"use client";

import { useEffect, useState } from "react";
import { BarChart3, Coins } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  formatPercent,
  parseAssumption,
  type Currency,
  type PLAssumptions,
  type RevparScenario,
} from "@/lib/report/financials";
import { FinancialMetricCard } from "./financial-metric-card";

// ── RevPAR Scenario (segmented institutional selector) ──────────────────────
//
// Replaces the prior 3-input "RevPAR Growth (YoY)" card. UI surfaces three
// committee-grade choices (Conservador / Mercado / Optimista) that map
// internally onto `downside` / `base` / `upside` — the visible labels never
// expose those internal terms.
//
// Selected button: forest-900 background + white text (HotelVALORA primary).
// Tier handling: PREMIUM toggles freely; PRO/FREE see the active scenario
// but can't change it (buttons render as `aria-disabled` non-interactive).

const SCENARIO_OPTIONS: { id: RevparScenario; label: string }[] = [
  { id: "downside", label: "Conservador" },
  { id: "base", label: "Mercado" },
  { id: "upside", label: "Optimista" },
];

export interface RevparScenarioCardProps {
  value: RevparScenario;
  editable: boolean;
  onChange: (next: RevparScenario) => void;
}

export function RevparScenarioCard({
  value,
  editable,
  onChange,
}: RevparScenarioCardProps) {
  return (
    <FinancialMetricCard variant="light">
      <CardHeader title="RevPAR Scenario" icon={<BarChart3 className="text-blue-600" size={20} />} />
      <div
        role="radiogroup"
        aria-label="RevPAR scenario"
        className={cn(
          "inline-flex w-full gap-1 rounded-lg border border-slate-200 bg-slate-50 p-1",
          "print:border-slate-200 print:p-0.5",
        )}
      >
        {SCENARIO_OPTIONS.map((opt) => {
          const isActive = opt.id === value;
          return (
            <button
              key={opt.id}
              type="button"
              role="radio"
              aria-checked={isActive}
              aria-disabled={!editable}
              disabled={!editable && !isActive}
              onClick={() => editable && onChange(opt.id)}
              className={cn(
                "flex-1 rounded-md px-3 py-2 text-xs font-bold uppercase tracking-wider transition-all",
                "print:py-1 print:text-[8px] print:tracking-normal",
                isActive
                  ? "bg-forest-900 text-white shadow-sm"
                  : "text-slate-500",
                editable && !isActive && "hover:bg-white hover:text-slate-700 cursor-pointer",
                !editable && !isActive && "cursor-default opacity-60",
              )}
            >
              {opt.label}
            </button>
          );
        })}
      </div>
    </FinancialMetricCard>
  );
}

// ── Expense Inflation ───────────────────────────────────────────────────────

export interface ExpenseInflationCardProps {
  values: PLAssumptions["expenseInflation"];
  editable: boolean;
  onChange: (next: PLAssumptions["expenseInflation"]) => void;
}

export function ExpenseInflationCard({
  values,
  editable,
  onChange,
}: ExpenseInflationCardProps) {
  return (
    <FinancialMetricCard variant="light">
      <CardHeader title="Expense Inflation" icon={<Coins className="text-slate-600" size={20} />} />
      <div className="flex gap-4 print:gap-2">
        <PercentField
          label="Payroll"
          value={values.payroll}
          editable={editable}
          onChange={(v) => onChange({ ...values, payroll: v })}
        />
        <PercentField
          label="Utilities"
          value={values.utilities}
          editable={editable}
          onChange={(v) => onChange({ ...values, utilities: v })}
        />
        <PercentField
          label="Other"
          value={values.other}
          editable={editable}
          onChange={(v) => onChange({ ...values, other: v })}
        />
      </div>
    </FinancialMetricCard>
  );
}

// ── EBITDA Stabilized (dark hero) ───────────────────────────────────────────

export interface EbitdaStabilizedCardProps {
  /** Stabilised EBITDA target ratio (0..1) */
  target: number;
  /** Staff cost share ratio (0..1) */
  staffCostShare: number;
  /** Optional currency (informational — not used today, here for symmetry) */
  currency?: Currency;
}

export function EbitdaStabilizedCard({
  target,
  staffCostShare,
}: EbitdaStabilizedCardProps) {
  // Progress bar fills relative to a 60% reference (institutional ceiling)
  const fillPct = Math.min(100, (target / 0.6) * 100);
  return (
    <FinancialMetricCard variant="dark" className="flex flex-col justify-between">
      <div className="flex items-start justify-between">
        <div className="flex flex-col">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-emerald-200">
            EBITDA stabilized
          </span>
          <span className="mt-1 text-3xl font-extrabold text-white print:text-2xl">
            {formatPercent(target, 1)}
          </span>
        </div>
        <div className="flex flex-col items-end">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-emerald-200">
            Staff cost
          </span>
          <span className="mt-1 text-2xl font-bold text-white print:text-xl">
            {formatPercent(staffCostShare, 1)}
          </span>
        </div>
      </div>
      <div className="mt-4 flex items-center gap-3 print:mt-2">
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-emerald-900">
          <div
            className="h-full rounded-full bg-yellow-400"
            style={{ width: `${fillPct}%` }}
          />
        </div>
        <span className="shrink-0 text-[10px] font-bold uppercase tracking-wider text-yellow-400 print:text-[7px]">
          Target
        </span>
      </div>
    </FinancialMetricCard>
  );
}

// ── Internals ──────────────────────────────────────────────────────────────

function CardHeader({ title, icon }: { title: string; icon: React.ReactNode }) {
  return (
    <div className="mb-4 flex items-center justify-between print:mb-2">
      <h3 className="text-sm font-bold text-slate-800 font-headline print:text-xs">
        {title}
      </h3>
      <span className="shrink-0">{icon}</span>
    </div>
  );
}

interface PercentFieldProps {
  label: string;
  value: number; // ratio 0..1
  editable: boolean;
  onChange: (next: number) => void;
}

function PercentField({ label, value, editable, onChange }: PercentFieldProps) {
  const [raw, setRaw] = useState(formatPercent(value, 1));
  useEffect(() => setRaw(formatPercent(value, 1)), [value]);

  const handleBlur = () => {
    const parsed = parseAssumption(raw, "percent");
    if (parsed === null) {
      setRaw(formatPercent(value, 1));
      return;
    }
    if (parsed !== value) onChange(parsed);
    setRaw(formatPercent(parsed, 1));
  };

  return (
    <div className="flex w-full flex-col gap-1">
      <label className="text-[10px] font-semibold uppercase text-slate-500 print:text-[7px]">
        {label}
      </label>
      <input
        type="text"
        value={raw}
        readOnly={!editable}
        onChange={(e) => setRaw(e.target.value)}
        onBlur={handleBlur}
        className={cn(
          "w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-center text-sm font-semibold text-slate-700",
          "focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500",
          "read-only:cursor-default read-only:focus:ring-0 read-only:focus:border-slate-300",
          "print:border-slate-200 print:py-1 print:text-xs",
        )}
      />
    </div>
  );
}
