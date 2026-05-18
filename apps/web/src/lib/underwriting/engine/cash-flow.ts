import type { EngineModule } from "./_types";
import type { CashFlowSchedule } from "../types";
import { zeroSeries } from "../temporal";

/**
 * Module · cash_flow.
 * Direct method · ties operating EBITDA → tax → CAPEX → financing
 * activities → net cash · which must reconcile with BS cash delta.
 * BLOCK 3 fills · current returns contract-shaped zeros.
 */
export const cashFlowModule: EngineModule<"cash_flow"> = {
  key: "cash_flow",
  dependsOn: ["pnl", "financing", "dta", "investment", "exit"],
  compute({ inputs }): CashFlowSchedule {
    const z = () => zeroSeries(inputs.periods);
    return {
      ebitda_after_replacement: z(),
      yield_net: z(),
      tax_payment: z(),
      acquisition: z(),
      capex: z(),
      contingency_insurance: z(),
      acquisition_fees_taxes: z(),
      operating_cash_flow: z(),
      debt_drawn: z(),
      interest_expense: z(),
      loan_principal: z(),
      equity_drawn: z(),
      net_cash_flow: z(),
      change_in_cash_bs: z(),
    };
  },
};
