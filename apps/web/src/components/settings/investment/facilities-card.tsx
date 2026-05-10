"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { FACILITIES, type FacilityId } from "@/lib/investment";

export interface FacilitiesCardProps {
  /** Card title — e.g. "MyProperty Facilities" or "CompSet Facilities" */
  title: string;
  icon: ReactNode;
  /** Currently-selected facility ids */
  selected: FacilityId[];
  onToggle: (id: FacilityId) => void;
  /** Optional bottom slot — institutional intelligence box, distance slider, etc. */
  bottomSlot?: ReactNode;
  className?: string;
}

/**
 * Reusable facilities checklist card. Same visual on the Investment
 * Requirements right sidebar for both MyProperty (with intelligence
 * insight box) and CompSet (with distance slider).
 */
export function FacilitiesCard({
  title,
  icon,
  selected,
  onToggle,
  bottomSlot,
  className,
}: FacilitiesCardProps) {
  const selectedSet = new Set(selected);
  return (
    <section
      className={cn(
        "rounded-2xl border border-slate-200 bg-white p-7 shadow-sm",
        className,
      )}
    >
      <header className="mb-6 flex items-center gap-2 text-forest-900">
        <span>{icon}</span>
        <h3 className="font-headline text-lg font-extrabold">{title}</h3>
      </header>

      <div className="space-y-4">
        {FACILITIES.map((f) => {
          const isChecked = selectedSet.has(f.id);
          return (
            <label
              key={f.id}
              className="group flex cursor-pointer items-center gap-3"
            >
              <input
                type="checkbox"
                checked={isChecked}
                onChange={() => onToggle(f.id)}
                className="h-5 w-5 rounded border-slate-300 text-forest-900 focus:ring-forest-900/30"
              />
              <span
                className={cn(
                  "text-sm transition-colors",
                  isChecked
                    ? "font-bold text-forest-900"
                    : "font-medium text-slate-500 group-hover:text-forest-900",
                )}
              >
                {f.label}
              </span>
            </label>
          );
        })}
      </div>

      {bottomSlot}
    </section>
  );
}
