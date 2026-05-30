/**
 * Dynamic Cap Rate Policy · admin-editable defaults.
 *
 * This file holds the operator-tunable WEIGHTS that the runtime
 * cap-rate-engine consumes via `lib/underwriting/cap-rate-engine/`.
 * The admin page reads + writes these via `useDraftedOverrides` ·
 * persistence is localStorage today · Block 7 ships Supabase persistence.
 *
 * Critical: this file describes the POLICY (values · structure) only.
 * NO financial logic here. The engine in
 * `lib/underwriting/cap-rate-engine/adjustments/index.ts` applies the
 * policy deterministically and remains the single source of truth for
 * formula application.
 *
 * Matrix dimensions (operator-grade reference):
 *   · 3 star categories · 3* (Midscale) / 4* (Upscale) / 5* (Luxury)
 *   · 3 size tiers      · <75 keys / 75-200 / +200
 *   · ⇒ 9 cells per adjustment line
 *
 * Future-proofing: market_overrides, submarket_overrides, operator
 * premiums, AI-assisted recommendations, confidence weight tuning all
 * land later via additive fields on this same shape.
 */

import type { StarCategoryId } from "./defaults";
import type { ScoreAdjustmentPolicy } from "./score-cap-adjustment";
import { SEGMENT_BASE_PRIORS_ES, type SegmentBasePriors } from "./segment-base-priors";

// ─── Matrix axes (single source) ──────────────────────────────────────

export const SIZE_TIERS = [
  { id: "small", label: "-75", range: [0, 75] as const },
  { id: "medium", label: "75–200", range: [75, 200] as const },
  { id: "large", label: "+200", range: [200, Infinity] as const },
] as const;

export type SizeTierId = (typeof SIZE_TIERS)[number]["id"];

/** Pre-computed 9-cell axis for grid rendering. */
export const POLICY_GRID_CELLS: Array<{ category: StarCategoryId; size: SizeTierId; label: string }> = [
  ...(["3star", "4star", "5star"] as const).flatMap((cat) =>
    SIZE_TIERS.map((s) => ({ category: cat, size: s.id, label: `${cat.replace("star", "*")} ${s.label}` })),
  ),
];

// ─── Renovation state options ────────────────────────────────────────
//
// Mirrors the engine's `AssetState` exactly (new · renovated · needs_work)
// so the engine reads `policy.renovation_adjustment[asset.state]` with NO
// translation. The prior 2-option capex/non-capex model could not represent
// the engine's three distinct state deltas — reconciled in X4b · TRAMO 3.

export const RENOVATION_OPTIONS = [
  { id: "new", label: "Nuevo · turnkey" },
  { id: "renovated", label: "Renovado · sin CAPEX" },
  { id: "needs_work", label: "Reposición · CAPEX" },
] as const;

export type RenovationOptionId = (typeof RENOVATION_OPTIONS)[number]["id"];

// ─── Scenario options ────────────────────────────────────────────────
//
// Sign convention (corrected in X4b · TRAMO 3): a CONSERVATIVE overlay
// WIDENS the cap (higher cap → lower valuation → prudence). The prior
// defaults had this inverted (conservative tightened = inflated value).

export const SCENARIO_OPTIONS = [
  { id: "conservative", label: "Conservador" },
  { id: "base", label: "Mercado" },
  { id: "aggressive", label: "Optimista" },
  { id: "stress", label: "Estrés" },
] as const;

export type ScenarioOptionId = (typeof SCENARIO_OPTIONS)[number]["id"];

/** Operator brand state · engine assumes branded chain in MVP. */
export type OperatorOptionId = "branded_chain" | "independent";
/** Liquidity band · driven by trailing-12m transaction count. */
export type LiquidityBandId = "deep_6plus" | "moderate_3_5" | "thin_below_3";

// ─── Policy shape ────────────────────────────────────────────────────

/** All values stored as percentage points (e.g. 0.25 = 0.25%). */
export interface DynamicCapRatePolicy {
  /** Base market yield · ULTIMATE fallback only (no segment prior · no comps). */
  base_market_yield_pct: number;

  /** Free-text source description shown in the rationale panel. */
  base_market_yield_source: string;

  /**
   * Cap-rate BASE per segment (X4b · TRAMO 3b). Institutional priors
   * calibrated with real €/key (NOT a median of comp cap rates · those
   * don't exist). This is the primary base source; `base_market_yield_pct`
   * is only the labelled last-resort fallback.
   */
  segment_base_priors: SegmentBasePriors;

  /** 9-cell category-adjustment matrix · per (category, size). */
  category_adjustment: Record<StarCategoryId, Record<SizeTierId, number>>;

  /** 9-cell size-adjustment matrix · per (category, size). */
  size_adjustment: Record<StarCategoryId, Record<SizeTierId, number>>;

  /** 9-cell matrix per renovation option · per (category, size). */
  renovation_adjustment: Record<RenovationOptionId, Record<StarCategoryId, Record<SizeTierId, number>>>;

  /** Flat-per-cell scenario adjustments · 9 cells per option. */
  scenario_adjustment: Record<ScenarioOptionId, Record<StarCategoryId, Record<SizeTierId, number>>>;

  /** Operator-brand adjustment · branded chain tightens, independent widens. */
  operator_adjustment: Record<OperatorOptionId, number>;

  /** Liquidity adjustment · by trailing-12m transaction-count band. */
  liquidity_adjustment: Record<LiquidityBandId, number>;

  /** HotelVALORA Score factor · compset-relative quality adjustment (±bps). */
  score_adjustment: ScoreAdjustmentPolicy;

  /** Macro delta basis points PER 100 bps Euribor above long-term mean. */
  macro_bps_per_100bps_euribor: number;
  /** Euribor 12m long-term mean reference (% points). */
  macro_long_term_mean_pct: number;
}

