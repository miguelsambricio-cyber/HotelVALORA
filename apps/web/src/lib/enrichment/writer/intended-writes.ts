/**
 * Plan intended writes from a JobExecutionResult (v1).
 *
 * Pure-functional translation: given the orchestrator's output, build
 * the ordered list of table operations needed to persist it. Both the
 * dry-run writer (captures) and the Supabase writer (executes) consume
 * the same output, so behavior is identical at the planning layer.
 *
 * Ordering convention:
 *   1. source_record.insert            (always — provenance history)
 *   2. canonical.upsert                (if outcome = completed/_with_warnings/fallback_required AND no auto_merge to existing row)
 *   3. duplicate_candidate.insert      (if dedup tier in {auto_merge, needs_review, likely_duplicate})
 *   4. field_provenance.insert × N     (one per provenance entry from mapping)
 *   5. audit_event × M                 (one per field outcome that updates canonical)
 *   6. enrichment_run.update           (if runId provided)
 */

import { blockKey } from "../dedup/scoring";
import { computeFieldConfidence } from "../confidence/calculator";
import type { JobExecutionResult } from "../orchestrator/types";
import type { SourceKey } from "../confidence/tier-registry";
import type {
  AuditEventWrite,
  CanonicalUpsertWrite,
  DuplicateCandidateInsertWrite,
  EnrichmentRunUpdateWrite,
  FieldProvenanceInsertWrite,
  IntendedWrite,
  SourceRecordInsertWrite,
} from "./types";

function isoNow(now: Date): string {
  return now.toISOString();
}

function ttlByFetchStatus(now: Date, source: SourceKey): string {
  // Default TTL 7 days for Booking, 30 days for others — aligned with
  // sidecar §5 caching policy.
  const days = source === "booking_rapidapi" ? 7 : 30;
  return new Date(now.getTime() + days * 24 * 60 * 60 * 1000).toISOString();
}

export interface PlanIntendedWritesInput {
  result: JobExecutionResult;
  runId: string | null;
  /** Hash of the source payload (caller computes once; reused). */
  payloadHash: string;
  /** The raw `source_id` for this fetch (e.g., booking hotel id). */
  sourceId: string;
  /** Source key (matches `SourceKey`). */
  source: SourceKey;
  /** Now-clock for deterministic test replay. */
  now?: Date;
}

