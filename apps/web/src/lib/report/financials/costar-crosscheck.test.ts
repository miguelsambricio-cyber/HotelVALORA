import { describe, it, expect } from "vitest";
import { computePL } from "./calculations";
import { getDefaultAssumptions } from "./assumptions";
import { ffeReservePct, deriveHasCapex } from "./ffe-reserve";
import {
  resolveValuationMode,
  computeValuationFromNoi,
  noiForValuation,
} from "./valuation";
import type { PLAssumptions } from "./types";

// CoStar national-ES USALI percentages (from pnl_template / COSTAR_MASTER_FINANCIALS),
// expressed as FRACTIONS (the reader divides the BD percentages by 100).
const COSTAR_NATIONAL_ES = {
  revFB: (17.7 + 6.8) / 100,
  revMeeting: 0.038,
  revSpa: 0.022,
  revParkingOther: 0.019,
  expRooms: 0.257,
  expFB: 0.792,
  expOtherDept: 0.858,
  expAdmin: 0.072,
  expSalesMarketing: 0.065,
  expPropertyMaint: 0.038,
  expUtilities: 0.028,
  expMgmtFee: 0.046,
  expPropertyTax: 0.007,
  expInsurance: 0.004,
  expFfeReserve: 0.04,
};

function costarAssumptions(): PLAssumptions {
  return { ...getDefaultAssumptions(), ratios: { ...COSTAR_NATIONAL_ES } };
}

describe("FF&E reserve ramp (D1/D2 · CAPEX-driven)", () => {
  it("ramps 2→3→4 and caps at 4% when hasCapex", () => {
    expect(ffeReservePct(0, true)).toBeCloseTo(0.02, 10);
    expect(ffeReservePct(1, true)).toBeCloseTo(0.03, 10);
    expect(ffeReservePct(2, true)).toBeCloseTo(0.04, 10);
    expect(ffeReservePct(3, true)).toBeCloseTo(0.04, 10);
    expect(ffeReservePct(9, true)).toBeCloseTo(0.04, 10);
  });
  it("is flat 4% without CAPEX", () => {
    for (let y = 0; y < 10; y++) expect(ffeReservePct(y, false)).toBeCloseTo(0.04, 10);
  });
  it("deriveHasCapex: new build / recent reno true; old/no-data false; operator override wins", () => {
    const yr = new Date().getFullYear();
    expect(deriveHasCapex({ year_opened: yr - 2, year_renovated_last: null })).toBe(true);
    expect(deriveHasCapex({ year_opened: null, year_renovated_last: yr - 3 })).toBe(true);
    expect(deriveHasCapex({ year_opened: 1990, year_renovated_last: 2000 })).toBe(false);
    expect(deriveHasCapex({ year_opened: null, year_renovated_last: null })).toBe(false);
    expect(deriveHasCapex({ year_opened: 1990, year_renovated_last: null }, true)).toBe(true);
  });
});

describe("computePL · ×100 guard (a ratio error must never ship silently)", () => {
  it("every margin stays in [0,1] with CoStar fractions", () => {
    const pl = computePL(costarAssumptions());
    for (let y = 0; y < 5; y++) {
      const rev = pl.results.totalRevenue[y];
      expect(pl.results.gop[y] / rev).toBeGreaterThan(0);
      expect(pl.results.gop[y] / rev).toBeLessThan(1);
      expect(pl.results.ebitda[y] / rev).toBeGreaterThan(0);
      expect(pl.results.ebitda[y] / rev).toBeLessThan(1);
      expect(pl.results.ebitdaAfterReplacement[y] / rev).toBeGreaterThan(0);
      expect(pl.results.ebitdaAfterReplacement[y] / rev).toBeLessThan(1);
    }
  });
  it("would FAIL the guard if percentages were fed un-divided (×100 bug simulation)", () => {
    // Simulate the bug: feed percentages (×100) as ratios. EBITDA margin
    // explodes out of [0,1]; the guard above would catch it.
    const bug: PLAssumptions = {
      ...getDefaultAssumptions(),
      ratios: Object.fromEntries(
        Object.entries(COSTAR_NATIONAL_ES).map(([k, v]) => [k, v * 100]),
      ) as PLAssumptions["ratios"],
    };
    // ancillary sum >= 1 → computePL throws (its own guard) — also acceptable.
    let margin: number | null = null;
    try {
      const pl = computePL(bug);
      margin = pl.results.ebitda[0] / pl.results.totalRevenue[0];
    } catch {
      margin = null;
    }
    if (margin !== null) expect(margin < 0 || margin > 1).toBe(true);
  });
});

