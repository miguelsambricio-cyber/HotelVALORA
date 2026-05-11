import { cn } from "@/lib/utils";
import type { PipelineEntry } from "@/lib/admin/dashboard";
import { SIGNAL_VISUAL } from "./signal-tints";

export interface PipelineCardProps {
  entry: PipelineEntry;
  className?: string;
}

/**
 * Operational card for the Data Pipeline Center. Dense, institutional —
 * each card surfaces: pipeline name · workspace · ingestion status pill ·
 * last update timestamp · queue size · success rate.
 *
 * 6 cards laid out in a 3-column responsive grid on the landing page.
 */
export function PipelineCard({ entry, className }: PipelineCardProps) {
  const v = SIGNAL_VISUAL[entry.signal];
  return (
    <article
      className={cn(
        "relative overflow-hidden rounded-xl border border-slate-800 bg-slate-950 p-4 transition-colors hover:border-slate-700",
        className,
      )}
    >
      <span aria-hidden className={cn("absolute inset-y-0 left-0 w-[3px]", v.rail)} />
      <header className="mb-3 flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 className="font-headline text-[14px] font-extrabold tracking-tight text-white">
            {entry.name}
          </h3>
          <p className="mt-0.5 text-[11px] leading-snug text-slate-400">{entry.domain}</p>
        </div>
        <span
          className={cn(
            "shrink-0 inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-mono text-[9.5px] uppercase tracking-widest ring-1",
            v.bg,
            v.ring,
            v.text,
          )}
        >
          <span className={cn("text-[8px] leading-none", v.pulse && "animate-pulse")} aria-hidden>
            {v.dot}
          </span>
          {entry.ingestionStatus}
        </span>
      </header>

      <dl className="grid grid-cols-3 gap-2 border-t border-slate-800/60 pt-3">
        <Cell label="Last update" value={formatTs(entry.lastUpdate)} mono />
        <Cell label="Queue" value={String(entry.queueSize)} mono />
        <Cell label="Success" value={entry.successRate} mono />
      </dl>

      {entry.workspace && (
        <p className="mt-3 truncate font-mono text-[10.5px] text-slate-500">{entry.workspace}</p>
      )}
    </article>
  );
}

function Cell({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div>
      <dt className="font-headline text-[9px] font-bold uppercase tracking-widest text-slate-500">
        {label}
      </dt>
      <dd className={cn("mt-0.5 text-[12px] font-bold text-white", mono && "font-mono tracking-tight")}>
        {value}
      </dd>
    </div>
  );
}

function formatTs(value: string): string {
  if (!value || value === "—") return "—";
  try {
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return value;
    const pad = (n: number) => n.toString().padStart(2, "0");
    return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())} ${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}`;
  } catch {
    return value;
  }
}
