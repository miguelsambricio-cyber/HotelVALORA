// Default assumption set + scenario presets — Madrid Upper Upscale baseline.
//
// In production these come from a CoStar dataset row keyed by (country,
// market, submarket, class). Today they're hand-tuned to match the Stitch
// reference exactly (the BASE preset reproduces the Stitch table figures).

import type { UnderwritingScenario } from "@/lib/underwriting/scenario";
import type { FacilityProfile, PLAssumptions } from "./types";
import { FACILITY_AWARE_FB_FACTORS } from "@/lib/admin/financials/defaults";

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

// ── Facility-aware rule ─────────────────────────────────────────────────────

/**
 * Adjust a base `PLAssumptions` for the actual facilities of a specific
 * hotel. This is the engine half of the facility-aware methodology rule
 * (operator decision firmed 2026-05-26, codified in `VALUATION_METHODOLOGY.md`).
 *
 * Two operations on the revenue ratios:
 *
 * 1. **Drop absent services** · For each ancillary revenue line, if the
 *    hotel doesn't have that facility, the ratio is set to 0. The compute
 *    layer (`computePL`) treats rooms revenue as the residual of total
 *    revenue minus ancillaries, so dropped lines naturally concentrate
 *    weight in rooms — exactly the apartahotel / boutique behaviour
 *    described in the methodology.
 *
 *      hasFB      = false → revFB           = 0
 *      hasMICE    = false → revMeeting      = 0
 *      hasSpa     = false → revSpa          = 0
 *      hasParking = false → revParkingOther = 0
 *
 * 2. **F&B uplift per extra restaurant** · When `restaurantsCount > 1`,
 *    each restaurant above the first adds a configurable factor to revFB,
 *    keyed by `hotel_type`:
 *
 *      urban  → +2% per extra outlet
 *      mixed  → +3% per extra outlet
 *      resort → +4% per extra outlet
 *
 *    The methodology principle: smaller urban venues add less F&B mix per
 *    outlet than larger resort/leisure venues.
 *
 * Defensive cap: if the resulting ancillary sum reaches 0.95, ratios are
 * scaled down proportionally so rooms residual stays >= 5%. This protects
 * `computePL` from the `ancillarySum >= 1` runtime error if an operator
 * configures absurd factors via admin.
 *
 * Pure function · no side effects · no I/O.
 */
export function applyFacilityAwareRule(
  base: PLAssumptions,
  profile: FacilityProfile,
  factors: { urban: number; mixed: number; resort: number } = FACILITY_AWARE_FB_FACTORS,
): PLAssumptions {
  // 1 · per-facility presence gate
  let revFB = profile.hasFB ? base.ratios.revFB : 0;
  const revMeeting = profile.hasMICE ? base.ratios.revMeeting : 0;
  const revSpa = profile.hasSpa ? base.ratios.revSpa : 0;
  const revParkingOther = profile.hasParking ? base.ratios.revParkingOther : 0;

  // 2 · F&B uplift · only when hotel actually has F&B AND > 1 restaurant
  if (profile.hasFB && profile.restaurantsCount !== null && profile.restaurantsCount > 1) {
    const factor = factors[profile.hotelType] ?? factors.urban;
    revFB = revFB + (profile.restaurantsCount - 1) * factor;
  }

  // 3 · defensive cap · ancillary sum must stay < 0.95 (rooms residual >= 5%)
  const ancillarySum = revFB + revMeeting + revSpa + revParkingOther;
  const scale = ancillarySum >= 0.95 ? 0.95 / ancillarySum : 1;

  return {
    ...base,
    ratios: {
      ...base.ratios,
      revFB: revFB * scale,
      revMeeting: revMeeting * scale,
      revSpa: revSpa * scale,
      revParkingOther: revParkingOther * scale,
    },
    facilityProfile: profile,
  };
}
