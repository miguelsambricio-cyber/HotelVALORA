import type { EngineModule } from "./_types";
import type { DtaSchedule } from "../types";
import { zeroSeries } from "../temporal";

/**
 * Module · dta.
 * Spanish Ley IS · 30% EBITDA cap on financial expenses with a 1 M€
 * absolute floor of deductibility. Non-deductible interest accumulates
 * as a DTA asset, released when future EBITDA capacity allows.
 * BLOCK 3 fills · current returns contract-shaped zeros.
 */
export const dtaModule: EngineModule<"dta"> = {
  key: "dta",
  dependsOn: ["pnl"],
  compute({ inputs }): DtaSchedule {
    const z = () => zeroSeries(inputs.periods);
    return {
      ebit: z(),
      ebitda: z(),
      limit_ebitda_30pct: z(),
      limit_finexp_floor: z(),
      financial_expenses_after_limits: z(),
      ebt_after_limits: z(),
      dta_beginning: z(),
      dta_increases: z(),
      dta_decreases: z(),
      dta_end: z(),
      cit_pl: z(),
      dta_compensation: z(),
      tax_payment: z(),
    };
  },
};
