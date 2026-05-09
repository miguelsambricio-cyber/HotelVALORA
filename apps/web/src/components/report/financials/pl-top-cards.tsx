"use client";

import { useEffect, useState } from "react";
import { ArrowUp, BarChart3, Coins } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  formatPercent,
  parseAssumption,
  SCENARIO_GROWTH,
  type Currency,
  type PLAssumptions,
} from "@/lib/report/financials";
import {
  SCENARIO_LABELS,
  type UnderwritingScenario,
} from "@/lib/underwriting/scenario";
import { FinancialMetricCard } from "./financial-metric-card";

// ── RevPAR Scenario (read-only readout of the global scenario) ──────────────
//
// This card was previously an interactive selector. With the global
// `ScenarioToggle` living in the page header, the card now acts as a
// committee-grade readout — surfacing the YoY growth values implied by the
// active scenario across the 5-year horizon. No buttons, no inputs.

export interface RevparScenarioCardProps {
  /** Active scenario from the global underwriting store */
  scenario: UnderwritingScenario;
}

export function RevparScenarioCard({ scenario }: RevparScenarioCardProps) {
  const growth = SCENARIO_GROWTH[scenario];
  return (
    <FinancialMetricCard variant="light">
      <CardHeader
        title="RevPAR Scenario"
        icon={<BarChart3 className="text-blue-600" size={20} />}
      />
      <div className="grid grid-cols-3 gap-3 print:gap-2">
        <ReadoutTile label="YR 2" value={growth.yr2} />
        <ReadoutTile label="YR 3" value={growth.yr3} />
        <ReadoutTile label="YR 4-5" value={growth.yr4to5} />
      </div>
      <p className="mt-3 flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-slate-400 print:mt-1.5 print:text-[7px]">
        <ArrowUp size={10} strokeWidth={2.5} className="print:hidden" />
        Active scenario
        <span className="font-bold text-forest-900">
          · {SCENARIO_LABELS[scenario]}
        </span>
        <span className="ml-auto print:hidden">Adjust from header</span>
      </p>
    </FinancialMetricCard>
  );
}

interface ReadoutTileProps {
  label: string;
  /** Growth ratio (0..1) — rendered as "+X.X%" */
  value: number;
}

function ReadoutTile({ label, value }: ReadoutTileProps) {
  const sign = value >= 0 ? "+" : "";
  return (
    <div className="rounded-md border border-slate-200 bg-slate-50 px-2 py-2 text-center print:py-1">
      <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 print:text-[7px]">
        {label}
      </p>
      <p className="mt-0.5 text-base font-extrabold text-slate-800 font-headline print:text-xs">
        {sign}
        {(value * 100).toFixed(1)}%
      </p>
    </div>
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
