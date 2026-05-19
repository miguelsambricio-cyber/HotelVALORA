/**
 * Dedup engine (v1).
 *
 * Top-level entry point for candidate-against-canonical comparison.
 * Inputs: a freshly-fetched candidate row + the list of existing
 * canonical rows that share its block_key.
 * Output: a tier classification with full component breakdown and a
 * decision recommendation.
 *
 * Honours architecture invariants:
 *   - Tier thresholds 0.92 / 0.80 / 0.65 (arch doc §4.2)
 *   - Apartment-block flooding override: `auto_merge` is downgraded to
 *     `needs_review` whenever either candidate has accommodation_type
 *     ∈ {apartment, aparthotel} (sidecar §7.2 mitigation #1)
 *   - Canonical pair order a_id < b_id (matches dedup_service.py)
 *
 * Does NOT persist anything. Persistence is the writer layer's
 * responsibility (Phase 3+). This engine returns the decision; the
 * caller acts on it.
 */

import {
  blockKey,
  compositeScore,
  type CompositeResult,
  type OperatorComparable,
} from "./scoring";

// ───────────────────────────────────────────────────────────────────────────
// Inputs / outputs
// ───────────────────────────────────────────────────────────────────────────

export interface DedupCandidate {
  /** Stable identifier — may be a draft id, a synthetic id, or a real UUID. */
  id: string;
  bookingHotelId?: string | null;
  name: string | null;
  cityNormalized: string | null;
  countryCode: string | null;
  lat: number | null;
  lng: number | null;
  totalRooms: number | null;
  operatorSlug?: string | null;
  brandFamilySlug?: string | null;
  accommodationType?: "hotel" | "apartment" | "aparthotel" | string | null;
}

export type DedupTier = "auto_merge" | "needs_review" | "likely_duplicate" | "no_match";

export interface DedupMatch {
  candidate: DedupCandidate;
  other: DedupCandidate;
  score: CompositeResult;
  tier: DedupTier;
  /**
   * Reason the tier was assigned (or downgraded). Visible in
   * `hotel_duplicate_candidate.components` JSONB for audit.
   */
  rationale: string;
  /** True if engine auto-downgraded auto_merge → needs_review per §7.2. */
  downgradedByApartmentRule: boolean;
}

export interface DedupEvaluation {
  candidate: DedupCandidate;
  blockKey: string;
  comparisons: DedupMatch[];
  bestMatch: DedupMatch | null;
  decision: DedupTier;
}

// ───────────────────────────────────────────────────────────────────────────
// Tier thresholds (institutional, from arch doc §4.2)
// ───────────────────────────────────────────────────────────────────────────

const TIER_THRESHOLDS = {
  auto_merge: 0.92,
  needs_review: 0.8,
  likely_duplicate: 0.65,
} as const;

function scoreToTier(score: number): DedupTier {
  if (score >= TIER_THRESHOLDS.auto_merge) return "auto_merge";
  if (score >= TIER_THRESHOLDS.needs_review) return "needs_review";
  if (score >= TIER_THRESHOLDS.likely_duplicate) return "likely_duplicate";
  return "no_match";
}

function isApartmentLike(t: string | null | undefined): boolean {
  if (!t) return false;
  return t === "apartment" || t === "aparthotel";
}

// ───────────────────────────────────────────────────────────────────────────
// Single-pair evaluation
// ───────────────────────────────────────────────────────────────────────────

function evaluatePair(candidate: DedupCandidate, other: DedupCandidate): DedupMatch {
  const score = compositeScore({
    nameA: candidate.name,
    nameB: other.name,
    geoA: candidate.lat != null && candidate.lng != null ? { lat: candidate.lat, lng: candidate.lng } : null,
    geoB: other.lat != null && other.lng != null ? { lat: other.lat, lng: other.lng } : null,
    operatorA: { operatorSlug: candidate.operatorSlug, brandFamilySlug: candidate.brandFamilySlug } as OperatorComparable,
    operatorB: { operatorSlug: other.operatorSlug, brandFamilySlug: other.brandFamilySlug } as OperatorComparable,
    roomsA: candidate.totalRooms,
    roomsB: other.totalRooms,
  });

  let tier: DedupTier = scoreToTier(score.composite);
  let rationale = `composite ${score.composite.toFixed(3)} → ${tier}`;
  let downgradedByApartmentRule = false;

  // Override: apartment-block flooding — never auto-merge these
  if (
    tier === "auto_merge" &&
    (isApartmentLike(candidate.accommodationType) || isApartmentLike(other.accommodationType))
  ) {
    tier = "needs_review";
    downgradedByApartmentRule = true;
    rationale += " · DOWNGRADED to needs_review (apartment-block flooding rule, sidecar §7.2)";
  }

  // Override: identical booking_hotel_id → always auto_merge (same record on the source side)
  if (
    candidate.bookingHotelId &&
    other.bookingHotelId &&
    candidate.bookingHotelId === other.bookingHotelId
  ) {
    tier = "auto_merge";
    rationale = `same booking_hotel_id=${candidate.bookingHotelId} · identity match · auto_merge`;
    downgradedByApartmentRule = false;
  }

  return { candidate, other, score, tier, rationale, downgradedByApartmentRule };
}

// ───────────────────────────────────────────────────────────────────────────
// Public entry point
// ───────────────────────────────────────────────────────────────────────────

/**
 * Evaluate a candidate against a known list of canonical rows.
 *
 * Pre-filter: only `others` sharing the candidate's `blockKey` are
 * compared, matching the institutional two-layer approach (arch doc
 * §4.1). The caller is responsible for fetching those candidates from
 * the DB; this engine receives them as inputs.
 */
export function evaluateCandidate(
  candidate: DedupCandidate,
  knownRows: readonly DedupCandidate[],
): DedupEvaluation {
  const candKey = blockKey({
    name: candidate.name,
    cityNormalized: candidate.cityNormalized,
    countryCode: candidate.countryCode,
  });

  const comparisons: DedupMatch[] = [];
  for (const other of knownRows) {
    if (other.id === candidate.id) continue;
    const otherKey = blockKey({
      name: other.name,
      cityNormalized: other.cityNormalized,
      countryCode: other.countryCode,
    });
    if (otherKey !== candKey) continue;
    comparisons.push(evaluatePair(candidate, other));
  }

  comparisons.sort((a, b) => b.score.composite - a.score.composite);
  const bestMatch = comparisons[0] ?? null;
  const decision: DedupTier = bestMatch ? bestMatch.tier : "no_match";

  return { candidate, blockKey: candKey, comparisons, bestMatch, decision };
}
