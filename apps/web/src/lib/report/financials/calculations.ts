// USALI 5-year P&L computation.
//
// Pure function: same input → same output, no React, no I/O. The UI never
// computes — it consumes `PLComputed` from this module. Future work plugs
// in different `PLAssumptions` sources (CoStar, Excel ingestion, REST API).
//
// Calculation model
// ─────────────────
// 1. Rooms revenue is the driver: RevPAR × rooms × daysInYear
// 2. Total revenue is solved from: Total = Rooms / (1 − sum of ancillary
//    revenue ratios), so Year-1 numbers respect the assumption ratios.
// 3. Each ancillary revenue line = ratio × Total revenue.
// 4. Departmental expenses = ratio × department revenue.
// 5. Undistributed + non-operating expenses = ratio × Total revenue.
// 6. GOP = Total − Departmental − Undistributed.
// 7. EBITDA = GOP − Non-operating.
// 8. Year-on-year propagation: RevPAR grows by the live `base` (Mercado)
//    scenario rate, applied as a constant across all 5 years. Occupancy
//    follows absolute pp deltas. ADR is then derived as RevPAR / Occupancy.
//    All ratios stay constant across years in v1 — `expenseInflation` is
//    captured in the assumption store but doesn't yet drive the table.

import type { FiveYears, PLAssumptions, PLComputed, PLLineItemId } from "./types";

const YEARS = 5 as const;

/**
 * Pure function: given the per-hotel assumption store, returns the computed
 * 5-year P&L. The active scenario is the `base` rate inside
 * `assumptions.scenarioGrowth` — downside / upside are stored for future
 * sensitivity comparison views and don't affect the live table.
 */
export function computePL(a: PLAssumptions): PLComputed {
  // ── 1. Year-by-year RevPAR / Occupancy / ADR ──────────────────────────
  const revpar: number[] = new Array(YEARS);
  const occupancy: number[] = new Array(YEARS);
  const adr: number[] = new Array(YEARS);

  occupancy[0] = a.occupancyYear1;
  adr[0] = a.adrYear1;
  revpar[0] = adr[0] * occupancy[0];

  // Live scenario for the table = base/Mercado, applied as a constant
  // year-over-year growth multiplier.
  const baseGrowth = a.scenarioGrowth.base;
  const revparMult = 1 + baseGrowth;

  const occDelta: [number, number, number, number] = [
    a.occupancyGrowth.yr2,
    a.occupancyGrowth.yr3,
    a.occupancyGrowth.yr4,
    a.occupancyGrowth.yr5,
  ];
  for (let y = 1; y < YEARS; y++) {
    revpar[y] = revpar[y - 1] * revparMult;
    occupancy[y] = occupancy[y - 1] + occDelta[y - 1];
    adr[y] = occupancy[y] > 0 ? revpar[y] / occupancy[y] : 0;
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