// ─── Defaults (calibrated to Madrid Centro 4* / 200-key benchmark) ──

function flatMatrix(value: number): Record<StarCategoryId, Record<SizeTierId, number>> {
  return {
    "3star": { small: value, medium: value, large: value },
    "4star": { small: value, medium: value, large: value },
    "5star": { small: value, medium: value, large: value },
  };
}

// Reconciled to the runtime engine (X4b · TRAMO 3). The engine is the
// reference; these matrices reproduce its independent-axis deltas exactly:
//   · Category: 5* −0.25 · 4* 0 · 3* +0.25   (category-only · flat across size)
//   · Size:    +200 −0.10 · 100-199 0 · <100 +0.20   (size-only · flat across cat)
//   · State:   new −0.10 · renovated 0 · needs_work +0.50
//   · Operator: branded −0.10 · independent +0.10
//   · Liquidity: ≥6 deals −0.05 · 3-5 0 · <3 +0.20
//   · Scenario: conservative +0.30 · base 0 · aggressive −0.20 · stress +0.60
// (Operators may still tune any cell to vary an axis by category/size — the
//  engine reads whatever the policy holds. Flat defaults = engine parity.)
export const DYNAMIC_CAP_RATE_POLICY_DEFAULTS: DynamicCapRatePolicy = {
  // Base is COMPS-DRIVEN at runtime (median of in-scope transactions ·
  // cascade submarket→market→national). This fixed value is the LABELED
  // FALLBACK used ONLY when no comparable transactions exist in scope.
  base_market_yield_pct: 6.50,
  base_market_yield_source: "Fallback último recurso · solo si no hay prior de segmento. La base viva sale del PRIOR institucional por segmento, calibrado con €/llave real (TRAMO 3b).",

  segment_base_priors: SEGMENT_BASE_PRIORS_ES,

  // Category → 0 (X4b · TRAMO 3b). The segment is now in the BASE prior
  // (luxury/upscale/…), so a separate 5★/4★/3★ delta would DOUBLE-COUNT
  // "it is premium". Kept as a (zeroed) editable axis for future nuance.
  category_adjustment: {
    "3star": { small: 0.00, medium: 0.00, large: 0.00 },
    "4star": { small: 0.00, medium: 0.00, large: 0.00 },
    "5star": { small: 0.00, medium: 0.00, large: 0.00 },
  },

  size_adjustment: {
    "3star": { small: 0.20, medium: 0.00, large: -0.10 },
    "4star": { small: 0.20, medium: 0.00, large: -0.10 },
    "5star": { small: 0.20, medium: 0.00, large: -0.10 },
  },

  renovation_adjustment: {
    new: flatMatrix(-0.10),
    renovated: flatMatrix(0),
    needs_work: flatMatrix(0.50),
  },

  scenario_adjustment: {
    conservative: flatMatrix(0.30),
    base: flatMatrix(0),
    aggressive: flatMatrix(-0.20),
    stress: flatMatrix(0.60),
  },

  operator_adjustment: { branded_chain: -0.10, independent: 0.10 },

  liquidity_adjustment: { deep_6plus: -0.05, moderate_3_5: 0, thin_below_3: 0.20 },

  // STEPPED + asymmetric: premium in 0.10 steps to −0.30 (excellence is scarce
  // · market pays up), penalty in 0.05 steps to +0.15. Steps trigger at 0.67 /
  // 1.33 / 2.0 σ above/below the compset mean (full premium at +2σ). σ_floor
  // 0.30 caps over-sensitivity on homogeneous compsets · ≥4 scored peers.
  score_adjustment: {
    max_premium_pp: 0.30,
    max_penalty_pp: 0.15,
    premium_step_pp: 0.10,
    penalty_step_pp: 0.05,
    sigma_cuts: [0.67, 1.33, 2.0],
    sigma_floor: 0.30,
    min_compset_n: 4,
  },

  macro_bps_per_100bps_euribor: 20,
  macro_long_term_mean_pct: 1.50,
};

// ─── Computation helpers (UI-side preview only) ──────────────────────
//
// The runtime engine (cap-rate-engine) owns the canonical computation.
// These helpers are for the admin panel's INLINE PREVIEW so operators
// see the live cap rate as they edit. Mirrors the engine math.

export interface ComputedCellResult {
  base: number;
  category: number;
  size: number;
  renovation: number;
  operator: number;
  liquidity: number;
  scenario: number;
  macro: number;
  total: number;
}

export function computeForCell(
  policy: DynamicCapRatePolicy,
  category: StarCategoryId,
  size: SizeTierId,
  renovation: RenovationOptionId,
  scenario: ScenarioOptionId,
  euribor12mPct: number,
  operator: OperatorOptionId = "branded_chain",
  liquidity: LiquidityBandId = "thin_below_3",
): ComputedCellResult {
  const cat = policy.category_adjustment[category][size];
  const sz = policy.size_adjustment[category][size];
  const ren = policy.renovation_adjustment[renovation][category][size];
  const op = policy.operator_adjustment[operator];
  const liq = policy.liquidity_adjustment[liquidity];
  const scn = policy.scenario_adjustment[scenario][category][size];
  const macroDeltaPct = ((euribor12mPct - policy.macro_long_term_mean_pct) / 100) * policy.macro_bps_per_100bps_euribor;
  const total = policy.base_market_yield_pct + cat + sz + ren + op + liq + scn + macroDeltaPct;
  return {
    base: policy.base_market_yield_pct,
    category: cat,
    size: sz,
    renovation: ren,
    operator: op,
    liquidity: liq,
    scenario: scn,
    macro: round2(macroDeltaPct),
    total: round2(total),
  };
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
