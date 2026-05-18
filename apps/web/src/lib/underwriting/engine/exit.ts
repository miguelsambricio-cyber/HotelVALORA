import type { EngineModule } from "./_types";
import type { ExitMetrics } from "../types";
import { zeroSeries } from "../temporal";

/**
 * Module · exit.
 * Terminal value = stabilised NOI ÷ exit cap rate. Disposition fee
 * applied. Project IRR / equity IRR / MOIC built from per-period
 * cash flows.
 * BLOCK 3 fills · current returns contract-shaped zeros + uses the
 * operator-configured exit year as the only non-zero hint.
 */
export const exitModule: EngineModule<"exit"> = {
  key: "exit",
  dependsOn: ["cap_rate", "pnl", "financing"],
  compute({ inputs }): ExitMetrics {
    const z = () => zeroSeries(inputs.periods);
    return {
      exit_cap_rate_pct: 0,
      exit_year: inputs.exit.year,
      exit_fee_pct: inputs.exit.fee_pct,
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
  },
};
