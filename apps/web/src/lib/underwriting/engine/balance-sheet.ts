import type { EngineModule } from "./_types";
import type { BalanceSheetSchedule } from "../types";
import { zeroSeries } from "../temporal";

/**
 * Module · balance_sheet.
 * Asset side (building net of D&A + MEP net + DTA + cash) and
 * equity/debt side. Invariant: total_assets ≡ total_eq_debt every
 * period (±1 € rounding).
 * BLOCK 3 fills · current returns contract-shaped zeros.
 */
export const balanceSheetModule: EngineModule<"balance_sheet"> = {
  key: "balance_sheet",
  dependsOn: ["pnl", "financing", "dta", "cash_flow", "investment"],
  compute({ inputs }): BalanceSheetSchedule {
    const z = () => zeroSeries(inputs.periods);
    return {
      non_current_assets: z(),
      building: z(),
      installations_mep: z(),
      dta_asset: z(),
      cash: z(),
      total_assets: z(),
      equity: z(),
      initial_equity: z(),
      reserves: z(),
      net_income_period: z(),
      debt: z(),
      total_eq_debt: z(),
    };
  },
};
