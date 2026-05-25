/**
 * Capa A · Same-physical-building detector.
 *
 * Parallel to the name-based dedup engine (scoring.ts · 35/30/20/10/5 with
 * name weights dominant). That engine works when a hotel is re-discovered
 * under SIMILAR name. It MISSES rebrands where the name changes drastically
 * (e.g. "AC Hotel Cuzco by Marriott" → "The Westin Madrid Cuzco"): the two
 * name fields contribute 65% of the score, so when both fail, max possible
 * is 35% — well below the likely_duplicate threshold of 65%.
 *
 * This detector takes a GEO-FIRST view: same building means same coordinates,
 * same postal code, similar room count. If those three match, it's the same
 * physical asset regardless of brand. Operator confirms via the surfaced
 * `same_building_rebrand` candidate row.
 *
 * Operator workflow (when CoStar mundial brings new candidate rows):
 *   1. Enrichment pipeline inserts candidate via standard insert path.
 *   2. Name dedup engine runs (existing) — no hit because rebrand.
 *   3. This detector runs (new) — surfaces matching neighbors.
 *   4. Operator decides: INSERT new row OR ALIAS to existing canonical_id.
 *   5. If alias: write to hotel_name_alias + hotel_canonical_history.
 *
 * NOT wired into a pipeline yet · pure module exporting functions that the
 * future CoStar mundial enrichment runner will call.
 */

import { haversineMeters } from "./scoring";

export interface BuildingCandidateInput {
  /** Optional · only used to disambiguate self-matches. Pass null for fresh candidates. */
  id?: string | null;
  lat: number | null;
  lng: number | null;
  postal_code: string | null;
  total_rooms: number | null;
  /** Country code for fast prefilter — only compare against neighbors in the same country. */
  country_code?: string | null;
}

export interface BuildingNeighborRow {
  id: string;
  canonical_name: string | null;
  lat: number | null;
  lng: number | null;
  postal_code: string | null;
  total_rooms: number | null;
  country_code?: string | null;
}

export type SameBuildingReason =
  | "geo_within_30m"
  | "geo_within_30m_postal_match"
  | "geo_within_30m_postal_match_rooms_within_20pct";

export interface SameBuildingMatch {
  neighbor_id: string;
  neighbor_name: string;
  distance_m: number;
  postal_match: boolean;
  rooms_within_20pct: boolean;
  reason: SameBuildingReason;
  /** Confidence 0..1 · 1.0 = all three criteria pass. */
  confidence: number;
}

/**
 * Default thresholds (operator-tunable).
 *
 *   distance_m       30m  · institutional anchor · same building footprint
 *   rooms_tolerance  0.20 · ±20% covers Hard Rock 161 ↔ NH Eurobuilding 412
 *                           type mismatches without false positives
 */
export const DEFAULT_SAME_BUILDING_THRESHOLDS = Object.freeze({
  distance_m: 30,
  rooms_tolerance: 0.2,
});

export interface SameBuildingThresholds {
  distance_m: number;
  rooms_tolerance: number;
}

/**
 * Compare a candidate to its neighbors. Returns the matches sorted by
 * confidence DESC. Empty array means no candidate match — caller should
 * INSERT the candidate as a new canonical row.
 */
export function detectSameBuilding(
  candidate: BuildingCandidateInput,
  neighbors: readonly BuildingNeighborRow[],
  thresholds: SameBuildingThresholds = DEFAULT_SAME_BUILDING_THRESHOLDS,
): SameBuildingMatch[] {
  // Hard prereqs · no lat/lng = no geo match possible
  if (candidate.lat === null || candidate.lng === null) return [];

  const candCoord = { lat: candidate.lat, lng: candidate.lng };
  const candPostal = (candidate.postal_code ?? "").trim();
  const candRooms = candidate.total_rooms ?? null;
  const candCountry = (candidate.country_code ?? "").toUpperCase();

  const matches: SameBuildingMatch[] = [];

  for (const n of neighbors) {
    if (candidate.id && n.id === candidate.id) continue; // skip self
    if (n.lat === null || n.lng === null) continue;
    if (candCountry && n.country_code && n.country_code.toUpperCase() !== candCountry) continue;

    const distance_m = haversineMeters(candCoord, { lat: n.lat, lng: n.lng });
    if (distance_m > thresholds.distance_m) continue;

    const postal_match =
      candPostal.length > 0 &&
      (n.postal_code ?? "").trim() === candPostal;

    const rooms_within_20pct =
      candRooms !== null &&
      n.total_rooms !== null &&
      n.total_rooms > 0 &&
      Math.abs(candRooms - n.total_rooms) / n.total_rooms <= thresholds.rooms_tolerance;

    // All three criteria → highest confidence (institutional gold)
    if (postal_match && rooms_within_20pct) {
      matches.push({
        neighbor_id: n.id,
        neighbor_name: n.canonical_name ?? "—",
        distance_m,
        postal_match,
        rooms_within_20pct,
        reason: "geo_within_30m_postal_match_rooms_within_20pct",
        confidence: 1.0,
      });
      continue;
    }

    // Geo + postal · likely same building (rooms unknown or fluctuating)
    if (postal_match) {
      matches.push({
        neighbor_id: n.id,
        neighbor_name: n.canonical_name ?? "—",
        distance_m,
        postal_match: true,
        rooms_within_20pct: false,
        reason: "geo_within_30m_postal_match",
        confidence: 0.75,
      });
      continue;
    }

    // Geo alone within 30m · suggestive but not conclusive (could be
    // two hotels in the same building / adjacent buildings on the same
    // street). Operator review required.
    matches.push({
      neighbor_id: n.id,
      neighbor_name: n.canonical_name ?? "—",
      distance_m,
      postal_match: false,
      rooms_within_20pct,
      reason: "geo_within_30m",
      confidence: 0.5,
    });
  }

  return matches.sort((a, b) => b.confidence - a.confidence);
}

/**
 * Convenience: classify a candidate's outcome based on detector output.
 *
 *   no_match            no rebrand signal · safe to INSERT new canonical row
 *   rebrand_candidate   one match · operator decides INSERT or ALIAS
 *   ambiguous           multiple matches · operator must triage
 */
export type CandidateOutcome = "no_match" | "rebrand_candidate" | "ambiguous";

export function classifyCandidate(matches: readonly SameBuildingMatch[]): CandidateOutcome {
  if (matches.length === 0) return "no_match";
  if (matches.length === 1 || matches[0].confidence > matches[1].confidence + 0.2)
    return "rebrand_candidate";
  return "ambiguous";
}
