// FF&E reserve — operator_assumption (NEVER CoStar). CAPEX-driven (D1/D2).
//
// Decision (VALUATION_METHODOLOGY.md annex, firmado 2026-05-30):
//   · Default = 4% flat for operating assets WITHOUT CAPEX.
//   · Ramp 2% → 3% → 4% (cap at 4%, reached year 3) ONLY when hasCapex.
//   · hasCapex shares its source with the cap-rate engine renovation
//     signal (D4): a single corrected signal serves both the FF&E ramp
//     and the exit-state derivation.
//
// `hasCapex` is derived SEPARATELY from the cap-rate engine's `renovated`
// catch-all default (option B): only a NEW build or a renovation within
// the last CAPEX_RECENCY_YEARS counts; a Premium operator override
// supersedes. Everything else (no data, or old opening/renovation) → flat 4%.

/**
 * Renovation/opening within this many years still counts as "recent CAPEX".
 * Single-source policy parameter (Mike · 2026-05-30: widened 5 → 10). Drives
 * BOTH the FF&E ramp (D1) and the projected exit state (D4): an asset whose
 * last CAPEX/opening is within this window exits "renovated" (exit ≈ entry);
 * older or undated → "needs_work" (exit cap widens).
 */
export const CAPEX_RECENCY_YEARS = 10;

/** Stabilised reserve for operating assets without CAPEX. */
export const FFE_STABILIZED_PCT = 0.04;

/**
 * FF&E reserve % for a given operating year. `yearIndex0`: 0 = Year 1.
 *   hasCapex=false → 0.04 flat (every year)
 *   hasCapex=true  → 0.02, 0.03, 0.04, 0.04, … (cap at 0.04)
 */
export function ffeReservePct(yearIndex0: number, hasCapex: boolean): number {
  if (!hasCapex) return FFE_STABILIZED_PCT;
  const ramped = 0.02 + 0.01 * Math.max(0, yearIndex0);
  return Math.min(FFE_STABILIZED_PCT, ramped);
}

/**
 * Derive `hasCapex` from canonical opening/renovation years.
 * Premium operators can override the automatic calculation (HOOK · not
 * surfaced in UI this commit — `operatorOverride` is the wiring point).
 */
export function deriveHasCapex(
  signal: { year_opened: number | null; year_renovated_last: number | null },
  operatorOverride?: boolean | null,
): boolean {
  if (operatorOverride != null) return operatorOverride;
  const currentYear = new Date().getFullYear();
  const newBuild =
    signal.year_opened != null && currentYear - signal.year_opened <= CAPEX_RECENCY_YEARS;
  const recentReno =
    signal.year_renovated_last != null &&
    currentYear - signal.year_renovated_last <= CAPEX_RECENCY_YEARS;
  return newBuild || recentReno;
}
