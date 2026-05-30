/**
 * HotelVALORA Underwriting · type contracts.
 *
 * BLOCK 2 REFACTOR (2026-05-18):
 *   · YearSeries (11-tuple) → PeriodSeries (number[] aligned to Period[])
 *   · financing.asset_tranche / capex_tranche → financing.tranches: DebtTranche[]
 *   · Added VersionTag to UnderwritingBundle (schema + engine versioning)
 *   · Each schedule now carries `periods: Period[]` so renderers know N cols
 *
 * Architecture invariants (locked · 2026-05-18):
 *
 *  1. React contains ZERO financial logic. Engine is pure TS.
 *  2. Inputs (operator-editable) and Computed (engine output) are
 *     ALWAYS separate. Never store derived values in inputs.
 *  3. Multi-scenario from day-1 architecture · MVP renders one
 *     scenario but the type carries scenario_id throughout.
 *  4. Cap Rate engine has four explicit layers · MarketEvidence ·
 *     AdjustmentLogic · ConfidenceEngine · OverrideLayer.
 *  5. Persistence flows through Supabase · localStorage only as draft
 *     cache. Block 8 wires the persistence path.
 *  6. Temporal granularity is per-layer · MVP yearly · components
 *     accept periods[] and never hardcode column count.
 *  7. Financing is tranche-first · MVP renders 2 tranches but the
 *     model carries `tranches[]` so mezzanine / preferred equity /
 *     bridge land without breaking changes.
 */

import type { Period, PeriodSeries } from "./temporal";
import type { DebtTranche, FinancingPortfolioSchedule } from "./financing-tranches";
import type { VersionTag } from "./versioning";
import type { DynamicCapRateResult as _DynamicCapRateResult } from "./cap-rate-engine/types";

// ─── Scenarios ────────────────────────────────────────────────────────

export type ScenarioId =
  | "base"
  | "upside"
  | "downside"
  | "stress"
  | "refinance"
  | "operator_change"
  | "exit_delay"
  | string; // open · operator can name custom scenarios

export interface ScenarioMeta {
  id: ScenarioId;
  label: string;
  description?: string;
  parent_id?: ScenarioId; // child scenarios inherit from parent
  created_by_email?: string;
  created_at?: string;
}

// ─── Asset basics ─────────────────────────────────────────────────────

export type StarCategory = "3star" | "4star" | "5star";
export type AssetState = "new" | "renovated" | "needs_work";

export interface AssetBasics {
  asset_id?: string;
  hotel_name?: string;
  rooms: number;
  total_sqm: number;
  intervention_sqm: number;
  market: string;
  submarket: string;
  category: StarCategory;
  state: AssetState;
  /**
   * Fine-grained market segment (chain_scale · 6 levels: luxury …economy).
   * Drives the segment-based cap-rate BASE prior (X4b · TRAMO 3b). When
   * absent, the base falls back to a star→segment default (labelled).
   */
  segment?: string;
}

// ─── Cap Rate engine I/O ──────────────────────────────────────────────

export interface CapRateContext {
  asset: AssetBasics;
  macro: { euribor_12m: number; bond_10y?: number };
  /** Subset of comparable transactions in scope · resolved upstream. */
  comparables: CapRateComparable[];
}

// Legacy alias for backward-compat with code that imported the
// 9-field shape. New code should import directly from
// `lib/underwriting/cap-rate-engine`.
export interface CapRateComparable {
  transaction_id: string;
  market: string;
  submarket: string;
  category: StarCategory;
  rooms: number;
  state: AssetState;
  cap_rate: number;
  transaction_date: string;
  source: string;
}

// Re-export the rich 5-layer types from the Dynamic Cap Rate Engine.
// Section 6 + engine module consume DynamicCapRateResult shape from here.
export type {
  CapRateAdjustment,
  ConfidenceScore,
  ConfidenceBand,
  ConfidenceSubScore,
  DynamicCapRateResult,
  MarketEvidence,
  RationaleTrace,
  CapRateOverride,
  CompTransaction,
  RatesRegime,
  LiquidityMetrics,
  ExcludedComp,
  AdjustmentCategory,
  AdjustmentSource,
  CapRateEngineContext,
} from "./cap-rate-engine/types";

export interface CapRateInputs {
  /** Operator override · null means "use dynamic". */
  manual_override_pct: number | null;
  /** Defaults to true · operator can flip to manual at any time. */
  use_dynamic: boolean;
}

// ─── Underwriting inputs (operator-editable) ──────────────────────────

export interface UnderwritingInputs {
  scenario_id: ScenarioId;
  asset: AssetBasics;

  /** Reporting axis · MVP = YEARLY_PERIODS_Y0_Y10 · operator can swap. */
  periods: Period[];

  acquisition: {
    asking_price: number;
    hotel_value: number;
    cap_rate: CapRateInputs;
    costs: {
      notary_registry_pct: number;
      ajd_pct: number;
      itp_pct: number;
      acquisition_fee_pct: number;
      key_money_total: number;
    };
  };

