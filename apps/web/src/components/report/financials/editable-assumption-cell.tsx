"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import {
  formatAbsolute,
  formatCurrency,
  formatPercent,
  parseAssumption,
  type Currency,
  type PLValueKind,
} from "@/lib/report/financials";

export interface EditableAssumptionCellProps {
  /** Numeric value — currency unit, ratio (0..1), or absolute integer */
  value: number;
  kind: PLValueKind;
  /** True → editable input. False → readonly span styled like the input */
  editable: boolean;
  /** Display-only sub-label (e.g. "% rooms rev") rendered under the value */
  denominator?: string;
  /** Currency context for formatting */
  currency: Currency;
  /** Fired on blur with the parsed numeric value (ratio for percent) */
  onChange?: (next: number) => void;
  /** Compact mode — smaller padding for inline table cells */
  compact?: boolean;
  className?: string;
}

/**
 * Tier-aware assumption input. PREMIUM gets a real `<input>` (controlled);
 * PRO and FREE get a styled span that visually matches the editable cell.
 * Parses on blur, reverts to the prior value on parse failure.
 *
 * Hidden in print — assumption inputs don't belong in the PDF snapshot
 * (the computed year columns carry the resulting numbers).
 */
export function EditableAssumptionCell({
  value,
  kind,
  editable,
  denominator,
  currency,
  onChange,
  compact = false,
  className,
}: EditableAssumptionCellProps) {
  const [raw, setRaw] = useState<string>(() => formatValue(value, kind, currency));

  // Resync when the controlled value changes externally (e.g. scenario reset)
  useEffect(() => {
    setRaw(formatValue(value, kind, currency));
  }, [value, kind, currency]);

  const handleBlur = () => {
    const parsed = parseAssumption(raw, kind);
    if (parsed === null) {
      setRaw(formatValue(value, kind, currency));
      return;
    }
    if (parsed !== value) onChange?.(parsed);
    setRaw(formatValue(parsed, kind, currency));
  };

  return (
    <div className={cn("flex flex-col items-center gap-0.5", className)}>
      {editable ? (
        <input
          type="text"
          value={raw}
          onChange={(e) => setRaw(e.target.value)}
          onBlur={handleBlur}
          className={cn(
            "w-full rounded border border-blue-200 bg-white text-blue-700 text-center font-semibold",
            "focus:border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-400",
            compact ? "px-2 py-0.5 text-xs" : "px-2 py-1 text-sm",
          )}
        />
      ) : (
        <span
          className={cn(
            "block w-full truncate rounded border border-slate-200 bg-slate-50 text-center font-semibold text-slate-700",
            compact ? "px-2 py-0.5 text-xs" : "px-2 py-1 text-sm",
          )}
        >
          {raw}
        </span>
      )}
      {denominator && (
        <span className="text-[8px] uppercase tracking-wider text-slate-400 leading-none">
          {denominator}
        </span>
      )}
    </div>
  );
}

function formatValue(value: number, kind: PLValueKind, currency: Currency): string {
  switch (kind) {
    case "percent":
      return formatPercent(value, 1);
    case "currency":
      return formatCurrency(value, currency, { decimals: 2 });
    case "absolute":
      return formatAbsolute(value);
  }
}
