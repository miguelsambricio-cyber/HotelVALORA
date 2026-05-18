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
 * IRR via Newton-Raphson · returns percentage value (e.g. 12.5 not 0.125).
 * Returns NaN if no convergence in 100 iterations · caller must defend.
 */
export function irrPct(flows: PeriodSeries, guess = 0.1): number {
  const maxIter = 100;
  const tol = 1e-7;
  let rate = guess;

  for (let iter = 0; iter < maxIter; iter++) {
    let npv = 0;
    let dnpv = 0;
    for (let t = 0; t < flows.length; t++) {
      const denom = Math.pow(1 + rate, t);
      npv += flows[t] / denom;
      dnpv += (-t * flows[t]) / (denom * (1 + rate));
    }
    if (dnpv === 0) return NaN;
    const newRate = rate - npv / dnpv;
    if (Math.abs(newRate - rate) < tol) return newRate * 100;
    rate = newRate;
  }
  return NaN;
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
  spanishFinexpDeductionCap,
  corporateIncomeTax,
  straightLineDepreciation,
  perKey,
  perSqm,
} as const;

export type FormulaKey = keyof typeof FORMULAS;
