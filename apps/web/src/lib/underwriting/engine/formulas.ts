/**
 * Formula registry.
 *
 * Single source of truth for closed-form financial formulas referenced
 * across the engine. Centralising them avoids hidden inline variants
 * and makes audit + spreadsheet comparison straightforward.
 *
 * Convention: every formula has (a) a stable id (b) a one-line spec
 * comment (c) a pure implementation. Adding a formula here requires
 * an entry in docs/underwriting/formulas.md (Block 2 deliverable).
 */

import type { PeriodSeries } from "../temporal";

// ─── Coverage ratios ──────────────────────────────────────────────────

/** DSCR = NOI / Debt Service · NaN-safe · returns 0 when denom == 0. */
export function dscr(noi: number, debtService: number): number {
  if (!Number.isFinite(debtService) || debtService === 0) return 0;
  return noi / debtService;
}

/** ICR = NOI / Interest · NaN-safe · returns 0 when interest == 0. */
export function icr(noi: number, interest: number): number {
  if (!Number.isFinite(interest) || interest === 0) return 0;
  return noi / interest;
}

/** LTV = Debt Balance / Asset Value · NaN-safe. */
export function ltv(debtBalance: number, assetValue: number): number {
  if (!Number.isFinite(assetValue) || assetValue === 0) return 0;
  return debtBalance / assetValue;
}

// ─── Exit + valuation ─────────────────────────────────────────────────

/** Exit value = Stabilised NOI / Exit Cap Rate · returns 0 when cap is 0. */
export function exitValueFromCap(noiStabilised: number, capRatePct: number): number {
  if (capRatePct <= 0) return 0;
  return noiStabilised / (capRatePct / 100);
}

/** Gross-to-net at exit · subtracts disposition fee. */
export function exitNetProceeds(grossExit: number, feePct: number, debtAtExit: number): number {
  const fees = grossExit * (feePct / 100);
  return grossExit - fees - debtAtExit;
}

// ─── IRR + MOIC ───────────────────────────────────────────────────────

/** MOIC = sum(positive flows) / |sum(negative flows)|. */
export function moic(flows: PeriodSeries): number {
  let positive = 0;
  let negative = 0;
  for (const v of flows) {
    if (v > 0) positive += v;
    else if (v < 0) negative += -v;
  }
  if (negative === 0) return 0;
  return positive / negative;
}

/**
 * NPV of a flow series at decimal rate `r`. Helper for IRR routines.
 * Returns NaN on overflow / non-finite inputs · caller must defend.
 */
export function npv(flows: PeriodSeries, r: number): number {
  let acc = 0;
  for (let t = 0; t < flows.length; t++) {
    const denom = Math.pow(1 + r, t);
    if (!Number.isFinite(denom) || denom === 0) return NaN;
    acc += flows[t] / denom;
  }
  return acc;
}

/**
 * IRR · deterministic, bounded, edge-case-safe.
 *
 * Strategy:
 *   1. Validate the series has at least one positive AND one negative
 *      flow (else IRR is mathematically undefined · return NaN).
 *   2. Bracket the root by scanning a coarse rate grid.
 *   3. Run Newton-Raphson from the midpoint of the bracket for fast
 *      convergence (typically < 10 iterations).
 *   4. If NR diverges, falls outside the bracket, or oscillates,
 *      fall back to bisection inside the bracket (guaranteed
 *      convergence in ≤ 60 iterations to 1e-9 precision).
 *
 * Returns percentage value (e.g. 12.5 not 0.125). NaN means the IRR
 * is mathematically undefined (no sign change OR cash-flows fully
 * uniform) · caller MUST handle NaN explicitly in display.
 */
