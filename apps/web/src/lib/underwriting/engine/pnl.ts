import type { EngineModule } from "./_types";
import type { PnlSchedule } from "../types";
import { zeroSeries } from "../temporal";

/**
 * Module · pnl.
 * USALI-style P&L · GOP from departments → operator/owner costs →
 * EBITDA after replacement → D&A → EBIT → financial expenses → EBT
 * → CIT → net income.
 * BLOCK 3 fills · current returns contract-shaped zeros aligned to
 * inputs.periods.
 */
export const pnlModule: EngineModule<"pnl"> = {
  key: "pnl",
  dependsOn: ["investment", "financing"],
  compute({ inputs }): PnlSchedule {
    const z = () => zeroSeries(inputs.periods);
    return {
      hotel: z(),
      fb: z(),
      other_departments: z(),
      gross_operating_profit: z(),
      mgmt_fee: z(),
      property_taxes: z(),
      property_insurance: z(),
      ffe_reserve: z(),
      total_costs: z(),
      ebitda_after_replacement: z(),
      da: z(),
      ebit: z(),
      financial_expenses: z(),
      ebt: z(),
      cit: z(),
      net_income: z(),
      total_net_income: z(),
    };
  },
};
