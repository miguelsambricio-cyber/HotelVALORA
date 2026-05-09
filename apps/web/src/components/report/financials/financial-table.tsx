"use client";

import type { ReactNode } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { MONTH_LABELS } from "@/lib/report/financials";

export interface FinancialTableProps {
  /** Tbody children — typically multiple <PLSection /> instances */
  children: ReactNode;
  /** True when Year 1 is expanded into 12 month sub-columns */
  year1Expanded: boolean;
  /** Toggle handler for the Year 1 chevron */
  onToggleYear1: () => void;
  className?: string;
}

/**
 * Outer table shell. Two header layouts:
 *
 *   Collapsed (default — 7 columns):
 *     ┌───────┬─────────┬───┬────┬────┬────┬────┐
 *     │ Label │ Assump. │ ▸ │ Y2 │ Y3 │ Y4 │ Y5 │
 *     └───────┴─────────┴───┴────┴────┴────┴────┘
 *
 *   Expanded (Year 1 → 12 month sub-columns, 18 total):
 *     ┌───────┬─────────┬─────────────────────────────────┬────┬────┬────┬────┐
 *     │ Label │ Assump. │  ▾ Year 1  (colspan = 12)       │ Y2 │ Y3 │ Y4 │ Y5 │
 *     │       │         ├───┬───┬───┬───┬───┬───┬───┬───┬─┼────┼────┼────┼────┤
 *     │       │         │Jan│Feb│...│ ...                 │    │    │    │    │
 *     └───────┴─────────┴───┴───┴───┴───────────────────────┴────┴────┴────┴────┘
 *
 * Print: assumption column hidden, expanded columns rendered if the user
 * left them open before exporting (no auto-collapse for PDF — the analyst's
 * choice survives).
 */
export function FinancialTable({
  children,
  year1Expanded,
  onToggleYear1,
  className,
}: FinancialTableProps) {
  return (
    <div
      className={cn(
        "w-full overflow-x-auto pb-4 print:overflow-visible print:pb-0",
        className,
      )}
    >
      <table className="w-full text-sm text-left print:text-[9px]">
        <colgroup>
          <col className="w-48 print:w-32" />
          <col className="w-28 print:hidden" />
          {year1Expanded ? (
            MONTH_LABELS.map((m) => (
              <col key={m} className="min-w-[64px] print:min-w-0" />
            ))
          ) : (
            <col className="min-w-[100px] print:min-w-0" />
          )}
          <col className="min-w-[110px] print:min-w-0" />
          <col className="min-w-[110px] print:min-w-0" />
          <col className="min-w-[110px] print:min-w-0" />
          <col className="min-w-[110px] print:min-w-0" />
        </colgroup>

        {year1Expanded ? (
          <ExpandedHeader onToggleYear1={onToggleYear1} />
        ) : (
          <CollapsedHeader onToggleYear1={onToggleYear1} />
        )}

        {children}
      </table>
    </div>
  );
}

/** Total column count for the current expansion state. */
export function getTableColCount(year1Expanded: boolean): number {
  return year1Expanded ? 18 : 7;
}

/** @deprecated kept for back-compat — prefer `getTableColCount(expanded)` */
export const FINANCIAL_TABLE_COLS = 7;

// ── Header variants ────────────────────────────────────────────────────────

function CollapsedHeader({ onToggleYear1 }: { onToggleYear1: () => void }) {
  return (
    <thead>
      <tr className="border-b border-slate-200 text-slate-700 font-bold">
        <th className="py-4 pl-2 pr-4 font-headline text-base print:py-2 print:pl-1 print:text-[10px]">
          P&amp;L USALI
        </th>
        <th className="py-4 px-2 text-center print:hidden">
          <AssumpPill />
        </th>
        <th className="py-4 px-2 text-right font-headline print:py-2 print:px-1 print:text-[9px]">
          <Year1ToggleButton expanded={false} onClick={onToggleYear1} />
        </th>
        <YearTh label="Year 2" />
        <YearTh label="Year 3" />
        <YearTh label="Year 4" />
        <YearTh label="Year 5" />
      </tr>
    </thead>
  );
}

function ExpandedHeader({ onToggleYear1 }: { onToggleYear1: () => void }) {
  return (
    <thead>
      <tr className="border-b border-slate-200 text-slate-700 font-bold">
        <th
          rowSpan={2}
          className="py-4 pl-2 pr-4 font-headline text-base print:py-2 print:pl-1 print:text-[10px] align-bottom"
        >
          P&amp;L USALI
        </th>
        <th rowSpan={2} className="py-4 px-2 text-center print:hidden align-bottom">
          <AssumpPill />
        </th>
        <th
          colSpan={12}
          className="py-3 px-2 text-center font-headline border-b border-slate-200 print:py-1 print:px-1 print:text-[9px]"
        >
          <Year1ToggleButton expanded onClick={onToggleYear1} />
        </th>
        <YearTh label="Year 2" rowSpan={2} />
        <YearTh label="Year 3" rowSpan={2} />
        <YearTh label="Year 4" rowSpan={2} />
        <YearTh label="Year 5" rowSpan={2} />
      </tr>
      <tr className="border-b border-slate-200 text-slate-500 font-semibold">
        {MONTH_LABELS.map((m) => (
          <th
            key={m}
            className="py-2 px-1 text-right text-[10px] uppercase tracking-wider print:py-1 print:px-0.5 print:text-[7px]"
          >
            {m}
          </th>
        ))}
      </tr>
    </thead>
  );
}

// ── Header internals ────────────────────────────────────────────────────────

function AssumpPill() {
  return (
    <span className="inline-block rounded bg-red-50 px-2 py-1 text-xs font-bold uppercase tracking-wider text-red-600">
      Assump.
    </span>
  );
}

function YearTh({ label, rowSpan }: { label: string; rowSpan?: number }) {
  return (
    <th
      rowSpan={rowSpan}
      className={cn(
        "py-4 px-2 text-right font-headline print:py-2 print:px-1 print:text-[9px]",
        rowSpan && "align-bottom",
      )}
    >
      {label}
    </th>
  );
}

function Year1ToggleButton({
  expanded,
  onClick,
}: {
  expanded: boolean;
  onClick: () => void;
}) {
  const Icon = expanded ? ChevronDown : ChevronRight;
  return (
    <button
      type="button"
      onClick={onClick}
      aria-expanded={expanded}
      aria-label={expanded ? "Collapse Year 1 monthly view" : "Expand Year 1 monthly view"}
      className={cn(
        "inline-flex items-center gap-1 font-headline text-emerald-800 transition-colors",
        "hover:text-emerald-900 focus:outline-none focus:underline cursor-pointer",
        // Print: don't suggest interactivity but keep the chevron visible so the
        // PDF reader sees the active state (▸ collapsed / ▾ expanded)
        "print:hover:text-emerald-800 print:cursor-default",
      )}
    >
      <Icon
        size={14}
        strokeWidth={3}
        className="text-emerald-700 print:text-emerald-800"
      />
      Year 1
    </button>
  );
}
