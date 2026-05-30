/**
 * Dynamic Cap Rate Engine · type contracts.
 *
 * The 5-layer architecture (operator-approved · 2026-05-18):
 *
 *   1. Market Evidence Layer   · comparable transactions, rates regime
 *   2. Adjustment Policy Layer · category / size / renovation / operator /
 *                                macro / liquidity / scenario deltas
 *   3. Confidence Engine        · numeric 0-100 + 4 sub-scores
 *   4. Explainability Layer     · structured rationale trace + narrative
 *   5. Override Layer           · operator override with audit trail
 *
 * Determinism: every layer is a pure function · same inputs → byte-
 * identical outputs across runs. This is what makes a recommended cap
 * rate auditable in an investment committee or by a lender.
 */

import type { AssetBasics, StarCategory } from "../types";
import type { DynamicCapRatePolicy } from "@/lib/admin/financials/dynamic-cap-rate-policy";
import type { ScoreContext } from "@/lib/admin/financials/score-cap-adjustment";

// ─── Layer 1 · Market Evidence ────────────────────────────────────────

export interface CompTransaction {
  transaction_id: string;
  hotel_name?: string;
  market: string;
  submarket: string;
  category: StarCategory;
  rooms: number;
  state: "new" | "renovated" | "needs_work";
  transaction_date: string; // ISO
  cap_rate_pct: number;
  price_total_eur: number;
  price_per_key_eur: number;
  source: string; // e.g. "Cushman & Wakefield · 2024 H2 Hotel Investment"
  notes?: string;
}

export interface RatesRegime {
  euribor_12m_pct: number;
  bond_10y_pct: number;
  /** Long-term mean (e.g. last 10y) for the macro adjustment. */
  euribor_12m_pct_long_term_mean: number;
  date_of_record: string; // ISO
}

export interface LiquidityMetrics {
  transactions_last_12m: number;
  transactions_last_24m: number;
  /** 5-year window · 60 months. */
  transactions_last_60m: number;
  /** 10-year window · 120 months. */
  transactions_last_120m: number;
  total_volume_last_12m_eur: number;
  total_volume_last_24m_eur: number;
  total_volume_last_60m_eur: number;
  total_volume_last_120m_eur: number;
}

export interface MarketEvidence {
  context: {
    market: string;
    submarket: string;
    category: StarCategory;
    rooms: number;
    state: AssetState;
    as_of_date: string; // ISO · query timestamp for staleness checks
  };

  /** Comparables that survived all filters (used for stats). */
  comparables_in_scope: CompTransaction[];
  /** Excluded comps + the rule that rejected them · for traceability. */
  comparables_excluded: ExcludedComp[];

  rates_regime: RatesRegime;

  // Derived metrics · all percentage points
  comp_count: number;
  median_cap_pct: number;
  mean_cap_pct: number;
  p25_cap_pct: number;
  p75_cap_pct: number;
  stddev_cap_pct: number;
  spread_p75_p25_pct: number; // p75 − p25

  most_recent_date: string | null;
  oldest_in_scope_date: string | null;

  liquidity_metrics: LiquidityMetrics;
}

export interface ExcludedComp {
  transaction_id: string;
  reason: string; // e.g. "submarket mismatch · Barcelona", "stale · >36 months"
}

export type AssetState = "new" | "renovated" | "needs_work";

// ─── Layer 2 · Adjustment Policy ──────────────────────────────────────

export type AdjustmentCategory =
  | "base"
  | "category"
  | "size"
  | "renovation"
  | "operator"
  | "macro"
  | "liquidity"
  | "score"
  | "scenario"
  | "side";

export type AdjustmentSource = "policy" | "evidence" | "operator_override";

export interface CapRateAdjustment {
  id: string;
  category: AdjustmentCategory;
  label: string;
  /** Δ in percentage points · positive = wider cap rate · lower price. */
  delta_pct: number;
  rationale: string;
  source: AdjustmentSource;
}

// ─── Layer 3 · Confidence Engine ──────────────────────────────────────

