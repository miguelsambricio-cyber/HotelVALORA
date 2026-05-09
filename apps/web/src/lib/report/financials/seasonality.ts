// Monthly seasonality engine for Year 1 expansion.
//
// Why this lives in its own module
// ────────────────────────────────
// The annual P&L (computePL) intentionally knows nothing about monthly
// distribution — that's a concern of the underwriting view layer, and the
// data sources differ:
//
//   - Annual ratios + scenario presets come from the per-hotel assumption
//     store (ultimately CoStar by market × class).
//   - Monthly seasonality is a *separate* CoStar dataset — STR / CoStar
//     publishes monthly demand curves per (country, market, submarket,
//     hotel class). A market like Madrid has ~12 dimensional seasonality
//     points; a beach destination has very different curves.
//
// Architecture for future Excel/CoStar ingestion
// ──────────────────────────────────────────────
// 1. `SeasonalityProfile` is the canonical contract — anyone who can
//    produce 12 occupancy + 12 ADR multipliers can plug in.
// 2. `getSeasonalityProfile(market, hotelClass)` is the lookup — today
//    returns the hand-tuned default; tomorrow it queries the CoStar
//    dataset / Excel ingestion service.
// 3. `expandYear1ToMonthly(assumptions, computed, profile)` is the pure
//    pipeline that maps annual → 12 months. Adding a new market means
//    extending the profile lookup, NOT touching the calc.
// 4. Adapter functions (e.g. `adapterFromCoStarMonthlyExcel`) live here
//    and produce `SeasonalityProfile` from raw Excel rows. UI never sees
//    raw Excel.
//
// Mathematical guarantees
// ───────────────────────
// Sum of monthly values = annual Year-1 value, exactly. Three mechanics:
//   - Variable lines (revenue, mgmt fee, FF&E, dept variable portion):
//     ratio × monthly revenue base → trivially sums to ratio × annual.
//   - Inflated lines (Admin / S&M / Property maint / Utilities / Property
//     tax): distributed pro-rata by days from the annual amount.
//   - Hybrid departmental fixed payroll portion: same pro-rata by days.

import type { PLAssumptions, PLComputed, PLLineItemId } from "./types";

export const MONTH_LABELS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
] as const;

export type MonthLabel = (typeof MONTH_LABELS)[number];

/** Standard non-leap-year days per calendar month — sums to 365. */
export const DAYS_IN_MONTH: readonly number[] = [
  31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31,
] as const;

export interface SeasonalityProfile {
  /**
   * Occupancy multipliers per month (12 values). Normalised at compute
   * time so the days-weighted average becomes 1.0 — i.e. monthly occ =
   * annual occ × multiplier reproduces the annual room-nights total.
   */
  occupancy: readonly number[];
  /**
   * ADR multipliers per month (12 values). Normalised at compute time
   * so the room-nights-weighted average becomes 1.0 — i.e. monthly ADR
   * = annual ADR × multiplier reproduces the annual rooms revenue total.
   */
  adr: readonly number[];
  /** Source identifier for traceability (e.g. "costar-MAD-luxury-2024Q4") */
  source: string;
}

/**
 * Default Madrid Upper Upscale seasonality.
 * Q2/Q3 strong (May–Jun, Sep–Oct); Aug weak (city emptied); Jan/Feb soft
 * (post-holiday); Dec mid-high (year-end). ADR roughly tracks demand.
 *
 * Future: replace with the result of `getSeasonalityProfile(market,
 * hotelClass)` returning a CoStar-sourced profile.
 */
export const MADRID_UPSCALE_SEASONALITY: SeasonalityProfile = {
  occupancy: [0.85, 0.85, 0.95, 1.05, 1.1, 1.1, 1.05, 0.85, 1.1, 1.1, 0.95, 1.05],
  adr: [0.92, 0.92, 0.96, 1.05, 1.1, 1.12, 1.05, 0.9, 1.1, 1.1, 0.95, 1.03],
  source: "default-madrid-upscale",
};

/**
 * Look up the seasonality profile for a (market, hotelClass) pair. v1
 * always returns the Madrid default; v2 will query the CoStar ingestion
 * service or read from a local Excel mapping.
 */
export function getSeasonalityProfile(
  _market: string = "madrid",
  _hotelClass: string = "upper-upscale",
): SeasonalityProfile {
  return MADRID_UPSCALE_SEASONALITY;
}

// ── Output shape ────────────────────────────────────────────────────────────

export interface MonthlyYear1Breakdown {
  months: typeof MONTH_LABELS;
  /** 12 monthly values per line item — sums equal Year-1 totals exactly */
  lineItems: Record<PLLineItemId, number[]>;
  /** Aggregates per month */
  results: {
    totalRevenue: number[];
    gop: number[];
    ebitda: number[];
    /** EBITDA margin per month (varies by season — fixed costs concentrated in low months) */
    ebitdaMargin: number[];
  };
  /** Source identifier of the seasonality profile used (for PDF footer / traceability) */
  source: string;
}

// ── Pipeline ────────────────────────────────────────────────────────────────

