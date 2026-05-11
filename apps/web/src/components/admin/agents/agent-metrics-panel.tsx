import { cn } from "@/lib/utils";
import type { AgentKpi } from "@/lib/admin/agents";

export interface AgentMetricsPanelProps {
  kpis: AgentKpi[];
  title?: string;
  className?: string;
}

/**
 * KPI grid for the agent dashboard. 2- or 4-column responsive grid. Each
 * card carries a small uppercase label + a large value + an optional hint.
 *
 * HOTELVALORA institutional look — font-headline, tracked-out labels,
 * forest-900 / slate-900 typography.
 */
export function AgentMetricsPanel({
  kpis,
  title = "Operational KPIs",
  className,
}: AgentMetricsPanelProps) {
  return (
    <section
      className={cn(
        "rounded-xl border border-slate-200 bg-white p-5 shadow-sm",
        className,
      )}
    >
      <h3 className="mb-4 font-headline text-[10px] font-extrabold uppercase tracking-[0.25em] text-slate-500">
        {title}
      </h3>
      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {kpis.map((kpi, i) => (
          <li
            key={i}
            className="rounded-lg border border-slate-200 bg-slate-50/60 px-3 py-3"
          >
            <span className="block font-headline text-[9px] font-bold uppercase tracking-widest text-slate-500">
              {kpi.label}
            </span>
            <span className="mt-1.5 block font-headline text-xl font-extrabold tracking-tight text-forest-900">
              {kpi.value}
            </span>
            {kpi.hint && (
              <span className="mt-1 block text-[10.5px] leading-snug text-slate-500">
                {kpi.hint}
              </span>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
