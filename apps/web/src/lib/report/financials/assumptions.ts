// Default assumption set — Madrid Upper Upscale baseline.
//
// In production this comes from a CoStar dataset row keyed by (country,
// market, submarket, class). Today it's hand-tuned to roughly match the
// Stitch P&L reference. When the Excel ingestion ships, replace
// `getDefaultAssumptions` with `getAssumptionsFromCoStar(market, class)`.

import type { PLAssumptions } from "./types";

export function getDefaultAssumptions(): PLAssumptions {
  return {
    currency: "EUR",
    rooms: 300,

    // Year-1 base — Madrid Upper Upscale typical
    occupancyYear1: 0.65,
    adrYear1: 175,

    // ── Three scenario growth rates ──
    // Each rate is applied as a constant RevPAR growth across all 5 years.
    // The committee tunes these independently; the live P&L uses `base`.
    // Defaults preserve the prior baseline (Mercado = 6%) so the table
    // stays in the same order of magnitude.
    scenarioGrowth: {
      downside: 0.085, // Conservador
      base: 0.06, // Mercado — drives the live P&L
      upside: 0.03, // Optimista
    },

    occupancyGrowth: { yr2: 0.03, yr3: 0.02, yr4: 0.01, yr5: 0 },
    expenseInflation: { payroll: 0.045, utilities: 0.035, other: 0.025 },

    // ── Per-line ratios (constant across years in v1) ──
    ratios: {
      // Operating revenue — % of total revenue (rev-rooms is derived as residual)
      revFB: 0.25,
      revMeeting: 0.038,
      revSpa: 0.022,
      revParkingOther: 0.019,

      // Departmental expenses — % of department revenue
      expRooms: 0.257,
      expFB: 0.65,
      expOtherDept: 0.85,

      // Undistributed expenses — % of total revenue
      expAdmin: 0.072,
      expSalesMarketing: 0.06,
      expPropertyMaint: 0.045,
      expUtilities: 0.028,

      // Non-operating charges — % of total revenue
      expMgmtFee: 0.046,
      expPropertyTax: 0.011,
      expFfeReserve: 0.04,
    },

    // Hero-card informational metrics — `ebitdaStabilizedTarget` is no
    // longer surfaced in the UI (the card now displays the derived Year-3
    // EBITDA margin from `computePL`). Kept here so the assumption store
    // stays a complete underwriting input set; downstream sensitivities
    // can reference the analyst's target if they need to.
    ebitdaStabilizedTarget: 0.505,
    staffCostShare: 0.317,

    daysInYear: 365,
  };
}
