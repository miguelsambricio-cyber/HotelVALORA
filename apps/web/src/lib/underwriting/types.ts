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
}

// ─── Cap Rate engine I/O ──────────────────────────────────────────────

export interface CapRateContext {
  asset: AssetBasics;
  macro: { euribor_12m: number; bond_10y?: number };
  /** Subset of comparable transactions in scope · resolved upstream. */
  comparables: CapRateComparable[];
}

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

export interface CapRateAdjustment {
  label: string;
  delta_pct: number;
  rationale: string;
}

export interface DynamicCapRateResult {
  /** Final recommended cap rate · base + sum(adjustments). */
  recommended_pct: number;
  /** Band around recommended · widens when confidence is low. */
  band: { low_pct: number; high_pct: number };
  /** Median of comparable transactions · pre-adjustment. */
  base_pct: number;
  /** Comp count + variability metrics. */
  evidence: {
    comp_count: number;
    median_pct: number;
    p25_pct: number;
    p75_pct: number;
    stddev_pct: number;
    most_recent_date: string | null;
  };
  /** Ordered list of additive adjustments applied. */
  adjustments: CapRateAdjustment[];
  /** Confidence scoring for the recommendation. */
  confidence: {
    level: "low" | "medium" | "high";
    reasons: string[]; // human-readable explanation
  };
}

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
    entry: { dynamic: DynamicCapRateResult; used_pct: number; source: "dynamic" | "override" };
    exit: { dynamic: DynamicCapRateResult; used_pct: number; source: "dynamic" | "override" };
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
  site_acquisition_total: number;
  capex_total: number;
  contingency_insurance: number;
  acquisition_fees_taxes: number;
  total_building_cost: number;
  acquisition: BreakdownLine[];
  capex_hard_cost: BreakdownLine[];
  capex_soft_cost: BreakdownLine[];
  capex_project: BreakdownLine[];
}

export interface BreakdownLine {
  id: string;
  label: string;
  total_eur: number;
  per_room_eur: number;
  per_sqm_eur: number;
  per_intervention_sqm_eur: number;
  pct_of_total: number;
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
  project_cash_flow: PeriodSeries;
  equity_cash_flow: PeriodSeries;
  debt_cash_flow: PeriodSeries;
  project_irr_pct: number;
  equity_irr_pct: number;
  moic: number;
}

// ─── Underwriting bundle (everything for a scenario) ──────────────────

export interface UnderwritingBundle extends VersionTag {
  meta: ScenarioMeta;
  inputs: UnderwritingInputs;
  computed: UnderwritingComputed;
}
