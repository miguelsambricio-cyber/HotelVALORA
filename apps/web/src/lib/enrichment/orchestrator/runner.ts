/**
 * Job runner (v1).
 *
 * Single-job execution through the full enrichment pipeline:
 *
 *   1. Fetch source data (provider client; dry-run / fixture / live).
 *   2. Parse + map to canonical draft (provider-specific).
 *   3. Dedup against block-key neighborhood.
 *   4. Conflict-resolve per field against existing canonical (if any).
 *   5. Compute per-field confidence.
 *   6. Decide outcome.
 *   7. Emit `JobExecutionResult`.
 *
 * Phase 1 dry-run constraints:
 *   - No DB writes (canonical store may be in-memory).
 *   - No real HTTP (live mode throws at the client layer).
 *   - All randomness deterministic via injectable `rng` (not used here
 *     directly; retry policy uses it).
 *
 * The runner is intentionally small. The heavy lifting lives in
 * dedup/, confidence/, and providers/booking-rapidapi/.
 */

import {
  parseHotelData,
  parseHotelDualSource,
  unwrapEnvelope,
} from "../providers/booking-rapidapi/parse";
import {
  mapToCanonical,
  type CanonicalHotelDraft,
} from "../providers/booking-rapidapi/map-to-canonical";
import type {
  BookingDualSource,
  BookingEnvelope,
  BookingFacilitiesData,
  BookingFacilitiesResponse,
  BookingHotelDetailsData,
  BookingHotelDetailsResponse,
  BookingSearchHit,
} from "../providers/booking-rapidapi/types";

import { blockKey } from "../dedup/scoring";
import {
  evaluateCandidate,
  type DedupCandidate,
} from "../dedup/engine";

import { resolveFieldConflict } from "../confidence/conflict-resolver";
import { computeFieldConfidence } from "../confidence/calculator";

import type {
  EnrichmentJob,
  ExecutionContext,
  JobExecutionResult,
  JobOutcome,
  PerFieldOutcome,
} from "./types";

// ───────────────────────────────────────────────────────────────────────────
// Coverage tier helper (mirrors dry-run.ts; ported to runner-level use)
// ───────────────────────────────────────────────────────────────────────────

function computeCoverage(d: CanonicalHotelDraft): { tier0: number; tier1: number; tier2: number } {
  const determinedAmenities = Object.values(d.amenities).filter((v) => v !== null).length;
  const tier0 =
    (d.booking_hotel_id != null ? 1 : 0) +
    (d.canonical_name != null ? 1 : 0) +
    (d.city != null ? 1 : 0) +
    (d.city_normalized != null ? 1 : 0) +
    (d.country_code != null && d.country_code.length === 2 ? 1 : 0) +
    (d.lat != null && d.lat >= -90 && d.lat <= 90 ? 1 : 0) +
    (d.lng != null && d.lng >= -180 && d.lng <= 180 ? 1 : 0) +
    (d.lat != null && d.lng != null ? 1 : 0);
  const tier1 =
    (d.star_rating != null ? 1 : 0) +
    (d.total_rooms != null ? 1 : 0) +
    (d.segment !== "unknown" ? 1 : 0) +
    (d.hotel_type != null ? 1 : 0) +
    (determinedAmenities >= 5 ? 1 : 0) +
    (d.review_score != null ? 1 : 0) +
    (d.review_count != null ? 1 : 0) +
    (d.booking_url != null ? 1 : 0) +
    (d.primary_source != null ? 1 : 0) +
    2 +
    (d.status != null ? 1 : 0);
  const tier2 =
    (d.brand != null ? 1 : 0) +
    (d.brand_family != null ? 1 : 0) +
    (d.chain_scale !== "unknown" ? 1 : 0) +
    (determinedAmenities >= 14 ? 1 : 0) +
    (d.address_line1 != null ? 1 : 0) +
    (d.postal_code != null ? 1 : 0) +
    (d.neighborhood != null ? 1 : 0) +
    (d.hero_image_path != null ? 1 : 0) +
    (d.website_url != null ? 1 : 0) +
    (d.phone != null ? 1 : 0);
  return { tier0, tier1, tier2 };
}

// ───────────────────────────────────────────────────────────────────────────
// Convert a draft into a DedupCandidate
// ───────────────────────────────────────────────────────────────────────────

