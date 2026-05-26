import { Check, Minus } from "lucide-react";
import { cn } from "@/lib/utils";
import type { FacilityItem } from "@/lib/report/asset-analysis-data";

export interface FacilitiesCardProps {
  items: FacilityItem[];
  /** Card heading (defaults to "Facilities") */
  title?: string;
  className?: string;
}

/**
 * Card showing facility availability as a 2-column checklist. Available items
 * use a green check; unavailable items use a slate dash. Mirrors the Stitch
 * "Facilities" card from the Asset Analysis layout.
 */
export function FacilitiesCard({
  items,
  title = "Facilities",
  className,
}: FacilitiesCardProps) {
  return (
    <div
      className={cn(
        "bg-white border border-slate-200 rounded-xl p-5 shadow-sm flex flex-col print:shadow-none",
        className,
      )}
    >
      <h4 className="text-[11px] font-bold uppercase tracking-widest text-slate-500 mb-4">
        {title}
      </h4>
      <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-[13px] text-slate-700">
        {items.map((item) => {
          // Render count only when present AND > 1 (single-unit "×1" is
          // visual noise · the check alone communicates presence). NULL
          // count = unknown · check only, no number (honest absence).
          const hasCount = typeof item.count === "number" && item.count > 1;
          return (
            <div key={item.label} className="flex items-center gap-2">
              {item.available ? (
                <Check size={16} className="text-emerald-600" strokeWidth={3} />
              ) : (
                <Minus size={16} className="text-slate-400" strokeWidth={3} />
              )}
              <span>
                {item.label}
                {hasCount && (
                  <span className="ml-1.5 font-semibold text-forest-900 tabular-nums">
                    ×{item.count}
                  </span>
                )}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
