// X4b · bridge computePL (5-year CoStar P&L) → the 11-year underwriting-engine
// `pl_drivers` shape, so the engine's IRR/exit run on the hotel's REAL
// NOI-after-replacement instead of the static placeholder drivers.
//
// Mapping (Decision A · Mike 2026-05-30): the full GOP goes into the engine's
// `gop.hotel` line (fb/other = 0). What matters for EBITDA/IRR is the SUM
// (= GOP); the per-department split of the engine's 5-year table is cosmetic
// and was already deferred (pl-data-divergence.md). Costs map 1:1 and are
// stored NEGATIVE (engine convention). The result:
//
//   engine ebitda_after_replacement[y] = GOP[y] − mgmt − tax − insurance − ffe
//                                       = computePL ebitdaAfterReplacement[y]
//
// Horizon: Y0 = 0 (acquisition · no ops); Y1-Y5 from computePL; Y6-Y10 by
// terminal projection (occupancy flat at Y5, ADR grown at the scenario's
// terminal delta → margins held → every line scales by the same factor),
// identical to `valuation.ts` noiForValuation.

import type { PLAssumptions, PLComputed } from "./types";
import { SCENARIO_PRESETS } from "./assumptions";

export interface EnginePlDrivers {
  gop: { hotel: number[]; fb: number[]; other: number[] };
  costs: {
    mgmt_fee: number[];
    property_tax: number[];
    property_insurance: number[];
    ffe_reserve: number[];
  };
}

/** Default engine horizon · Y0..Y10 (11 periods). */
export const ENGINE_HORIZON = 11;

export function buildEnginePlDrivers(
  pl: PLComputed,
  assumptions: PLAssumptions,
  horizon: number = ENGINE_HORIZON,
): EnginePlDrivers {
  const lastDelta = SCENARIO_PRESETS[assumptions.activeScenario].adrGrowth[3];

  // engine year-index e: 0 = Y0 (acquisition · no ops). e>=1 operating.
  // computePL is 5-year (idx 0..4 = Y1..Y5). Y6+ uses terminal projection.
  const at = (series5: readonly number[], e: number): number => {
    if (e <= 0) return 0;
    if (e <= 5) return series5[e - 1];
    return series5[4] * Math.pow(1 + lastDelta, e - 5);
  };

  const idx = Array.from({ length: horizon }, (_, e) => e);
  const gop = pl.results.gop;
  const mgmt = pl.lineItems["exp-mgmt-fee"];
  const tax = pl.lineItems["exp-property-tax"];
  const ins = pl.lineItems["exp-insurance"];
  const ffe = pl.lineItems["exp-ffe-reserve"];

  return {
    gop: {
      hotel: idx.map((e) => at(gop, e)), // full GOP in the hotel line (Decision A)
      fb: idx.map(() => 0),
      other: idx.map(() => 0),
    },
    costs: {
      mgmt_fee: idx.map((e) => -at(mgmt, e)),
      property_tax: idx.map((e) => -at(tax, e)),
      property_insurance: idx.map((e) => -at(ins, e)),
      ffe_reserve: idx.map((e) => -at(ffe, e)),
    },
  };
}
