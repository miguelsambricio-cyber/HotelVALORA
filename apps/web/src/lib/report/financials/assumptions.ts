// Default assumption set + scenario presets — Madrid Upper Upscale baseline.
//
// In production these come from a CoStar dataset row keyed by (country,
// market, submarket, class). Today they're hand-tuned to match the Stitch
// reference exactly (the BASE preset reproduces the Stitch table figures).

import type { UnderwritingScenario } from "@/lib/underwriting/scenario";
import type { PLAssumptions } from "./types";

/**
 * Per-scenario preset: 4 occupancy pp-deltas (Year 2 → Year 5) and 4 ADR
 * growth ratios (Year 2 → Year 5). Year 1 occupancy + ADR live on
 * `PLAssumptions.occupancyYear1` / `adrYear1` so the analyst can rebase
 * the starting point without touching the scenario shape.
 *
 * Numbers locked-in per the institutional spec:
 *
 *   DOWN  Occ deltas  +1.0pp  +1.0pp  +0.5pp  +0.5pp
 *         ADR growth  +1.5%   +2.0%   +2.0%   +2.5%
 *   BASE  Occ deltas  +3.0pp  +2.0pp  +1.0pp   0pp        ← matches Stitch
 *         ADR growth  +3.6%   +2.9%   +1.5%   +2.4%       ← matches Stitch
 *   UP    Occ deltas  +3.0pp  +2.0pp  +1.0pp   0pp
 *         ADR growth  +5.0%   +4.5%   +4.0%   +3.5%
 */
export const SCENARIO_PRESETS: Record<
  UnderwritingScenario,
  {
    /** Occupancy pp-delta per year, applied as: occ[y] = occ[y-1] + delta[y-1] */
    occDeltas: [number, number, number, number];
    /** ADR YoY growth ratio per year, applied as: adr[y] = adr[y-1] × (1 + g[y-1]) */
    adrGrowth: [number, number, number, number];
  }
> = {
  downside: {
    occDeltas: [0.01, 0.01, 0.005, 0.005],
    adrGrowth: [0.015, 0.02, 0.02, 0.025],
  },
  base: {
    occDeltas: [0.03, 0.02, 0.01, 0],
    adrGrowth: [0.036, 0.029, 0.015, 0.024],
  },
  upside: {
    occDeltas: [0.03, 0.02, 0.01, 0],
    adrGrowth: [0.05, 0.045, 0.04, 0.035],
  },
};

export function getDefaultAssumptions(): PLAssumptions {
  return {
    currency: "EUR",
    rooms: 300,

    // Year-1 base — Madrid Upper Upscale typical
    occupancyYear1: 0.65,
    adrYear1: 175,

    // Active scenario — defaults to BASE / Mercado
    activeScenario: "base",

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

    // EBITDA Stabilized card surfaces the derived Year-3 EBITDA % margin
    // (auto-tracks any edit to assumptions or scenario), not this target —
    // kept on the assumption store for future sensitivity / hurdle checks.
    ebitdaStabilizedTarget: 0.505,
    staffCostShare: 0.317,

    daysInYear: 365,
  };
}
