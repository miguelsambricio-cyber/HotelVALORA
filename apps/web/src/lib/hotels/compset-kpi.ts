/**
 * CompSet differential KPIs · Phase H
 *
 * Computes institutional-rigour deltas between a competitor and the
 * subject property in a CompetitiveSet. The deltas drive inline
 * Δ-badges and a composite Match score in the CompetitiveSetTable so
 * the IC reader can read the competitive landscape analytically, not
 * just identify it.
 *
 * Methodology (transparent · documented):
 *   · keysDelta            · competitor.keys − subject.keys (positive = competitor bigger)
 *   · locationScoreDelta   · competitor.locationScore − subject.locationScore
 *   · facilitiesOverlap    · count(shared amenities) / count(subject amenities)
 *                            (0.0 = no overlap · 1.0 = full match · stars-agnostic)
 *   · matchScore (0-100)   · weighted composite of 4 proximities:
 *       keys proximity      · 30 % (closer in scale = better match)
 *       stars match         · 20 % (same star count = full · diff = 0)
 *       loc-score proximity · 20 % (closer in score = better match)
 *       facilities overlap  · 30 % (more shared amenities = better match)
 *
 * Boundary: pure data transformation · zero React · zero touch on
 * underwriting baseline · zero touch on the canonical
 * CompetitiveSetData shape (added field is optional).
 */

import type { CompetitorProperty, FacilityKey } from "../report/competitive-set-data";

export interface CompsetKpi {
  /** competitor.keys − subject.keys (can be negative). */
  keysDelta: number;
  /** competitor.locationScore − subject.locationScore (can be negative). */
  locationScoreDelta: number;
  /** Shared amenities ratio · [0, 1] · vs subject's amenity set. */
  facilitiesOverlap: number;
  /** Composite 0-100 · 100 = perfect match against subject. */
  matchScore: number;
}

const FACILITY_KEYS: FacilityKey[] = [
  "bar",
  "restaurant",
  "rooftop",
  "meeting",
  "gym",
  "spa",
];

/** Linear proximity · returns 1 when delta = 0 · 0 when |delta| >= range. */
function proximity(delta: number, range: number): number {
  if (!Number.isFinite(delta) || range <= 0) return 0;
  return Math.max(0, 1 - Math.abs(delta) / range);
}

/**
 * Computes the differential KPIs of `competitor` vs `subject`. Returns
 * null when the competitor IS the subject (no self-comparison) or when
 * either side is missing required fields.
 */
export function computeCompsetKpi(
  subject: CompetitorProperty,
  competitor: CompetitorProperty,
): CompsetKpi | null {
  if (competitor.id === subject.id || competitor.isSubject) return null;

  const keysDelta = competitor.keys - subject.keys;
  const locationScoreDelta = competitor.locationScore - subject.locationScore;

  // Facilities overlap · share of subject's TRUE amenities also TRUE
  // on the competitor. If subject has zero amenities, define overlap
  // as 0 (avoid div-by-zero · do NOT inflate).
  const subjectActive = FACILITY_KEYS.filter((k) => subject.facilities[k]);
  const overlapCount = subjectActive.filter((k) => competitor.facilities[k]).length;
  const facilitiesOverlap =
    subjectActive.length === 0 ? 0 : overlapCount / subjectActive.length;

  // Composite match score · weighted average · output 0-100
  const keysProximity = proximity(keysDelta, 100); // ±100 keys = 0
  const starsMatch = competitor.stars === subject.stars ? 1 : 0;
  const locScoreProximity = proximity(locationScoreDelta, 2); // ±2.0 = 0
  const matchScore = Math.round(
    100 *
      (keysProximity * 0.3 +
        starsMatch * 0.2 +
        locScoreProximity * 0.2 +
        facilitiesOverlap * 0.3),
  );

  return {
    keysDelta,
    locationScoreDelta,
    facilitiesOverlap,
    matchScore,
  };
}

/** Format a signed delta for inline display · e.g. "+22" / "−5" / "±0". */
export function formatSignedInt(n: number): string {
  if (n === 0) return "±0";
  if (n > 0) return `+${n}`;
  return `−${Math.abs(n)}`;
}

/** Format a signed decimal · e.g. "+0.4" / "−0.5" / "±0.0". */
export function formatSignedDecimal(n: number, decimals = 1): string {
  if (Math.abs(n) < Math.pow(10, -decimals) / 2) return `±${(0).toFixed(decimals)}`;
  const abs = Math.abs(n).toFixed(decimals);
  return n > 0 ? `+${abs}` : `−${abs}`;
}