function draftToDedupCandidate(d: CanonicalHotelDraft, id: string): DedupCandidate {
  return {
    id,
    bookingHotelId: d.booking_hotel_id,
    name: d.canonical_name,
    cityNormalized: d.city_normalized,
    countryCode: d.country_code,
    lat: d.lat,
    lng: d.lng,
    totalRooms: d.total_rooms,
    operatorSlug: null, // Phase 1: Booking doesn't usually return operator slug
    brandFamilySlug: d.brand_family ? d.brand_family.toLowerCase().replace(/\s+/g, "-") : null,
    accommodationType: d.hotel_type === "aparthotel" ? "aparthotel" : "hotel",
  };
}

// ───────────────────────────────────────────────────────────────────────────
// Main runner
// ───────────────────────────────────────────────────────────────────────────

export async function runEnrichmentJob(
  job: EnrichmentJob,
  ctx: ExecutionContext,
): Promise<JobExecutionResult> {
  const startedAt = Date.now();
  const warnings: string[] = [];

  // 1. Fetch source data (provider-specific). Accepted shapes:
  //    - { e1Hit, e2Detail, e3Facilities? }              — new dual-source (post-live-validation)
  //    - { e1Hit, e2Detail (envelope), e3Facilities? }   — same, envelopes auto-unwrapped
  //    - { e2: detail }                                  — legacy single-source (M2 synthetic fixtures)
  //    - BookingHotelDetailsData / envelope              — single-source legacy
  //    - null                                            — dry-run no-op
  let e1Hit: BookingSearchHit | null = null;
  let e2Detail: BookingHotelDetailsData | null = null;
  let e3Facilities: BookingFacilitiesData | null = null;

  try {
    const fetched = await ctx.fetchSourceData(job);
    if (!fetched) {
      return {
        job,
        outcome: "dry_run_no_call",
        warnings,
        durationMs: Date.now() - startedAt,
        completedAt: ctx.now(),
      };
    }
    const f = fetched as Record<string, unknown>;
    if (typeof fetched === "object" && fetched !== null && ("e1Hit" in f || "e2Detail" in f)) {
      e1Hit = (f.e1Hit as BookingSearchHit | null) ?? null;
      const e2Raw = f.e2Detail as BookingEnvelope<BookingHotelDetailsData> | BookingHotelDetailsData | null;
      e2Detail = e2Raw ? unwrapEnvelope<BookingHotelDetailsData>(e2Raw) : null;
      const e3Raw = f.e3Facilities as BookingFacilitiesResponse | BookingFacilitiesData | null | undefined;
      e3Facilities = e3Raw ? unwrapEnvelope<BookingFacilitiesData>(e3Raw) : null;
    } else if (typeof fetched === "object" && fetched !== null && "e2" in f) {
      // Legacy shape from M2 synthetic fixtures
      const e2Raw = f.e2 as BookingEnvelope<BookingHotelDetailsData> | BookingHotelDetailsData;
      e2Detail = unwrapEnvelope<BookingHotelDetailsData>(e2Raw);
      const e3Raw = f.e3 as BookingFacilitiesResponse | BookingFacilitiesData | null | undefined;
      e3Facilities = e3Raw ? unwrapEnvelope<BookingFacilitiesData>(e3Raw) : null;
    } else {
      // Bare detail (envelope or unwrapped)
      e2Detail = unwrapEnvelope<BookingHotelDetailsData>(
        fetched as BookingEnvelope<BookingHotelDetailsData> | BookingHotelDetailsData,
      );
    }
  } catch (err) {
    return {
      job,
      outcome: "routed_to_dlq",
      warnings,
      durationMs: Date.now() - startedAt,
      completedAt: ctx.now(),
      error: {
        class: "PARSE",
        retryable: false,
        message: err instanceof Error ? err.message : String(err),
      },
    };
  }

  if (!e1Hit && !e2Detail) {
    return {
      job,
      outcome: "fixture_not_found",
      warnings,
      durationMs: Date.now() - startedAt,
      completedAt: ctx.now(),
    };
  }

  // 2. Parse + map (dual-source path; legacy single-source still works)
  const parsed = (e1Hit || e3Facilities)
    ? parseHotelDualSource({ e1Hit, e2Detail, e3Facilities })
    : parseHotelData(e2Detail!);

  if (parsed.hasCriticalGaps) {
    return {
      job,
      outcome: "routed_to_dlq",
      warnings: [...warnings, ...parsed.parsed.warnings, `critical_gaps:${parsed.criticalGaps.join(",")}`],
      durationMs: Date.now() - startedAt,
      completedAt: ctx.now(),
      error: {
        class: "VALIDATION",
        retryable: false,
        message: `critical_gaps:${parsed.criticalGaps.join(",")}`,
      },
    };
  }

  const mapping = mapToCanonical(parsed.parsed);

  // 3. Dedup against block-key neighborhood
  const draftCandidate = draftToDedupCandidate(mapping.draft, `draft:${job.id}`);
  const bk = blockKey({
    name: draftCandidate.name,
    cityNormalized: draftCandidate.cityNormalized,
    countryCode: draftCandidate.countryCode,
  });
  const neighborhood = ctx.canonicalStore.findByBlockKey(bk);
  const knownAsCandidates = neighborhood.map((n) =>
    draftToDedupCandidate(n, n.booking_hotel_id ?? `canonical:${n.canonical_name}`),
  );
  const dedup = evaluateCandidate(draftCandidate, knownAsCandidates);

  // 4. Conflict-resolve per field (only if dedup found an existing match)
  let existing: CanonicalHotelDraft | null = null;
  if (dedup.bestMatch && (dedup.decision === "auto_merge" || dedup.decision === "needs_review")) {
    // Try to find the actual canonical row for the matched id
    const matchedId = dedup.bestMatch.other.bookingHotelId;
    if (matchedId) {
      existing = ctx.canonicalStore.findByExternalId("booking_hotel_id", matchedId);
    }
  }

  const fieldOutcomes: PerFieldOutcome[] = [];
  if (existing) {
    for (const provEntry of mapping.provenance) {
      const fieldKey = String(provEntry.field);
      const existingValue = readField(existing, fieldKey);
      const existingConf = 0.85; // Phase 1: assumed prior confidence; real read comes from hotel_field_provenance
      const conf = computeFieldConfidence({
        fieldName: fieldKey,
        primarySource: "booking_rapidapi",
        fetchedAt: ctx.now(),
        validation: { passed: true },
      });
      const resolution = resolveFieldConflict(
        existingValue == null ? null : { value: existingValue, confidence: existingConf },
        { value: provEntry.value, confidence: conf.confidence },
      );
      fieldOutcomes.push({
        field: fieldKey,
        resolution: resolution.resolution,
        shouldUpdateCanonical: resolution.shouldUpdateCanonical,
        shouldEnqueueReview: resolution.shouldEnqueueReview,
        beforeValue: resolution.diff.before.value,
        afterValue: resolution.diff.after.value,
        beforeConfidence: resolution.diff.before.confidence,
        afterConfidence: resolution.diff.after.confidence,
        rationale: resolution.rationale,
      });
    }
  }

  // 5. Coverage
  const preCoverage = computeCoverage(mapping.draft);

  // 6. Outcome
  const outcome: JobOutcome = decideOutcome(dedup.decision, fieldOutcomes, preCoverage);

  // 7. Optional store write (no-op in dry-run unless upsert provided)
  if (outcome === "completed" || outcome === "completed_with_warnings") {
    ctx.canonicalStore.upsert?.(mapping.draft);
  }

  if (mapping.diagnostics.unmappedAmenities.length > 0) {
    warnings.push(`unmapped_amenities:${mapping.diagnostics.unmappedAmenities.length}`);
  }
  if (mapping.diagnostics.brandUnresolved) warnings.push("brand_unresolved");
  if (mapping.diagnostics.municipioUnresolved) warnings.push("municipio_unresolved");
  if (mapping.diagnostics.hotelTypeUnresolved) warnings.push("hotel_type_unresolved");

  return {
    job,
    outcome,
    draft: mapping.draft,
    dedup,
    dedupDecision: dedup.decision,
    fieldOutcomes,
    preCoverage,
    warnings,
    durationMs: Date.now() - startedAt,
    completedAt: ctx.now(),
  };
}

// ───────────────────────────────────────────────────────────────────────────
// Helpers
// ───────────────────────────────────────────────────────────────────────────

function readField(d: CanonicalHotelDraft, key: string): unknown {
  if (key.startsWith("amenities.")) {
    const k = key.slice("amenities.".length) as keyof typeof d.amenities;
    return d.amenities[k];
  }
  const obj = d as unknown as Record<string, unknown>;
  return obj[key];
}

function decideOutcome(
  dedupDecision: string,
  fieldOutcomes: PerFieldOutcome[],
  preCoverage: { tier0: number; tier1: number; tier2: number },
): JobOutcome {
  if (preCoverage.tier0 < 8) return "routed_to_dlq";
  const hasConflicts = fieldOutcomes.some((f) => f.resolution === "CONFLICT");
  if (hasConflicts) return "completed_with_warnings";
  if (preCoverage.tier2 < 12) return "fallback_required";
  return "completed";
}