  capex: {
    hard_cost: {
      structure_pct: number;
      asset_content_pct: number;
      mep_per_room: number;
      exterior_pct: number;
    };
    soft_cost: {
      licensing_pct: number;
      technical_consultant_pct: number;
      development_fee_pct: number;
      preopening_total: number;
      ffe_per_room: number;
      ose_per_room: number;
      insurance_pct: number;
    };
    contingency_pct: number;
  };

  pl_drivers: {
    /** GOP source lines per period · aligned to periods[]. */
    gop: { hotel: PeriodSeries; fb: PeriodSeries; other: PeriodSeries };
    costs: {
      mgmt_fee: PeriodSeries;
      property_tax: PeriodSeries;
      property_insurance: PeriodSeries;
      ffe_reserve: PeriodSeries;
    };
  };

  depreciation: {
    building_years: number; // default 25
    mep_years: number; // default 7
  };

  financing: {
    /** Capital stack · first-class tranches · MVP seeds 2 (senior + capex). */
    tranches: DebtTranche[];
    /** Macro rate context · referenced by floating-rate tranches. */
    euribor_12m_pct: number;
    /** Upfront fee · percentage points of principal · amortized linearly
     *  over senior loan years · default 0.5% (institutional lender fee). */
    upfront_fee_pct?: number;
  };

  exit: {
    cap_rate: CapRateInputs;
    year: number; // 1..10
    fee_pct: number;
  };

  tax: {
    cit_rate_pct: number; // 25% ES default
    ebitda_limit_pct: number; // 30% Ley IS ES
    finexp_floor_eur: number; // 1M € deductibility floor
  };
}

// ─── Underwriting computed (engine output) ────────────────────────────

export interface UnderwritingComputed {
  scenario_id: ScenarioId;
  asset: AssetBasics;
  periods: Period[];

  // Schedules · each indexed by periods[]
  pnl: PnlSchedule;
  balance_sheet: BalanceSheetSchedule;
  cash_flow: CashFlowSchedule;
  dta: DtaSchedule;
  financing: FinancingPortfolioSchedule;

  // One-shot calculations
  investment: InvestmentBreakdown;
  exit: ExitMetrics;

  // Cap rate engine outputs
  cap_rate: {
    entry: { dynamic: _DynamicCapRateResult; used_pct: number; source: "dynamic" | "override" };
    exit: { dynamic: _DynamicCapRateResult; used_pct: number; source: "dynamic" | "override" };
  };

  // Cross-checks · zero-tolerance institutional invariants
  reconciliation: {
    bs_balanced: boolean[]; // per period · assets == eq + debt (tolerance ±1 €)
    cash_matches_cf: boolean;
    dscr_per_period: PeriodSeries; // values < 1.0 trigger warning
    warnings: string[];
  };
}

// Schedule shapes · indexed by the parent's periods[].

export interface PnlSchedule {
  hotel: PeriodSeries;
  fb: PeriodSeries;
  other_departments: PeriodSeries;
  gross_operating_profit: PeriodSeries;
  mgmt_fee: PeriodSeries;
  property_taxes: PeriodSeries;
  property_insurance: PeriodSeries;
  ffe_reserve: PeriodSeries;
  total_costs: PeriodSeries;
  ebitda_after_replacement: PeriodSeries;
  da: PeriodSeries;
  ebit: PeriodSeries;
  financial_expenses: PeriodSeries;
  ebt: PeriodSeries;
  cit: PeriodSeries;
  net_income: PeriodSeries;
  total_net_income: PeriodSeries; // cumulative
}

export interface BalanceSheetSchedule {
  non_current_assets: PeriodSeries;
  building: PeriodSeries;
  installations_mep: PeriodSeries;
  dta_asset: PeriodSeries;
  cash: PeriodSeries;
  total_assets: PeriodSeries;
  equity: PeriodSeries;
  initial_equity: PeriodSeries;
  reserves: PeriodSeries;
  net_income_period: PeriodSeries;
  debt: PeriodSeries;
  total_eq_debt: PeriodSeries;
}

export interface CashFlowSchedule {
  ebitda_after_replacement: PeriodSeries;
  yield_net: PeriodSeries;
  tax_payment: PeriodSeries;
  acquisition: PeriodSeries;
  capex: PeriodSeries;
  contingency_insurance: PeriodSeries;
  acquisition_fees_taxes: PeriodSeries;
  operating_cash_flow: PeriodSeries;
  debt_drawn: PeriodSeries;
  interest_expense: PeriodSeries;
  loan_principal: PeriodSeries;
  equity_drawn: PeriodSeries;
  net_cash_flow: PeriodSeries;
  change_in_cash_bs: PeriodSeries;
}

export interface DtaSchedule {
  ebit: PeriodSeries;
  ebitda: PeriodSeries;
  limit_ebitda_30pct: PeriodSeries;
  limit_finexp_floor: PeriodSeries;
  financial_expenses_after_limits: PeriodSeries;
  ebt_after_limits: PeriodSeries;
  dta_beginning: PeriodSeries;
  dta_increases: PeriodSeries;
  dta_decreases: PeriodSeries;
  dta_end: PeriodSeries;
  cit_pl: PeriodSeries;
  dta_compensation: PeriodSeries;
  tax_payment: PeriodSeries;
}

