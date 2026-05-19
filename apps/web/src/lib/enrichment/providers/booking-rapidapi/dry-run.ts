/**
 * RapidAPI Booking — dry-run orchestrator (v1).
 *
 * Runs the full client → parse → map pipeline against fixture payloads
 * without making any HTTP calls. Output is a `DryRunReport` per fixture
 * that the operator inspects before authorising live mode.
 *
 * Usage (from a runnable script — see apps/web/scripts/enrichment-booking-dry-run.ts):
 *
 *   import { runDryRun } from "@/lib/enrichment/providers/booking-rapidapi/dry-run";
 *   const reports = await runDryRun({ fixtures: [...] });
 *   console.log(JSON.stringify(reports, null, 2));
 */

import { parseHotelData, parseFacilitiesResponse, type ParseResult } from "./parse";
import { mapToCanonical, type MappingResult } from "./map-to-canonical";
import type { RapidApiHotelData, RapidApiFacilitiesResponse } from "./types";

export interface DryRunFixture {
  /** Synthetic label for the fixture, e.g. "ritz-by-belmond-madrid". */
  label: string;
  /** E2 hotel data payload. */
  e2: RapidApiHotelData;
  /** Optional E3 facilities payload (when E2 lacks granular amenities). */
  e3?: RapidApiFacilitiesResponse;
}

export interface DryRunReport {
  label: string;
  parse: ParseResult;
  mapping: MappingResult;
  // Coverage-tier counts BEFORE persistence (we measure what Booking
  // alone would deliver for this hotel).
  preCoverage: {
    tier0Count: number;
    tier1Count: number;
    tier2Count: number;
    determinedAmenityKeys: number;
  };
  summary: {
    canonicalNamePopulated: boolean;
    brandFamilyResolved: boolean;
    municipioFolded: boolean;
    municipioFoldedTo: string | null;
    hotelTypeResolved: boolean;
    segmentDerived: string;
    populatedFieldCount: number;
    unmappedAmenityCount: number;
    criticalGapCount: number;
  };
}

export interface DryRunInput {
  fixtures: DryRunFixture[];
}

export interface DryRunAggregate {
  totalFixtures: number;
  fixturesWithCriticalGaps: number;
  averagePopulatedFields: number;
  totalUnmappedAmenities: number;
  notes: string[];
}

export interface DryRunOutput {
  reports: DryRunReport[];
  aggregate: DryRunAggregate;
}

// ───────────────────────────────────────────────────────────────────────────
// TIER-0/T1/T2 counts AT THE DRAFT LEVEL (before persistence)
// ───────────────────────────────────────────────────────────────────────────

function tier0Count(mapping: MappingResult): number {
  const d = mapping.draft;
  return (
    (d.booking_hotel_id != null ? 1 : 0) +
    (d.canonical_name != null ? 1 : 0) +
    (d.city != null ? 1 : 0) +
    (d.city_normalized != null ? 1 : 0) +
    (d.country_code != null && d.country_code.length === 2 ? 1 : 0) +
    (d.lat != null && d.lat >= -90 && d.lat <= 90 ? 1 : 0) +
    (d.lng != null && d.lng >= -180 && d.lng <= 180 ? 1 : 0) +
    // geom derived from lat/lng — count if both present
    (d.lat != null && d.lng != null ? 1 : 0)
  );
}

function tier1Count(mapping: MappingResult, determinedAmenities: number): number {
  const d = mapping.draft;
  return (
    (d.star_rating != null ? 1 : 0) +
    (d.total_rooms != null ? 1 : 0) +
    (d.segment !== "unknown" ? 1 : 0) +
    (d.hotel_type != null ? 1 : 0) +
    (determinedAmenities >= 5 ? 1 : 0) +
    (d.review_score != null ? 1 : 0) +
    (d.review_count != null ? 1 : 0) +
    (d.booking_url != null ? 1 : 0) +
    (d.primary_source != null ? 1 : 0) +
    // data_quality_tier and enrichment_version are post-persist; assume 1+1
    2 +
    (d.status != null ? 1 : 0)
  );
}

