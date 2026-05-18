/**
 * HotelVALORA Underwriting · type contracts.
 *
 * BLOCK 1 SCOPE: shell + skeleton only. Engine stubs are intentionally
 * minimal · Block 2 fills the calculation engine + Excel-to-engine
 * mapping audit. Block 6 ships the Dynamic Cap Rate engine.
 *
 * Architecture invariants (locked in arch review · 2026-05-18):
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
 *  6. Year columns: 11 (Year 0 … Year 10). Monthly/quarterly toggle
 *     designed-for-future · NOT implemented MVP.
 */

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

// ─── Year axis ────────────────────────────────────────────────────────

/** 11 entries · Year 0 .. Year 10. Index 0 = Year 0 (closing year). */
export type YearSeries = readonly [
  number, number, number, number, number, number,
  number, number, number, number, number,
];

export const YEAR_COUNT = 11 as const;
export const YEAR_LABELS: readonly string[] = Array.from(
  { length: YEAR_COUNT },
  (_, i) => `Year ${i}`,
);

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
    /** GOP source lines per year · Y0..Y10. */
    gop: { hotel: YearSeries; fb: YearSeries; other: YearSeries };
    costs: {
      mgmt_fee: YearSeries;
      property_tax: YearSeries;
      property_insurance: YearSeries;
      ffe_reserve: YearSeries;
    };
  };

  depreciation: {
    building_years: number; // default 25
    mep_years: number; // default 7
  };

  financing: {
    asset_tranche: { ltv: number; years: number; grace: number; bullet_pct: number };
    capex_tranche: { ltv: number; years: number; grace: number };
    euribor_12m_pct: number;
    margin_pct: number;
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
// MINIMAL Block 1 surface · Block 2 expands each sub-schedule.

export interface UnderwritingComputed {
  scenario_id: ScenarioId;
  asset: AssetBasics;

  // Schedules · each Year 0..Year 10
  pnl: PnlSchedule;
  balance_sheet: BalanceSheetSchedule;
  cash_flow: CashFlowSchedule;
  dta: DtaSchedule;
  financing: FinancingSchedule;

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
    bs_balanced: boolean[]; // per year · assets == eq + debt (tolerance ±1 €)
    cash_matches_cf: boolean;
    dscr_per_year: YearSeries; // values < 1.0 trigger warning
    warnings: string[];
  };
}

// Schedule shapes · Block 2 fills these. Block 1 just needs the type wired.

export interface PnlSchedule {
  hotel: YearSeries;
  fb: YearSeries;
  other_departments: YearSeries;
  gross_operating_profit: YearSeries;
  mgmt_fee: YearSeries;
  property_taxes: YearSeries;
  property_insurance: YearSeries;
  ffe_reserve: YearSeries;
  total_costs: YearSeries;
  ebitda_after_replacement: YearSeries;
  da: YearSeries;
  ebit: YearSeries;
  financial_expenses: YearSeries;
  ebt: YearSeries;
  cit: YearSeries;
  net_income: YearSeries;
  total_net_income: YearSeries; // cumulative
}

export interface BalanceSheetSchedule {
  non_current_assets: YearSeries;
  building: YearSeries;
  installations_mep: YearSeries;
  dta_asset: YearSeries;
  cash: YearSeries;
  total_assets: YearSeries;
  equity: YearSeries;
  initial_equity: YearSeries;
  reserves: YearSeries;
  net_income_period: YearSeries;
  debt: YearSeries;
  total_eq_debt: YearSeries;
}

export interface CashFlowSchedule {
  ebitda_after_replacement: YearSeries;
  yield_net: YearSeries;
  tax_payment: YearSeries;
  acquisition: YearSeries;
  capex: YearSeries;
  contingency_insurance: YearSeries;
  acquisition_fees_taxes: YearSeries;
  operating_cash_flow: YearSeries;
  debt_drawn: YearSeries;
  interest_expense: YearSeries;
  loan_principal: YearSeries;
  equity_drawn: YearSeries;
  net_cash_flow: YearSeries;
  change_in_cash_bs: YearSeries;
}

export interface DtaSchedule {
  ebit: YearSeries;
  ebitda: YearSeries;
  limit_ebitda_30pct: YearSeries;
  limit_finexp_floor: YearSeries;
  financial_expenses_after_limits: YearSeries;
  ebt_after_limits: YearSeries;
  dta_beginning: YearSeries;
  dta_increases: YearSeries;
  dta_decreases: YearSeries;
  dta_end: YearSeries;
  cit_pl: YearSeries;
  dta_compensation: YearSeries;
  tax_payment: YearSeries;
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

export interface FinancingSchedule {
  total_asset_costs: number;
  total_ltv_pct: number;
  total_debt: number;
  bullet_pct: number;
  bullet_amount: number;
  principal_loan: number;

  // Per year debt service
  bofy_balance: YearSeries;
  payment: YearSeries;
  interest_expense: YearSeries;
  loan_principal: YearSeries;
  loan_capex: YearSeries;
  bullet_principal: YearSeries;
  eofy_balance: YearSeries;

  rcsd: YearSeries; // ratio · n.a. when payment = 0
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
  project_cash_flow: YearSeries;
  equity_cash_flow: YearSeries;
  debt_cash_flow: YearSeries;
  project_irr_pct: number;
  equity_irr_pct: number;
  moic: number;
}

// ─── Underwriting bundle (everything for a scenario) ──────────────────

export interface UnderwritingBundle {
  meta: ScenarioMeta;
  inputs: UnderwritingInputs;
  computed: UnderwritingComputed;
}
