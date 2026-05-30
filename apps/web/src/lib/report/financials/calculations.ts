// USALI 5-year P&L computation.
//
// Pure function: same input → same output, no React, no I/O. The UI never
// computes — it consumes `PLComputed` from this module.
//
// Calculation model
// ─────────────────
// 1. Year-1 occupancy + ADR come from the assumption store
//    (`occupancyYear1`, `adrYear1`).
// 2. Year 2-5 occupancy = previous year + scenario preset's pp delta.
// 3. Year 2-5 ADR = previous year × (1 + scenario preset's ADR growth).
// 4. RevPAR per year = ADR × Occupancy.
// 5. Rooms revenue = RevPAR × rooms × daysInYear.
// 6. Total revenue = Rooms / (1 − sum of ancillary ratios).
// 7. Each ancillary revenue line = ratio × Total revenue.
// 8. Departmental expenses = HYBRID 70 / 30 split.
//    - 70% variable: ratio × department revenue (labour productivity
//      scales with the business — front-of-house, COGS, variable wages).
//    - 30% fixed-inflating: Year-1 ratio-derived base × `payroll`
//      inflation compounded (base payroll obligations: salaried staff,
//      contracted services). This activates the payroll inflation card —
//      the rate now drives departmental cost trajectory year-over-year
//      and produces the small late-cycle margin compression typical of
//      institutional underwriting models.
// 9. Undistributed expenses (Admin / S&M / Property maint / Utilities) =
//    Year-1 base × CPI compound. Each line picks its bucket:
//    - Admin, S&M, Property maint → `expenseInflation.other`
//    - Utilities                  → `expenseInflation.utilities`
//    These are largely fixed costs; growing slower than revenue creates
//    the operating leverage that expands EBITDA margin year-over-year.
// 10. Mgmt fee + FF&E reserve = ratio × Total revenue (VARIABLE — these
//     are typically % of revenue contracts).
// 11. Property tax & insurance = Year-1 base × `other` inflation (slow-
//     moving, indexed to property value).
// 12. GOP = Total − Departmental − Undistributed.
// 13. EBITDA = GOP − Non-operating.
// 14. EBITDA margin = EBITDA / Total Revenue.
//
// Switching `assumptions.activeScenario` re-projects the entire forecast
// because the preset lookup drives occupancy + ADR — every downstream line
// recomputes in the same pass. Tweaking `expenseInflation` shifts the
// fixed-cost trajectory and re-compounds the margin curve.

import type { FiveYears, PLAssumptions, PLComputed, PLLineItemId } from "./types";
import { SCENARIO_PRESETS } from "./assumptions";
import { ffeReservePct } from "./ffe-reserve";

const YEARS = 5 as const;

/** Options for the P&L computation that don't live on the assumption store. */
export interface ComputePLOptions {
  /**
   * Drives the FF&E reserve ramp (D1/D2). When the asset has CAPEX (new
   * build or recent renovation, or operator-set) the reserve ramps
   * 2%→3%→4%; otherwise it is a flat 4%. Default false (stabilised asset).
   */
  hasCapex?: boolean;
}

/**
 * Departmental expense split — what fraction is treated as fixed payroll
 * (inflated) vs variable (scales with revenue). 30% is the institutional
 * default for full-service hotels (salaried management + base FOH crew).
 * Future enhancement: expose per-department on `PLAssumptions`.
 */
const DEPT_PAYROLL_FIXED_SHARE = 0.3;