export function planIntendedWrites(input: PlanIntendedWritesInput): IntendedWrite[] {
  const now = input.now ?? new Date();
  const writes: IntendedWrite[] = [];
  let ordinal = 0;

  const { result } = input;
  if (!result.draft) {
    // Nothing to write beyond the source_record + audit_event ledger.
    const sourceRecord: SourceRecordInsertWrite = {
      kind: "source_record.insert",
      ordinal: ordinal++,
      effective: true,
      rationale: "no_draft_produced — keep source_record for forensic audit",
      source: input.source,
      sourceId: input.sourceId,
      payloadHash: input.payloadHash,
      fetchedAt: isoNow(now),
      fetchStatus: result.outcome === "routed_to_dlq" ? "parse_failed" : "ok",
      ttlExpiresAt: ttlByFetchStatus(now, input.source),
      enrichmentRunId: input.runId,
      includePayload: true,
    };
    writes.push(sourceRecord);
    return writes;
  }

  // ─── 1. source_record.insert ────────────────────────────────────────────
  const sourceRecord: SourceRecordInsertWrite = {
    kind: "source_record.insert",
    ordinal: ordinal++,
    effective: true,
    rationale: "every fetch produces one immutable source_record row",
    source: input.source,
    sourceId: input.sourceId,
    payloadHash: input.payloadHash,
    fetchedAt: isoNow(now),
    fetchStatus: result.warnings.length > 0 ? "parsed_with_warnings" : "ok",
    ttlExpiresAt: ttlByFetchStatus(now, input.source),
    enrichmentRunId: input.runId,
    includePayload: true,
  };
  writes.push(sourceRecord);

  // ─── 2. canonical.upsert (unless dedup auto_merge to existing row) ──────
  const isMerging = result.dedupDecision === "auto_merge" && (result.dedup?.bestMatch ?? null) !== null;
  const draftBlockKey = blockKey({
    name: result.draft.canonical_name,
    cityNormalized: result.draft.city_normalized,
    countryCode: result.draft.country_code,
  });

  if (!isMerging) {
    const upsert: CanonicalUpsertWrite = {
      kind: "canonical.upsert",
      ordinal: ordinal++,
      effective: true,
      rationale: isMerging
        ? "would_upsert_but_merging — handled by alias path"
        : "fresh canonical row OR field-level update via on-conflict",
      conflictKey: "booking_hotel_id",
      draft: result.draft,
      blockKey: draftBlockKey,
    };
    writes.push(upsert);
  } else {
    // Auto-merge — emit a non-effective placeholder for traceability
    writes.push({
      kind: "canonical.upsert",
      ordinal: ordinal++,
      effective: false,
      rationale: "auto_merge to existing canonical row — alias registration via hotel_aliases (handled by writer layer when implemented)",
      conflictKey: "booking_hotel_id",
      draft: result.draft,
      blockKey: draftBlockKey,
    });
  }

  // ─── 3. duplicate_candidate.insert ──────────────────────────────────────
  if (result.dedup?.bestMatch && result.dedup.decision !== "no_match") {
    const m = result.dedup.bestMatch;
    const [aId, bId] = [
      result.dedup.candidate.id,
      m.other.id,
    ].sort();
    const dup: DuplicateCandidateInsertWrite = {
      kind: "duplicate_candidate.insert",
      ordinal: ordinal++,
      effective: true,
      rationale: `dedup tier=${m.tier} composite=${m.score.composite.toFixed(3)}`,
      hotelAId: aId,
      hotelBId: bId,
      score: m.score.composite,
      tier: m.tier === "no_match" ? "likely_duplicate" : m.tier,
      components: {
        name_exact: m.score.components.name_exact,
        name_fuzzy: m.score.components.name_fuzzy,
        geo: m.score.components.geo,
        operator: m.score.components.operator,
        room_count: m.score.components.room_count,
      },
    };
    writes.push(dup);
  }

  // ─── 4. field_provenance.insert × N (post-canonical-upsert) ─────────────
  // For each field outcome that updates canonical OR for each provenance
  // entry on a fresh insert, emit a hotel_field_provenance row.
  const fieldOutcomes = result.fieldOutcomes ?? [];
  if (fieldOutcomes.length > 0) {
    // Existing canonical row — only emit provenance for fields that
    // ADOPT / AUTO_SUPERSEDE / REINFORCE (the canonical changed or was
    // reinforced). ABSORB still records provenance but marks superseded.
    for (const fo of fieldOutcomes) {
      const conf = computeFieldConfidence({
        fieldName: fo.field,
        primarySource: input.source,
        fetchedAt: now,
        validation: { passed: true },
      });
      const prov: FieldProvenanceInsertWrite = {
        kind: "field_provenance.insert",
        ordinal: ordinal++,
        effective: true,
        rationale: `field outcome ${fo.resolution}`,
        hotelId: null, // resolved by writer after canonical upsert
        fieldName: fo.field,
        value: fo.afterValue,
        source: input.source,
        sourceRecordId: null, // resolved by writer after source_record insert
        confidence: conf.confidence,
        fetchedAt: isoNow(now),
      };
      writes.push(prov);
    }
  } else if (result.draft) {
    // Fresh insert — emit one provenance row per non-null draft field.
    // For brevity we delegate the actual entries to the mapping
    // provenance trail (already computed) when available.
    for (const [fieldName, value] of Object.entries(result.draft)) {
      if (value === null || value === undefined) continue;
      if (fieldName === "amenities") continue; // handled separately below
      const conf = computeFieldConfidence({
        fieldName,
        primarySource: input.source,
        fetchedAt: now,
        validation: { passed: true },
      });
      writes.push({
        kind: "field_provenance.insert",
        ordinal: ordinal++,
        effective: true,
        rationale: "fresh canonical insert — provenance per non-null field",
        hotelId: null,
        fieldName,
        value,
        source: input.source,
        sourceRecordId: null,
        confidence: conf.confidence,
        fetchedAt: isoNow(now),
      });
    }
    // Amenities — emit one provenance per determined key
    if (result.draft.amenities) {
      for (const [k, v] of Object.entries(result.draft.amenities)) {
        if (v === null) continue;
        const conf = computeFieldConfidence({
          fieldName: `amenities.${k}`,
          primarySource: input.source,
          fetchedAt: now,
          validation: { passed: true },
        });
        writes.push({
          kind: "field_provenance.insert",
          ordinal: ordinal++,
          effective: true,
          rationale: "fresh canonical insert — amenity per determined key",
          hotelId: null,
          fieldName: `amenities.${k}`,
          value: v,
          source: input.source,
          sourceRecordId: null,
          confidence: conf.confidence,
          fetchedAt: isoNow(now),
        });
      }
    }
  }

  // ─── 5. audit_event × M (one per field outcome that updates canonical) ──
  for (const fo of fieldOutcomes) {
    if (!fo.shouldUpdateCanonical && fo.resolution !== "CONFLICT") continue;
    const audit: AuditEventWrite = {
      kind: "audit_event",
      ordinal: ordinal++,
      effective: true,
      rationale: `field outcome routed to audit (${fo.resolution})`,
      eventType:
        fo.resolution === "CONFLICT"
          ? "hotel.canonical.field_conflict_routed_to_review"
          : "hotel.canonical.field_updated",
      hotelId: null, // resolved by writer
      beforeState: { value: fo.beforeValue, confidence: fo.beforeConfidence },
      afterState: { value: fo.afterValue, confidence: fo.afterConfidence },
      meta: {
        field: fo.field,
        resolution: fo.resolution,
        rationale: fo.rationale,
      },
    };
    writes.push(audit);
  }

  // ─── 6. enrichment_run.update ───────────────────────────────────────────
  if (input.runId) {
    const run: EnrichmentRunUpdateWrite = {
      kind: "enrichment_run.update",
      ordinal: ordinal++,
      effective: true,
      rationale: "tick run-level counters",
      runId: input.runId,
      patch: {
        hotelsSeen: 1,
        hotelsInserted: !isMerging && result.outcome !== "routed_to_dlq" ? 1 : 0,
        hotelsUpdated: isMerging ? 1 : 0,
        fieldsUpdated: fieldOutcomes.filter((f) => f.shouldUpdateCanonical).length,
        errorsCount: result.error ? 1 : 0,
      },
    };
    writes.push(run);
  }

  return writes;
}
