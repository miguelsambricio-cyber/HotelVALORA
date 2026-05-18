import type { EngineModule } from "./_types";
import type { PnlSchedule } from "../types";
import { zeroSeries } from "../temporal";
import { straightLineDepreciation } from "./formulas";

/**
 * Module · pnl.
 * USALI-style P&L · GOP from departments → operator/owner costs →
 * EBITDA after replacement → D&A → EBIT → financial expenses → EBT
 * → CIT → net income.
 *
 * Block 2 emits zero-shaped lines + a stub D&A schedule so Section 6
 * has something to render. Block 3 wires the operating math from
 * inputs.pl_drivers + financing.interest_expense.
 */
export const pnlModule: EngineModule<"pnl"> = {
  key: "pnl",
  dependsOn: ["investment", "financing"],
  compute({ inputs, prior }): PnlSchedule {
    const z = () => zeroSeries(inputs.periods);

    // Stub D&A · straight-line building + MEP starting Y1 so the D&A
    // block in Section 6 renders a realistic schedule. Block 3 replaces
    // this with the proper per-class split + asset rotation policy.
    const investment = prior.investment;
    const da = z();
    if (investment) {
      const mepBasis = (investment.capex_hard_cost.find((l) => l.id === "mep")?.total_eur ?? 0);
      const buildingBasis = Math.max(investment.total_building_cost - mepBasis, 0);
      const buildingAnnual = straightLineDepreciation(buildingBasis, inputs.depreciation.building_years);
      const mepAnnual = straightLineDepreciation(mepBasis, inputs.depreciation.mep_years);
      for (let i = 1; i < inputs.periods.length; i++) {
        const period = inputs.periods[i];
        if (period.kind !== "year") continue;
        const yearsSinceOpening = i - 1;
        const building = yearsSinceOpening < inputs.depreciation.building_years ? buildingAnnual : 0;
        const mep = yearsSinceOpening < inputs.depreciation.mep_years ? mepAnnual : 0;
        da[i] = -(building + mep);
      }
    }

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
      da,
      ebit: z(),
      financial_expenses: z(),
      ebt: z(),
      cit: z(),
      net_income: z(),
      total_net_income: z(),
    };
  },
};
