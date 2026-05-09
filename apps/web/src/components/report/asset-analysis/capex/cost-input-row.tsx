"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import {
  formatCapexAmount,
  type CapexUnit,
} from "@/lib/report/capex-renders-data";

const UNIT_LABEL: Record<CapexUnit, string> = {
  total: "€ total",
  perRoom: "€ / room",
};

export interface CostInputRowProps {
  label: string;
  /** Initial monetary amount (numeric) */
  amount: number;
  /** Display unit — controls the inert label on the right */
  unit?: CapexUnit;
  /** Indent the row (used inside category accordions for sub-items) */
  indent?: boolean;
  /** Disable the input (read-only display) */
  readOnly?: boolean;
  className?: string;
}

/**
 * Editable label/value/unit row used inside a CAPEX category. Fixed 44 px
 * height matches the institutional row rhythm; bottom border separates rows
 * cleanly inside the accordion body. Totals are NOT recomputed in the UI —
 * the future financial engine replaces local state.
 */
export function CostInputRow({
  label,
  amount,
  unit = "total",
  indent = true,
  readOnly = false,
  className,
}: CostInputRowProps) {
  const [value, setValue] = useState(formatCapexAmount(amount));

  return (
    <div
      className={cn(
        "flex justify-between items-center h-11 border-b border-slate-200/50 last:border-0",
        indent && "pl-8",
        className,
      )}
    >
      <span className="text-sm text-slate-600 font-medium">{label}</span>
      <div className="flex items-center gap-2">
        <input
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          readOnly={readOnly}
          className="border border-slate-200 rounded text-right text-slate-600 w-24 h-7 px-2 text-sm focus:ring-forest-900 focus:border-forest-900 outline-none"
        />
        <span className="text-xs text-slate-400 w-16">{UNIT_LABEL[unit]}</span>
      </div>
    </div>
  );
}
