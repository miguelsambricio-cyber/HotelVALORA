/**
 * Dynamic Cap Rate Engine · CORE IP.
 *
 * 5-layer architecture · pure function · deterministic.
 *
 *   1. Market Evidence    · evidence/index.ts → buildMarketEvidence
 *   2. Adjustment Policy  · adjustments/index.ts → buildAdjustments
 *   3. Confidence         · confidence/index.ts → buildConfidence
 *   4. Rationale          · rationale/index.ts → buildRationale
 *   5. Override           · overrides/index.ts → buildOverride
 *
 * The engine entry point orchestrates these in order · NO layer reaches
 * into another. Each consumes the prior layer's typed output.
 *
 * Output is a single DynamicCapRateResult that:
 *   · the Underwriting engine `cap_rate` module returns to downstream
 *     modules (Investment · Exit · BS)
 *   · the Section 6 Investment Memorandum view renders as the Cap Rate
 *     Card (Block 6 visual deliverable)
 *
 * Block 7+ will:
 *   · swap SEEDED_HOTEL_COMPS for a live Supabase query against the
 *     Intelligence Layer's `hotel_transactions` table
 *   · expose adjustment-policy weights via a Cap Rate Policy Editor
 *     surface (admin)
 *   · add sensitivity matrix (recommended vs comps subset · scenario)
 */

import { buildMarketEvidence } from "./evidence";
import { SEEDED_HOTEL_COMPS } from "./evidence/seeded-comps";
import { buildAdjustments } from "./adjustments";
import { buildConfidence } from "./confidence";
import { buildRationale } from "./rationale";
import { buildOverride } from "./overrides";
import type { CapRateEngineContext, DynamicCapRateResult, RatesRegime } from "./types";

export { SEEDED_HOTEL_COMPS } from "./evidence/seeded-comps";
export type * from "./types";

export const DEFAULT_RATES_REGIME: RatesRegime = {
  euribor_12m_pct: 2.75,
  bond_10y_pct: 3.10,
  euribor_12m_pct_long_term_mean: 1.50,
  date_of_record: "2026-05-01",
};

export function runDynamicCapRate(ctx: CapRateEngineContext): DynamicCapRateResult {
  const asOfDate = ctx.as_of_date ?? new Date().toISOString().slice(0, 10);

  // Layer 1 · Evidence
  const evidence = buildMarketEvidence(ctx.asset, ctx.comparables, ctx.rates_regime, asOfDate);

  // Layer 2 · Adjustments
  const adjustments = buildAdjustments(ctx.asset, evidence, ctx.scenario_id, ctx.side, ctx.policy, ctx.score_context);

  // Layer 3 · Confidence
  const confidence = buildConfidence(evidence, ctx.asset, adjustments);

  // Layer 4 · Rationale
  const rationale = buildRationale(evidence, adjustments, confidence);

  // Layer 5 · Override
  const override = buildOverride(ctx.override, rationale.recommended_pct);

  const recommendedPct = rationale.recommended_pct;
  const usedPct = override.enabled && override.manual_value_pct !== undefined
    ? override.manual_value_pct
    : recommendedPct;
  const source: "dynamic" | "override" = override.enabled ? "override" : "dynamic";

  return {
    recommended_pct: recommendedPct,
    used_pct: usedPct,
    source,
    band: rationale.recommended_band,
    evidence,
    adjustments,
    confidence,
    rationale,
    override,
    base_pct: rationale.base_market_yield_pct,
  };
}
