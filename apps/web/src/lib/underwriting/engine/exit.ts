import type { EngineModule } from "./_types";
import type { ExitMetrics } from "../types";
import { zeroSeries } from "../temporal";
import { exitValueFromCap, irrPct, moic } from "./formulas";

/**
 * Module · exit · 4-layer institutional architecture.
 *
 *   Operational Exit     · stabilized NOI at exit year · operating truth
 *   Market Exit          · gross exit value + disposition fees · market truth
 *   Capital-Structure    · debt unwind (scheduled + bullet + payoff residual)
 *   Equity Layer         · distributable proceeds · IRR · MOIC · MoNic
 *
 * Hooks left for Block 6 (Cap Rate Engine) and Block 9 (waterfall):
 *   · exit_cap_rate_used     · already consumed via cap_rate.exit.used_pct
 *   · stabilized_noi         · exposed for Cap Rate Engine confidence sizing
 *   · debt_repayment_at_exit · ready for refinance-vs-sell scenario fork
 *   · promote_waterfall      · NOT YET · Block 9 splits equity_cash_flow
 *                              into LP/GP tranches with hurdles + catchups
 *
 * Sign conventions:
 *   · project_cash_flow[0]    NEGATIVE (acquisition + capex outflow)
 *   · project_cash_flow[t>0]  POSITIVE (operating CF before debt service)
 *   · equity_cash_flow[0]     NEGATIVE (equity injection)
 *   · equity_cash_flow[exit]  POSITIVE (distributions + exit proceeds)
 *   · debt_cash_flow[0]       POSITIVE (drawdown to equity sponsor side)
 *   · debt_cash_flow[t>0]     NEGATIVE (debt service)
 */
export const exitModule: EngineModule<"exit"> = {
  key: "exit",
  dependsOn: ["cap_rate", "pnl", "dta", "financing", "investment"],
  compute({ inputs, prior }): ExitMetrics {
    const periods = inputs.periods;
    const n = periods.length;
    const exitYear = Math.max(1, Math.min(n - 1, inputs.exit.year));

    const pnl = prior.pnl;
    const dta = prior.dta;
    const financing = prior.financing;
    const investment = prior.investment;
    const capRate = prior.cap_rate;

    if (!pnl || !dta || !financing || !investment || !capRate) {
      return zeroExit(periods.length, inputs.exit.year, inputs.exit.fee_pct);
    }

    // ─── Layer 1 · Operational Exit ─────────────────────────────────
    // Stabilized NOI = EBITDA after Replacement at exit year.
    // (Operator can later override to "trailing 12-month average" via
    //  Block 4 setting · MVP uses point-in-time.)
    const stabilizedNoi = pnl.ebitda_after_replacement[exitYear] ?? 0;

    // ─── Layer 2 · Market Exit ──────────────────────────────────────
    const exitCapRatePct = capRate.exit.used_pct;
    const exitFeePct = inputs.exit.fee_pct * 100; // stored 0.015 → 1.5
    const exitPriceGross = exitValueFromCap(stabilizedNoi, exitCapRatePct);
    const exitFeesEur = exitPriceGross * (exitFeePct / 100);
    const exitPriceNetOfFees = exitPriceGross - exitFeesEur;

    // ─── Layer 3 · Capital-Structure Exit ───────────────────────────
    // Debt repayment at exit = scheduled payment THIS YEAR
    //   + remaining EoFY balance (paid off in full at sale).
    const debtBalanceAfterScheduled = financing.total_eofy_balance[exitYear] ?? 0;
    const scheduledPaymentExitYr = financing.total_payment[exitYear] ?? 0;
    const debtRepaymentAtExit = scheduledPaymentExitYr + debtBalanceAfterScheduled;

    // ─── Layer 4 · Equity Layer ─────────────────────────────────────
    const equityInvestment = Math.max(0, investment.total_building_cost - financing.total_principal);

    const projectCf = zeroSeries(periods);
    const equityCf = zeroSeries(periods);
    const debtCf = zeroSeries(periods);

    // Period 0 · drawdowns + outflows.
    projectCf[0] = -investment.total_building_cost;
    equityCf[0] = -equityInvestment;
    debtCf[0] = financing.total_drawdown[0] ?? 0;

    // Periods 1..exitYear · operating cash flows.
    for (let t = 1; t <= exitYear; t++) {
      const ebitda = pnl.ebitda_after_replacement[t] ?? 0;
      const cashTax = dta.tax_payment[t] ?? 0;
      const debtService = financing.total_payment[t] ?? 0;
      const interest = financing.total_interest_expense[t] ?? 0;
      const principal = (financing.total_loan_principal[t] ?? 0) + (financing.total_bullet_principal[t] ?? 0);

      // Project CF · pre-debt operating cash less cash taxes.
      projectCf[t] = ebitda - cashTax;
      // Equity CF · project CF less debt service.
      equityCf[t] = projectCf[t] - debtService;
      // Debt CF (sponsor view) · negative outflow during life.
      debtCf[t] = -(interest + principal);
    }

    // Exit-year additions.
    projectCf[exitYear] += exitPriceNetOfFees;
    equityCf[exitYear] += exitPriceNetOfFees - debtBalanceAfterScheduled;
    debtCf[exitYear] += -debtBalanceAfterScheduled;

    // ─── IRR / MOIC ────────────────────────────────────────────────
    const projectIrrPct = irrPct(projectCf);
    const equityIrrPct = irrPct(equityCf);
    const moicValue = moic(equityCf);

    const profitShare = equityCf.reduce((acc, v) => acc + (v > 0 ? v : 0), 0) - equityInvestment;

    return {
      exit_cap_rate_pct: exitCapRatePct,
      exit_year: exitYear,
      exit_fee_pct: inputs.exit.fee_pct,
      exit_price: exitPriceGross,
      exit_price_per_room: investment.total_building_cost > 0 && inputs.asset.rooms > 0
        ? exitPriceGross / inputs.asset.rooms
        : 0,
      exit_price_per_sqm: inputs.asset.total_sqm > 0 ? exitPriceGross / inputs.asset.total_sqm : 0,
      debt_repayment_at_exit: debtRepaymentAtExit,
      equity_investment: equityInvestment,
      profit_share: profitShare,
      project_cash_flow: projectCf,
      equity_cash_flow: equityCf,
      debt_cash_flow: debtCf,
      project_irr_pct: Number.isFinite(projectIrrPct) ? projectIrrPct : 0,
      equity_irr_pct: Number.isFinite(equityIrrPct) ? equityIrrPct : 0,
      moic: moicValue,
    };
  },
};

function zeroExit(n: number, exitYear: number, feePct: number): ExitMetrics {
  const z = () => new Array<number>(n).fill(0);
  return {
    exit_cap_rate_pct: 0,
    exit_year: exitYear,
    exit_fee_pct: feePct,
    exit_price: 0,
    exit_price_per_room: 0,
    exit_price_per_sqm: 0,
    debt_repayment_at_exit: 0,
    equity_investment: 0,
    profit_share: 0,
    project_cash_flow: z(),
    equity_cash_flow: z(),
    debt_cash_flow: z(),
    project_irr_pct: 0,
    equity_irr_pct: 0,
    moic: 0,
  };
}