export type ConfidenceBand = "very_low" | "low" | "medium" | "high" | "very_high";

export interface ConfidenceSubScore {
  /** 0-100 · higher is better. */
  score: number;
  /** Human-readable explanation of the sub-score. */
  explanation: string;
}

export interface ConfidenceScore {
  /** Composite 0-100. */
  score_0_100: number;
  band: ConfidenceBand;

  /** Weighted contributors · sum of weights = 1.0. */
  components: {
    sufficiency: ConfidenceSubScore;      // # of comps
    volatility: ConfidenceSubScore;        // spread (p75 − p25)
    staleness: ConfidenceSubScore;         // age of most recent comp
    coverage: ConfidenceSubScore;          // submarket + category match
  };

  /** Top reasons surfaced for operator review (max 5). */
  reasons: string[];
}

// ─── Layer 4 · Explainability ─────────────────────────────────────────

export interface RationaleTrace {
  base_market_yield_pct: number;
  base_market_yield_source: string;

  adjustments_applied: CapRateAdjustment[];
  adjustments_total_delta_pct: number;

  recommended_pct: number;
  recommended_band: { low_pct: number; high_pct: number };

  evidence_used: {
    comp_count: number;
    date_range: { from: string | null; to: string | null };
    submarket_match_count: number;
    category_match_count: number;
  };
  evidence_excluded: {
    count: number;
    reasons: string[];
  };

  confidence: ConfidenceScore;

  /** One-paragraph operator-grade narrative · auto-generated. */
  narrative: string;
}

// ─── Layer 5 · Override ───────────────────────────────────────────────

export interface CapRateOverride {
  /** Has the operator pinned a manual value? */
  enabled: boolean;
  /** Manual cap rate value (percentage points). */
  manual_value_pct?: number;
  /** Free-text operator justification · required for institutional audit. */
  operator_rationale?: string;
  /** Operator identity for audit trail. */
  operator_email?: string;
  /** ISO timestamp · when the override was applied. */
  applied_at?: string;
  /** Δ between override and engine recommendation. */
  delta_vs_recommended_pct?: number;
}

// ─── Engine entry point ──────────────────────────────────────────────

export interface CapRateEngineContext {
  asset: AssetBasics;
  /** Scenario id · drives scenario adjustment (conservative · base · upside · stress). */
  scenario_id: string;
  /** Operator override · pass `{ enabled: false }` when none. */
  override: { enabled: boolean; manual_value_pct?: number; operator_rationale?: string; operator_email?: string };
  rates_regime: RatesRegime;
  comparables: CompTransaction[];
  /** Entry vs exit · exit adds a terminal-yield hedge by default. */
  side: "entry" | "exit";
  /** ISO date for staleness scoring · defaults to today. */
  as_of_date?: string;
  /**
   * Operator-tunable adjustment policy (admin/financials · Dynamic Cap Rate).
   * Optional · defaults to DYNAMIC_CAP_RATE_POLICY_DEFAULTS so existing
   * callers are unaffected. Per-request policy wiring lands with Block 7
   * Supabase persistence (X4b · TRAMO 3).
   */
  policy?: DynamicCapRatePolicy;
  /**
   * HotelVALORA Score context · subject quality + compset peers' qualities.
   * Optional · absent → Score factor contributes 0 (labelled · never
   * penalises for missing data). Assembled by the report build from
   * `hotel_profiles` for the subject + its competitive set.
   */
  score_context?: ScoreContext;
}

export interface DynamicCapRateResult {
  // Top-line
  recommended_pct: number;
  used_pct: number;
  source: "dynamic" | "override";
  band: { low_pct: number; high_pct: number };

  // Layers (all 5)
  evidence: MarketEvidence;
  adjustments: CapRateAdjustment[];
  confidence: ConfidenceScore;
  rationale: RationaleTrace;
  override: CapRateOverride;

  /** Legacy compat · = evidence.median_cap_pct. */
  base_pct: number;
}
