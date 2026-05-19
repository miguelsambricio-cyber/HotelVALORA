/**
 * Underwriting · Temporal model.
 *
 * Replaces the hardcoded 11-tuple YearSeries from Block 1. Every
 * schedule now carries an explicit periods[] array · sections render
 * N columns regardless of granularity.
 *
 * Granularity per architectural layer (operator decision · 2026-05-18):
 *
 *   Layer            MVP        Future
 *   ─────────────────────────────────────────
 *   reporting        yearly     yearly + monthly toggle
 *   operations       yearly     monthly (RevPAR · ADR · Occ imports)
 *   financing        yearly     monthly (covenant testing · refinance)
 *   taxes            yearly     yearly (Spanish IS is annual filing)
 *
 * MVP ships with `kind: "year"` for all 11 periods. Architecture is
 * ready for monthly / quarterly · components must NOT hardcode 11.
 *
 * Convention: Period.index === 0 means closing year (Year 0 in the
 * Excel reference · transaction-close period · all CAPEX + debt drawn
 * + equity injected happens here, operations not yet running).
 *
 * Cross-layer alignment: operating periods aggregate up to reporting
 * periods via PeriodAggregator (Block 3+). Financing covenants test
 * against trailing-12-month reporting series even when granularity
 * differs.
 */

export type PeriodKind = "year" | "quarter" | "month";

/**
 * Underwriting lifecycle phase the period belongs to.
 *
 * `acquisition` · capital deployment phase · pre-stabilization.
 *   Operations are not yet running. Hotel revenue + GOP are not
 *   applicable. Investment / financing / cash flow activity (CAPEX
 *   draw, debt drawdown, equity injection, acquisition costs,
 *   pre-opening) IS happening — this is the core of the underwriting.
 *
 * `operating` · post-stabilization · operating hold.
 *   Hotel is generating revenue and EBITDA. Standard P&L line items
 *   apply. Debt service runs. Tax accrues.
 *
 * Future phases (`stabilization`, `exit`) can be added without
 * breaking existing consumers — render layers default to `operating`
 * for any unrecognized phase.
 *
 * Future-proof: multi-period acquisitions (phased renovations,
 * construction periods, staged openings, delayed stabilization) are
 * supported by tagging more than one period as `acquisition`. The
 * presentation layer styles every acquisition cell uniformly.
 */
export type PeriodPhase = "acquisition" | "operating";

export interface Period {
  /** Stable id · e.g. "y0", "y1", "y7q3", "y3m05". */
  id: string;
  kind: PeriodKind;
  /** Sequential index within the layer · 0-based. */
  index: number;
  /** Display label · e.g. "Year 0", "Y3 Q2", "Y1 Mar". */
  label: string;
  /** Underwriting lifecycle phase · drives presentational treatment. */
  phase: PeriodPhase;
  /** Optional · ISO start of the period · only set when real calendar dates land. */
  start_date?: string;
  end_date?: string;
}

/** Series indexed by Period.index · length === periods.length. */
export type PeriodSeries = number[];

/** Aggregated value across all periods · scalar. */
export type PeriodScalar = number;

// ─── Default period axes ──────────────────────────────────────────────

/**
 * MVP · 11 yearly periods · Y0 .. Y10.
 *
 * Y0 is tagged `acquisition` (closing year · capital deployment · no
 * operations yet). Y1..Y10 are `operating`. Multi-period acquisitions
 * are supported by wrapping the result with `markAcquisitionPhase(...)`.
 */
export const YEARLY_PERIODS_Y0_Y10: Period[] = Array.from({ length: 11 }, (_, i) => ({
  id: `y${i}`,
  kind: "year" as const,
  index: i,
  label: `Year ${i}`,
  phase: i === 0 ? ("acquisition" as PeriodPhase) : ("operating" as PeriodPhase),
}));

/**
 * Re-tag a period axis with N acquisition periods at the front.
 *
 * Used for phased renovations · construction periods · delayed
 * stabilization. The first `acquisitionCount` periods become
 * `acquisition` (presentation muted in operating tables); the rest
 * become `operating`.
 */
export function markAcquisitionPhase(periods: Period[], acquisitionCount = 1): Period[] {
  return periods.map((p, i) => ({
    ...p,
    phase: i < acquisitionCount ? "acquisition" : "operating",
  }));
}

/** Future · monthly periods for a given hold (kept here so consumers can switch). */
export function monthlyPeriods(yearCount: number, acquisitionMonths = 12): Period[] {
  const out: Period[] = [];
  for (let y = 0; y < yearCount; y++) {
    for (let m = 0; m < 12; m++) {
      const index = out.length;
      out.push({
        id: `y${y}m${String(m + 1).padStart(2, "0")}`,
        kind: "month",
        index,
        label: `Y${y} M${m + 1}`,
        phase: index < acquisitionMonths ? "acquisition" : "operating",
      });
    }
  }
  return out;
}

/** Future · quarterly periods. */
export function quarterlyPeriods(yearCount: number, acquisitionQuarters = 4): Period[] {
  const out: Period[] = [];
  for (let y = 0; y < yearCount; y++) {
    for (let q = 1; q <= 4; q++) {
      const index = out.length;
      out.push({
        id: `y${y}q${q}`,
        kind: "quarter",
        index,
        label: `Y${y} Q${q}`,
        phase: index < acquisitionQuarters ? "acquisition" : "operating",
      });
    }
  }
  return out;
}

// ─── Builders + helpers ───────────────────────────────────────────────

/** Pad / truncate a raw series to match periods.length · zeroes when short. */
export function alignToSeries(values: readonly number[], periods: Period[]): PeriodSeries {
  const out = periods.map((_, i) => values[i] ?? 0);
  return out;
}

/** Zero-filled series matching the given periods axis. */
export function zeroSeries(periods: Period[]): PeriodSeries {
  return new Array(periods.length).fill(0);
}

/** Sum a series across periods · NaN-safe. */
export function sumSeries(s: PeriodSeries): number {
  let total = 0;
  for (const v of s) if (Number.isFinite(v)) total += v;
  return total;
}

/** Element-wise add · returns new array · throws on length mismatch. */
export function addSeries(a: PeriodSeries, b: PeriodSeries): PeriodSeries {
  if (a.length !== b.length) {
    throw new Error(`addSeries length mismatch · ${a.length} vs ${b.length}`);
  }
  return a.map((v, i) => v + b[i]);
}

/** Element-wise subtract. */
export function subSeries(a: PeriodSeries, b: PeriodSeries): PeriodSeries {
  if (a.length !== b.length) {
    throw new Error(`subSeries length mismatch · ${a.length} vs ${b.length}`);
  }
  return a.map((v, i) => v - b[i]);
}

/** Multiply each element by a scalar. */
export function scaleSeries(s: PeriodSeries, k: number): PeriodSeries {
  return s.map((v) => v * k);
}

/** Cumulative sum series · returns same-length array. */
export function cumSeries(s: PeriodSeries): PeriodSeries {
  let running = 0;
  return s.map((v) => (running += v));
}

/** Lag series by k periods · pads with zeros at the front. */
export function lagSeries(s: PeriodSeries, k: number): PeriodSeries {
  if (k <= 0) return s.slice();
  return [...new Array(k).fill(0), ...s.slice(0, s.length - k)];
}