export function irrPct(flows: PeriodSeries, guess = 0.10): number {
  if (!flows.length) return NaN;
  let positives = 0;
  let negatives = 0;
  for (const v of flows) {
    if (!Number.isFinite(v)) return NaN;
    if (v > 0) positives++;
    if (v < 0) negatives++;
  }
  if (positives === 0 || negatives === 0) return NaN;

  // Coarse bracket scan · rates from −95% to +1,000%.
  const grid: number[] = [];
  for (let r = -0.95; r <= 10; r += 0.05) grid.push(r);
  let bracketLo: number | null = null;
  let bracketHi: number | null = null;
  let prevR = grid[0];
  let prevNpv = npv(flows, prevR);
  for (let i = 1; i < grid.length; i++) {
    const r = grid[i];
    const n = npv(flows, r);
    if (Number.isFinite(prevNpv) && Number.isFinite(n) && prevNpv * n < 0) {
      bracketLo = prevR;
      bracketHi = r;
      break;
    }
    prevR = r;
    prevNpv = n;
  }
  if (bracketLo === null || bracketHi === null) return NaN;

  // Newton-Raphson from bracket midpoint.
  const tol = 1e-9;
  const maxIterNR = 60;
  let rate = (bracketLo + bracketHi) / 2;
  for (let iter = 0; iter < maxIterNR; iter++) {
    let f = 0;
    let df = 0;
    let valid = true;
    for (let t = 0; t < flows.length; t++) {
      const denom = Math.pow(1 + rate, t);
      if (!Number.isFinite(denom) || denom === 0) { valid = false; break; }
      f += flows[t] / denom;
      df += (-t * flows[t]) / (denom * (1 + rate));
    }
    if (!valid || df === 0 || !Number.isFinite(df)) break;
    const newRate = rate - f / df;
    if (newRate <= bracketLo || newRate >= bracketHi || !Number.isFinite(newRate)) break;
    if (Math.abs(newRate - rate) < tol) return newRate * 100;
    rate = newRate;
  }

  // Bisection fallback · guaranteed inside the bracket.
  let lo = bracketLo;
  let hi = bracketHi;
  let fLo = npv(flows, lo);
  for (let iter = 0; iter < 200; iter++) {
    const mid = (lo + hi) / 2;
    const fMid = npv(flows, mid);
    if (Math.abs(fMid) < 1e-6 || (hi - lo) / 2 < tol) return mid * 100;
    if (fLo * fMid < 0) {
      hi = mid;
    } else {
      lo = mid;
      fLo = fMid;
    }
  }
  return ((lo + hi) / 2) * 100;
}

// ─── Tax · Spanish Ley IS ─────────────────────────────────────────────

/**
 * Deductible financial expense per Ley IS (Spain):
 *   max(1M €, 30% × EBITDA)
 *
 * Returns the cap (not the deductible amount itself · caller does min).
 */
export function spanishFinexpDeductionCap(
  ebitda: number,
  ebitdaLimitPct: number,
  finexpFloorEur: number,
): number {
  const ebitdaCap = ebitda * (ebitdaLimitPct / 100);
  return Math.max(finexpFloorEur, ebitdaCap);
}

/** CIT = max(0, EBT × rate). Negative EBT yields zero tax (DTA tracked separately). */
export function corporateIncomeTax(ebt: number, ratePct: number): number {
  if (ebt <= 0) return 0;
  return ebt * (ratePct / 100);
}

// ─── Depreciation ─────────────────────────────────────────────────────

/** Straight-line annual depreciation. */
export function straightLineDepreciation(basis: number, usefulLifeYears: number): number {
  if (usefulLifeYears <= 0) return 0;
  return basis / usefulLifeYears;
}

// ─── Per-key + per-sqm normalisation ──────────────────────────────────

export function perKey(total: number, rooms: number): number {
  if (rooms <= 0) return 0;
  return total / rooms;
}

export function perSqm(total: number, sqm: number): number {
  if (sqm <= 0) return 0;
  return total / sqm;
}

// ─── Formula registry · keyed for introspection / tooling ─────────────

export const FORMULAS = {
  dscr,
  icr,
  ltv,
  exitValueFromCap,
  exitNetProceeds,
  moic,
  irrPct,
  npv,
  spanishFinexpDeductionCap,
  corporateIncomeTax,
  straightLineDepreciation,
  perKey,
  perSqm,
} as const;

export type FormulaKey = keyof typeof FORMULAS;
