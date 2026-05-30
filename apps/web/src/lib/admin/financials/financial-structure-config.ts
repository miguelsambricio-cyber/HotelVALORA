/**
 * Financial Structure · MACHINE-READABLE engine config (X4b · TRAMO 1).
 *
 * The admin card `FINANCIAL_STRUCTURE_DEFAULTS` carries human reference RANGES
 * ("LTV 55-65", "Euribor 6M + 250-400", "5y bullet"). The underwriting engine
 * cannot consume ranges — it needs single numbers. THIS object is the single
 * source the engine reads (via `buildFinancingTranches`), so "what the panel
 * states = what the engine computes".
 *
 * Values are the operator's confirmed single points (Mike · 2026-05-30):
 * Hold 7y · LTV 65% · LTC 60% · Euribor + 250 bps · interest-only bullet 5y ·
 * DSCR ≥1.30x · DYR ≥7.50% · equity IRR target 10% · MOIC 1.8x.
 *
 * NOTE (immediate follow-up · not this tramo): the admin card still RENDERS the
 * ranges. Next step is to turn the card into single-value editable fields bound
 * to THIS config (then the range becomes a reference note beside the input).
 * Until then, the range is display-only and these single values drive the engine.
 *
 * The Euribor reference is the single `inputs.financing.euribor_12m_pct` wired
 * in the engine; the admin "6M" label is cosmetic (one Euribor reference).
 */

import type { DebtTranche } from "@/lib/underwriting/financing-tranches";

export interface FinancialStructureEngineConfig {
  /** Hold period · governs the default exit year (unless a tier override). */
  hold_years: number;
  /** Senior debt · Loan-to-Value at acquisition (% of hotel value). */
  senior_ltv_pct: number;
  /** CAPEX line · Loan-to-Cost (% of CAPEX) · used only on reposition. */
  capex_ltc_pct: number;
  /** All-in spread over Euribor · basis points. */
  debt_spread_bps: number;
  /** Amortization profile of the senior tranche. */
  amortization: "interest_only" | "straight" | "bullet";
  /** Bullet / loan term · years. */
  term_years: number;
  // ── Covenants / targets · informational (surfaced, not IRR drivers) ──
  dscr_min: number;
  dyr_min_pct: number;
  equity_irr_target_pct: number;
  moic_target: number;
}

export const FINANCIAL_STRUCTURE_ENGINE: FinancialStructureEngineConfig = {
  hold_years: 7,
  senior_ltv_pct: 65,
  capex_ltc_pct: 60,
  debt_spread_bps: 250,
  amortization: "interest_only",
  term_years: 5,
  dscr_min: 1.3,
  dyr_min_pct: 7.5,
  equity_irr_target_pct: 10,
  moic_target: 1.8,
};

/**
 * Bridge · Financial Structure config → engine `DebtTranche[]`.
 * Senior (LTV of hotel value) + CAPEX line (LTC of CAPEX · draws 0 when the
 * deal is a stabilised acquisition with no reposition CAPEX). Both float over
 * Euribor at the configured spread, interest-only with a bullet at term.
 */
export function buildFinancingTranches(
  cfg: FinancialStructureEngineConfig = FINANCIAL_STRUCTURE_ENGINE,
): DebtTranche[] {
  const marginPct = cfg.debt_spread_bps / 100; // 250 bps → 2.5%
  const amortization =
    cfg.amortization === "interest_only"
      ? ({ kind: "interest_only", years: cfg.term_years } as const)
      : cfg.amortization === "bullet"
        ? ({ kind: "bullet", years: cfg.term_years, bullet_pct: 100 } as const)
        : ({ kind: "straight", years: cfg.term_years } as const);

  const senior: DebtTranche = {
    id: "senior_secured_y0",
    kind: "senior_secured",
    label: "Senior Secured · acquisition",
    origination_period_index: 0,
    principal: { kind: "ltv_of_value", ltv_pct: cfg.senior_ltv_pct, value_basis: "hotel_value" },
    rate: { kind: "floating", base: "euribor_6m", margin_pct: marginPct },
    amortization,
    grace_periods: 0,
    maturity_periods: cfg.term_years,
  };

  const capexLine: DebtTranche = {
    id: "senior_capex_y0",
    kind: "senior_capex",
    label: "Senior CAPEX line",
    origination_period_index: 0,
    principal: { kind: "ltc_of_total", ltc_pct: cfg.capex_ltc_pct, cost_basis: "capex_only" },
    rate: { kind: "floating", base: "euribor_6m", margin_pct: marginPct },
    amortization,
    grace_periods: 0,
    maturity_periods: cfg.term_years,
  };

  return [senior, capexLine];
}
