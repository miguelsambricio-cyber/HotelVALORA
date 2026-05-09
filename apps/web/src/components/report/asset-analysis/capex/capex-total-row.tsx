"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import {
  formatCapexAmount,
  type CapexUnit,
} from "@/lib/report/capex-renders-data";

export interface CapexTotalRowProps {
  /** Initial total (numeric) */
  total: number;
  /** Display unit */
  unit?: CapexUnit;
  /** Available unit choices for the dropdown */
  unitOptions?: { id: CapexUnit; label: string }[];
  className?: string;
}

const DEFAULT_UNIT_OPTIONS: { id: CapexUnit; label: string }[] = [
  { id: "total", label: "€ total" },
  { id: "perRoom", label: "€ / room" },
];

/**
 * Headline "TOTAL CAPEX" row — primary tinted background, editable amount,
 * unit selector. Compact 64 px row to keep the upper layout balanced against
 * the fixed-width Property Gallery on the right.
 */
export function CapexTotalRow({
  total,
  unit = "total",
  unitOptions = DEFAULT_UNIT_OPTIONS,
  className,
}: CapexTotalRowProps) {
  const [value, setValue] = useState(formatCapexAmount(total));
  const [currentUnit, setCurrentUnit] = useState<CapexUnit>(unit);

  return (
    <div
      className={cn(
        "bg-forest-900/5 rounded-xl px-5 py-3 border border-forest-900/20",
        "flex flex-col md:flex-row justify-between md:items-center gap-3",
        className,
      )}
    >
      <span className="text-base font-bold font-headline text-forest-900">
        TOTAL CAPEX
      </span>
      <div className="flex items-center gap-2">
        <input
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          className="border border-slate-300 rounded-md text-right font-semibold text-slate-700 w-32 h-8 px-2 focus:ring-forest-900 focus:border-forest-900 shadow-sm outline-none"
        />
        <select
          value={currentUnit}
          onChange={(e) => setCurrentUnit(e.target.value as CapexUnit)}
          className="border border-slate-300 rounded-md text-slate-600 text-sm h-8 px-2 focus:ring-forest-900 focus:border-forest-900 bg-white shadow-sm outline-none"
        >
          {unitOptions.map((opt) => (
            <option key={opt.id} value={opt.id}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
