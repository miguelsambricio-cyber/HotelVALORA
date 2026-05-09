"use client";

import { cn } from "@/lib/utils";
import type {
  DynamicsClass,
  DynamicsFilterOption,
  DynamicsFilterState,
  DynamicsHorizon,
  DynamicsKpi,
  DynamicsScope,
} from "@/lib/report/market-dynamics-data";
import {
  CLASS_OPTIONS,
  HORIZON_OPTIONS,
  KPI_OPTIONS,
  SCOPE_OPTIONS,
} from "@/lib/report/market-dynamics-data";

export interface DynamicsFilterBarProps {
  value: DynamicsFilterState;
  onChange: (next: DynamicsFilterState) => void;
  className?: string;
}

/**
 * 4-axis institutional filter bar at the top of Market Dynamics. All four
 * groups are global — every change re-renders the 6 chart cards below.
 *
 * Visual style matches the CAPEX `ToggleSelector` (slate-100 track, dark
 * forest pill on active). Stays visible in print so the PDF reader can see
 * the snapshot's filter state, with a light treatment so it doesn't compete
 * with the data.
 */
export function DynamicsFilterBar({
  value,
  onChange,
  className,
}: DynamicsFilterBarProps) {
  return (
    <div
      className={cn(
        "rounded-xl border border-slate-200 bg-slate-50/80 p-4 print:border-slate-200 print:bg-white print:p-2 print:rounded-md",
        className,
      )}
    >
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4 print:grid-cols-4 print:gap-2">
        <FilterGroup
          label="Ámbito"
          options={SCOPE_OPTIONS}
          selected={value.scope}
          onChange={(scope) => onChange({ ...value, scope })}
        />
        <FilterGroup
          label="Class"
          options={CLASS_OPTIONS}
          selected={value.class}
          onChange={(klass) => onChange({ ...value, class: klass })}
        />
        <FilterGroup
          label="KPI"
          options={KPI_OPTIONS}
          selected={value.kpi}
          onChange={(kpi) => onChange({ ...value, kpi })}
        />
        <FilterGroup
          label="Horizonte"
          options={HORIZON_OPTIONS}
          selected={value.horizon}
          onChange={(horizon) => onChange({ ...value, horizon })}
        />
      </div>
    </div>
  );
}

// ── Internal filter pill group ──────────────────────────────────────────────

interface FilterGroupProps<T extends string> {
  label: string;
  options: DynamicsFilterOption<T>[];
  selected: T;
  onChange: (id: T) => void;
}

function FilterGroup<T extends DynamicsScope | DynamicsClass | DynamicsKpi | DynamicsHorizon>({
  label,
  options,
  selected,
  onChange,
}: FilterGroupProps<T>) {
  return (
    <div className="min-w-0">
      <p className="mb-1.5 text-[10px] font-bold uppercase tracking-widest text-slate-500 print:text-[7px] print:mb-1 print:tracking-normal">
        {label}
      </p>
      <div
        role="tablist"
        className="inline-flex w-full flex-wrap gap-1 rounded-lg border border-slate-200 bg-white p-1 print:border-slate-200 print:p-0.5"
      >
        {options.map((option) => {
          const isActive = option.id === selected;
          return (
            <button
              key={option.id}
              type="button"
              role="tab"
              aria-selected={isActive}
              onClick={() => onChange(option.id)}
              className={cn(
                "min-w-0 flex-1 truncate rounded-md px-2.5 py-1.5 text-[11px] font-bold transition-colors print:text-[7px] print:px-1.5 print:py-0.5",
                isActive
                  ? "bg-forest-900 text-white shadow-sm"
                  : "text-slate-500 hover:bg-slate-100 hover:text-slate-700 print:text-slate-400",
              )}
            >
              {option.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
