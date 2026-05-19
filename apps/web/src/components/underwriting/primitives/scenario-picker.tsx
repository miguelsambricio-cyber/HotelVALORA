"use client";

import { cn } from "@/lib/utils";
import type { ScenarioCatalogEntry } from "@/lib/underwriting/defaults";

/**
 * ScenarioPicker · sticky segmented control at the top of the
 * underwriting page. Conservador / Mercado / Optimista → re-prices the
 * engine reactively. Hidden in print.
 *
 * Corporate light theme · the active scenario is a forest-900 chip
 * (same palette as the P&L "ACTIVE" RevPAR scenario button); live
 * metrics on the right render in blue (#005db7) — the same colour the
 * operator sees on every editable surface, signalling "these numbers
 * just changed because you switched scenario".
 */
export function ScenarioPicker({
  catalog,
  activeId,
  onChange,
  capRateEntryPct,
  capRateExitPct,
  equityIrrPct,
  moic,
}: {
  catalog: ScenarioCatalogEntry[];
  activeId: string;
  onChange: (id: string) => void;
  capRateEntryPct: number;
  capRateExitPct: number;
  equityIrrPct: number;
  moic: number;
}) {
  return (
    <div className="sticky top-0 z-30 -mx-2 mb-3 rounded-md border border-slate-200 bg-white/95 px-3 py-2 shadow-md backdrop-blur supports-[backdrop-filter]:bg-white/85 print:hidden">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <div className="flex items-center gap-2">
          <span className="font-headline text-[9px] font-extrabold uppercase tracking-[0.28em] text-[#005db7]">
            Scenario
          </span>
          <div role="radiogroup" aria-label="Underwriting scenario" className="inline-flex rounded-md border border-slate-200 bg-slate-50 p-0.5">
            {catalog.map((s) => {
              const active = s.id === activeId;
              return (
                <button
                  key={s.id}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  onClick={() => onChange(s.id)}
                  title={s.hint}
                  className={cn(
                    "rounded-sm px-3 py-1 font-headline text-[10.5px] font-extrabold uppercase tracking-[0.18em] transition-colors",
                    active
                      ? "bg-forest-900 text-white shadow-sm"
                      : "text-slate-600 hover:bg-white hover:text-slate-900",
                  )}
                >
                  {s.label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="ml-auto flex flex-wrap items-baseline gap-x-4 gap-y-1">
          <LiveMetric label="Cap rate entry" value={`${capRateEntryPct.toFixed(2).replace(".", ",")}%`} />
          <LiveMetric label="Cap rate exit" value={`${capRateExitPct.toFixed(2).replace(".", ",")}%`} />
          <LiveMetric label="Equity IRR" value={`${equityIrrPct.toFixed(2).replace(".", ",")}%`} />
          <LiveMetric label="MOIC" value={`${moic.toFixed(2).replace(".", ",")}x`} />
        </div>
      </div>
    </div>
  );
}

function LiveMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline gap-1.5">
      <span className="font-headline text-[8.5px] font-bold uppercase tracking-[0.22em] text-slate-500">
        {label}
      </span>
      <span className="font-mono text-[12px] font-extrabold tabular-nums text-[#005db7]">{value}</span>
    </div>
  );
}
