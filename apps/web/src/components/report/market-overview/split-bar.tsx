import { cn } from "@/lib/utils";
import type { SplitBarData } from "@/lib/report/market-overview-data";

export interface SplitBarProps {
  data: SplitBarData;
  className?: string;
}

/**
 * Two-segment ratio bar with uppercase labels above (e.g. "Nacional 35% /
 * Internacional 65%"). The bar uses the canonical emerald-800 fill plus a
 * slate-300 left segment for visual contrast.
 */
export function SplitBar({ data, className }: SplitBarProps) {
  return (
    <div className={cn(className)}>
      <div className="flex justify-between text-[10px] font-semibold text-slate-600 mb-1.5 uppercase tracking-wider print:text-[6px] print:mb-0.5 print:tracking-normal">
        <span>{data.left.label} ({data.left.pct}%)</span>
        <span>{data.right.label} ({data.right.pct}%)</span>
      </div>
      <div className="h-1.5 w-full bg-emerald-800 rounded-full overflow-hidden flex print:h-1">
        <div
          className="h-full bg-slate-300 border-r border-white/50"
          style={{ width: `${data.left.pct}%` }}
        />
      </div>
    </div>
  );
}
