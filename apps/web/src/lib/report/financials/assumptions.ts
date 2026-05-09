// Default assumption set — Madrid Upper Upscale baseline.
//
// In production this comes from a CoStar dataset row keyed by (country,
// market, submarket, class). Today it's hand-tuned to roughly match the
// Stitch P&L numbers while staying internally consistent (no contradictory
// ratios). When the Excel ingestion ships, replace `getDefaultAssumptions`
// with `getAssumptionsFromCoStar(market, class)`.

import type { UnderwritingScenario } from "@/lib/underwriting/scenario";
import type { PLAssumptions } from "./types";

/**
 * RevPAR growth profile per scenario. The "base" profile preserves the
 * Madrid Upper Upscale baseline; downside / upside flank it symmetrically.
 *
 * Future: this table will be sourced from CoStar dataset rows keyed by
 * (country × market × class) so each report carries its own scenario band.
 */
export const SCENARIO_GROWTH: Record<
  UnderwritingScenario,
  { yr2: number; yr3: number; yr4to5: number }
> = {
  downside: { yr2: 0.03, yr3: 0.02, yr4to5: 0.01 },
  base: { yr2: 0.085, yr3: 0.06, yr4to5: 0.03 },
  upside: { yr2: 0.12, yr3: 0.09, yr4to5: 0.05 },
};

export function getDefaultAssumptions(): PLAssumptions {
  return {
    currency: "EUR",
    rooms: 300,

    // Year-1 base — Madrid Upper Upscale typical
    occupancyYear1: 0.65,
    adrYear1: 175,

    // Top-card assumptions (scenario lives in the global store, not here)
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

    // Hero-card informational metrics (stabilized year, not Year-1)
    ebitdaStabilizedTarget: 0.505,
    staffCostShare: 0.317,

    daysInYear: 365,
  };
}
