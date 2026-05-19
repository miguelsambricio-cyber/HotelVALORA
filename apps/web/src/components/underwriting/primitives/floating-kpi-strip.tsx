"use client";

import { useEffect, useState } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Floating KPI strip · sticky-top investment committee glance.
 *
 *  · always visible while scrolling
 *  · 4 hero KPIs (Project IRR · Equity IRR · MOIC · Scenario)
 *  · hidden in print (PDF surfaces these via dedicated summary)
 *
 * Corporate light theme · white card with slate-200 border, identical
 * surface treatment to the P&L FinancialSummaryStrip.
 *
 * One cell can carry a `scenarioPicker` payload that turns the cell into
 * a clickable dropdown · selecting an option flips the active scenario
 * via `onSelect`. Used by the underwriting shell to let the operator
 * switch Conservador / Mercado / Optimista from anywhere on the page.
 */

export interface KpiScenarioPicker {
  options: Array<{ id: string; label: string }>;
  activeId: string;
  onSelect: (id: string) => void;
}

export interface KpiItem {
  label: string;
  value: string;
  sub?: string;
  tone?: "neutral" | "ok" | "warn" | "info";
  /** When set, the cell is a clickable scenario dropdown. */
  scenarioPicker?: KpiScenarioPicker;
}

export function FloatingKpiStrip({ items }: { items: KpiItem[] }) {
  // 4-col on lg+ matches the trimmed Project IRR / Equity IRR / MOIC /
  // Scenario lineup. Smaller breakpoints stack 2-col / 3-col.
  return (
    <div className="sticky top-20 z-30 -mx-2 mb-6 rounded-2xl border border-slate-200 bg-white/95 px-3 py-2 shadow-md backdrop-blur supports-[backdrop-filter]:bg-white/85 print:hidden">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-2 lg:grid-cols-4">
        {items.map((kpi) => (
          <KpiCell key={kpi.label} {...kpi} />
        ))}
      </div>
    </div>
  );
}

function KpiCell({ label, value, sub, tone = "neutral", scenarioPicker }: KpiItem) {
  const valueTone =
    tone === "ok" ? "text-emerald-700"
    : tone === "warn" ? "text-amber-700"
    : tone === "info" ? "text-[#005db7]"
    : "text-slate-900";

  if (scenarioPicker) {
    return (
      <ScenarioPickerCell
        label={label}
        sub={sub}
        picker={scenarioPicker}
      />
    );
  }

  return (
    <div className="min-w-0">
      <p className="font-headline text-[8.5px] font-bold uppercase tracking-[0.22em] text-slate-500">
        {label}
      </p>
      <p className={cn("mt-0.5 truncate font-mono text-[13px] font-extrabold tabular-nums", valueTone)}>
        {value}
      </p>
      {sub && (
        <p className="truncate font-mono text-[9.5px] text-slate-500">{sub}</p>
      )}
    </div>
  );
}

/**
 * ScenarioPickerCell · clickable cap-rate scenario selector. Shows the
 * active scenario label in uppercase headline type (e.g. "MERCADO") with
 * a chevron · clicking opens a small dropdown with the 3 options.
 */
function ScenarioPickerCell({
  label,
  sub,
  picker,
}: {
  label: string;
  sub?: string;
  picker: KpiScenarioPicker;
}) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest("[data-scenario-dropdown]")) setOpen(false);
    };
    window.addEventListener("mousedown", handler);
    return () => window.removeEventListener("mousedown", handler);
  }, [open]);

  const active = picker.options.find((o) => o.id === picker.activeId);
  const activeLabel = (active?.label ?? picker.activeId).toUpperCase();

  return (
    <div className="relative min-w-0" data-scenario-dropdown>
      <p className="font-headline text-[8.5px] font-bold uppercase tracking-[0.22em] text-slate-500">
        {label}
      </p>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setOpen((v) => !v);
        }}
        aria-haspopup="listbox"
        aria-expanded={open}
        className={cn(
          "mt-0.5 inline-flex w-full items-center gap-1 truncate rounded-sm py-0.5 text-left font-headline text-[12px] font-extrabold uppercase tracking-[0.16em] transition-colors",
          open
            ? "text-[#005db7]"
            : "text-slate-900 hover:text-[#005db7]",
        )}
      >
        <span className="truncate">{activeLabel}</span>
        <ChevronDown size={12} strokeWidth={2.5} className={cn("shrink-0 transition-transform", open && "rotate-180")} />
      </button>
      {sub && (
        <p className="truncate font-mono text-[9.5px] text-slate-500">{sub}</p>
      )}
      {open && (
        <ul
          role="listbox"
          className="absolute left-0 z-40 mt-1 w-40 overflow-hidden rounded-md border border-slate-200 bg-white shadow-lg ring-1 ring-black/5"
        >
          {picker.options.map((opt) => {
            const isActive = opt.id === picker.activeId;
            return (
              <li key={opt.id}>
                <button
                  type="button"
                  role="option"
                  aria-selected={isActive}
                  onClick={(e) => {
                    e.stopPropagation();
                    picker.onSelect(opt.id);
                    setOpen(false);
                  }}
                  className={cn(
                    "block w-full px-3 py-1.5 text-left font-headline text-[10.5px] font-extrabold uppercase tracking-[0.18em] transition-colors",
                    isActive
                      ? "bg-blue-50 text-[#005db7]"
                      : "text-slate-700 hover:bg-slate-50",
                  )}
                >
                  {opt.label}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
