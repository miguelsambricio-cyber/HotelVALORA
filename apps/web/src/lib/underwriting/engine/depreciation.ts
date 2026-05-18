/**
 * Depreciation helpers.
 *
 * Not a DAG node · D&A series fold into the pnl module's output. This
 * file isolates the straight-line math so the test surface stays small.
 *
 * Block 3 wires:
 *   · building basis (capex hard cost ex-MEP) over building_years (25)
 *   · MEP basis (per-room × rooms) over mep_years (7)
 *   · refurbishment cycle / FF&E reserve interaction (Block 4)
 */

import type { Period, PeriodSeries } from "../temporal";
import { zeroSeries } from "../temporal";
import { straightLineDepreciation } from "./formulas";

export function annualDepreciation(
  basis: number,
  usefulLifeYears: number,
  periods: Period[],
  startPeriodIndex: number,
): PeriodSeries {
  const out = zeroSeries(periods);
  if (basis <= 0 || usefulLifeYears <= 0) return out;
  const annual = straightLineDepreciation(basis, usefulLifeYears);
  const end = Math.min(periods.length, startPeriodIndex + usefulLifeYears);
  for (let i = startPeriodIndex; i < end; i++) {
    if (periods[i]?.kind === "year") out[i] = annual;
  }
  return out;
}
