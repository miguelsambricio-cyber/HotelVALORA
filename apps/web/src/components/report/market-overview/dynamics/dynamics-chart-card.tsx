import { cn } from "@/lib/utils";
import type { DynamicsChart } from "@/lib/report/market-dynamics-data";
import { DynamicsLineChart } from "./dynamics-line-chart";

export interface DynamicsChartCardProps {
  chart: DynamicsChart;
  className?: string;
}

/**
 * White institutional card hosting one of the 6 Market Dynamics charts.
 * Header pattern matches the rest of the report (uppercase tracked label
 * top-left, slim badge top-right, small unit caption above the chart).
 *
 * Sized for a 2×3 grid on desktop (~400px tall) and compresses to ~180px
 * for print so 4-6 cards fit per A4 portrait page without page-breaks
 * inside any single chart.
 */
export function DynamicsChartCard({ chart, className }: DynamicsChartCardProps) {
  return (
    <article
      className={cn(
        "flex h-[400px] flex-col rounded-xl border border-slate-200 bg-white p-5 shadow-sm",
        "print:h-[170px] print:p-3 print:shadow-none print:rounded-md print:break-inside-avoid",
        className,
      )}
    >
      {/* Header */}
      <div className="mb-3 flex items-start justify-between gap-3 print:mb-2">
        <div className="min-w-0">
          <h3 className="text-sm font-extrabold uppercase tracking-wider text-forest-900 font-headline print:text-[10px]">
            {chart.title}
          </h3>
          {chart.unit && (
            <p className="mt-0.5 text-[10px] font-semibold uppercase tracking-widest text-slate-400 print:text-[7px] print:mt-0">
              {chart.unit}
            </p>
          )}
        </div>
        {chart.badge && (
          <span className="shrink-0 rounded-md bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700 print:text-[7px] print:px-1.5 print:py-0">
            {chart.badge}
          </span>
        )}
      </div>

      {/* Chart body — flex-1 lets the chart fill remaining card height */}
      <div className="min-h-0 flex-1">
        <DynamicsLineChart series={chart.series} xLabels={chart.xLabels} />
      </div>
    </article>
  );
}