export interface InvestmentBreakdown {
  // Asking + appraised
  asking_price: number;
  hotel_value: number;

  // Section totals
  site_acquisition_total: number;
  capex_total: number;
  contingency_insurance: number;
  acquisition_fees_taxes: number;
  total_building_cost: number;

  // Itemised lines (one BreakdownLine per Excel row)
  acquisition: BreakdownLine[];          // Notary · AJD · ITP · Acq fee · Key money
  capex_hard_cost: BreakdownLine[];      // Structure · Asset content · MEP · Exterior
  capex_soft_cost: BreakdownLine[];      // Licensing · TC · Dev fee · Pre-opening · FF&E · OS&E · Insurance
  capex_project: BreakdownLine[];        // Contingency · Insurance development · other project costs

  // Future-proof · phased deployment of CAPEX (MVP single initial phase)
  capex_phases: CapexPhase[];

  // Stabilised yield progression · NOI ÷ total investment per period · Y1..Y5 minimum.
  stabilized_yield_progression: PeriodSeries;
}

export interface BreakdownLine {
  id: string;
  label: string;
  /** Optional · the underwriting driver behind this line (e.g. "11.250 €/key", "2%"). */
  assumption?: string;
  /** Numeric value of the assumption · used by the editable inline input. */
  assumption_raw?: number;
  /**
   * Kind of the assumption · drives the editable input format + parser.
   *   · "percent_asking" → % of asking price (0.02 = 2,00%)
   *   · "percent_subtotal" → % of subtotal / total project (0.05 = 5,00%)
   *   · "currency_per_key" → € per key (11250 = 11.250 € / key)
   *   · "currency_total" → absolute € (250000 = 250.000 €)
   */
  assumption_kind?: "percent_asking" | "percent_subtotal" | "currency_per_key" | "currency_total";
  total_eur: number;
  per_room_eur: number;
  per_sqm_eur: number;
  per_intervention_sqm_eur: number;
  pct_of_total: number;
  notes?: string;
}

/**
 * CAPEX phase · future-proof for multi-wave deployments, operator
 * contributions, tenant-improvement allowances, expansion CAPEX,
 * ESG retrofit buckets. MVP seeds a single `initial_renovation`
 * phase but the structure accepts unlimited phases.
 */
export type CapexBucketKind =
  | "initial_renovation"
  | "refurbishment_wave"
  | "expansion"
  | "esg_retrofit"
  | "tenant_improvement"
  | "operator_contribution"
  | "fitout"
  | "contingency"
  | "insurance";

export type CapexFundedBy =
  | "developer"
  | "operator"
  | "tenant"
  | "esg_grant"
  | "insurance_claim";

export interface CapexPhase {
  id: string;
  kind: CapexBucketKind;
  label: string;
  /** First period of drawdown · 0 = closing year. */
  start_period_index: number;
  /** Span across periods · phased drawdowns (1 = single-shot). */
  drawdown_periods: number;
  total_eur: number;
  funded_by: CapexFundedBy;
  notes?: string;
}

export interface ExitMetrics {
  exit_cap_rate_pct: number;
  exit_year: number; // 1..10
  exit_fee_pct: number;
  exit_price: number;
  exit_price_per_room: number;
  exit_price_per_sqm: number;
  debt_repayment_at_exit: number;
  equity_investment: number;
  profit_share: number;

  // ── Cash-flow layers ─────────────────────────────────────────────
  // PROJECT LAYER · unlevered · pre-tax · asset-level economics.
  // EBITDA + exit proceeds (gross). No tax, no debt service.
  project_cash_flow: PeriodSeries;

  // EQUITY LAYER · levered · post-tax · investor economics.
  // EBITDA − cashTax − debtService + (exit net of fees + debt payoff residual).
  equity_cash_flow: PeriodSeries;

  // Debt service flows (sponsor view · negative outflow during life).
  debt_cash_flow: PeriodSeries;

  // ── IRR layers ───────────────────────────────────────────────────
  /** Project IRR · UNLEVERED · PRE-TAX · institutional asset benchmark. */
  project_irr_pct: number;
  /** Equity IRR · LEVERED · POST-TAX · institutional LP return. */
  equity_irr_pct: number;

  // ── Future-proof IRR slots (currently null · populated in later blocks) ──
  /** Project IRR · unlevered · POST-TAX (NOPAT-based · no tax shield). */
  project_irr_posttax_pct?: number | null;
  /** Equity IRR · levered · GROSS of promote (before LP/GP split). */
  equity_irr_gross_pct?: number | null;
  /** LP IRR · post-waterfall · sliced from equity_cash_flow after promote. */
  lp_irr_pct?: number | null;
  /** GP IRR · catch-up + carry · sliced from equity_cash_flow. */
  gp_irr_pct?: number | null;

  moic: number;
}

// ─── Underwriting bundle (everything for a scenario) ──────────────────

export interface UnderwritingBundle extends VersionTag {
  meta: ScenarioMeta;
  inputs: UnderwritingInputs;
  computed: UnderwritingComputed;
}
