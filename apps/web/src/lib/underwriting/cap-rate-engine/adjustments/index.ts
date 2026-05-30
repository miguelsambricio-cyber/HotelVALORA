import type { CapRateAdjustment, MarketEvidence } from "../types";
import type { AssetBasics } from "../../types";
import {
  DYNAMIC_CAP_RATE_POLICY_DEFAULTS,
  type DynamicCapRatePolicy,
  type RenovationOptionId,
  type ScenarioOptionId,
  type SizeTierId,
} from "@/lib/admin/financials/dynamic-cap-rate-policy";
import { computeScoreCapAdjustment, type ScoreContext } from "@/lib/admin/financials/score-cap-adjustment";
import { resolveSegmentBase } from "@/lib/admin/financials/segment-base-priors";

/**
 * Adjustment Policy Layer.
 *
 * Pure functions · each takes the asset context, the market evidence, and
 * the operator-tunable POLICY (admin/financials · Dynamic Cap Rate card),
 * returns an Adjustment record. The deltas are NO LONGER hardcoded here —
 * they are READ from the policy so "what the admin panel shows = what the
 * engine uses" (X4b · TRAMO 3). The engine still owns the deterministic
 * APPLICATION (which band / state / scenario a given asset falls in).
 *
 * Sign convention: POSITIVE delta widens the cap rate (lowers price ·
 * adds conservatism). NEGATIVE delta tightens (raises price · premium).
 *
 * Band semantics (engine-owned · unchanged so production is intact):
 *   · Size:    ≥200 keys → "large" · 100-199 → "medium" · <100 → "small"
 *   · Liquidity: ≥6 deals/12m → deep · 3-5 → moderate · <3 → thin
 *   · State:   asset.state maps 1:1 to the policy renovation option
 *   · Scenario: scenario_id mapped to the policy scenario option
 *
 * Base Market Yield is COMPS-DRIVEN (evidence median · cascade
 * submarket→market→national); the policy's fixed base is the LABELED
 * FALLBACK applied only when no comparable transactions exist in scope.
 */

export function buildAdjustments(
  asset: AssetBasics,
  evidence: MarketEvidence,
  scenarioId: string,
  side: "entry" | "exit",
  policy: DynamicCapRatePolicy = DYNAMIC_CAP_RATE_POLICY_DEFAULTS,
  scoreContext?: ScoreContext,
): CapRateAdjustment[] {
  const adjustments: CapRateAdjustment[] = [];
  const sizeCol = sizeColumnFor(asset.rooms);

  // ── Base · SEGMENT PRIOR (TRAMO 3b · calibrated with real €/key) ──
  // The base is the institutional prior for the asset's segment (chain_scale),
  // NOT the median of comp cap rates (the real comps carry €/key, no cap rate).
  const segBase = resolveSegmentBase({
    segment: asset.segment,
    category: asset.category,
    priors: policy.segment_base_priors,
    fallbackPct: policy.base_market_yield_pct,
  });
  adjustments.push({
    id: "base",
    category: "base",
    label: `Base · ${segBase.segment}`,
    delta_pct: segBase.base_pct,
    rationale: segBase.prior ? segBase.prior.source : segBase.label,
    source: "policy",
  });

  // ── Category ── (policy · category-driven · read at the asset's size column)
  adjustments.push(categoryAdjustment(asset, policy, sizeCol));
  // ── Size ──
  adjustments.push(sizeAdjustment(asset, policy, sizeCol));
  // ── Renovation state ──
  adjustments.push(renovationAdjustment(asset, policy, sizeCol));
  // ── Operator ──
  adjustments.push(operatorAdjustment(policy));
  // ── Macro (Euribor regime) ──
  adjustments.push(macroAdjustment(evidence, policy));
  // ── Liquidity ──
  adjustments.push(liquidityAdjustment(evidence, policy));
  // ── HotelVALORA Score (compset-relative quality · ±max) ──
  adjustments.push(scoreAdjustment(scoreContext, policy));
  // ── Scenario ──
  adjustments.push(scenarioAdjustment(scenarioId, asset, policy, sizeCol));
  // ── Side ──
  // D4 (2026-05-30): the fixed +20 bps exit hedge is REMOVED. The
  // entry↔exit cap-rate difference is now driven by the asset's projected
  // STATE at exit (passed via `asset.state` by the runner's exit run),
  // not by a flat spread. `side` is retained for labeling/audit only.
  void side;

  return adjustments;
}

// ─── Band resolution (engine-owned · preserves production semantics) ──

function sizeColumnFor(rooms: number): SizeTierId {
  return rooms >= 200 ? "large" : rooms >= 100 ? "medium" : "small";
}

// ─── Individual adjustment functions ─────────────────────────────────

