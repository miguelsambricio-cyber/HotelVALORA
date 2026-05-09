"use client";

import { Fragment } from "react";
import { cn } from "@/lib/utils";
import {
  formatAbsolute,
  formatCompactCurrency,
  formatPercent,
  formatPpDelta,
  formatYearDelta,
  type Currency,
  type FiveYears,
  type PLLineItemConfig,
} from "@/lib/report/financials";
import { EditableAssumptionCell } from "./editable-assumption-cell";
import { ForecastBadge } from "./forecast-badge";

export interface PLRowProps {
  config: PLLineItemConfig;
  /** Assumption value bound to this row (null if the row has no assumption) */
  assumption: number | null;
  /** Computed 5-year values for this row */
  yearValues: FiveYears;
  /**
   * Optional 12-month breakdown for Year 1. When provided, the single
   * Year-1 cell is replaced by 12 monthly cells (Jan-Dec). Sums equal
   * `yearValues[0]` exactly. Months render read-only — assumptions still
   * edit through the Assump. column in collapsed Year 1 mode.
   */
  year1Monthly?: number[];
  /** True when the user can edit. PRO/FREE always render readonly */
  editable: boolean;
  currency: Currency;
  /** Fired when the assumption changes (already parsed) */
  onAssumptionChange?: (next: number) => void;
  /** Fired when the Year-1 cell is edited (for derived rows like RevPAR) */
  onYear1Change?: (next: number) => void;
}

/**
 * One USALI line item — label + assumption cell + 5 year cells, plus an
 * optional 12-cell monthly band that replaces the single Year-1 cell when
 * the table is expanded.
 */
export function PLRow({
  config,
  assumption,
  yearValues,
  year1Monthly,
  editable,
  currency,
  onAssumptionChange,
  onYear1Change,
}: PLRowProps) {
  const isBold = config.weight === "bold";
  return (
    <tr
      className={cn(
        "hover:bg-slate-50 print:hover:bg-transparent",
        isBold && "border-t border-slate-200",
      )}
    >
      {/* Label */}
      <td
        className={cn(
          "py-3 pl-2 print:py-1 print:pl-1",
          isBold
            ? "text-slate-900 font-bold print:text-[9px]"
            : "text-slate-700 font-medium print:text-[8px]",
        )}
      >
        {config.label}
      </td>

      {/* Assumption cell — hidden in print */}
      <td className="px-2 py-2 print:hidden">
        {config.assumptionKind && assumption !== null ? (
          <EditableAssumptionCell
            value={assumption}
            kind={config.assumptionKind}
            editable={editable && config.editableAssumption}
            denominator={config.assumptionDenominator}
            currency={currency}
            compact
            onChange={onAssumptionChange}
          />
        ) : null}
      </td>

      {/* Year 1 — collapses to a single editable cell, expands to 12 read-only months */}
      {year1Monthly ? (
        year1Monthly.map((v, m) => (
          <YearCell
            key={m}
            value={v}
            previousValue={undefined}
            config={config}
            currency={currency}
            compact
          />
        ))
      ) : (
        <YearCell
          value={yearValues[0]}
          previousValue={undefined}
          config={config}
          currency={currency}
          editable={editable && config.editableYear1}
          onChange={onYear1Change}
        />
      )}

      {/* Year 2-5 — always shown, never expanded */}
      <YearCell
        value={yearValues[1]}
        previousValue={yearValues[0]}
        config={config}
        currency={currency}
      />
      <YearCell
        value={yearValues[2]}
        previousValue={yearValues[1]}
        config={config}
        currency={currency}
      />
      <YearCell
        value={yearValues[3]}
        previousValue={yearValues[2]}
        config={config}
        currency={currency}
      />
      <YearCell
        value={yearValues[4]}
        previousValue={yearValues[3]}
        config={config}
        currency={currency}
      />
    </tr>
  );
}

// ── Year cell ───────────────────────────────────────────────────────────────

interface YearCellProps {
  value: number;
  previousValue: number | undefined;
  config: PLLineItemConfig;
  currency: Currency;
  editable?: boolean;
  /** Compact mode for monthly cells — tighter padding + smaller font */
  compact?: boolean;
  onChange?: (next: number) => void;
}

function YearCell({
  value,
  previousValue,
  config,
  currency,
  editable,
  compact,
  onChange,
}: YearCellProps) {
  const formatted = formatByKind(value, config.yearKind, currency);
  const delta = config.showYearDelta
    ? config.yearKind === "percent"
      ? formatPpDelta(value, previousValue)
      : formatYearDelta(value, previousValue)
    : null;
  const tone = delta && delta.startsWith("-") ? "down" : "up";
  const isBold = config.weight === "bold";

  return (
    <td
      className={cn(
        "text-right print:py-1 print:px-1",
        compact ? "px-1 py-2 text-[11px]" : "px-2 py-3",
        isBold ? "text-slate-900 font-bold" : "text-slate-700",
        "print:text-[9px]",
      )}
    >
      <span className="inline-flex items-baseline gap-1">
        {editable && onChange ? (
          <Year1Input value={value} formatted={formatted} onChange={onChange} bold={isBold} />
        ) : (
          <span className={cn(isBold && "font-headline")}>{formatted}</span>
        )}
        {delta && !compact && (
          <ForecastBadge text={delta} tone={tone} strong={isBold} />
        )}
      </span>
    </td>
  );
}

// ── Inline editable Year-1 input (transparent, no border) ───────────────────

function Year1Input({
  value,
  formatted,
  onChange,
  bold,
}: {
  value: number;
  formatted: string;
  onChange: (next: number) => void;
  bold: boolean;
}) {
  return (
    <input
      type="text"
      defaultValue={formatted}
      key={`${value}`}
      onBlur={(e) => {
        const stripped = e.target.value
          .replace(/[€$£\s]/g, "")
          .replace(",", ".");
        const parsed = parseFloat(stripped);
        if (!Number.isNaN(parsed)) onChange(parsed);
      }}
      className={cn(
        "w-24 bg-transparent border-none p-0 text-right focus:ring-0 focus:outline-none",
        bold ? "font-headline font-bold text-slate-900" : "font-headline text-slate-700 font-medium",
        "print:hidden",
      )}
    />
  );
}

function formatByKind(
  value: number,
  kind: "currency" | "percent" | "absolute",
  currency: Currency,
): string {
  switch (kind) {
    case "currency":
      // Compact (k / M) above 100k; full format below — keeps ADR / RevPAR
      // legible while shortening big revenue / expense numbers.
      return formatCompactCurrency(value, currency);
    case "percent":
      return formatPercent(value, 1);
    case "absolute":
      return formatAbsolute(value);
  }
}

// Re-export Fragment so this file is treated as a module (defensive)
export const _ = Fragment;
