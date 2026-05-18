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

export const RENOVATION_OPTIONS = [
  { id: "capex", label: "CAPEX · reposition" },
  { id: "non-capex", label: "Non-CAPEX · renovated" },
] as const;

export type RenovationOptionId = (typeof RENOVATION_OPTIONS)[number]["id"];

// ─── Scenario options ────────────────────────────────────────────────

export const SCENARIO_OPTIONS = [
  { id: "conservative", label: "Conservador" },
  { id: "base", label: "Mercado" },
  { id: "aggressive", label: "Optimista" },
] as const;

export type ScenarioOptionId = (typeof SCENARIO_OPTIONS)[number]["id"];

// ─── Policy shape ────────────────────────────────────────────────────

/** All values stored as percentage points (e.g. 0.25 = 0.25%). */
export interface DynamicCapRatePolicy {
  /** Base market yield · single number (median of in-scope comps). */
  base_market_yield_pct: number;

  /** Free-text source description shown in the rationale panel. */
  base_market_yield_source: string;

  /** 9-cell category-adjustment matrix · per (category, size). */
  category_adjustment: Record<StarCategoryId, Record<SizeTierId, number>>;

  /** 9-cell size-adjustment matrix · per (category, size). */
  size_adjustment: Record<StarCategoryId, Record<SizeTierId, number>>;

  /** 9-cell matrix per renovation option · per (category, size). */
  renovation_adjustment: Record<RenovationOptionId, Record<StarCategoryId, Record<SizeTierId, number>>>;

  /** Flat-per-cell scenario adjustments · 9 cells per option. */
  scenario_adjustment: Record<ScenarioOptionId, Record<StarCategoryId, Record<SizeTierId, number>>>;

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

export const DYNAMIC_CAP_RATE_POLICY_DEFAULTS: DynamicCapRatePolicy = {
  base_market_yield_pct: 6.50,
  base_market_yield_source: "Basado en 12 transacciones comparables en Madrid 2023–2025",

  category_adjustment: {
    "3star": { small: 0.50, medium: 0.25, large: 0.25 },
    "4star": { small: 0.25, medium: 0.00, large: 0.00 },
    "5star": { small: 0.00, medium: -0.50, large: -0.50 },
  },

  size_adjustment: {
    "3star": { small: 0.50, medium: 0.00, large: -0.25 },
    "4star": { small: 0.50, medium: 0.00, large: -0.25 },
    "5star": { small: 0.50, medium: 0.00, large: -0.25 },
  },

  renovation_adjustment: {
    capex: flatMatrix(-0.15),
    "non-capex": {
      "3star": { small: 0.50, medium: 0.25, large: 0.25 },
      "4star": { small: 0.25, medium: 0.25, large: 0.25 },
      "5star": { small: 0.25, medium: 0.25, large: 0.25 },
    },
  },

  scenario_adjustment: {
    conservative: flatMatrix(-0.25),
    base: flatMatrix(0),
    aggressive: flatMatrix(0.25),
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
): ComputedCellResult {
  const cat = policy.category_adjustment[category][size];
  const sz = policy.size_adjustment[category][size];
  const ren = policy.renovation_adjustment[renovation][category][size];
  const scn = policy.scenario_adjustment[scenario][category][size];
  const macroDeltaPct = ((euribor12mPct - policy.macro_long_term_mean_pct) / 100) * policy.macro_bps_per_100bps_euribor;
  const total = policy.base_market_yield_pct + cat + sz + ren + scn + macroDeltaPct;
  return {
    base: policy.base_market_yield_pct,
    category: cat,
    size: sz,
    renovation: ren,
    scenario: scn,
    macro: round2(macroDeltaPct),
    total: round2(total),
  };
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