/**
 * Hard-coded institutional default for the fixed-payroll share of
 * departmental cost. MUST stay in sync with `calculations.ts` —
 * the two functions describe the same accounting model from different
 * temporal granularities.
 */
const DEPT_PAYROLL_FIXED_SHARE = 0.3;

const TOTAL_DAYS = DAYS_IN_MONTH.reduce((a, b) => a + b, 0); // 365

export function expandYear1ToMonthly(
  assumptions: PLAssumptions,
  computed: PLComputed,
  profile: SeasonalityProfile = MADRID_UPSCALE_SEASONALITY,
): MonthlyYear1Breakdown {
  // ── 1. Normalise occupancy seasonality ──────────────────────────────
  // Goal: weighted avg by days = 1.0, so monthly occ = annual occ × m
  // reproduces the annual room-nights total exactly.
  const occWeightedSum = profile.occupancy.reduce(
    (s, o, i) => s + o * DAYS_IN_MONTH[i],
    0,
  );
  const occMult = profile.occupancy.map(
    (o) => (o * TOTAL_DAYS) / occWeightedSum,
  );

  // ── 2. Monthly room nights sold ─────────────────────────────────────
  const monthlyRoomNightsSold = DAYS_IN_MONTH.map(
    (d, i) => assumptions.rooms * d * assumptions.occupancyYear1 * occMult[i],
  );
  const totalRoomNightsSold = monthlyRoomNightsSold.reduce((a, b) => a + b, 0);

  // ── 3. Normalise ADR seasonality ────────────────────────────────────
  // Weighted by room nights sold (so revenue-weighted avg ADR matches).
  const adrWeightedSum = profile.adr.reduce(
    (s, a, i) => s + a * monthlyRoomNightsSold[i],
    0,
  );
  const adrMult = profile.adr.map(
    (a) => (a * totalRoomNightsSold) / adrWeightedSum,
  );

  // ── 4. Monthly key metrics (Occupancy / ADR / RevPAR) ───────────────
  const monthlyOccupancy = occMult.map((m) => assumptions.occupancyYear1 * m);
  const monthlyAdr = adrMult.map((m) => assumptions.adrYear1 * m);
  const monthlyRevpar = monthlyAdr.map((adr, i) => adr * monthlyOccupancy[i]);

  // ── 5. Monthly Rooms revenue (driver) ───────────────────────────────
  const monthlyRoomsRev = monthlyRevpar.map(
    (rp, i) => rp * assumptions.rooms * DAYS_IN_MONTH[i],
  );

  // ── 6. Monthly Total revenue + ancillary lines ──────────────────────
  const ancillarySum =
    assumptions.ratios.revFB +
    assumptions.ratios.revMeeting +
    assumptions.ratios.revSpa +
    assumptions.ratios.revParkingOther;
  const monthlyTotalRev = monthlyRoomsRev.map((r) => r / (1 - ancillarySum));
  const monthlyRevFB = monthlyTotalRev.map((t) => t * assumptions.ratios.revFB);
  const monthlyRevMeeting = monthlyTotalRev.map(
    (t) => t * assumptions.ratios.revMeeting,
  );
  const monthlyRevSpa = monthlyTotalRev.map((t) => t * assumptions.ratios.revSpa);
  const monthlyRevParkingOther = monthlyTotalRev.map(
    (t) => t * assumptions.ratios.revParkingOther,
  );

  // ── 7. Monthly departmental expenses (HYBRID 70/30) ─────────────────
  // Variable portion (0.7) scales with monthly dept revenue.
  // Fixed payroll portion (0.3) of the Year-1 annual amount distributed
  // pro-rata by days (constant payroll obligations across the year).
  const otherDeptRev = monthlyRevMeeting.map(
    (r, i) => r + monthlyRevSpa[i] + monthlyRevParkingOther[i],
  );
  const variableShare = 1 - DEPT_PAYROLL_FIXED_SHARE;

  const annualExpRoomsFixed =
    DEPT_PAYROLL_FIXED_SHARE * computed.lineItems["exp-rooms"][0];
  const annualExpFBFixed =
    DEPT_PAYROLL_FIXED_SHARE * computed.lineItems["exp-fb"][0];
  const annualExpOtherDeptFixed =
    DEPT_PAYROLL_FIXED_SHARE * computed.lineItems["exp-other-dept"][0];

  const monthlyExpRooms = monthlyRoomsRev.map(
    (r, i) =>
      variableShare * assumptions.ratios.expRooms * r +
      (annualExpRoomsFixed * DAYS_IN_MONTH[i]) / TOTAL_DAYS,
  );
  const monthlyExpFB = monthlyRevFB.map(
    (r, i) =>
      variableShare * assumptions.ratios.expFB * r +
      (annualExpFBFixed * DAYS_IN_MONTH[i]) / TOTAL_DAYS,
  );
  const monthlyExpOtherDept = otherDeptRev.map(
    (r, i) =>
      variableShare * assumptions.ratios.expOtherDept * r +
      (annualExpOtherDeptFixed * DAYS_IN_MONTH[i]) / TOTAL_DAYS,
  );

  // ── 8. Monthly undistributed expenses (FIXED — pro-rata by days) ───
  const distributePro = (annualValue: number, monthIdx: number) =>
    (annualValue * DAYS_IN_MONTH[monthIdx]) / TOTAL_DAYS;

  const monthlyExpAdmin = DAYS_IN_MONTH.map((_, i) =>
    distributePro(computed.lineItems["exp-admin"][0], i),
  );
  const monthlyExpSm = DAYS_IN_MONTH.map((_, i) =>
    distributePro(computed.lineItems["exp-sales-marketing"][0], i),
  );
  const monthlyExpPm = DAYS_IN_MONTH.map((_, i) =>
    distributePro(computed.lineItems["exp-property-maint"][0], i),
  );
  const monthlyExpUtilities = DAYS_IN_MONTH.map((_, i) =>
    distributePro(computed.lineItems["exp-utilities"][0], i),
  );

  // ── 9. Monthly non-operating ────────────────────────────────────────
  // Mgmt fee + FF&E reserve = ratio × monthly total revenue (variable).
  // Property tax = pro-rata by days from annual (slow-moving fixed).
  const monthlyExpMgmtFee = monthlyTotalRev.map(
    (t) => t * assumptions.ratios.expMgmtFee,
  );
  const monthlyExpFfeReserve = monthlyTotalRev.map(
    (t) => t * assumptions.ratios.expFfeReserve,
  );
  const monthlyExpPropertyTax = DAYS_IN_MONTH.map((_, i) =>
    distributePro(computed.lineItems["exp-property-tax"][0], i),
  );

  // ── 10. Aggregates ──────────────────────────────────────────────────
  const monthlyGop = monthlyTotalRev.map(
    (t, i) =>
      t -
      monthlyExpRooms[i] -
      monthlyExpFB[i] -
      monthlyExpOtherDept[i] -
      monthlyExpAdmin[i] -
      monthlyExpSm[i] -
      monthlyExpPm[i] -
      monthlyExpUtilities[i],
  );
  const monthlyEbitda = monthlyGop.map(
    (g, i) =>
      g - monthlyExpMgmtFee[i] - monthlyExpPropertyTax[i] - monthlyExpFfeReserve[i],
  );
  const monthlyEbitdaMargin = monthlyEbitda.map((e, i) =>
    monthlyTotalRev[i] > 0 ? e / monthlyTotalRev[i] : 0,
  );

  // ── 11. Pack ────────────────────────────────────────────────────────
  const lineItems: Record<PLLineItemId, number[]> = {
    "rooms-count": DAYS_IN_MONTH.map(() => assumptions.rooms),
    occupancy: monthlyOccupancy,
    adr: monthlyAdr,
    revpar: monthlyRevpar,

    "rev-rooms": monthlyRoomsRev,
    "rev-fb": monthlyRevFB,
    "rev-meeting": monthlyRevMeeting,
    "rev-spa": monthlyRevSpa,
    "rev-parking-other": monthlyRevParkingOther,

    "exp-rooms": monthlyExpRooms,
    "exp-fb": monthlyExpFB,
    "exp-other-dept": monthlyExpOtherDept,

    "exp-admin": monthlyExpAdmin,
    "exp-sales-marketing": monthlyExpSm,
    "exp-property-maint": monthlyExpPm,
    "exp-utilities": monthlyExpUtilities,

    "exp-mgmt-fee": monthlyExpMgmtFee,
    "exp-property-tax": monthlyExpPropertyTax,
    "exp-ffe-reserve": monthlyExpFfeReserve,
  };

  return {
    months: MONTH_LABELS,
    lineItems,
    results: {
      totalRevenue: monthlyTotalRev,
      gop: monthlyGop,
      ebitda: monthlyEbitda,
      ebitdaMargin: monthlyEbitdaMargin,
    },
    source: profile.source,
  };
}