function tier2Count(mapping: MappingResult, determinedAmenities: number): number {
  const d = mapping.draft;
  return (
    (d.brand != null ? 1 : 0) +
    (d.brand_family != null ? 1 : 0) +
    (d.chain_scale !== "unknown" ? 1 : 0) +
    // operator_id — Booking does not produce this Phase 1; counts as 0
    0 +
    // operator_type
    0 +
    (determinedAmenities >= 14 ? 1 : 0) +
    (d.address_line1 != null ? 1 : 0) +
    (d.postal_code != null ? 1 : 0) +
    (d.neighborhood != null ? 1 : 0) +
    // room_type_mix — Booking E2 doesn't expose; 0
    0 +
    // meeting_rooms_count — sometimes from E3 facility flag; not modeled here
    0 +
    // meeting_space_sqm — never in Booking; 0
    0 +
    // year_opened — never in Booking; 0
    0 +
    (d.hero_image_path != null ? 1 : 0) +
    (d.website_url != null ? 1 : 0) +
    (d.phone != null ? 1 : 0) +
    // google_place_id — Phase E fallback
    0 +
    // market_id, submarket_id — derived from city/geo at write time
    0 +
    0
  );
}

// ───────────────────────────────────────────────────────────────────────────
// Per-fixture run
// ───────────────────────────────────────────────────────────────────────────

function runOneFixture(fixture: DryRunFixture): DryRunReport {
  const parse = parseHotelData(fixture.e2);

  // Merge granular facilities from E3 if present
  let extraFacilities: string[] = [];
  if (fixture.e3) {
    const facParse = parseFacilitiesResponse(fixture.e3);
    extraFacilities = facParse.facilities;
  }

  const mapping = mapToCanonical(parse.parsed, { extraFacilities });

  const determinedAmenities =
    Object.values(mapping.draft.amenities).filter((v) => v !== null).length;

  const preCoverage = {
    tier0Count: tier0Count(mapping),
    tier1Count: tier1Count(mapping, determinedAmenities),
    tier2Count: tier2Count(mapping, determinedAmenities),
    determinedAmenityKeys: determinedAmenities,
  };

  const summary = {
    canonicalNamePopulated: mapping.draft.canonical_name != null,
    brandFamilyResolved: mapping.draft.brand_family != null,
    municipioFolded: mapping.municipioResolution != null,
    municipioFoldedTo: mapping.municipioResolution?.cityNormalized ?? null,
    hotelTypeResolved: mapping.draft.hotel_type != null,
    segmentDerived: mapping.draft.segment,
    populatedFieldCount: mapping.populatedFieldCount,
    unmappedAmenityCount: mapping.diagnostics.unmappedAmenities.length,
    criticalGapCount: parse.criticalGaps.length,
  };

  return {
    label: fixture.label,
    parse,
    mapping,
    preCoverage,
    summary,
  };
}

// ───────────────────────────────────────────────────────────────────────────
// Public entry point
// ───────────────────────────────────────────────────────────────────────────

export function runDryRun(input: DryRunInput): DryRunOutput {
  const reports = input.fixtures.map(runOneFixture);

  const totalUnmapped = reports.reduce((s, r) => s + r.summary.unmappedAmenityCount, 0);
  const totalCritical = reports.filter((r) => r.summary.criticalGapCount > 0).length;
  const avgPopulated =
    reports.length === 0
      ? 0
      : reports.reduce((s, r) => s + r.summary.populatedFieldCount, 0) / reports.length;

  return {
    reports,
    aggregate: {
      totalFixtures: reports.length,
      fixturesWithCriticalGaps: totalCritical,
      averagePopulatedFields: Math.round(avgPopulated * 10) / 10,
      totalUnmappedAmenities: totalUnmapped,
      notes: [
        "Dry-run mode: no HTTP calls were made. Numbers reflect what Booking RapidAPI E2 (+ optional E3) alone would deliver per hotel.",
        "TIER-2 ceiling visible here is the Booking-only ceiling. Fallback chain (Google Places + website + Wikidata) is required to reach the institutional 80% goal.",
      ],
    },
  };
}