function categoryAdjustment(asset: AssetBasics, policy: DynamicCapRatePolicy, sizeCol: SizeTierId): CapRateAdjustment {
  const delta = policy.category_adjustment[asset.category][sizeCol];
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

function sizeAdjustment(asset: AssetBasics, policy: DynamicCapRatePolicy, sizeCol: SizeTierId): CapRateAdjustment {
  const delta = policy.size_adjustment[asset.category][sizeCol];
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

function renovationAdjustment(asset: AssetBasics, policy: DynamicCapRatePolicy, sizeCol: SizeTierId): CapRateAdjustment {
  const stateKey = asset.state as RenovationOptionId; // AssetState ≡ RenovationOptionId (new/renovated/needs_work)
  const delta = policy.renovation_adjustment[stateKey][asset.category][sizeCol];
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

function operatorAdjustment(policy: DynamicCapRatePolicy): CapRateAdjustment {
  // MVP · default to "branded chain" assumption (most institutional comps).
  // Block 7 will read inputs.operator.brand / inputs.operator.independent flag.
  return {
    id: "operator",
    category: "operator",
    label: "Operator · branded chain (assumed)",
    delta_pct: policy.operator_adjustment.branded_chain,
    rationale: "Branded global chain default · stable distribution · brand equity premium · revisit when operator inputs land",
    source: "policy",
  };
}

function macroAdjustment(evidence: MarketEvidence, policy: DynamicCapRatePolicy): CapRateAdjustment {
  const r = evidence.rates_regime;
  const ltMean = policy.macro_long_term_mean_pct;
  const delta = ((r.euribor_12m_pct - ltMean) / 100) * policy.macro_bps_per_100bps_euribor;
  const rounded = Math.round(delta * 100) / 100;
  return {
    id: "macro",
    category: "macro",
    label: `Macro · Euribor 12m at ${r.euribor_12m_pct.toFixed(2)}%`,
    delta_pct: rounded,
    rationale: rounded >= 0
      ? `Rates ${(r.euribor_12m_pct - ltMean).toFixed(2)}pp above long-term mean (${ltMean.toFixed(2)}%) · yields widen with risk-free rate`
      : `Rates ${(ltMean - r.euribor_12m_pct).toFixed(2)}pp below long-term mean · risk-on tightening`,
    source: "policy",
  };
}

function liquidityAdjustment(evidence: MarketEvidence, policy: DynamicCapRatePolicy): CapRateAdjustment {
  const t12 = evidence.liquidity_metrics.transactions_last_12m;
  const band = t12 >= 6 ? "deep_6plus" : t12 >= 3 ? "moderate_3_5" : "thin_below_3";
  const delta = policy.liquidity_adjustment[band];
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

function scenarioAdjustment(
  scenarioId: string,
  asset: AssetBasics,
  policy: DynamicCapRatePolicy,
  sizeCol: SizeTierId,
): CapRateAdjustment {
  const id = scenarioId.toLowerCase();
  let key: ScenarioOptionId = "base";
  let labelTag = "Base";
  if (id.includes("stress")) {
    key = "stress";
    labelTag = "Stress";
  } else if (id.includes("down") || id.includes("conservative")) {
    key = "conservative";
    labelTag = "Conservative";
  } else if (id.includes("up") || id.includes("aggressive")) {
    key = "aggressive";
    labelTag = "Aggressive";
  }
  const delta = policy.scenario_adjustment[key][asset.category][sizeCol];
  return {
    id: "scenario",
    category: "scenario",
    label: `Scenario · ${labelTag}`,
    delta_pct: delta,
    rationale: labelTag === "Stress"
      ? "Stress overlay · tail-risk pricing for IC defence"
      : labelTag === "Conservative"
        ? "Conservative overlay · underwriting prudence · cap widens"
        : labelTag === "Aggressive"
          ? "Aggressive overlay · tight pricing · acquisition narrative"
          : "Base case · no scenario overlay",
    source: "policy",
  };
}

function scoreAdjustment(scoreContext: ScoreContext | undefined, policy: DynamicCapRatePolicy): CapRateAdjustment {
  // No context → contribute 0 (never penalise for missing data · labelled).
  const ctx: ScoreContext = scoreContext ?? { hotel_quality: null, compset_qualities: [] };
  const r = computeScoreCapAdjustment(ctx, policy.score_adjustment);
  return {
    id: "score",
    category: "score",
    label: `HotelVALORA Score vs compset`,
    delta_pct: r.adjustment_pp,
    rationale: r.status === "applied"
      ? `${r.label} · pivote ${r.pivot?.toFixed(2)} · σ ${r.stddev?.toFixed(2)} · n=${r.n}`
      : r.label,
    source: "policy",
  };
}
