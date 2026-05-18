import type { CapRateAdjustment, MarketEvidence } from "../types";
import type { AssetBasics } from "../../types";

/**
 * Adjustment Policy Layer.
 *
 * Pure functions · each takes the asset context and the market
 * evidence, returns an Adjustment record. The policy is the proprietary
 * IP of HotelVALORA · operators can challenge / tune the deltas in
 * Block 7 (Cap Rate Policy Editor).
 *
 * Sign convention: POSITIVE delta widens the cap rate (lowers price ·
 * adds conservatism). NEGATIVE delta tightens (raises price · premium).
 *
 * Default base point references (calibrated to Madrid Centro 4* /
 * 200-key benchmark):
 *   · Category: 5* −25 bps · 4* 0 · 3* +25 bps
 *   · Size:    ≥200 keys −10 bps · 100-199 0 · <100 +20 bps
 *   · State:   new −10 bps · renovated 0 · needs_work +50 bps
 *   · Operator: branded chain −10 bps · independent +10 bps
 *   · Macro:   Euribor 100 bps above LT mean → +20 bps
 *   · Liquidity: ≥6 deals/12m −5 bps · 3-5 0 · <3 +20 bps
 *   · Scenario: downside +30 bps · base +0 · upside −20 bps · stress +60 bps
 *   · Side:    exit +20 bps (terminal hedge) · entry 0
 */

export function buildAdjustments(
  asset: AssetBasics,
  evidence: MarketEvidence,
  scenarioId: string,
  side: "entry" | "exit",
): CapRateAdjustment[] {
  const adjustments: CapRateAdjustment[] = [];

  // ── Base Market Yield (NOT an adjustment per se · documents the start point) ──
  adjustments.push({
    id: "base",
    category: "base",
    label: `Base Market Yield · ${scopeLabelFor(evidence)}`,
    delta_pct: evidence.median_cap_pct,
    rationale: `Median of ${evidence.comp_count} comparable transactions in scope · stddev ${evidence.stddev_cap_pct.toFixed(2)}%`,
    source: "evidence",
  });

  // ── Category ──
  adjustments.push(categoryAdjustment(asset));
  // ── Size ──
  adjustments.push(sizeAdjustment(asset));
  // ── Renovation state ──
  adjustments.push(renovationAdjustment(asset));
  // ── Operator ──
  adjustments.push(operatorAdjustment());
  // ── Macro (Euribor regime) ──
  adjustments.push(macroAdjustment(evidence));
  // ── Liquidity ──
  adjustments.push(liquidityAdjustment(evidence));
  // ── Scenario ──
  adjustments.push(scenarioAdjustment(scenarioId));
  // ── Side (exit terminal hedge) ──
  if (side === "exit") {
    adjustments.push(sideAdjustment(side));
  }

  return adjustments;
}

// ─── Individual adjustment functions ─────────────────────────────────

function categoryAdjustment(asset: AssetBasics): CapRateAdjustment {
  const delta =
    asset.category === "5star" ? -0.25
    : asset.category === "4star" ? 0
    : 0.25;
  const tier =
    asset.category === "5star" ? "Luxury"
    : asset.category === "4star" ? "Upscale"
    : "Midscale";
  return {
    id: "category",
    category: "category",
    label: `Category · ${asset.category.replace("star", "*")} ${tier}`,
    delta_pct: delta,
    rationale: tier === "Luxury"
      ? "Luxury positioning · premium pricing · scarcity bid"
      : tier === "Midscale"
        ? "Midscale positioning · wider yield expectation"
        : "Benchmark positioning · no premium / discount",
    source: "policy",
  };
}

function sizeAdjustment(asset: AssetBasics): CapRateAdjustment {
  const delta =
    asset.rooms >= 200 ? -0.10
    : asset.rooms >= 100 ? 0
    : 0.20;
  return {
    id: "size",
    category: "size",
    label: `Size · ${asset.rooms} keys`,
    delta_pct: delta,
    rationale: asset.rooms >= 200
      ? "Institutional scale · larger buyer pool · liquidity premium"
      : asset.rooms < 100
        ? "Sub-scale · narrower buyer pool · liquidity discount"
        : "Mid-tier scale · neutral",
    source: "policy",
  };
}

