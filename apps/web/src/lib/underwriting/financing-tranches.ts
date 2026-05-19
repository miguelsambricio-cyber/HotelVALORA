/**
 * Financing · tranche-based architecture.
 *
 * MVP renders three legacy tranches (senior · capex · bullet) but the
 * model carries `tranches: DebtTranche[]` so future capital structures
 * land without breaking changes:
 *
 *   · senior · CAPEX line · bridge · mezzanine · preferred equity
 *   · refinance events · prepayment · partial paydown
 *   · variable rate stack (Euribor + margin · SOFR · fixed)
 *   · interest-only periods · grace · bullet maturity
 *
 * Tranches are FIRST-CLASS · the engine aggregates per-tranche schedules
 * into a portfolio-level FinancingSchedule. No assumption about how
 * many tranches exist beyond what each section's UI surfaces.
 */

import type { PeriodSeries } from "./temporal";

export type TrancheKind =
  | "senior_secured"
  | "senior_capex"
  | "bullet"
  | "mezzanine"
  | "bridge"
  | "preferred_equity";

export type AmortizationKind = "straight" | "bullet" | "interest_only" | "custom";

export type RateKind = "fixed" | "floating";

export type TrancheEventKind = "refinance" | "prepayment" | "covenant_breach" | "default" | "extension";

export interface DebtTranche {
  id: string;
  kind: TrancheKind;
  label: string;
  /** Origination period index · matches the temporal axis. */
  origination_period_index: number;
  /** Principal · either fixed amount or computed from LTV/LTC. */
  principal: PrincipalSpec;
  /** Rate stack. */
  rate: RateSpec;
  /** Amortization schedule. */
  amortization: AmortizationSpec;
  /** Optional · grace before principal payments start (in periods). */
  grace_periods: number;
  /** Optional · maturity in periods from origination. */
  maturity_periods: number;
  /** Optional events that mutate the schedule (refinance · prepay · etc.). */
  events?: TrancheEvent[];
  /** Optional covenant tests (DSCR · LTV) that trigger warnings. */
  covenants?: TrancheCovenant[];
}

export type PrincipalSpec =
  | { kind: "fixed_amount"; amount: number }
  | { kind: "ltv_of_value"; ltv_pct: number; value_basis: "acquisition" | "hotel_value" }
  | { kind: "ltc_of_total"; ltc_pct: number; cost_basis: "total_project" | "capex_only" };

export type RateSpec =
  | { kind: "fixed"; pct: number }
  | { kind: "floating"; base: "euribor_12m" | "euribor_6m" | "sofr"; margin_pct: number; floor_pct?: number; cap_pct?: number };

export interface AmortizationSpec {
  kind: AmortizationKind;
  /** Total years of the schedule from origination. */
  years: number;
  /** Bullet-only · percentage of principal due at maturity. */
  bullet_pct?: number;
  /** Custom · explicit principal series indexed by period. */
  custom_principal_series?: PeriodSeries;
}

export interface TrancheEvent {
  period_index: number;
  kind: TrancheEventKind;
  amount?: number;
  notes?: string;
}

export interface TrancheCovenant {
  kind: "DSCR_MIN" | "ICR_MIN" | "LTV_MAX" | "EBITDA_MIN";
  threshold: number;
  /** Optional cure period in periods after breach. */
  cure_periods?: number;
}

// ─── Per-tranche schedule (engine output) ─────────────────────────────

export interface TrancheSchedule {
  tranche_id: string;
  kind: TrancheKind;
  label: string;
  principal_amount: number;
  /** BoFY balance per period. */
  bofy_balance: PeriodSeries;
  /** Total payment per period (interest + principal). */
  payment: PeriodSeries;
  /** Interest expense per period. */
  interest_expense: PeriodSeries;
  /** Scheduled principal per period (amortization). */
  loan_principal: PeriodSeries;
  /** Bullet repayment per period (zero except maturity). */
  bullet_principal: PeriodSeries;
  /** Drawdown per period (positive when capital received). */
  drawdown: PeriodSeries;
  /** EoFY balance per period. */
  eofy_balance: PeriodSeries;
  /** Effective rate applied per period (post-cap/floor). */
  effective_rate_pct: PeriodSeries;
}

// ─── Portfolio aggregation ────────────────────────────────────────────

export interface FinancingPortfolioSchedule {
  /** Per-tranche detail · order matches inputs.tranches. */
  tranches: TrancheSchedule[];

  /** Portfolio aggregates · sums across all tranches per period. */
  total_principal: number;
  total_drawdown: PeriodSeries;
  total_interest_expense: PeriodSeries;
  total_loan_principal: PeriodSeries;
  total_bullet_principal: PeriodSeries;
  total_payment: PeriodSeries;
  total_bofy_balance: PeriodSeries;
  total_eofy_balance: PeriodSeries;

  /** Coverage ratios (BLOCK 5+ computes from CF).
   *  DSCR = Gross Operating Profit / debt service (institutional convention
   *  for hospitality · operator-explicit choice 2026-05-19). */
  dscr: PeriodSeries;
  icr: PeriodSeries;

  /** Aggregate LTV per period. */
  ltv_pct: PeriodSeries;

  /** Debt Yield Ratio · GOP / EoFY debt balance · institutional lender covenant. */
  debt_yield_pct: PeriodSeries;

  /** Upfront fee · amortized linearly over senior loan years (Y1..maturity).
   *  Pre-aggregated portfolio series in absolute € per period. */
  total_upfront_fee_amortized: PeriodSeries;

  /** Covenant test results per period · summarised across all tranches. */
  covenant_breaches: Array<{
    period_index: number;
    tranche_id: string;
    kind: TrancheCovenant["kind"];
    threshold: number;
    actual: number;
  }>;
}
