import { cn } from "@/lib/utils";
import type { AgentLogEntry } from "@/lib/admin/agents";

export interface AgentLogsPanelProps {
  entries: AgentLogEntry[];
  className?: string;
}

const LEVEL_TINT: Record<AgentLogEntry["level"], string> = {
  ok: "text-emerald-400",
  info: "text-sky-300",
  warn: "text-amber-300",
  error: "text-rose-400",
};

/**
 * Bloomberg-terminal style log feed. Monospace · dark background · tracked-out
 * level prefixes. Mock data today; Phase 3 streams real ai_agent_runs.steps.
 */
export function AgentLogsPanel({ entries, className }: AgentLogsPanelProps) {
  return (
    <div
      className={cn(
        "overflow-hidden rounded-xl border border-slate-200 bg-slate-950",
        className,
      )}
    >
      <header className="flex items-center justify-between border-b border-slate-800 bg-slate-900/50 px-4 py-2.5">
        <span className="font-headline text-[10px] font-extrabold uppercase tracking-[0.25em] text-lime-300">
          Operational Log Feed
        </span>
        <span className="font-mono text-[10px] uppercase tracking-widest text-slate-500">
          mock · static fixture · v0.1
        </span>
      </header>
      <ol className="max-h-[420px] overflow-y-auto divide-y divide-slate-800/60">
        {entries.length === 0 ? (
          <li className="px-4 py-6 text-center font-mono text-[11px] text-slate-500">
            — no log entries —
          </li>
        ) : (
          entries.map((e, i) => (
            <li key={i} className="flex gap-3 px-4 py-2 font-mono text-[12px]">
              <span className="shrink-0 text-slate-500">{formatTs(e.ts)}</span>
              <span
                className={cn(
                  "shrink-0 font-bold uppercase tracking-widest text-[10px] w-12",
                  LEVEL_TINT[e.level],
                )}
              >
                {e.level}
              </span>
              <span className="text-slate-100">{e.message}</span>
            </li>
          ))
        )}
      </ol>
    </div>
  );
}

function formatTs(iso: string): string {
  // Trim ISO to HH:MM:SS — keeps the row compact, matches Bloomberg cadence
  try {
    const d = new Date(iso);
    const pad = (n: number) => n.toString().padStart(2, "0");
    return `${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}:${pad(d.getUTCSeconds())}Z`;
  } catch {
    return iso.slice(11, 19);
  }
}