function renovationAdjustment(asset: AssetBasics): CapRateAdjustment {
  const delta =
    asset.state === "new" ? -0.10
    : asset.state === "renovated" ? 0
    : 0.50;
  const labelMap = {
    new: "Newly built · turnkey",
    renovated: "Renovated · non-CAPEX",
    needs_work: "Reposition · CAPEX-heavy",
  } as const;
  return {
    id: "renovation",
    category: "renovation",
    label: `Renovation state · ${labelMap[asset.state]}`,
    delta_pct: delta,
    rationale: asset.state === "needs_work"
      ? "CAPEX execution risk · timing risk · operator transition risk"
      : asset.state === "new"
        ? "No execution risk · ramp-up risk only"
        : "Recent capex absorbed · no near-term spend required",
    source: "policy",
  };
}

function operatorAdjustment(): CapRateAdjustment {
  // MVP · default to "branded chain" assumption (most institutional comps).
  // Block 7 will read inputs.operator.brand / inputs.operator.independent flag.
  return {
    id: "operator",
    category: "operator",
    label: "Operator · branded chain (assumed)",
    delta_pct: -0.10,
    rationale: "Branded global chain default · stable distribution · brand equity premium · revisit when operator inputs land",
    source: "policy",
  };
}

function macroAdjustment(evidence: MarketEvidence): CapRateAdjustment {
  const r = evidence.rates_regime;
  const delta = ((r.euribor_12m_pct - r.euribor_12m_pct_long_term_mean) / 100) * 20;
  // Each 100 bps above LT mean → +20 bps cap rate widening
  const rounded = Math.round(delta * 100) / 100;
  return {
    id: "macro",
    category: "macro",
    label: `Macro · Euribor 12m at ${r.euribor_12m_pct.toFixed(2)}%`,
    delta_pct: rounded,
    rationale: rounded >= 0
      ? `Rates ${(r.euribor_12m_pct - r.euribor_12m_pct_long_term_mean).toFixed(2)}pp above long-term mean (${r.euribor_12m_pct_long_term_mean.toFixed(2)}%) · yields widen with risk-free rate`
      : `Rates ${(r.euribor_12m_pct_long_term_mean - r.euribor_12m_pct).toFixed(2)}pp below long-term mean · risk-on tightening`,
    source: "policy",
  };
}

function liquidityAdjustment(evidence: MarketEvidence): CapRateAdjustment {
  const t12 = evidence.liquidity_metrics.transactions_last_12m;
  const delta = t12 >= 6 ? -0.05 : t12 >= 3 ? 0 : 0.20;
  return {
    id: "liquidity",
    category: "liquidity",
    label: `Liquidity · ${t12} deals last 12m`,
    delta_pct: delta,
    rationale: t12 >= 6
      ? "Deep transaction volume · easy exit"
      : t12 < 3
        ? "Thin transaction volume · exit risk · discount"
        : "Moderate liquidity · neutral",
    source: "policy",
  };
}

function scenarioAdjustment(scenarioId: string): CapRateAdjustment {
  const id = scenarioId.toLowerCase();
  let delta = 0;
  let labelTag = "Base";
  if (id.includes("down") || id.includes("conservative") || id.includes("stress")) {
    delta = id.includes("stress") ? 0.60 : 0.30;
    labelTag = id.includes("stress") ? "Stress" : "Conservative";
  } else if (id.includes("up") || id.includes("aggressive")) {
    delta = -0.20;
    labelTag = "Aggressive";
  }
  return {
    id: "scenario",
    category: "scenario",
    label: `Scenario · ${labelTag}`,
    delta_pct: delta,
    rationale: labelTag === "Stress"
      ? "Stress overlay · tail-risk pricing for IC defence"
      : labelTag === "Conservative"
        ? "Conservative overlay · underwriting prudence"
        : labelTag === "Aggressive"
          ? "Aggressive overlay · tight pricing · acquisition narrative"
          : "Base case · no scenario overlay",
    source: "policy",
  };
}

function sideAdjustment(side: "entry" | "exit"): CapRateAdjustment {
  return {
    id: "side",
    category: "side",
    label: "Side · exit terminal hedge",
    delta_pct: 0.20,
    rationale: "Exit yield trades wider than entry to hedge terminal market regime risk",
    source: "policy",
  };
}

function scopeLabelFor(evidence: MarketEvidence): string {
  return `${evidence.context.submarket} · ${evidence.context.category.replace("star", "*")}`;
}
