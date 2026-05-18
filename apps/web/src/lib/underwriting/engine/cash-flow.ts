import type { EngineModule } from "./_types";
import type { CashFlowSchedule } from "../types";
import { zeroSeries } from "../temporal";

/**
 * Module · cash_flow · direct method · 4-section institutional structure.
 *
 *   Operating CF       = EBITDA after Replacement − cash tax
 *   Investment CF      = −acquisition − capex (phased) − contingency − fees
 *   Financing CF       = drawdown − interest − loan principal − bullet
 *                        − debt payoff at exit (when exit < maturity)
 *   Equity CF          = equity contribution at t=0 (residual to land
 *                        cash[0] = 0) · no further calls in MVP
 *
 *   Net CF             = sum of the four sections
 *   Change in Cash BS  = mirror feed into Balance Sheet cash account
 *
 * Bridge invariant (validated by reconciliation, I-2):
 *   BS.cash[t] − BS.cash[t-1] ≡ CF.change_in_cash_bs[t]   (±1 €)
 *
 * Exit-year treatment:
 *   · Exit price (net of disposition fees) lands as positive Operating CF
 *     additive at exit year (per institutional convention · separates
 *     "operating" from "realisation" but stays in operating bucket for
 *     simplicity · Block 4 may move it under a new "Realisation" section)
 *   · Outstanding debt balance is paid off at exit · counted in Financing
 *     CF as an extra principal outflow
 */
export const cashFlowModule: EngineModule<"cash_flow"> = {
  key: "cash_flow",
  dependsOn: ["pnl", "financing", "dta", "investment", "exit"],
  compute({ inputs, prior }): CashFlowSchedule {
    const periods = inputs.periods;
    const n = periods.length;
    const z = () => zeroSeries(periods);

    const pnl = prior.pnl;
    const dta = prior.dta;
    const financing = prior.financing;
    const investment = prior.investment;
    const exit = prior.exit;

    const ebitda = pnl ? pnl.ebitda_after_replacement.slice() : z();
    const taxPayment = dta ? dta.tax_payment.map((v) => -v) : z(); // outflow → negative
    const yieldNet = z();
    if (investment && investment.total_building_cost > 0) {
      for (let t = 0; t < n; t++) {
        yieldNet[t] = ebitda[t] / investment.total_building_cost;
      }
    }

    // ─── Investment CF · MVP single-phase at t=0 ───────────────────
    const acquisition = z();
    const capex = z();
    const contingencyInsurance = z();
    const acquisitionFeesTaxes = z();
    if (investment) {
      acquisition[0] = -investment.asking_price;
      acquisitionFeesTaxes[0] = -investment.acquisition_fees_taxes;
      // CAPEX = CAPEX_total − contingency_insurance (rest of capex)
      // Then contingency_insurance lands as its own line per Excel.
      capex[0] = -(investment.capex_total - investment.contingency_insurance);
      contingencyInsurance[0] = -investment.contingency_insurance;
    }

    const operatingCashFlow = ebitda.map((v, t) => v + taxPayment[t]);

    // ─── Financing CF ──────────────────────────────────────────────
    const debtDrawn = financing ? financing.total_drawdown.slice() : z();
    const interestExpense = financing
      ? financing.total_interest_expense.map((v) => -v)
      : z();
    const loanPrincipal = financing
      ? financing.total_loan_principal.map((v, t) => -(v + (financing.total_bullet_principal[t] ?? 0)))
      : z();

    // Exit-year additions + post-exit silencing.
    //   · at exit_year · add net exit proceeds to operating CF and pay
    //     off the residual debt balance as a one-shot principal outflow.
    //   · t > exit_year · the deal is OVER · zero every CF line so the
    //     Balance Sheet stops rolling phantom debt service / depreciation.
    const exitYear = exit?.exit_year ?? 0;
    const exitPriceNetOfFees = exit
      ? exit.exit_price * (1 - inputs.exit.fee_pct)
      : 0;
    const debtBalanceAtExit = financing?.total_eofy_balance[exitYear] ?? 0;

    if (exit && exitYear > 0 && exitYear < n) {
      operatingCashFlow[exitYear] += exitPriceNetOfFees;
      loanPrincipal[exitYear] -= debtBalanceAtExit;
    }

    if (exit && exitYear > 0) {
      for (let t = exitYear + 1; t < n; t++) {
        ebitda[t] = 0;
        yieldNet[t] = 0;
        taxPayment[t] = 0;
        operatingCashFlow[t] = 0;
        debtDrawn[t] = 0;
        interestExpense[t] = 0;
        loanPrincipal[t] = 0;
      }
    }

    // ─── Equity CF · residual at t=0 to land cash[0] = 0 ──────────
    const equityDrawn = z();
    if (investment && financing) {
      // Σ(Y0 inflows) + equity = Σ(Y0 outflows)
      // equity = total_investment − total_debt_drawn[Y0] (− initial cash)
      const y0Outflows =
        -acquisition[0] - capex[0] - contingencyInsurance[0] - acquisitionFeesTaxes[0];
      const y0InflowsExEquity = debtDrawn[0];
      equityDrawn[0] = Math.max(0, y0Outflows - y0InflowsExEquity);
    }

    // ─── Net CF + Change-in-cash bridge ────────────────────────────
    const netCashFlow = z();
    for (let t = 0; t < n; t++) {
      netCashFlow[t] =
        operatingCashFlow[t] +
        acquisition[t] +
        capex[t] +
        contingencyInsurance[t] +
        acquisitionFeesTaxes[t] +
        debtDrawn[t] +
        interestExpense[t] +
        loanPrincipal[t] +
        equityDrawn[t];
    }
    const changeInCashBs = netCashFlow.slice();

    return {
      ebitda_after_replacement: ebitda,
      yield_net: yieldNet,
      tax_payment: taxPayment,
      acquisition,
      capex,
      contingency_insurance: contingencyInsurance,
      acquisition_fees_taxes: acquisitionFeesTaxes,
      operating_cash_flow: operatingCashFlow,
      debt_drawn: debtDrawn,
      interest_expense: interestExpense,
      loan_principal: loanPrincipal,
      equity_drawn: equityDrawn,
      net_cash_flow: netCashFlow,
      change_in_cash_bs: changeInCashBs,
    };
  },
};
