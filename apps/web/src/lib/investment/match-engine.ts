// Match engine — scores a hotel against the user's investment criteria.
//
// v1 (today)
// ──────────
// Stub. Returns a hardcoded "strong" match so downstream UI can render
// the indicator pattern (🟢/🟡/🔴 + per-category breakdown) without
// blocking on the real scoring rules.
//
// v2 (when wired)
// ───────────────
// Each category gets a real scoring function:
//
//   location   → distance proximity to target submarket + centroHistorico
//                + locationScore floor
//   size       → rooms within [minRooms, maxRooms] hard band
//   facilities → intersection ratio of MyProperty required ∩ hotel.facilities
//   financials → IRR target met + EBITDA margin floor + per-key bracket
//   capex      → CAPEX total vs criteria.capex bracket (tolerance band)
//   strategy   → renovation match + asset class match
//
// Each category produces score ∈ [0..1]; weighted average → overall tier:
//   ≥ 0.75 strong    🟢
//   ≥ 0.50 partial   🟡
//   <  0.50 weak      🔴

import type {
  CategoryMatch,
  InvestmentCriteria,
  MatchCategory,
  MatchResult,
  MatchTier,
} from "./types";

/** Placeholder hotel shape — replace with the real domain type when wired */
export interface HotelMatchInput {
  id: string;
  name: string;
}

export function evaluateHotel(
  _hotel: HotelMatchInput,
  _criteria: InvestmentCriteria,
): MatchResult {
  // v1 stub — returns a deterministic mocked breakdown so UI primitives
  // can render. Replace with the real per-category scoring functions in v2.
  const byCategory: CategoryMatch[] = [
    { category: "location", score: 0.92, tier: "strong" },
    { category: "size", score: 0.85, tier: "strong" },
    { category: "facilities", score: 0.7, tier: "partial", reason: "5 of 7 required" },
    { category: "financials", score: 0.88, tier: "strong" },
    { category: "capex", score: 0.6, tier: "partial", reason: "Above per-key bracket" },
    { category: "strategy", score: 0.9, tier: "strong" },
  ];
  const overallScore = byCategory.reduce((s, c) => s + c.score, 0) / byCategory.length;
  return {
    overall: tierFromScore(overallScore),
    overallScore,
    byCategory,
  };
}

export function tierFromScore(score: number): MatchTier {
  if (score >= 0.75) return "strong";
  if (score >= 0.5) return "partial";
  return "weak";
}

export const MATCH_TIER_LABELS: Record<MatchTier, string> = {
  strong: "Strong Match",
  partial: "Partial Match",
  weak: "Weak Match",
};

export const MATCH_CATEGORY_LABELS: Record<MatchCategory, string> = {
  location: "Location",
  size: "Size",
  facilities: "Facilities",
  financials: "Financials",
  capex: "CAPEX",
  strategy: "Strategy Fit",
};
