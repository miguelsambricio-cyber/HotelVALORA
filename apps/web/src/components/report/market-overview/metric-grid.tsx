import { cn } from "@/lib/utils";
import type { InsightMetric } from "@/lib/report/market-overview-data";

export interface MetricGridProps {
  metrics: InsightMetric[];
  /** Columns count — defaults to 3 to match the Stitch insight card */
  columns?: 2 | 3 | 4;
  /** Top + bottom border separator pattern */
  bordered?: boolean;
  className?: string;
}

const COL_CLASS: Record<NonNullable<MetricGridProps["columns"]>, string> = {
  2: "grid-cols-2",
  3: "grid-cols-3",
  4: "grid-cols-4",
};

/**
 * Flexible metric grid used inside Market Insight cards. Each cell renders
 * an uppercase tracked label above a bold value. Vertical rhythm matches
 * the Stitch reference (`gap-y-4 gap-x-2`, top/bottom slate-100 borders).
 */
export function MetricGrid({
  metrics,
  columns = 3,
  bordered = true,
  className,
}: MetricGridProps) {
  return (
    <div
      className={cn(
        "grid gap-y-4 gap-x-2 print:gap-y-1 print:gap-x-1",
        COL_CLASS[columns],
        bordered && "border-y border-slate-100 py-4 print:py-1",
        className,
      )}
    >
      {metrics.map((metric) => (
        <div key={metric.id}>
          <p className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider mb-1 print:text-[6px] print:mb-0 print:tracking-normal">
            {metric.label}
          </p>
          <p className="text-sm font-bold text-slate-800 print:text-[9px]">{metric.value}</p>
        </div>
      ))}
    </div>
  );
}
