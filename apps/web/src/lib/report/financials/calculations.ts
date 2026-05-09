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
// 8. Departmental expenses = ratio × department revenue.
// 9. Undistributed + non-operating = ratio × Total revenue.
// 10. GOP = Total − Departmental − Undistributed.
// 11. EBITDA = GOP − Non-operating.
// 12. EBITDA margin = EBITDA / Total Revenue.
//
// Switching `assumptions.activeScenario` re-projects the entire forecast
// because the preset lookup drives occupancy + ADR — every downstream line
// recomputes in the same pass.

import type { FiveYears, PLAssumptions, PLComputed, PLLineItemId } from "./types";
import { SCENARIO_PRESETS } from "./assumptions";

const YEARS = 5 as const;

export function computePL(a: PLAssumptions): PLComputed {
  const preset = SCENARIO_PRESETS[a.activeScenario];

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

  // ── 4. Departmental expenses ──────────────────────────────────────────
  const expRooms = revRooms.map((r) => r * a.ratios.expRooms);
  const expFB = revFB.map((r) => r * a.ratios.expFB);
  const otherDeptRev = revMeeting.map((r, i) => r + revSpa[i] + revParkingOther[i]);
  const expOtherDept = otherDeptRev.map((r) => r * a.ratios.expOtherDept);

  // ── 5. Undistributed expenses ─────────────────────────────────────────
  const expAdmin = totalRevenue.map((t) => t * a.ratios.expAdmin);
  const expSalesMarketing = totalRevenue.map((t) => t * a.ratios.expSalesMarketing);
  const expPropertyMaint = totalRevenue.map((t) => t * a.ratios.expPropertyMaint);
  const expUtilities = totalRevenue.map((t) => t * a.ratios.expUtilities);

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
  const expMgmtFee = totalRevenue.map((t) => t * a.ratios.expMgmtFee);
  const expPropertyTax = totalRevenue.map((t) => t * a.ratios.expPropertyTax);
  const expFfeReserve = totalRevenue.map((t) => t * a.ratios.expFfeReserve);
  const ebitda = gop.map(
    (g, i) => g - expMgmtFee[i] - expPropertyTax[i] - expFfeReserve[i],
  );
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
    "exp-ffe-reserve": toFive(expFfeReserve),
  };

  return {
    lineItems,
    results: {
      totalRevenue: toFive(totalRevenue),
      gop: toFive(gop),
      ebitda: toFive(ebitda),
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
