import { cn } from "@/lib/utils";
import type { DualMetric } from "@/lib/report/transactions-data";

export interface DualMetricCellProps {
  metric: DualMetric;
  className?: string;
}

/**
 * Two-part metric tile used inside `TransactionsKpiCard`. Stitch renders the
 * primary + secondary parts on a single line padded with whitespace; we use
 * `flex justify-between` so the alignment survives any string length.
 */
export function DualMetricCell({ metric, className }: DualMetricCellProps) {
  return (
    <div className={className}>
      <div className="flex justify-between items-baseline gap-2 mb-1">
        <p className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider">
          {metric.primary.label}
        </p>
        {metric.secondary.label && (
          <p className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider text-right">
            {metric.secondary.label}
          </p>
        )}
      </div>
      <div className="flex justify-between items-baseline gap-2">
        <p className="text-sm font-bold text-slate-800">{metric.primary.value}</p>
        <p className="text-sm font-bold text-slate-800 text-right">
          {metric.secondary.value}
        </p>
      </div>
    </div>
  );
}
