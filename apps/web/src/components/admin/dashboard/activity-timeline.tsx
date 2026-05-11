import { cn } from "@/lib/utils";
import type { ActivityEntry } from "@/lib/admin/dashboard";
import { SIGNAL_VISUAL } from "./signal-tints";

export interface ActivityTimelineProps {
  entries: ActivityEntry[];
  className?: string;
}

/**
 * Recent Operational Activity — institutional timeline.
 *
 * Each row: signal dot · channel label (AGENT / INGEST / CRON / etc.) ·
 * title · context line · monospace timestamp. Dense, Bloomberg-feeling,
 * stack-ordered by recency.
 */
export function ActivityTimeline({ entries, className }: ActivityTimelineProps) {
  return (
    <ol
      className={cn(
        "overflow-hidden rounded-xl border border-slate-800 bg-slate-950",
        className,
      )}
    >
      {entries.map((e, i) => {
        const v = SIGNAL_VISUAL[e.signal];
        return (
          <li
            key={e.id}
            className={cn(
              "flex gap-3 px-4 py-3 transition-colors hover:bg-slate-900/40",
              i > 0 && "border-t border-slate-800/60",
            )}
          >
            <div className="relative mt-2 flex h-2 w-2 shrink-0">
              <span
                aria-hidden
                className={cn(
                  "absolute inset-0 rounded-full",
                  v.rail,
                  v.pulse && "animate-pulse",
                )}
              />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-baseline gap-2">
                <span
                  className={cn(
                    "rounded bg-slate-900 px-1.5 py-0.5 font-mono text-[9.5px] font-bold uppercase tracking-widest",
                    v.text,
                  )}
                >
                  {e.channel}
                </span>
                <h3 className="font-headline text-[13px] font-extrabold tracking-tight text-white">
                  {e.title}
                </h3>
                <span className="ml-auto font-mono text-[10px] uppercase tracking-widest text-slate-500">
                  {formatRelative(e.ts)}
                </span>
              </div>
              <p className="mt-0.5 text-[11.5px] leading-snug text-slate-400">{e.detail}</p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}

function formatRelative(iso: string): string {
  try {
    const t = new Date(iso).getTime();
    const now = Date.now();
    const diff = Math.max(0, now - t);
    const mins = Math.floor(diff / 60_000);
    if (mins < 1) return "just now";
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days}d ago`;
    const d = new Date(t);
    const pad = (n: number) => n.toString().padStart(2, "0");
    return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
  } catch {
    return iso.slice(0, 10);
  }
}
