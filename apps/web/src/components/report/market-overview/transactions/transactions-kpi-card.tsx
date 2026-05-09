import { cn } from "@/lib/utils";
import type { TransactionsKpiCardData } from "@/lib/report/transactions-data";
import { InsightBadge } from "../insight-badge";
import { DualMetricCell } from "./dual-metric-cell";

export interface TransactionsKpiCardProps {
  data: TransactionsKpiCardData;
  className?: string;
}

/**
 * Top-row KPI card for the Transactions page. Shares chrome (white surface,
 * slate-200 border, rounded-xl, shadow-sm) with the Market Overview insight
 * cards so the two pages read as one section family. Reuses `InsightBadge`
 * from the market-overview primitives for the top-right pill.
 */
export function TransactionsKpiCard({ data, className }: TransactionsKpiCardProps) {
  return (
    <article
      id={`transactions-kpi-${data.scope}`}
      className={cn(
        "h-full bg-white rounded-xl p-6 border border-slate-200 shadow-sm flex flex-col gap-6",
        "print:shadow-none print:break-inside-avoid",
        className,
      )}
    >
      <div className="flex justify-between items-start gap-3">
        <h3 className="text-xl font-extrabold text-forest-900 font-headline uppercase tracking-tight">
          {data.title}
        </h3>
        <InsightBadge>{data.badge}</InsightBadge>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {data.metrics.map((metric, idx) => (
          <DualMetricCell key={idx} metric={metric} />
        ))}
      </div>
    </article>
  );
}
