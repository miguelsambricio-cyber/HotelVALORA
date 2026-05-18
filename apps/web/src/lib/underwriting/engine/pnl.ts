import type { EngineModule } from "./_types";
import type { PnlSchedule } from "../types";
import { addSeries, scaleSeries, zeroSeries } from "../temporal";
import { corporateIncomeTax, straightLineDepreciation } from "./formulas";

/**
 * Module · pnl.
 *
 * USALI-style P&L composed deterministically from:
 *   · inputs.pl_drivers (GOP departments + owner-side costs)
 *   · investment.capex_hard_cost.MEP basis → MEP D&A
 *   · investment.total_building_cost − MEP basis → Building D&A
 *   · financing.total_interest_expense → Financial Expenses
 *   · tax.cit_rate_pct → CIT (Ley IS · Block 4 wires DTA interaction)
 *
 * Sign convention (matches inputs):
 *   · GOP source lines are POSITIVE
 *   · Costs (mgmt fee / property tax / insurance / FF&E reserve) are
 *     stored NEGATIVE in inputs · added straight
 *   · D&A returned NEGATIVE
 *   · Financial Expenses returned NEGATIVE
 *   · CIT stored POSITIVE (it is an expense; NetIncome = EBT − CIT)
 *
 * Block 4 will:
 *   · route through dta.compute so non-deductible interest accumulates
 *     as a DTA asset, lowering effective CIT
 *   · split building vs MEP D&A into separate lines if the operator
 *     wants per-class visibility in the P&L view (today they sum)
 */
export const pnlModule: EngineModule<"pnl"> = {
  key: "pnl",
  dependsOn: ["investment", "financing"],
  compute({ inputs, prior }): PnlSchedule {
    const periods = inputs.periods;
    const z = () => zeroSeries(periods);

    const investment = prior.investment;
    const financing = prior.financing;

    const hotel = inputs.pl_drivers.gop.hotel.slice();
    const fb = inputs.pl_drivers.gop.fb.slice();
    const other = inputs.pl_drivers.gop.other.slice();
    const gross = addSeries(addSeries(hotel, fb), other);

    const mgmtFee = inputs.pl_drivers.costs.mgmt_fee.slice();
    const propTax = inputs.pl_drivers.costs.property_tax.slice();
    const propIns = inputs.pl_drivers.costs.property_insurance.slice();
    const ffeReserve = inputs.pl_drivers.costs.ffe_reserve.slice();
    const totalCosts = addSeries(addSeries(addSeries(mgmtFee, propTax), propIns), ffeReserve);

    const ebitda = addSeries(gross, totalCosts);

    // ─── D&A · building over building_years · MEP over mep_years ───
    const da = z();
    if (investment) {
      const mepBasis = investment.capex_hard_cost.find((l) => l.id === "mep")?.total_eur ?? 0;
      const buildingBasis = Math.max(investment.total_building_cost - mepBasis, 0);
      const buildingAnnual = straightLineDepreciation(buildingBasis, inputs.depreciation.building_years);
      const mepAnnual = straightLineDepreciation(mepBasis, inputs.depreciation.mep_years);
      for (let i = 1; i < periods.length; i++) {
        if (periods[i].kind !== "year") continue;
        const yearsSinceOpening = i - 1;
        const building = yearsSinceOpening < inputs.depreciation.building_years ? buildingAnnual : 0;
        const mep = yearsSinceOpening < inputs.depreciation.mep_years ? mepAnnual : 0;
        da[i] = -(building + mep);
      }
    }
    const ebit = addSeries(ebitda, da);

    // ─── Financial expenses · −Σ tranche interest ─────────────────
    const finExp = financing
      ? scaleSeries(financing.total_interest_expense, -1)
      : z();
    const ebt = addSeries(ebit, finExp);

    // ─── CIT · simple Block 3A pass · Ley IS limits land in dta.ts ─
    const cit = z();
    for (let i = 0; i < periods.length; i++) {
      cit[i] = corporateIncomeTax(ebt[i], inputs.tax.cit_rate_pct * 100);
    }
    const netIncome = ebt.map((v, i) => v - cit[i]);

    const totalNetIncome = new Array<number>(periods.length).fill(0);
    let cum = 0;
    for (let i = 0; i < periods.length; i++) {
      cum += netIncome[i];
      totalNetIncome[i] = cum;
    }

    return {
      hotel,
      fb,
      other_departments: other,
      gross_operating_profit: gross,
      mgmt_fee: mgmtFee,
      property_taxes: propTax,
      property_insurance: propIns,
      ffe_reserve: ffeReserve,
      total_costs: totalCosts,
      ebitda_after_replacement: ebitda,
      da,
      ebit,
      financial_expenses: finExp,
      ebt,
      cit,
      net_income: netIncome,
      total_net_income: totalNetIncome,
    };
  },
};
