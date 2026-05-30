// Valuation mode + NOI/cap valuation (F3 · D3).
//
// Exit year is a PARAMETER gated by subscription plan (D3):
//   FREE          → current market value · NOI on TTM (Year 1)
//   PRO / PREMIUM → NOI at chosen exit year · default Year 7 · range 1..10
//
// X5: the NOI/cap value is computed ONLY when CoStar ratios are resolved
// AND the cap rate is present. Otherwise null (no fabricated value).

import type { PLAssumptions, PLComputed, Tier } from "./types";
import { SCENARIO_PRESETS } from "./assumptions";

export type ValuationMode =
  | { kind: "current_ttm" }
  | { kind: "exit_year"; year: number };

export const DEFAULT_EXIT_YEAR = 7;
export const MIN_EXIT_YEAR = 1; // TTM / Year 1
export const MAX_EXIT_YEAR = 10;

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

export function resolveValuationMode(tier: Tier, requestedExitYear?: number | null): ValuationMode {
  if (tier === "free") return { kind: "current_ttm" };
  const y = clamp(Math.round(requestedExitYear ?? DEFAULT_EXIT_YEAR), MIN_EXIT_YEAR, MAX_EXIT_YEAR);
  return { kind: "exit_year", year: y };
}

/**
 * NOI (EBITDA after replacement) for the valuation year. Years 1-5 read the
 * computed P&L. Years 6-10 use a terminal projection (D1): occupancy held
 * flat at Year 5, ADR grown at the scenario's terminal delta, margins + the
 * 4% stabilised FF&E held — so NOI scales with ADR beyond the explicit
 * 5-year window.
 */
export function noiForValuation(
  pl: PLComputed,
  assumptions: PLAssumptions,
  mode: ValuationMode,
): number {
  const series = pl.results.ebitdaAfterReplacement;
  const year = mode.kind === "current_ttm" ? 1 : mode.year;
  if (year <= 5) return series[clamp(year, 1, 5) - 1];
  const noiY5 = series[4];
  const lastDelta = SCENARIO_PRESETS[assumptions.activeScenario].adrGrowth[3];
  return noiY5 * Math.pow(1 + lastDelta, year - 5);
}

export interface ValuationArgs {
  pl: PLComputed;
  assumptions: PLAssumptions;
  capRatePct: number | null;
  /** X4 resolved real CoStar ratios (NOT the hard default fallback). */
  costarRatiosResolved: boolean;
  mode: ValuationMode;
}

/** NOI/cap valuation. X5: returns null unless CoStar ratios resolved AND cap rate present. */
export function computeValuationFromNoi(args: ValuationArgs): number | null {
  if (!args.costarRatiosResolved || args.capRatePct == null || args.capRatePct <= 0) return null;
  const noi = noiForValuation(args.pl, args.assumptions, args.mode);
  if (!Number.isFinite(noi) || noi <= 0) return null;
  return Math.round(noi / (args.capRatePct / 100));
}