export function computePL(a: PLAssumptions, opts: ComputePLOptions = {}): PLComputed {
  const preset = SCENARIO_PRESETS[a.activeScenario];
  const hasCapex = opts.hasCapex ?? a.hasCapex ?? false;

  // ── 1. Year-by-year Occupancy / ADR / RevPAR ──────────────────────────
  const occupancy: number[] = new Array(YEARS);
  const adr: number[] = new Array(YEARS);
  const revpar: number[] = new Array(YEARS);

  occupancy[0] = a.occupancyYear1;
  adr[0] = a.adrYear1;
  revpar[0] = adr[0] * occupancy[0];

  for (let y = 1; y < YEARS; y++) {
    occupancy[y] = occupancy[y - 1] + preset.occDeltas[y - 1];
    adr[y] = adr[y - 1] * (1 + preset.adrGrowth[y - 1]);
    revpar[y] = adr[y] * occupancy[y];
  }

  // ── 2. Rooms revenue (driver) ─────────────────────────────────────────
  const revRooms = revpar.map((r) => r * a.rooms * a.daysInYear);

  // ── 3. Total revenue + ancillary revenues ─────────────────────────────
  const ancillarySum =
    a.ratios.revFB +
    a.ratios.revMeeting +
    a.ratios.revSpa +
    a.ratios.revParkingOther;
  if (ancillarySum >= 1) {
    throw new Error(
      `Ancillary revenue ratios sum to ${ancillarySum} — must be < 1`,
    );
  }
  const totalRevenue = revRooms.map((r) => r / (1 - ancillarySum));
  const revFB = totalRevenue.map((t) => t * a.ratios.revFB);
  const revMeeting = totalRevenue.map((t) => t * a.ratios.revMeeting);
  const revSpa = totalRevenue.map((t) => t * a.ratios.revSpa);
  const revParkingOther = totalRevenue.map((t) => t * a.ratios.revParkingOther);

  // ── 4. Departmental expenses (HYBRID 70/30: variable + payroll-inflated) ──
  const otherDeptRev = revMeeting.map((r, i) => r + revSpa[i] + revParkingOther[i]);

  const variableShare = 1 - DEPT_PAYROLL_FIXED_SHARE;
  const payrollInfl = (y: number) => Math.pow(1 + a.expenseInflation.payroll, y);

  // Year-1 ratio-derived baseline for the inflated portion
  const expRoomsY1 = revRooms[0] * a.ratios.expRooms;
  const expFBY1 = revFB[0] * a.ratios.expFB;
  const expOtherDeptY1 = otherDeptRev[0] * a.ratios.expOtherDept;

  const expRooms = times(YEARS, (y) =>
    variableShare * a.ratios.expRooms * revRooms[y] +
    DEPT_PAYROLL_FIXED_SHARE * expRoomsY1 * payrollInfl(y),
  );
  const expFB = times(YEARS, (y) =>
    variableShare * a.ratios.expFB * revFB[y] +
    DEPT_PAYROLL_FIXED_SHARE * expFBY1 * payrollInfl(y),
  );
  const expOtherDept = times(YEARS, (y) =>
    variableShare * a.ratios.expOtherDept * otherDeptRev[y] +
    DEPT_PAYROLL_FIXED_SHARE * expOtherDeptY1 * payrollInfl(y),
  );

  // ── 5. Undistributed expenses (FIXED — Y1 base × CPI compound) ────────
  // Year index `y` (0..4) → multiplier (1 + inflation)^y. Year 1 carries
  // the ratio-derived starting amount; Year 2-5 inflate from there.
  const otherInfl = (y: number) => Math.pow(1 + a.expenseInflation.other, y);
  const utilInfl = (y: number) => Math.pow(1 + a.expenseInflation.utilities, y);

  // Admin & general base = ROOMS revenue (USALI methodology §3.1: "s/ habitaciones").
  // This is the base that reproduces the CoStar GOP in the reconciliation
  // cross-check; the other undistributed lines stay on total revenue.
  const expAdminY1 = revRooms[0] * a.ratios.expAdmin;
  const expSmY1 = totalRevenue[0] * a.ratios.expSalesMarketing;
  const expPmY1 = totalRevenue[0] * a.ratios.expPropertyMaint;
  const expUtilY1 = totalRevenue[0] * a.ratios.expUtilities;

  const expAdmin = times(YEARS, (y) => expAdminY1 * otherInfl(y));
  const expSalesMarketing = times(YEARS, (y) => expSmY1 * otherInfl(y));
  const expPropertyMaint = times(YEARS, (y) => expPmY1 * otherInfl(y));
  const expUtilities = times(YEARS, (y) => expUtilY1 * utilInfl(y));

  // ── 6. GOP ────────────────────────────────────────────────────────────
  const gop = totalRevenue.map(
    (t, i) =>
      t -
      expRooms[i] -
      expFB[i] -
      expOtherDept[i] -
      expAdmin[i] -
      expSalesMarketing[i] -
      expPropertyMaint[i] -
      expUtilities[i],
  );

  // ── 7. Non-operating + EBITDA ─────────────────────────────────────────
  // Mgmt fee is a % of revenue contract (variable). Property tax & insurance
  // are slow-moving / indexed to property value (modelled as `other`
  // inflation from Year-1 base).
  //
  // EBITDA (pre-replacement · headline)  = GOP − mgmt − property_tax − insurance
  //   (HotelVALORA model: NO IT, NO rent · VALUATION_METHODOLOGY.md annex).
  // EBITDA after replacement (valuation) = EBITDA − FF&E reserve (CAPEX ramp).
  //   FF&E is an operator_assumption (NOT CoStar): flat 4% without CAPEX,
  //   ramp 2→3→4 with CAPEX (`ffeReservePct`, see ffe-reserve.ts).
  const expMgmtFee = totalRevenue.map((t) => t * a.ratios.expMgmtFee);
  const expPropertyTaxY1 = totalRevenue[0] * a.ratios.expPropertyTax;
  const expPropertyTax = times(YEARS, (y) => expPropertyTaxY1 * otherInfl(y));
  const expInsuranceY1 = totalRevenue[0] * a.ratios.expInsurance;
  const expInsurance = times(YEARS, (y) => expInsuranceY1 * otherInfl(y));
  const expFfeReserve = times(YEARS, (y) => ffeReservePct(y, hasCapex) * totalRevenue[y]);

  const ebitda = gop.map(
    (g, i) => g - expMgmtFee[i] - expPropertyTax[i] - expInsurance[i],
  );
  const ebitdaAfterReplacement = ebitda.map((e, i) => e - expFfeReserve[i]);
  const ebitdaMargin = ebitda.map((e, i) =>
    totalRevenue[i] > 0 ? e / totalRevenue[i] : 0,
  );

  // ── 8. Pack into the typed result ─────────────────────────────────────
  const lineItems: Record<PLLineItemId, FiveYears> = {
    "rooms-count": fixedFiveYears(a.rooms),
    occupancy: toFive(occupancy),
    adr: toFive(adr),
    revpar: toFive(revpar),

    "rev-rooms": toFive(revRooms),
    "rev-fb": toFive(revFB),
    "rev-meeting": toFive(revMeeting),
    "rev-spa": toFive(revSpa),
    "rev-parking-other": toFive(revParkingOther),

    "exp-rooms": toFive(expRooms),
    "exp-fb": toFive(expFB),
    "exp-other-dept": toFive(expOtherDept),

    "exp-admin": toFive(expAdmin),
    "exp-sales-marketing": toFive(expSalesMarketing),
    "exp-property-maint": toFive(expPropertyMaint),
    "exp-utilities": toFive(expUtilities),

    "exp-mgmt-fee": toFive(expMgmtFee),
    "exp-property-tax": toFive(expPropertyTax),
    "exp-insurance": toFive(expInsurance),
    "exp-ffe-reserve": toFive(expFfeReserve),
  };

  return {
    lineItems,
    results: {
      totalRevenue: toFive(totalRevenue),
      gop: toFive(gop),
      ebitda: toFive(ebitda),
      ebitdaAfterReplacement: toFive(ebitdaAfterReplacement),
      ebitdaMargin: toFive(ebitdaMargin),
    },
  };
}

// ── Helpers ─────────────────────────────────────────────────────────────────

function toFive(arr: number[]): FiveYears {
  return [arr[0], arr[1], arr[2], arr[3], arr[4]] as const;
}

function fixedFiveYears(value: number): FiveYears {
  return [value, value, value, value, value] as const;
}

/** `times(5, fn)` → [fn(0), fn(1), fn(2), fn(3), fn(4)] */
function times(n: number, fn: (i: number) => number): number[] {
  const out: number[] = new Array(n);
  for (let i = 0; i < n; i++) out[i] = fn(i);
  return out;
}
