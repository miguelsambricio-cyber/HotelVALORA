import type { EngineModule } from "./_types";
import type { DynamicCapRateResult, UnderwritingComputed, UnderwritingInputs } from "../types";

/**
 * Module · cap_rate (entry + exit).
 *
 * BLOCK 6 wires the CORE IP · MarketEvidence · AdjustmentLogic ·
 * ConfidenceEngine · OverrideLayer. Until then this module emits a
 * deterministic narrative-shaped placeholder so the Section 6
 * "investment memorandum" view already renders a complete cap-rate
 * rationale stack (base market yield → adjustments → recommended).
 */

function buildPlaceholder(
  asset: UnderwritingInputs["asset"],
  scenario_id: string,
  finalPct: number,
  side: "entry" | "exit",
): DynamicCapRateResult {
  // Reverse-engineer the adjustment stack so the sum lands on finalPct.
  // Base yield is a stylised "Madrid Centro / market" figure; deltas
  // mirror the institutional rationale shown in the operator memo.
  const baseMarketYield = 5.85;
  const categoryDelta = asset.category === "5star" ? -0.15 : asset.category === "4star" ? 0 : 0.20;
  const sizeDelta = asset.rooms >= 200 ? 0.10 : asset.rooms >= 100 ? 0 : 0.15;
  const stateDelta = asset.state === "renovated" ? 0 : asset.state === "needs_work" ? 0.30 : -0.10;
  const scenarioDelta = scenario_id === "downside" ? 0.25 : scenario_id === "upside" ? -0.20 : 0.30;
  // Force closure so the recommendation ties to the operator override.
  const sumAdjustments = categoryDelta + sizeDelta + stateDelta + scenarioDelta;
  const residual = round2(finalPct - baseMarketYield - sumAdjustments);

  return {
    recommended_pct: finalPct,
    band: { low_pct: round2(finalPct - 0.20), high_pct: round2(finalPct + 0.20) },
    base_pct: baseMarketYield,
    evidence: {
      comp_count: 0,
      median_pct: baseMarketYield,
      p25_pct: round2(baseMarketYield - 0.30),
      p75_pct: round2(baseMarketYield + 0.30),
      stddev_pct: 0.45,
      most_recent_date: null,
    },
    adjustments: [
      { label: `Base Market Yield · ${asset.submarket || asset.market}`, delta_pct: baseMarketYield, rationale: "Median observed yield in scope · pre-asset adjustments" },
      { label: `Category · ${asset.category.replace("star", "*")} ${asset.category === "5star" ? "Luxury" : asset.category === "4star" ? "Upscale" : "Midscale"}`, delta_pct: categoryDelta, rationale: "Brand positioning premium / discount vs base" },
      { label: `Size · ${asset.rooms} keys`, delta_pct: sizeDelta, rationale: asset.rooms >= 200 ? "Institutional scale · large-deal liquidity premium" : "Smaller asset · narrower buyer pool" },
      { label: `Renovation state · ${asset.state === "renovated" ? "Renovated · Non-CAPEX" : asset.state === "needs_work" ? "Reposition · CAPEX-heavy" : "Newly built"}`, delta_pct: stateDelta, rationale: "Capex execution risk priced into yield" },
      { label: `Scenario · ${scenario_id === "downside" ? "Conservative" : scenario_id === "upside" ? "Optimistic" : "Base"}`, delta_pct: scenarioDelta, rationale: side === "exit" ? "Terminal-yield stress for exit hedging" : "Underwriting conservatism" },
      ...(Math.abs(residual) > 0.005 ? [{ label: "Closure to operator override", delta_pct: residual, rationale: "Residual reconciling adjustments to operator-locked rate" }] : []),
    ],
    confidence: {
      level: "low",
      reasons: ["Block 6 not yet implemented · adjustments shown as narrative placeholders · MarketEvidence + ConfidenceEngine pending"],
    },
  };
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

export const capRateModule: EngineModule<"cap_rate"> = {
  key: "cap_rate",
  dependsOn: [],
  compute({ inputs }): UnderwritingComputed["cap_rate"] {
    const entryOverride = inputs.acquisition.cap_rate.manual_override_pct ?? 6.25;
    const exitOverride = inputs.exit.cap_rate.manual_override_pct ?? 6.25;
    return {
      entry: {
        dynamic: buildPlaceholder(inputs.asset, inputs.scenario_id, entryOverride, "entry"),
        used_pct: entryOverride,
        source: inputs.acquisition.cap_rate.use_dynamic ? "dynamic" : "override",
      },
      exit: {
        dynamic: buildPlaceholder(inputs.asset, inputs.scenario_id, exitOverride, "exit"),
        used_pct: exitOverride,
        source: inputs.exit.cap_rate.use_dynamic ? "dynamic" : "override",
      },
    };
  },
};
