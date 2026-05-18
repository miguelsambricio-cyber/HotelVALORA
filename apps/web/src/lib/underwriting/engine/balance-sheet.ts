import type { EngineModule } from "./_types";
import type { BalanceSheetSchedule } from "../types";
import { zeroSeries } from "../temporal";
import { straightLineDepreciation } from "./formulas";

/**
 * Module · balance_sheet · first-class reconciliation layer.
 *
 * Asset side (depreciated cost basis):
 *   · Building              · capex_total_ex_mep − cumulative building D&A
 *   · Installations (MEP)   · mep_basis           − cumulative MEP D&A
 *   · DTA asset             · dta.dta_end (tax-euro basis)
 *   · Cash                  · cash[t-1] + change_in_cash_bs[t]
 *
 * Equity side:
 *   · Initial equity        · constant · total_investment − total_debt
 *   · Reserves              · cumulative ACCOUNTING net income of prior periods
 *   · Net income period     · ACCOUNTING net income this period
 *   · Debt                  · financing.total_eofy_balance
 *
 * Accounting net income (NOT pnl.net_income · pnl uses simple basis):
 *   accounting_NI[t] = pnl.ebt[t] − dta.cit_pl[t]
 *
 * where dta.cit_pl includes both current tax + deferred tax movement.
 * This is what closes the BS balance — the DTA asset on the left side
 * is matched by the deferred-tax benefit boosting equity on the right.
 *
 * Invariant (enforced by reconciliation I-1):
 *   total_assets[t] ≡ total_eq_debt[t]   (±1 €)
 *
 * Exit-year treatment:
 *   · Asset depreciation continues through exit year
 *   · DTA, cash and debt mark the END of the exit year
 *   · Periods > exit_year hold post-exit residual state (cash carries
 *     the realisation proceeds; assets stay at depreciated cost since
 *     the engine does not yet zero them out · Block 4 may add an
 *     "asset disposal" entry to remove building + MEP from BS at exit)
 */
export const balanceSheetModule: EngineModule<"balance_sheet"> = {
  key: "balance_sheet",
  dependsOn: ["pnl", "financing", "dta", "cash_flow", "investment", "exit"],
  compute({ inputs, prior }): BalanceSheetSchedule {
    const periods = inputs.periods;
    const n = periods.length;
    const z = () => zeroSeries(periods);

    const pnl = prior.pnl;
    const dta = prior.dta;
    const financing = prior.financing;
    const investment = prior.investment;
    const cashFlow = prior.cash_flow;

    if (!pnl || !dta || !financing || !investment || !cashFlow) {
      return emptyBs(n);
    }

    // ─── Asset basis split ─────────────────────────────────────────
    const mepBasis = investment.capex_hard_cost.find((l) => l.id === "mep")?.total_eur ?? 0;
    const buildingBasis = Math.max(investment.total_building_cost - mepBasis, 0);

    const buildingAnnualDa = straightLineDepreciation(buildingBasis, inputs.depreciation.building_years);
    const mepAnnualDa = straightLineDepreciation(mepBasis, inputs.depreciation.mep_years);

    // Exit context · used for asset disposal + gain-on-sale recognition.
    const exit = prior.exit;
    const exitYear = exit?.exit_year ?? 0;
    const exitPriceNetOfFees = exit
      ? exit.exit_price * (1 - inputs.exit.fee_pct)
      : 0;

    // ─── Roll forward per period ──────────────────────────────────
    const building = z();
    const installationsMep = z();
    const nonCurrentAssets = z();
    const dtaAsset = z();
    const cash = z();
    const totalAssets = z();
    const equity = z();
    const initialEquity = z();
    const reserves = z();
    const netIncomePeriod = z();
    const debt = z();
    const totalEqDebt = z();

    const equityInvestment = Math.max(0, investment.total_building_cost - financing.total_principal);

    // ACCOUNTING net income · GAAP-aligned (current + deferred tax).
    // Augmented at exit_year with gain on sale so equity captures the
    // realisation event.
    const accountingNi = new Array<number>(n).fill(0);
    for (let t = 0; t < n; t++) {
      accountingNi[t] = (pnl.ebt[t] ?? 0) - (dta.cit_pl[t] ?? 0);
    }

    let cumDaBuilding = 0;
    let cumDaMep = 0;
    let runningCash = 0;
    let cumNiPrior = 0;

    for (let t = 0; t < n; t++) {
      // D&A accrues through exit year · post-exit the asset is disposed.
      if (t >= 1 && periods[t].kind === "year" && t <= exitYear) {
        const yearsSinceOpening = t - 1;
        if (yearsSinceOpening < inputs.depreciation.building_years) cumDaBuilding += buildingAnnualDa;
        if (yearsSinceOpening < inputs.depreciation.mep_years) cumDaMep += mepAnnualDa;
      }

      if (exit && t === exitYear && exitYear > 0) {
        // Recognise gain on sale at the moment of disposal · the gain
        // generates fiscal capacity that fully absorbs the residual DTA,
        // so we ALSO write off the DTA as a deferred-tax expense (it
        // would have been recovered against future operations that no
        // longer exist post-realisation).
        const bookValuePreDisposal =
          Math.max(0, buildingBasis - cumDaBuilding) +
          Math.max(0, mepBasis - cumDaMep);
        const gainOnSale = exitPriceNetOfFees - bookValuePreDisposal;
        const dtaWriteOff = dta.dta_end[t] ?? 0;
        accountingNi[t] += gainOnSale - dtaWriteOff;

        // Asset off the books post-disposal · DTA absorbed.
        building[t] = 0;
        installationsMep[t] = 0;
        dtaAsset[t] = 0;
      } else if (exit && t > exitYear && exitYear > 0) {
        // Post-exit · asset gone · debt repaid · DTA fully unwound.
        building[t] = 0;
        installationsMep[t] = 0;
        dtaAsset[t] = 0;
      } else {
        building[t] = Math.max(0, buildingBasis - cumDaBuilding);
        installationsMep[t] = Math.max(0, mepBasis - cumDaMep);
        dtaAsset[t] = dta.dta_end[t] ?? 0;
      }
      nonCurrentAssets[t] = building[t] + installationsMep[t];

      runningCash += cashFlow.change_in_cash_bs[t] ?? 0;
      cash[t] = runningCash;

      totalAssets[t] = nonCurrentAssets[t] + dtaAsset[t] + cash[t];

      initialEquity[t] = equityInvestment;
      reserves[t] = cumNiPrior;
      netIncomePeriod[t] = accountingNi[t];
      equity[t] = initialEquity[t] + reserves[t] + netIncomePeriod[t];

      // Debt zero post-exit (repaid at sale).
      debt[t] = exit && t > exitYear && exitYear > 0
        ? 0
        : exit && t === exitYear && exitYear > 0
          ? 0  // repaid at end of exit period
          : financing.total_eofy_balance[t] ?? 0;
      totalEqDebt[t] = equity[t] + debt[t];

      cumNiPrior += accountingNi[t];
    }

    return {
      non_current_assets: nonCurrentAssets,
      building,
      installations_mep: installationsMep,
      dta_asset: dtaAsset,
      cash,
      total_assets: totalAssets,
      equity,
      initial_equity: initialEquity,
      reserves,
      net_income_period: netIncomePeriod,
      debt,
      total_eq_debt: totalEqDebt,
    };
  },
};

function emptyBs(n: number): BalanceSheetSchedule {
  const z = () => new Array<number>(n).fill(0);
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
}