describe("EBITDA reconciliation (cross-check §7)", () => {
  // #1 · CoStar-style (re-include IT + rent) reproduces the published row.
  it("#1 reconstructs CoStar GOP 36.7% / EBITDA 23.2% (±1pp) with IT + rent", () => {
    const r = COSTAR_NATIONAL_ES;
    const rooms = 1 - (r.revFB + r.revMeeting + r.revSpa + r.revParkingOther);
    const other = r.revMeeting + r.revSpa + r.revParkingOther;
    const it = 0.013;
    const rent = 0.078;
    const dept = r.expRooms * rooms + r.expFB * r.revFB + r.expOtherDept * other;
    const undist = r.expAdmin * rooms + it + r.expSalesMarketing + r.expPropertyMaint + r.expUtilities;
    const gop = 1 - dept - undist;
    const ebitda = gop - r.expMgmtFee - rent - r.expPropertyTax - r.expInsurance;
    expect(gop).toBeGreaterThan(0.357);
    expect(gop).toBeLessThan(0.377); // 36.7% ± 1pp
    expect(ebitda).toBeGreaterThan(0.222);
    expect(ebitda).toBeLessThan(0.242); // 23.2% ± 1pp
  });

  // #2 · HV model (no IT, no rent) via computePL. HV GOP ≈ CoStar GOP + IT.
  it("#2 computePL (HV model) GOP ≈ 38% and closes the F&B gap (0.792 vs 0.65)", () => {
    const plCostar = computePL(costarAssumptions());
    const gopMarginY1 = plCostar.results.gop[0] / plCostar.results.totalRevenue[0];
    expect(gopMarginY1).toBeGreaterThan(0.36);
    expect(gopMarginY1).toBeLessThan(0.40); // HV pre-rent/pre-IT, admin on rooms

    // The Stitch default (expFB 0.65) overstates GOP vs CoStar (expFB 0.792).
    const plStitch = computePL(getDefaultAssumptions());
    const gopStitch = plStitch.results.gop[0] / plStitch.results.totalRevenue[0];
    expect(gopStitch).toBeGreaterThan(gopMarginY1); // wiring CoStar LOWERS GOP toward reality
  });

  it("EBITDA after replacement < pre-replacement EBITDA (FF&E subtracted)", () => {
    const pl = computePL(costarAssumptions(), { hasCapex: false }); // flat 4%
    for (let y = 0; y < 5; y++) {
      expect(pl.results.ebitdaAfterReplacement[y]).toBeLessThan(pl.results.ebitda[y]);
    }
  });
});

describe("USALI coverage cascade · Level 2 national applied (Barajas)", () => {
  // Level 2: a submarket with NO own USALI (Barajas/Hortaleza) but with real
  // market data gets the NATIONAL USALI applied over its real ADR/occ/RevPAR.
  // The ratios are the national set; the market data is Barajas's own.
  function barajasLevel2(): PLAssumptions {
    return {
      ...getDefaultAssumptions(),
      ratios: { ...COSTAR_NATIONAL_ES },
      rooms: 150,
      occupancyYear1: 0.7648, // Barajas real occ (snapshot)
      adrYear1: 112.62,       // Barajas real ADR (snapshot)
    };
  }

  it("produces a coherent P&L · RevPAR matches the submarket, margins in [0,1] (×100 guard)", () => {
    const pl = computePL(barajasLevel2(), { hasCapex: false });
    // RevPAR Y1 = ADR × occ ≈ 86.13 (Barajas snapshot RevPAR)
    expect(pl.lineItems.revpar[0]).toBeCloseTo(112.62 * 0.7648, 2);
    const rev = pl.results.totalRevenue[0];
    expect(pl.results.gop[0] / rev).toBeGreaterThan(0.30);
    expect(pl.results.gop[0] / rev).toBeLessThan(0.45);
    // ×100 guard: EBITDA margins stay sane
    expect(pl.results.ebitda[0] / rev).toBeGreaterThan(0);
    expect(pl.results.ebitda[0] / rev).toBeLessThan(1);
    expect(pl.results.ebitdaAfterReplacement[0] / rev).toBeGreaterThan(0);
    expect(pl.results.ebitdaAfterReplacement[0] / rev).toBeLessThan(1);
    // EBITDA after replacement (valuation NOI) is positive
    expect(pl.results.ebitdaAfterReplacement[0]).toBeGreaterThan(0);
  });
});

describe("Valuation (F3 · D3 · X5)", () => {
  it("resolveValuationMode: free→TTM, pro→year 7 default, clamp 1..10", () => {
    expect(resolveValuationMode("free")).toEqual({ kind: "current_ttm" });
    expect(resolveValuationMode("pro")).toEqual({ kind: "exit_year", year: 7 });
    expect(resolveValuationMode("premium", 3)).toEqual({ kind: "exit_year", year: 3 });
    expect(resolveValuationMode("pro", 99)).toEqual({ kind: "exit_year", year: 10 });
    expect(resolveValuationMode("pro", 0)).toEqual({ kind: "exit_year", year: 1 });
  });

  it("X5: null unless CoStar ratios resolved AND cap rate present", () => {
    const pl = computePL(costarAssumptions());
    const a = costarAssumptions();
    const mode = resolveValuationMode("free");
    expect(computeValuationFromNoi({ pl, assumptions: a, capRatePct: null, costarRatiosResolved: true, mode })).toBeNull();
    expect(computeValuationFromNoi({ pl, assumptions: a, capRatePct: 6.5, costarRatiosResolved: false, mode })).toBeNull();
    const v = computeValuationFromNoi({ pl, assumptions: a, capRatePct: 6.5, costarRatiosResolved: true, mode });
    expect(v).not.toBeNull();
    expect(v!).toBeGreaterThan(0);
  });

  it("value = NOI(year) / cap; exit year > 5 uses terminal projection (>= year 5 NOI)", () => {
    const pl = computePL(costarAssumptions());
    const a = costarAssumptions();
    const noiY5 = noiForValuation(pl, a, { kind: "exit_year", year: 5 });
    const noiY7 = noiForValuation(pl, a, { kind: "exit_year", year: 7 });
    expect(noiY7).toBeGreaterThanOrEqual(noiY5); // terminal ADR growth (base scenario >= 0)
    const v = computeValuationFromNoi({ pl, assumptions: a, capRatePct: 6.5, costarRatiosResolved: true, mode: { kind: "exit_year", year: 7 } });
    expect(v).toBeCloseTo(Math.round(noiY7 / 0.065), 0);
  });
});
