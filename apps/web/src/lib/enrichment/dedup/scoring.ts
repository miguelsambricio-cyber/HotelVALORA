/**
 * Composite duplicate scoring (v1).
 *
 * Implements the institutional weighted rubric from architecture doc §4.2:
 *
 *   name_exact      35%   1.0 if Jaro-Winkler ≥ 0.95, else 0
 *   name_fuzzy      30%   linear in JW over [0.80, 0.95]; below 0.80 → 0
 *   geo_proximity   20%   1.0 < 50m, 0.7 < 200m, 0.4 < 500m, else 0
 *   operator_match  10%   1.0 same operator slug, 0.5 same brand_family, else 0
 *   room_count_match 5%   1.0 ±5%, 0.5 ±15%, else 0
 *
 * Tiers (architecture doc §4.2):
 *   ≥ 0.92 → auto_merge
 *   ≥ 0.80 → needs_review
 *   ≥ 0.65 → likely_duplicate
 *   <  0.65 → discard
 *
 * Note: per RapidAPI sidecar §7.2 (apartment-block flooding), the engine
 * downgrades `auto_merge` to `needs_review` when either candidate's
 * `accommodation_type` is `apartment` or `aparthotel`. That override is
 * applied in `engine.ts`, not here — this file produces the raw score.
 */

import { jaroWinklerSimilarity, normalizeForBlocking, soundex } from "./string-similarity";

// ───────────────────────────────────────────────────────────────────────────
// Block key
// ───────────────────────────────────────────────────────────────────────────

/**
 * Deterministic, human-readable block key. Two rows with the same key
 * are eligible to be compared by the full composite scorer; rows with
 * different keys are skipped without N×N cost.
 *
 *   `<SOUNDEX>::<city_normalized>::<country_code>`
 *
 * Soundex over stopword-stripped name → phonetic grouping that survives
 * minor spelling variation. City + country prevent cross-market collisions.
 */
export function blockKey(input: {
  name: string | null | undefined;
  cityNormalized: string | null | undefined;
  countryCode: string | null | undefined;
}): string {
  const name = input.name ?? "";
  const city = input.cityNormalized ?? "";
  const cc = (input.countryCode ?? "").toUpperCase();
  const sx = soundex(normalizeForBlocking(name) || name);
  const cityKey = normalizeForBlocking(city) || normalizeForBlocking(input.cityNormalized ?? "");
  return `${sx}::${cityKey}::${cc}`;
}

// ───────────────────────────────────────────────────────────────────────────
// Geo proximity (haversine)
// ───────────────────────────────────────────────────────────────────────────

const EARTH_RADIUS_M = 6_371_000;

export function haversineMeters(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number },
): number {
  const toRad = (x: number) => (x * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const sinDLat = Math.sin(dLat / 2);
  const sinDLng = Math.sin(dLng / 2);
  const aTerm = sinDLat * sinDLat + Math.cos(lat1) * Math.cos(lat2) * sinDLng * sinDLng;
  const c = 2 * Math.atan2(Math.sqrt(aTerm), Math.sqrt(1 - aTerm));
  return EARTH_RADIUS_M * c;
}

export function geoProximityScore(distanceMeters: number | null): number {
  if (distanceMeters === null || !Number.isFinite(distanceMeters)) return 0;
  if (distanceMeters < 50) return 1.0;
  if (distanceMeters < 200) return 0.7;
  if (distanceMeters < 500) return 0.4;
  return 0;
}

// ───────────────────────────────────────────────────────────────────────────
// Name score components
// ───────────────────────────────────────────────────────────────────────────

export function nameExactScore(a: string | null | undefined, b: string | null | undefined): number {
  if (!a || !b) return 0;
  return jaroWinklerSimilarity(a, b) >= 0.95 ? 1.0 : 0;
}

export function nameFuzzyScore(a: string | null | undefined, b: string | null | undefined): number {
  if (!a || !b) return 0;
  const jw = jaroWinklerSimilarity(a, b);
  if (jw < 0.8) return 0;
  if (jw > 0.95) return 1.0;
  // Linear interpolation over [0.80, 0.95] → [0, 1]
  return (jw - 0.8) / 0.15;
}

// ───────────────────────────────────────────────────────────────────────────
// Operator / brand component
// ───────────────────────────────────────────────────────────────────────────

export interface OperatorComparable {
  operatorSlug?: string | null;
  brandFamilySlug?: string | null;
}

export function operatorMatchScore(a: OperatorComparable, b: OperatorComparable): number {
  if (a.operatorSlug && b.operatorSlug && a.operatorSlug === b.operatorSlug) return 1.0;
  if (a.brandFamilySlug && b.brandFamilySlug && a.brandFamilySlug === b.brandFamilySlug) return 0.5;
  return 0;
}

// ───────────────────────────────────────────────────────────────────────────
// Room count component
// ───────────────────────────────────────────────────────────────────────────

export function roomCountMatchScore(a: number | null | undefined, b: number | null | undefined): number {
  if (a == null || b == null || a <= 0 || b <= 0) return 0;
  const delta = Math.abs(a - b);
  const baseline = Math.max(a, b);
  const ratio = delta / baseline;
  if (ratio <= 0.05) return 1.0;
  if (ratio <= 0.15) return 0.5;
  return 0;
}

// ───────────────────────────────────────────────────────────────────────────
// Composite
// ───────────────────────────────────────────────────────────────────────────

export interface ScoreComponents {
  name_exact: number;
  name_fuzzy: number;
  geo: number;
  operator: number;
  room_count: number;
}

export const COMPONENT_WEIGHTS: ScoreComponents = {
  name_exact: 0.35,
  name_fuzzy: 0.3,
  geo: 0.2,
  operator: 0.1,
  room_count: 0.05,
};

export interface CompositeInputs {
  nameA: string | null | undefined;
  nameB: string | null | undefined;
  geoA: { lat: number; lng: number } | null;
  geoB: { lat: number; lng: number } | null;
  operatorA: OperatorComparable;
  operatorB: OperatorComparable;
  roomsA: number | null | undefined;
  roomsB: number | null | undefined;
}

export interface CompositeResult {
  components: ScoreComponents;
  composite: number;
  geoDistanceMeters: number | null;
}

export function compositeScore(inputs: CompositeInputs): CompositeResult {
  const components: ScoreComponents = {
    name_exact: nameExactScore(inputs.nameA, inputs.nameB),
    name_fuzzy: nameFuzzyScore(inputs.nameA, inputs.nameB),
    geo: 0,
    operator: operatorMatchScore(inputs.operatorA, inputs.operatorB),
    room_count: roomCountMatchScore(inputs.roomsA, inputs.roomsB),
  };
  let distance: number | null = null;
  if (inputs.geoA && inputs.geoB) {
    distance = haversineMeters(inputs.geoA, inputs.geoB);
    components.geo = geoProximityScore(distance);
  }
  const composite =
    components.name_exact * COMPONENT_WEIGHTS.name_exact +
    components.name_fuzzy * COMPONENT_WEIGHTS.name_fuzzy +
    components.geo * COMPONENT_WEIGHTS.geo +
    components.operator * COMPONENT_WEIGHTS.operator +
    components.room_count * COMPONENT_WEIGHTS.room_count;
  return {
    components,
    composite: Math.min(1, Math.max(0, composite)),
    geoDistanceMeters: distance,
  };
}
