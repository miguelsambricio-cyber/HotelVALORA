import { cn } from "@/lib/utils";
import type { KpiEntry } from "@/lib/admin/dashboard";
import { SIGNAL_VISUAL } from "./signal-tints";

export interface KpiCardProps {
  entry: KpiEntry;
  className?: string;
}

/**
 * Institutional KPI tile for the Executive Overview grid.
 *
 * Bloomberg-style dense info card: thin colored rail on the left, tracked-out
 * uppercase label, large mono-leaning value, one-line subline, optional
 * trend pill. Dark institutional canvas (slate-950 + forest-900 accent).
 */
export function KpiCard({ entry, className }: KpiCardProps) {
  const v = SIGNAL_VISUAL[entry.signal];
  const trendV = entry.trendLevel ? SIGNAL_VISUAL[entry.trendLevel] : v;
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-xl border border-slate-800 bg-slate-950 p-4",
        "transition-colors hover:border-slate-700",
        className,
      )}
    >
      <span
        aria-hidden
        className={cn("absolute inset-y-0 left-0 w-[3px]", v.rail)}
      />
      <div className="flex items-center justify-between gap-2">
        <span className="font-headline text-[9.5px] font-extrabold uppercase tracking-[0.22em] text-slate-400">
          {entry.label}
        </span>
        <span
          className={cn(
            "inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 font-mono text-[9.5px] uppercase tracking-widest ring-1",
            v.bg,
            v.ring,
            v.text,
          )}
          aria-hidden
        >
          <span className={cn("text-[8px] leading-none", v.pulse && "animate-pulse")}>
            {v.dot}
          </span>
          {entry.signal}
        </span>
      </div>
      <div className="mt-3 font-headline text-2xl font-extrabold tracking-tighter text-white sm:text-[26px]">
        {entry.value}
      </div>
      <p className="mt-1 text-[11px] leading-snug text-slate-400">{entry.subline}</p>
      {entry.trend && (
        <div className="mt-2.5 flex items-center gap-1 font-mono text-[10px] uppercase tracking-widest">
          <span className={trendV.text}>{entry.trend}</span>
        </div>
      )}
    </div>
  );
}
