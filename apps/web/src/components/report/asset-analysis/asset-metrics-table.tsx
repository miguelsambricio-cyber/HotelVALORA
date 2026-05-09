import { cn } from "@/lib/utils";
import type { AssetMetricsRow } from "@/lib/report/asset-analysis-data";

export interface AssetMetricsTableProps {
  rows: AssetMetricsRow[];
  className?: string;
}

/**
 * Left-column metrics table. Each row is a fixed-height label/value pair with
 * a light bottom separator (last row has no separator, matching Stitch).
 */
export function AssetMetricsTable({ rows, className }: AssetMetricsTableProps) {
  return (
    <div className={cn("flex flex-col", className)}>
      {rows.map((row, idx) => {
        const isLast = idx === rows.length - 1;
        return (
          <div
            key={row.label}
            className={cn(
              "flex justify-between items-center h-8 py-1.5",
              !isLast && "border-b border-slate-100",
            )}
          >
            <span className="text-sm font-semibold text-slate-500 uppercase tracking-wider leading-[1.1]">
              {row.label}
            </span>
            <span className="font-display font-bold text-base text-forest-700 leading-[1.1]">
              {row.value}
            </span>
          </div>
        );
      })}
    </div>
  );
}