// ── Future adapter contracts (skeleton — not used in v1) ───────────────────

/**
 * Stub for future CoStar Excel ingestion. The real implementation will
 * parse a worksheet of monthly metrics and produce a SeasonalityProfile.
 *
 *   import { read, utils } from "xlsx";
 *   const workbook = read(buffer, { type: "buffer" });
 *   const sheet = workbook.Sheets["Monthly"];
 *   const rows = utils.sheet_to_json<CoStarMonthlyRow>(sheet);
 *   return adapterFromCoStarMonthlyRows(rows);
 */
export interface CoStarMonthlyRow {
  month: string; // "Jan", "Feb", ...
  occupancy: number; // ratio 0..1
  adr: number; // currency
}

export function adapterFromCoStarMonthlyRows(
  rows: CoStarMonthlyRow[],
  source: string,
): SeasonalityProfile {
  // Convert absolute monthly values → multipliers (vs annual averages).
  // Caller passes the source string (market+class+vintage identifier).
  const occAvg = rows.reduce((s, r) => s + r.occupancy, 0) / rows.length;
  const adrAvg = rows.reduce((s, r) => s + r.adr, 0) / rows.length;
  return {
    occupancy: rows.map((r) => r.occupancy / occAvg),
    adr: rows.map((r) => r.adr / adrAvg),
    source,
  };
}
