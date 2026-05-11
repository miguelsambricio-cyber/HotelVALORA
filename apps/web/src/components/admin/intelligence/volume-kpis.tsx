import { cn } from "@/lib/utils";
import { SIGNAL_VISUAL } from "@/components/admin/dashboard/signal-tints";
import type { VolumeKpi } from "@/lib/admin/intelligence";

/**
 * Top-strip KPIs for the Intelligence Terminal — articles today / 7d /
 * transactions detected / deal volume / authenticated-source health.
 *
 * Same institutional dark-canvas pattern as the Executive Control Room's
 * KPI tiles, but oriented horizontally (terminal-style).
 */
export function VolumeKpis({ kpis }: { kpis: VolumeKpi[] }) {
  return (
    <section className="overflow-hidden rounded-2xl border border-slate-800/60 bg-gradient-to-b from-forest-900 to-slate-950 shadow-sm">
      <header className="border-b border-slate-800/60 px-5 py-3.5">
        <h3 className="font-headline text-[10px] font-extrabold uppercase tracking-[0.25em] text-slate-400">
          News Volume · KPIs
        </h3>
      </header>
      <dl className="grid grid-cols-2 divide-y divide-slate-800/60 sm:grid-cols-3 sm:divide-x sm:divide-y-0 lg:grid-cols-6">
        {kpis.map((k) => {
          const signal = SIGNAL_VISUAL[k.signal];
          return (
            <div key={k.id} className="relative px-4 py-4">
              <span aria-hidden className={cn("absolute left-0 top-3 bottom-3 w-0.5", signal.rail)} />
              <dt className="flex items-center gap-1.5 pl-2 font-headline text-[9px] font-bold uppercase tracking-[0.22em] text-slate-500">
                <span aria-hidden className={cn(signal.text, signal.pulse && "animate-pulse")}>{signal.dot}</span>
                {k.label}
              </dt>
              <dd className="mt-1.5 pl-2 font-headline text-2xl font-extrabold tracking-tighter text-lime-300">
                {k.value}
              </dd>
              <p className="mt-1 pl-2 text-[11.5px] leading-snug text-slate-400">{k.subline}</p>
              {k.trend && (
                <p className={cn("mt-1.5 pl-2 font-headline text-[10px] font-bold uppercase tracking-[0.18em]", signal.text)}>
                  {k.trend}
                </p>
              )}
            </div>
          );
        })}
      </dl>
    </section>
  );
}
