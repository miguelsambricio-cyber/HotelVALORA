import type {
  CapRateAdjustment,
  ConfidenceScore,
  MarketEvidence,
  RationaleTrace,
} from "../types";

/**
 * Explainability Layer.
 *
 * Structures the evidence + adjustments + confidence into a
 * RationaleTrace that the UI renders as the institutional defence of
 * the recommended cap rate. Operator can drop this into an investment
 * memorandum verbatim.
 */
export function buildRationale(
  evidence: MarketEvidence,
  adjustments: CapRateAdjustment[],
  confidence: ConfidenceScore,
): RationaleTrace {
  const baseAdjustment = adjustments.find((a) => a.id === "base");
  const baseYield = baseAdjustment?.delta_pct ?? evidence.median_cap_pct;

  // Sum of non-base adjustments.
  const deltaSum = adjustments
    .filter((a) => a.id !== "base")
    .reduce((acc, a) => acc + a.delta_pct, 0);

  const recommended = baseYield + deltaSum;
  // Band widens when confidence is low.
  const confidenceFactor = 1 - confidence.score_0_100 / 100;
  const bandHalfWidth = Math.max(0.20, 0.20 + confidenceFactor * 0.50);

  const submarketMatch = evidence.comparables_in_scope.filter(
    (c) => c.submarket.trim().toLowerCase() === evidence.context.submarket.trim().toLowerCase(),
  ).length;
  const categoryMatch = evidence.comparables_in_scope.filter((c) => c.category === evidence.context.category).length;

  const excludedReasonsSet = new Set<string>();
  for (const ex of evidence.comparables_excluded) {
    // Group reasons by their first phrase before "·".
    const tag = ex.reason.split("·")[0].trim();
    excludedReasonsSet.add(tag);
  }

  return {
    base_market_yield_pct: round2(baseYield),
    base_market_yield_source: `Median of ${evidence.comp_count} comparable transaction${evidence.comp_count === 1 ? "" : "s"} in ${evidence.context.submarket}, ${evidence.context.category.replace("star", "*")}`,

    adjustments_applied: adjustments,
    adjustments_total_delta_pct: round2(deltaSum),

    recommended_pct: round2(recommended),
    recommended_band: {
      low_pct: round2(recommended - bandHalfWidth),
      high_pct: round2(recommended + bandHalfWidth),
    },

    evidence_used: {
      comp_count: evidence.comp_count,
      date_range: { from: evidence.oldest_in_scope_date, to: evidence.most_recent_date },
      submarket_match_count: submarketMatch,
      category_match_count: categoryMatch,
    },
    evidence_excluded: {
      count: evidence.comparables_excluded.length,
      reasons: Array.from(excludedReasonsSet),
    },

    confidence,
    narrative: buildNarrative(evidence, adjustments, confidence, recommended),
  };
}

function buildNarrative(
  evidence: MarketEvidence,
  adjustments: CapRateAdjustment[],
  confidence: ConfidenceScore,
  recommended: number,
): string {
  const scopePhrase = evidence.comp_count > 0
    ? `${evidence.comp_count} comparable transaction${evidence.comp_count === 1 ? "" : "s"} in ${evidence.context.submarket} (${evidence.context.category.replace("star", "*")}) cluster around ${evidence.median_cap_pct.toFixed(2)}% (IQR ${evidence.p25_cap_pct.toFixed(2)}% — ${evidence.p75_cap_pct.toFixed(2)}%)`
    : `no in-scope comparables available · operator should source manually`;

  const directionalAdj = adjustments
    .filter((a) => a.id !== "base" && Math.abs(a.delta_pct) >= 0.05)
    .sort((a, b) => Math.abs(b.delta_pct) - Math.abs(a.delta_pct))
    .slice(0, 3);
  const adjPhrase = directionalAdj.length > 0
    ? directionalAdj.map((a) => `${a.label} (${a.delta_pct >= 0 ? "+" : ""}${a.delta_pct.toFixed(2)}pp)`).join(" · ")
    : "no material adjustments";

  return `${scopePhrase}. After applying ${adjPhrase}, the engine recommends ${recommended.toFixed(2)}% with ${confidence.band.replace("_", " ")} confidence (score ${confidence.score_0_100.toFixed(0)}/100).`;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
