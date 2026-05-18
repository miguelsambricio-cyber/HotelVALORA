"use client";

import { cn } from "@/lib/utils";

/**
 * Floating KPI strip · sticky-top investment committee glance.
 *
 *  · always visible in the viewport while scrolling
 *  · 4-6 hero KPIs (IRR · DSCR · LTV · Cap rate · Equity Multiple)
 *  · hidden in print (PDF surfaces these via dedicated summary)
 *
 * Block 1 ships with placeholder labels · Block 7 wires real engine
 * outputs (Project IRR, Equity IRR, exit metrics).
 */

export interface KpiItem {
  label: string;
  value: string;
  sub?: string;
  tone?: "neutral" | "ok" | "warn" | "info";
}

export function FloatingKpiStrip({ items }: { items: KpiItem[] }) {
  return (
    <div className="sticky top-20 z-30 -mx-2 mb-6 rounded-2xl border border-lime-300/30 bg-forest-900/95 px-3 py-2 shadow-2xl ring-1 ring-lime-300/15 backdrop-blur print:hidden">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
        {items.map((kpi) => (
          <KpiCell key={kpi.label} {...kpi} />
        ))}
      </div>
    </div>
  );
}

function KpiCell({ label, value, sub, tone = "neutral" }: KpiItem) {
  const valueTone =
    tone === "ok" ? "text-emerald-300"
    : tone === "warn" ? "text-amber-300"
    : tone === "info" ? "text-lime-300"
    : "text-white";
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
