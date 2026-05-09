import { cn } from "@/lib/utils";
import type { TrendBarsData } from "@/lib/report/market-overview-data";

export interface TrendBarsProps {
  data: TrendBarsData;
  className?: string;
}

/**
 * Five-bar trend block (typically Total Travelers / RevPAR Growth / RN per
 * year). Bars step from emerald-900/20 → emerald-900 to imply growth even
 * without the actual numeric labels.
 */
export function TrendBars({ data, className }: TrendBarsProps) {
  return (
    <div
      className={cn(
        "bg-slate-50 rounded-lg p-3 border border-slate-100 mt-2 print:p-1 print:mt-0 print:rounded-sm",
        className,
      )}
    >
      <div className="flex justify-between items-center mb-2 print:mb-0.5">
        <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest print:text-[6px] print:tracking-normal">
          {data.title}
        </p>
        <span className="text-[9px] font-bold text-emerald-700 bg-emerald-100/50 px-1.5 py-0.5 rounded print:text-[6px] print:px-1 print:py-0">
          {data.badge}
        </span>
      </div>
      <div className="flex items-end gap-1 h-12 w-full pt-2 print:h-6 print:pt-0.5">
        {data.series.map((value, idx) => {
          const intensity =
            ["bg-emerald-900/20", "bg-emerald-900/30", "bg-emerald-900/50", "bg-emerald-900/70", "bg-emerald-900"][idx] ??
            "bg-emerald-900";
          return (
            <div
              key={idx}
              className={cn("flex-1 rounded-t-sm", intensity)}
              style={{ height: `${value}%` }}
            />
          );
        })}
      </div>
    </div>
  );
}
