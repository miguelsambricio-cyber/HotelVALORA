import { cn } from "@/lib/utils";
import type { InfraEntry } from "@/lib/admin/dashboard";
import { SIGNAL_VISUAL } from "./signal-tints";

export interface InfraIndicatorProps {
  entry: InfraEntry;
  className?: string;
}

/**
 * One row in the Infrastructure Monitoring panel.
 *
 * Composed as a horizontal pill: status dot · service name · scope subline ·
 * region pill · status detail. Sits comfortably in a 3-column grid OR a
 * single-column vertical stack on small screens.
 *
 * Subtle pulse on the operational dot — gives the panel a live-control-room
 * feel without crossing into animation theatre.
 */
export function InfraIndicator({ entry, className }: InfraIndicatorProps) {
  const v = SIGNAL_VISUAL[entry.signal];
  return (
    <div
      className={cn(
        "flex items-start gap-3 rounded-xl border border-slate-800 bg-slate-950 p-4 transition-colors hover:border-slate-700",
        className,
      )}
    >
      <div className="relative mt-1.5 flex h-2.5 w-2.5 shrink-0 items-center justify-center">
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
        <div className="flex items-center gap-2">
          <h3 className="font-headline text-[13px] font-extrabold tracking-tight text-white">
            {entry.name}
          </h3>
          <span
            className={cn(
              "rounded px-1.5 py-0.5 font-mono text-[9.5px] uppercase tracking-widest ring-1",
              v.bg,
              v.ring,
              v.text,
            )}
          >
            {entry.status}
          </span>
          <span className="ml-auto rounded bg-slate-900 px-1.5 py-0.5 font-mono text-[9.5px] uppercase tracking-widest text-slate-400">
            {entry.region}
          </span>
        </div>
        <p className="mt-1 text-[11px] leading-snug text-slate-400">{entry.scope}</p>
        <p className="mt-1.5 font-mono text-[10.5px] text-slate-500">{entry.detail}</p>
      </div>
    </div>
  );
}
