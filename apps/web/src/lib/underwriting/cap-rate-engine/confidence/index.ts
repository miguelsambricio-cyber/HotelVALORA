import type { CapRateAdjustment, ConfidenceBand, ConfidenceScore, MarketEvidence } from "../types";
import type { AssetBasics } from "../../types";

/**
 * Confidence Engine.
 *
 * Composite 0-100 score · weighted blend of 4 sub-scores:
 *
 *   sufficiency (30%) · how many comps survived filtering?
 *   volatility  (25%) · how tight is the comp band (p75 − p25)?
 *   staleness   (20%) · how recent is the most recent comp?
 *   coverage    (25%) · how well does the scope match the asset?
 *
 * Each sub-score returns 0-100 + a one-line explanation. Composite
 * weights are intentionally NOT operator-tunable in MVP · they encode
 * the proprietary trust model. Block 7 may expose a Policy Editor.
 *
 * Qualitative band:
 *   0-30  · very_low
 *   30-50 · low
 *   50-70 · medium
 *   70-85 · high
 *   85+   · very_high
 *
 * Volatility-aware: a tight comp band with few comps yields LOWER
 * confidence than a tight band with many comps (sufficiency dominates).
 * A wide comp band with many comps yields MEDIUM confidence (volatility
 * penalty) — operator should investigate why.
 */
export function buildConfidence(
  evidence: MarketEvidence,
  asset: AssetBasics,
  adjustments: CapRateAdjustment[],
): ConfidenceScore {
  const sufficiency = scoreSufficiency(evidence);
  const volatility = scoreVolatility(evidence);
  const staleness = scoreStaleness(evidence);
  const coverage = scoreCoverage(evidence, asset);

  const composite =
    sufficiency.score * 0.30 +
    volatility.score * 0.25 +
    staleness.score * 0.20 +
    coverage.score * 0.25;
  const band = bandFor(composite);

  const reasons = pickTopReasons({ sufficiency, volatility, staleness, coverage });

  // Suppress unused param warning · adjustments inform Block 7 audit only.
  void adjustments;

  return {
    score_0_100: Math.round(composite * 10) / 10,
    band,
    components: { sufficiency, volatility, staleness, coverage },
    reasons,
  };
}

// ─── Sub-scores ───────────────────────────────────────────────────────

function scoreSufficiency(evidence: MarketEvidence) {
  const n = evidence.comp_count;
  let score = 0;
  if (n >= 20) score = 95;
  else if (n >= 11) score = 85;
  else if (n >= 6) score = 70;
  else if (n >= 3) score = 50;
  else if (n >= 1) score = 25;
  else score = 0;
  return {
    score,
    explanation: n === 0
      ? "No comparables in scope · score 0"
      : `${n} comparable transaction${n === 1 ? "" : "s"} in scope`,
  };
}

function scoreVolatility(evidence: MarketEvidence) {
  if (evidence.comp_count === 0 || evidence.median_cap_pct === 0) {
    return { score: 0, explanation: "No comparables · volatility undefined" };
  }
  const relativeSpread = evidence.spread_p75_p25_pct / evidence.median_cap_pct;
  let score = 0;
  if (relativeSpread < 0.05) score = 95;
  else if (relativeSpread < 0.10) score = 80;
  else if (relativeSpread < 0.15) score = 65;
  else if (relativeSpread < 0.25) score = 45;
  else score = 25;
  return {
    score,
    explanation: `IQR spread ${evidence.spread_p75_p25_pct.toFixed(2)}pp (${(relativeSpread * 100).toFixed(1)}% of median)`,
  };
}

function scoreStaleness(evidence: MarketEvidence) {
  if (!evidence.most_recent_date) {
    return { score: 0, explanation: "No comparables · staleness undefined" };
  }
  const asOf = new Date(evidence.context.as_of_date);
  const ageMs = asOf.getTime() - new Date(evidence.most_recent_date).getTime();
  const ageMonths = Math.floor(ageMs / (30 * 24 * 60 * 60 * 1000));
  let score = 0;
  if (ageMonths < 6) score = 95;
  else if (ageMonths < 12) score = 80;
  else if (ageMonths < 24) score = 60;
  else if (ageMonths < 36) score = 40;
  else score = 20;
  return {
    score,
    explanation: `Most recent comparable · ${ageMonths === 0 ? "<1 month" : `${ageMonths} month${ageMonths === 1 ? "" : "s"}`} ago`,
  };
}

function scoreCoverage(evidence: MarketEvidence, asset: AssetBasics) {
  // Submarket + category direct matches
  const submarketHits = evidence.comparables_in_scope.filter(
    (c) => c.submarket.trim().toLowerCase() === asset.submarket.trim().toLowerCase(),
  ).length;
  const categoryHits = evidence.comparables_in_scope.filter((c) => c.category === asset.category).length;
  const total = evidence.comp_count;

  if (total === 0) return { score: 0, explanation: "No comparables · coverage undefined" };

  const submarketShare = submarketHits / total;
  const categoryShare = categoryHits / total;
  const combined = (submarketShare + categoryShare) / 2;

  let score = 0;
  if (combined >= 0.80) score = 90;
  else if (combined >= 0.60) score = 75;
  else if (combined >= 0.40) score = 60;
  else if (combined >= 0.20) score = 40;
  else score = 25;

  return {
    score,
    explanation: `${submarketHits}/${total} submarket match · ${categoryHits}/${total} category match`,
  };
}

// ─── Band + reason picker ───────────────────────────────────────────

function bandFor(score: number): ConfidenceBand {
  if (score < 30) return "very_low";
  if (score < 50) return "low";
  if (score < 70) return "medium";
  if (score < 85) return "high";
  return "very_high";
}

function pickTopReasons(sub: ConfidenceScore["components"]): string[] {
  const ranked = [
    { name: "Sufficiency", ...sub.sufficiency },
    { name: "Volatility", ...sub.volatility },
    { name: "Staleness", ...sub.staleness },
    { name: "Coverage", ...sub.coverage },
  ].sort((a, b) => a.score - b.score); // weakest first
  return ranked.slice(0, 3).map((r) => `${r.name}: ${r.explanation}`);
}
