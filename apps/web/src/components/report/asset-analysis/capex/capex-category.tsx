"use client";

import { useState } from "react";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  formatCapexAmount,
  type CapexCategoryData,
  type CapexUnit,
} from "@/lib/report/capex-renders-data";
import { CostInputRow } from "./cost-input-row";

const UNIT_OPTIONS: { id: CapexUnit; label: string }[] = [
  { id: "total", label: "€ total" },
  { id: "perRoom", label: "€ / room" },
];

export interface CapexCategoryProps {
  category: CapexCategoryData;
  className?: string;
}

/**
 * Collapsible CAPEX category. Header is a 44 px row with a 20 px horizontal
 * inset; line items inside the accordion mirror that height for consistent
 * institutional rhythm.
 */
export function CapexCategory({ category, className }: CapexCategoryProps) {
  const [open, setOpen] = useState(category.defaultOpen ?? true);
  const [total, setTotal] = useState(formatCapexAmount(category.total));
  const [unit, setUnit] = useState<CapexUnit>(category.unit);

  return (
    <div
      className={cn(
        "bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm print:shadow-none",
        className,
      )}
    >
      <div
        className="flex flex-col md:flex-row md:items-center md:h-11 px-5 py-3 md:py-0 cursor-pointer hover:bg-slate-50 transition-colors gap-3 md:justify-between"
        onClick={() => setOpen((v) => !v)}
      >
        <div className="flex items-center gap-2">
          <ChevronRight
            size={16}
            className={cn(
              "text-slate-400 transition-transform shrink-0",
              open && "rotate-90",
            )}
          />
          <span className="font-bold font-headline text-slate-800 text-sm">
            {category.label}
          </span>
        </div>
        <div
          className="flex items-center gap-2"
          onClick={(e) => e.stopPropagation()}
        >
          <input
            type="text"
            value={total}
            onChange={(e) => setTotal(e.target.value)}
            className="border border-slate-300 rounded-md text-right font-medium text-slate-700 w-28 h-8 px-2 text-sm focus:ring-forest-900 focus:border-forest-900 outline-none"
          />
          <select
            value={unit}
            onChange={(e) => setUnit(e.target.value as CapexUnit)}
            className="border border-slate-300 rounded-md text-slate-600 text-xs h-8 px-2 focus:ring-forest-900 focus:border-forest-900 bg-white outline-none"
          >
            {UNIT_OPTIONS.map((opt) => (
              <option key={opt.id} value={opt.id}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {open && (
        <div className="px-5 border-t border-slate-100 bg-slate-50/50">
          {category.items.map((item) => (
            <CostInputRow
              key={item.id}
              label={item.label}
              amount={item.amount}
              unit={item.unit ?? unit}
            />
          ))}
        </div>
      )}
    </div>
  );
}
