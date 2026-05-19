"use client";

import { createContext, useContext, useMemo, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import type { Period, PeriodPhase } from "@/lib/underwriting/temporal";

/**
 * Reusable period grid for underwriting schedules.
 *
 * Corporate light theme · white surface · slate-200 borders · slate-50
 * header band. Sticky header + sticky first column for legible horizontal
 * scrolling.
 *
 * Phase-aware presentation · 2026-05-19:
 *   Every Period carries a `phase` (acquisition | operating). Operating
 *   tables (P&L · Section 02) HIDE acquisition columns entirely via the
 *   `excludeAcquisition` prop — the operating schedule reads from Y1
 *   directly, which is the institutional convention for IC memos.
 *
 *   Capital tables (CF · Investment · Financing · Balance Sheet · Exit)
 *   keep acquisition columns visible because Y0 is the core of the
 *   underwriting there: equity injection, debt drawdown, CAPEX deploy.
 *
 * Exit-year limit · 2026-05-19:
 *   `displayThroughIndex` truncates the table to the operator's hold
 *   period. Combined with `excludeAcquisition`, the visible column set
 *   is intersected with both filters so children render the right slice.
 *
 * Future-proof: multi-period acquisitions (phased renovations,
 * construction periods, staged openings) are supported transparently —
 * every period with `phase === "acquisition"` is dropped from the
 * operating-table view. The engine still computes those periods · only
 * the operating-side presentation hides them.
 */

export type YearGridKind = "operating" | "capital";

interface YearGridContextValue {
  /**
   * Indices in the original PeriodSeries that should be rendered, in
   * order. Children use these to map their values:
   *   `visibleIndices.map((idx) => values[idx])`.
   * Encodes BOTH `displayThroughIndex` and `excludeAcquisition` filters.
   */
  visibleIndices: number[];
  /** Phase per visible column · parallel to `visibleIndices`. */
  phases: PeriodPhase[];
  /** Table type · drives any operating-vs-capital cell styling that survives the filter. */
  kind: YearGridKind;
}

const YearGridContext = createContext<YearGridContextValue>({
  visibleIndices: [],
  phases: [],
  kind: "capital",
});

/** Hook · returns the visible-column projection for the current YearGrid. */
export function useYearGridContext(): YearGridContextValue {
  return useContext(YearGridContext);
}

export function YearGrid({
  periods,
  caption,
  assumptionCol = false,
  displayThroughIndex,
  excludeAcquisition = false,
  kind = "capital",
  children,
}: {
  periods: Period[];
  caption?: string;
  assumptionCol?: boolean;
  /** Truncate to columns 0..N (inclusive). */
  displayThroughIndex?: number;
  /**
   * Drop every period whose `phase === "acquisition"` from the rendered
   * table. The institutional convention for operating schedules: the
   * timeline starts at Y1 (post-stabilization). Engine + capital
   * tables are unaffected — only this view is filtered.
   */
  excludeAcquisition?: boolean;
  /**
   * Table category.
   *   · "operating" — P&L / income-side · usually pairs with `excludeAcquisition`.
   *   · "capital"   — CF / Investment / Financing / BS / Exit · default.
   */
  kind?: YearGridKind;
  children: ReactNode;
}) {
  const visibleIndices = useMemo(() => {
    const upperBound =
      displayThroughIndex === undefined
        ? periods.length - 1
        : Math.min(Math.max(0, displayThroughIndex), periods.length - 1);
    const out: number[] = [];
    for (let i = 0; i <= upperBound; i++) {
      const phase = periods[i].phase ?? "operating";
      if (excludeAcquisition && phase === "acquisition") continue;
      out.push(i);
    }
    return out;
  }, [periods, displayThroughIndex, excludeAcquisition]);

  const visiblePeriods = useMemo(
    () => visibleIndices.map((i) => periods[i]),
    [visibleIndices, periods],
  );

  const phases = useMemo(
    () => visiblePeriods.map((p) => p.phase ?? "operating"),
    [visiblePeriods],
  );

  const ctxValue = useMemo<YearGridContextValue>(
    () => ({ visibleIndices, phases, kind }),
    [visibleIndices, phases, kind],
  );

  const cols = visiblePeriods.length;
  const conceptWidthClass = assumptionCol ? "w-[24%]" : "w-[26%]";
  const periodWidthPct = (assumptionCol ? 66 : 74) / Math.max(cols, 1);

  return (
    <YearGridContext.Provider value={ctxValue}>
      <div className="overflow-x-auto rounded-md border border-slate-200 bg-white">
        {caption && (
          <p className="border-b border-slate-200 bg-slate-50 px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.18em] text-slate-500">
            {caption}
          </p>
        )}
        <table className="w-full border-collapse text-[11px]">
          <thead>
            <tr className="bg-slate-50 text-left text-slate-700">
              <th
                className={cn(
                  "sticky left-0 z-10 bg-slate-50 px-3 py-2 font-headline text-[9.5px] font-bold uppercase tracking-[0.18em]",
                  conceptWidthClass,
                )}
              >
                Concept
              </th>
              {assumptionCol && (
                <th className="w-[10%] px-2 py-2 text-right font-headline text-[9.5px] font-bold uppercase tracking-[0.18em]">
                  <span className="inline-block rounded bg-blue-50 px-1.5 py-0.5 text-[9px] font-bold text-[#005db7] ring-1 ring-blue-200">
                    Assump.
                  </span>
                </th>
              )}
              {visiblePeriods.map((p) => (
                <PeriodHeader key={p.id} period={p} widthPct={periodWidthPct} />
              ))}
            </tr>
          </thead>
          <tbody>{children}</tbody>
        </table>
      </div>
    </YearGridContext.Provider>
  );
}

function PeriodHeader({ period, widthPct }: { period: Period; widthPct: number }) {
  const isAcquisition = (period.phase ?? "operating") === "acquisition";

  // Acquisition columns ONLY appear in capital tables (or when explicitly
  // not excluded). Surface the institutional eyebrow so the reader sees
  // immediately that Y0 is the closing event, not an operating period.
  if (isAcquisition) {
    return (
      <th
        style={{ width: `${widthPct}%` }}
        className="px-2 py-2 text-right font-headline text-[9.5px] font-bold uppercase tracking-[0.18em] text-slate-700"
      >
        <span className="block leading-tight">Acquisition</span>
        <span className="block font-mono text-[8.5px] font-normal normal-case tracking-normal text-slate-500">
          Pre-opening · {period.label.replace("Year ", "Y")}
        </span>
      </th>
    );
  }

  return (
    <th
      style={{ width: `${widthPct}%` }}
      className="px-2 py-2 text-right font-headline text-[9.5px] font-bold uppercase tracking-[0.18em]"
    >
      {period.label}
    </th>
  );
}
