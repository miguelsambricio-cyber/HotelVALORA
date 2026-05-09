"use client";

import { useEffect, useState } from "react";
import { BarChart3, Coins } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  formatPercent,
  parseAssumption,
  SCENARIO_OPTIONS,
  type Currency,
  type PLAssumptions,
  type UnderwritingScenario,
} from "@/lib/report/financials";
import { FinancialMetricCard } from "./financial-metric-card";

// ── RevPAR Scenario (3-button preset selector) ──────────────────────────────
//
// Three full presets (Down / Base / Up) — each one a complete profile of
// occupancy deltas + ADR growth per year. Picking one re-projects the
// entire 5-year forecast (RevPAR, Revenue, GOP, EBITDA, margin) via
// `computePL` consuming `assumptions.activeScenario`.
//
// Visual: 3 institutional input-styled tiles in a horizontal row, matching
// the Stitch reference. Active tile carries the HotelVALORA forest-900
// primary; inactive tiles stay slate. PRO renders the buttons disabled
// (active state still shows so the tier sees which scenario the analyst
// shipped); PREMIUM toggles freely.

export interface RevparScenarioCardProps {
  active: UnderwritingScenario;
  editable: boolean;
  onChange: (next: UnderwritingScenario) => void;
}

/**
 * Decorative committee labels rendered above each scenario button.
 * The buttons themselves carry the canonical short tags (DOWN / BASE /
 * UP) from `SCENARIO_OPTIONS`; the Spanish words are presentation-only
 * top-of-column tags that mirror the PAYROLL / UTILITIES / OTHER labels
 * of the adjacent Expense Inflation card.
 */
const TOP_LABEL_BY_SCENARIO: Record<UnderwritingScenario, string> = {
  downside: "Conservador",
  base: "Mercado",
  upside: "Optimista",
};

export function RevparScenarioCard({
  active,
  editable,
  onChange,
}: RevparScenarioCardProps) {
  return (
    <FinancialMetricCard variant="light">
      <CardHeader title="RevPAR Scenario" icon={<BarChart3 className="text-blue-600" size={20} />} />
      <div
        role="radiogroup"
        aria-label="RevPAR scenario"
        className="flex gap-4 print:gap-2"
      >
        {SCENARIO_OPTIONS.map((opt) => {
          const isActive = opt.id === active;
          return (
            <div key={opt.id} className="flex w-full flex-col gap-1">
              <span
                aria-hidden
                className="text-[10px] font-semibold uppercase text-slate-500 print:text-[7px]"
              >
                {TOP_LABEL_BY_SCENARIO[opt.id]}
              </span>
              <button
                type="button"
                role="radio"
                aria-checked={isActive}
                aria-disabled={!editable}
                disabled={!editable && !isActive}
                onClick={() => editable && onChange(opt.id)}
                className={cn(
                  "w-full rounded-md border px-3 py-2 text-center text-sm font-semibold transition-all",
                  "focus:outline-none focus:ring-1 focus:ring-emerald-500",
                  "print:border-slate-200 print:py-1 print:text-xs",
                  isActive
                    ? "border-forest-900 bg-forest-900 text-white shadow-sm"
                    : "border-slate-300 bg-white text-slate-700",
                  editable && !isActive && "cursor-pointer hover:border-slate-400 hover:bg-slate-50",
                  !editable && !isActive && "cursor-default opacity-60",
                )}
              >
                {opt.label}
              </button>
            </div>
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

// ── EBITDA Stabilized (dark hero — value derived from Year-3 margin) ────────

export interface EbitdaStabilizedCardProps {
  /** Stabilised EBITDA margin (0..1) — derived from Year-3 of `computePL` */
  margin: number;
  /** Staff cost share ratio (0..1) — informational, today still an assumption */
  staffCostShare: number;
  /** Optional currency (informational — kept for API symmetry) */
  currency?: Currency;
}

export function EbitdaStabilizedCard({
  margin,
  staffCostShare,
}: EbitdaStabilizedCardProps) {
  // Progress bar fills relative to a 60% reference (institutional ceiling)
  const fillPct = Math.min(100, (margin / 0.6) * 100);
  return (
    <FinancialMetricCard variant="dark" className="flex flex-col justify-between">
      <div className="flex items-start justify-between">
        <div className="flex flex-col">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-emerald-200">
            EBITDA stabilized
          </span>
          <span className="mt-1 text-3xl font-extrabold text-white print:text-2xl">
            {formatPercent(margin, 1)}
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
          Year 3
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
