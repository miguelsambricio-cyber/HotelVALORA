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
 * Renovation/opening within this many years counts as "recent CAPEX".
 * Single-source policy parameter (Mike · 2026-05-30: widened 5 → 10, aligned
 * with the typical hold). Drives the FF&E ramp (D1) and the renovation freshness
 * (D4): an asset with PROVEN reno/opening within this window earns the renovation
 * DISCOUNT (reward-only); older or undated → "needs_work" = NEUTRAL (no penalty).
 */
export const CAPEX_RECENCY_YEARS = 10;

/** A build opened within this many years (and never renovated) is "new"/turnkey. */
export const NEW_BUILD_RECENCY_YEARS = 5;

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
 * Derive `hasCapex` from canonical opening/renovation years, measured AT TODAY.
 * Drives the FF&E ramp (D1 · operating-year reserve · entry recency).
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

export type AssetCondition = "new" | "renovated" | "needs_work";

interface CapexSignal {
  year_opened: number | null;
  year_renovated_last: number | null;
}

/**
 * Renovation freshness AS OF a given year (today for entry · sale year for exit).
 * REWARD-ONLY (Mike · 2026-05-30): only PROOF of recent renovation/opening
 * (≤recency) earns "renovated"/"new"; no proof or old → "needs_work", which the
 * cap policy treats as NEUTRAL (0), not a penalty. No comfort proxy here —
 * comfort/location quality is deferred to TRAMO 5.
 */
function classifyByAge(asOfYear: number, sig: CapexSignal, recencyYears: number, newBuildYears: number): AssetCondition {
  if (sig.year_renovated_last == null && sig.year_opened != null && asOfYear - sig.year_opened <= newBuildYears) {
    return "new";
  }
  const effective = sig.year_renovated_last ?? sig.year_opened;
  if (effective != null && asOfYear - effective <= recencyYears) return "renovated";
  return "needs_work";
}

/** Asset condition AT ENTRY · measured at TODAY. */
export function deriveEntryState(
  sig: CapexSignal,
  recencyYears: number = CAPEX_RECENCY_YEARS,
  newBuildYears: number = NEW_BUILD_RECENCY_YEARS,
): AssetCondition {
  return classifyByAge(new Date().getFullYear(), sig, recencyYears, newBuildYears);
}

/**
 * Projected condition AT THE EXIT YEAR (D4). Measured at the SALE year, not
 * today, so a value-add deal keeps its reward at exit when hold ≤ recency.
 *  - reposition/value-add (`isReposition`): renovated at year 0 → age = hold.
 *  - stabilised: age the existing date forward = (today + hold) − reno/open year.
 * The recency window (10y) is ALIGNED with the typical hold: a reform at the
 * start of a 7-year hold has not expired at exit (7 ≤ 10 → keeps the discount).
 * Reposition is an explicit DEAL flag (not the condition) — decoupled so an
 * old asset held as-is stays "needs_work" (neutral) at both ends, not value-add.
 */
export function deriveExitState(
  sig: CapexSignal,
  holdYears: number,
  opts: { isReposition?: boolean; recencyYears?: number; newBuildYears?: number } = {},
): AssetCondition {
  const recency = opts.recencyYears ?? CAPEX_RECENCY_YEARS;
  const newBuild = opts.newBuildYears ?? NEW_BUILD_RECENCY_YEARS;
  if (opts.isReposition) return holdYears <= recency ? "renovated" : "needs_work";
  return classifyByAge(new Date().getFullYear() + holdYears, sig, recency, newBuild);
}
