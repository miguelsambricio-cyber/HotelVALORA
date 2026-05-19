/**
 * Parser+mapper validation against live booking-com15 fixtures.
 *
 * Loads the 3 captured live E2 fixtures (independent hostel + 2 branded),
 * runs them through parseHotelData + mapToCanonical, and emits a
 * comparison JSON for operator review.
 *
 * Requires Node 22.7+ for `--experimental-strip-types` (Node 24 has
 * it stable). Invocation:
 *
 *   node --experimental-strip-types apps/web/scripts/validate-parser-vs-live.mts
 */

import { readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

import { parseHotelData } from "../src/lib/enrichment/providers/booking-rapidapi/parse.ts";
import { mapToCanonical } from "../src/lib/enrichment/providers/booking-rapidapi/map-to-canonical.ts";
import { blockKey, compositeScore } from "../src/lib/enrichment/dedup/scoring.ts";

const __dirname = dirname(fileURLToPath(import.meta.url));
const FIXTURES = resolve(__dirname, "../src/lib/enrichment/providers/booking-rapidapi/fixtures");

const samples = [
  { label: "amazinn-stay-madrid-gran-via",   file: "live-e2-hotel-details-madrid.json" },
  { label: "nh-collection-madrid-eurobuilding", file: "live-e2-branded-nh-collection-eurobuilding.json" },
  { label: "jw-marriott-hotel-madrid",       file: "live-e2-branded-jw-marriott-madrid.json" },
];

interface ValidationReport {
  label: string;
  parsed_summary: Record<string, unknown>;
  mapping_summary: Record<string, unknown>;
  block_key: string;
  diagnostics: Record<string, unknown>;
  outcome_projection: string;
}

const reports: ValidationReport[] = [];

for (const s of samples) {
  const raw = JSON.parse(await readFile(resolve(FIXTURES, s.file), "utf-8"));
  const parsed = parseHotelData(raw);
  const mapping = mapToCanonical(parsed.parsed, {});
  const bk = blockKey({
    name: mapping.draft.canonical_name,
    cityNormalized: mapping.draft.city_normalized,
    countryCode: mapping.draft.country_code,
  });
  const determinedAmenityKeys = Object.values(mapping.draft.amenities).filter((v) => v !== null).length;

  const outcome =
    mapping.diagnostics.excludedByType ? "excluded_by_filter" :
    parsed.hasCriticalGaps ? "routed_to_dlq" :
    "fallback_required (T2 < 12)";

  reports.push({
    label: s.label,
    parsed_summary: {
      booking_hotel_id: parsed.parsed.bookingHotelId,
      canonical_name: parsed.parsed.name,
      accommodation_type_name: parsed.parsed.accommodationTypeName,
      city: parsed.parsed.city,
      district: parsed.parsed.district,
      postal_code: parsed.parsed.postalCode,
      country_code: parsed.parsed.countryCode,
      lat: parsed.parsed.lat,
      lng: parsed.parsed.lng,
      star_rating: parsed.parsed.starRating,
      review_score: parsed.parsed.reviewScore,
      review_count: parsed.parsed.reviewCount,
      hero_image_url: parsed.parsed.mainPhotoUrl,
      total_rooms: parsed.parsed.totalRooms,
      brand_from_chain_name: parsed.parsed.brand,
      raw_facilities_count: parsed.parsed.rawFacilities.length,
      warnings: parsed.parsed.warnings,
    },
    mapping_summary: {
      brand: mapping.draft.brand,
      brand_family: mapping.draft.brand_family,
      chain_scale: mapping.draft.chain_scale,
      segment: mapping.draft.segment,
      hotel_type: mapping.draft.hotel_type,
      city_normalized: mapping.draft.city_normalized,
      neighborhood: mapping.draft.neighborhood,
      hero_image_path: mapping.draft.hero_image_path,
      review_score: mapping.draft.review_score,
      review_count: mapping.draft.review_count,
      determined_amenity_keys: determinedAmenityKeys,
      total_provenance_entries: mapping.provenance.length,
      brand_inference_source: mapping.diagnostics.notes.find((n) => /Brand/i.test(n)) ?? "n/a",
    },
    block_key: bk,
    diagnostics: {
      excludedByType: mapping.diagnostics.excludedByType,
      brandUnresolved: mapping.diagnostics.brandUnresolved,
      municipioUnresolved: mapping.diagnostics.municipioUnresolved,
      hotelTypeUnresolved: mapping.diagnostics.hotelTypeUnresolved,
      unmappedAmenities_count: mapping.diagnostics.unmappedAmenities.length,
      parserWarnings: mapping.diagnostics.parserWarnings,
      notes: mapping.diagnostics.notes,
    },
    outcome_projection: outcome,
  });
}

// Cross-fixture dedup score: NH vs Marriott (should be no_match — different brand, geo distance >> 500m)
const nh = await readFile(resolve(FIXTURES, "live-e2-branded-nh-collection-eurobuilding.json"), "utf-8")
  .then((s) => parseHotelData(JSON.parse(s)));
const jw = await readFile(resolve(FIXTURES, "live-e2-branded-jw-marriott-madrid.json"), "utf-8")
  .then((s) => parseHotelData(JSON.parse(s)));

const nhMap = mapToCanonical(nh.parsed, {});
const jwMap = mapToCanonical(jw.parsed, {});

const dedupNhVsJw = compositeScore({
  nameA: nhMap.draft.canonical_name,
  nameB: jwMap.draft.canonical_name,
  geoA: nhMap.draft.lat != null && nhMap.draft.lng != null ? { lat: nhMap.draft.lat, lng: nhMap.draft.lng } : null,
  geoB: jwMap.draft.lat != null && jwMap.draft.lng != null ? { lat: jwMap.draft.lat, lng: jwMap.draft.lng } : null,
  operatorA: { brandFamilySlug: nhMap.draft.brand_family ?? null },
  operatorB: { brandFamilySlug: jwMap.draft.brand_family ?? null },
  roomsA: nhMap.draft.total_rooms,
  roomsB: jwMap.draft.total_rooms,
});

const output = {
  generated_at: new Date().toISOString(),
  fixtures_validated: reports.length,
  reports,
  cross_fixture_dedup_nh_vs_marriott: {
    composite: dedupNhVsJw.composite,
    components: dedupNhVsJw.components,
    geo_distance_meters: dedupNhVsJw.geoDistanceMeters,
    decision: dedupNhVsJw.composite >= 0.92 ? "auto_merge"
      : dedupNhVsJw.composite >= 0.8 ? "needs_review"
      : dedupNhVsJw.composite >= 0.65 ? "likely_duplicate"
      : "no_match (correct — distinct properties)",
  },
};

const outPath = resolve(FIXTURES, "live-parser-validation.json");
await writeFile(outPath, JSON.stringify(output, null, 2), "utf-8");
console.log(`\n✓ Validation report saved to: ${outPath}\n`);
console.log(JSON.stringify(output, null, 2));
