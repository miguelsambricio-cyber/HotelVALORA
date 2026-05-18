import type { EngineModule } from "./_types";
import type { InvestmentBreakdown } from "../types";

/**
 * Module · investment.
 * Computes acquisition costs + CAPEX hard / soft + contingency + per-key / per-sqm.
 * BLOCK 3 fills · current return is contract-shaped zeros.
 */
export const investmentModule: EngineModule<"investment"> = {
  key: "investment",
  dependsOn: ["cap_rate"],
  compute({ inputs }): InvestmentBreakdown {
    void inputs;
    return {
      site_acquisition_total: 0,
      capex_total: 0,
      contingency_insurance: 0,
      acquisition_fees_taxes: 0,
      total_building_cost: 0,
      acquisition: [],
      capex_hard_cost: [],
      capex_soft_cost: [],
      capex_project: [],
    };
  },
};
