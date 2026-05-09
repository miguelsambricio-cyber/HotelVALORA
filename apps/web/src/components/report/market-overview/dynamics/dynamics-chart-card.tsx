"use client";

import { useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import {
  CLASS_OPTIONS,
  HORIZON_OPTIONS,
  KPI_OPTIONS,
  SCOPE_OPTIONS,
  describeFilters,
  getDynamicsChart,
  type DynamicsClass,
  type DynamicsFilterOption,
  type DynamicsFilterState,
  type DynamicsHorizon,
  type DynamicsKpi,
  type DynamicsScope,
} from "@/lib/report/market-dynamics-data";
import { DynamicsLineChart } from "./dynamics-line-chart";

export interface DynamicsChartCardProps {
  /** Initial filter combo — chart starts here, user can override per-card */
  initialFilters: DynamicsFilterState;
  /** Stroke colour for the line (alternates emerald/teal across the grid) */
  color: string;
  className?: string;
}

/**
 * Stitch-parity chart card. Each card owns its own 4-axis filter state — the
 * reader picks the angle they want for THIS card without affecting the others.
 *
 * Web: 4 native selects on top, smoothed line chart below, ~400px tall.
 * Print: selects hidden, replaced by a single uppercase caption that
 * describes the active filter combo so the PDF reader knows what they're
 * looking at. break-inside-avoid keeps each card on a single A4 page.
 */
export function DynamicsChartCard({
  initialFilters,
  color,
  className,
}: DynamicsChartCardProps) {
  const [filters, setFilters] = useState<DynamicsFilterState>(initialFilters);
  const chart = useMemo(() => getDynamicsChart(filters), [filters]);
  const caption = describeFilters(filters);

  return (
    <article
      className={cn(
        "flex h-[400px] flex-col rounded-xl border border-slate-200 bg-white p-5 shadow-sm",
        "print:h-[180px] print:p-3 print:shadow-none print:rounded-md print:break-inside-avoid",
        className,
      )}
    >
      {/* DROPDOWNS — web only */}
      <div className="mb-6 grid grid-cols-2 gap-2 lg:grid-cols-4 print:hidden">
        <FilterSelect
          ariaLabel="Ámbito"
          options={SCOPE_OPTIONS}
          value={filters.scope}
          onChange={(scope) => setFilters({ ...filters, scope })}
        />
        <FilterSelect
          ariaLabel="Clase"
          options={CLASS_OPTIONS}
          value={filters.class}
          onChange={(klass) => setFilters({ ...filters, class: klass })}
        />
        <FilterSelect
          ariaLabel="KPI"
          options={KPI_OPTIONS}
          value={filters.kpi}
          onChange={(kpi) => setFilters({ ...filters, kpi })}
        />
        <FilterSelect
          ariaLabel="Horizonte"
          options={HORIZON_OPTIONS}
          value={filters.horizon}
          onChange={(horizon) => setFilters({ ...filters, horizon })}
        />
      </div>

      {/* PRINT CAPTION — print only */}
      <p className="hidden print:mb-2 print:block text-[7px] font-bold uppercase tracking-wider text-slate-600">
        {caption}
      </p>

      {/* CHART — flex-1 fills remaining card height */}
      <div className="min-h-0 flex-1">
        <DynamicsLineChart values={chart.values} color={color} />
      </div>
    </article>
  );
}

// ── Stitch-style native select with custom chevron ──────────────────────────

interface FilterSelectProps<T extends string> {
  ariaLabel: string;
  options: DynamicsFilterOption<T>[];
  value: T;
  onChange: (next: T) => void;
}

function FilterSelect<
  T extends DynamicsScope | DynamicsClass | DynamicsKpi | DynamicsHorizon,
>({ ariaLabel, options, value, onChange }: FilterSelectProps<T>) {
  return (
    <div className="relative min-w-0">
      <select
        aria-label={ariaLabel}
        value={value}
        onChange={(e) => onChange(e.target.value as T)}
        className={cn(
          "w-full appearance-none cursor-pointer truncate rounded-md border border-slate-200 bg-slate-50 py-1.5 pl-2 pr-7",
          "text-xs font-medium text-slate-700 transition-colors",
          "hover:border-slate-300 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500",
        )}
      >
        {options.map((opt) => (
          <option key={opt.id} value={opt.id}>
            {opt.label}
          </option>
        ))}
      </select>
      <span
        aria-hidden
        className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-slate-400"
      >
        <svg
          width="10"
          height="10"
          viewBox="0 0 10 10"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M2 4l3 3 3-3" />
        </svg>
      </span>
    </div>
  );
}
