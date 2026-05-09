"use client";

import { Fragment } from "react";
import { cn } from "@/lib/utils";
import {
  formatAbsolute,
  formatCurrency,
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
  /** True when the user can edit. PRO/FREE always render readonly */
  editable: boolean;
  currency: Currency;
  /** Fired when the assumption changes (already parsed) */
  onAssumptionChange?: (next: number) => void;
  /** Fired when the Year-1 cell is edited (for derived rows like RevPAR) */
  onYear1Change?: (next: number) => void;
}

/**
 * One USALI line item — label + assumption cell + 5 year cells.
 *
 * Year cells render the formatted value plus an optional auto YoY pill
 * (`+8.4%` or `+3pp`). Year 1 may itself be editable for "driver" rows
 * (RevPAR, ancillary revenue lines) — drives the model directly.
 */
export function PLRow({
  config,
  assumption,
  yearValues,
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

      {/* Year 1 — editable for driver rows */}
      <YearCell
        value={yearValues[0]}
        previousValue={undefined}
        config={config}
        currency={currency}
        editable={editable && config.editableYear1}
        onChange={onYear1Change}
        marker
      />
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
  marker?: boolean;
  onChange?: (next: number) => void;
}

function YearCell({
  value,
  previousValue,
  config,
  currency,
  editable,
  marker,
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
        "px-2 py-3 text-right print:py-1 print:px-1",
        isBold ? "text-slate-900 font-bold" : "text-slate-700",
        "print:text-[9px]",
      )}
    >
      <span className="inline-flex items-baseline gap-1">
        {marker && (
          <span
            aria-hidden
            className="mr-1 font-black text-emerald-700 print:hidden"
          >
            ›
          </span>
        )}
        {editable && onChange ? (
          <Year1Input value={value} formatted={formatted} onChange={onChange} bold={isBold} />
        ) : (
          <span className={cn(isBold && "font-headline")}>{formatted}</span>
        )}
        {delta && <ForecastBadge text={delta} tone={tone} strong={isBold} />}
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
      return formatCurrency(value, currency, { decimals: 0 });
    case "percent":
      return formatPercent(value, 1);
    case "absolute":
      return formatAbsolute(value);
  }
}

// Re-export Fragment so this file is treated as a module (defensive)
export const _ = Fragment;
