import { cn } from "@/lib/utils";
import type { CorporateSportsData } from "@/lib/report/market-overview-data";
import { InsightBadge } from "./insight-badge";

export interface CorporateSportsCardProps {
  data: CorporateSportsData;
  className?: string;
}

interface ColumnProps {
  title: string;
  rows: { label: string; value: string }[];
}

function Column({ title, rows }: ColumnProps) {
  return (
    <div className="flex flex-col gap-4">
      <p className="text-xs font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-2">
        {title}
      </p>
      <div className="space-y-3">
        {rows.map((row) => (
          <div
            key={row.label}
            className="flex justify-between items-center gap-3"
          >
            <span className="text-xs font-semibold text-slate-500">
              {row.label}
            </span>
            <span className="text-sm font-bold text-slate-800 text-right">
              {row.value}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * Single full-width card carrying corporate (left) and sport / music (right)
 * venue rows for the chosen market. Sits below the insight scroller.
 */
export function CorporateSportsCard({
  data,
  className,
}: CorporateSportsCardProps) {
  return (
    <article
      className={cn(
        "bg-white rounded-xl p-6 border border-slate-200 shadow-sm flex flex-col gap-6 print:shadow-none print:break-inside-avoid",
        className,
      )}
    >
      <div className="flex justify-between items-start gap-3">
        <h3 className="text-xl font-extrabold text-forest-900 font-headline uppercase tracking-tight">
          {data.title}
        </h3>
        <InsightBadge>{data.badge}</InsightBadge>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 print:grid-cols-2 gap-8">
        <Column title="Corporate" rows={data.corporate} />
        <Column title="Sport & Music Events" rows={data.sports} />
      </div>
    </article>
  );
}
