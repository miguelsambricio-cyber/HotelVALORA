import Link from "next/link";
import { Activity, Pencil, PauseCircle, ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  ALL_AGENTS,
  groupForStatus,
  type AgentDescriptor,
  type AgentStatusGroup,
} from "@/lib/admin/agents";

/**
 * Section 02 · Agent Roster by Tier.
 *
 * Operator management surface for the 10-agent fleet. Each row carries
 * four CTAs:
 *   - Open dashboard  → /user/admin/agents/<id>  (live per-agent surface)
 *   - View activity   → /user/admin/agents/<id>#runs
 *   - Edit agent      → opens edit drawer (Phase 3 mutation layer · gated)
 *   - Pause agent     → toggles `ai_agents.status` (Phase 3 mutation layer · gated)
 *
 * The Edit + Pause buttons render in a disabled-but-affordant state today
 * because the `ai_agents` write surface is not yet exposed. Tooltips
 * make the gate honest. Once the mutation layer ships, swap the `<button
 * disabled>` for the server action.
 */
export function AgentRoster() {
  const byTier: Record<number, AgentDescriptor[]> = { 0: [], 1: [], 2: [], 3: [] };
  ALL_AGENTS.forEach((a) => byTier[a.tier].push(a));

  return (
    <div className="space-y-5">
      {[0, 1, 2, 3].map((tier) => {
        const agents = byTier[tier];
        if (!agents || agents.length === 0) return null;
        return (
          <div
            key={tier}
            className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
          >
            <div className="mb-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="inline-flex h-6 items-center rounded-md bg-forest-900 px-2 font-headline text-[10px] font-extrabold uppercase tracking-[0.22em] text-lime-300">
                  Tier {tier}
                </span>
                <h3 className="font-headline text-[13px] font-extrabold tracking-tight text-forest-900">
                  {tierLabel(tier)}
                </h3>
              </div>
              <span className="font-mono text-[10px] uppercase tracking-widest text-slate-400">
                {agents.length} agent{agents.length === 1 ? "" : "s"}
              </span>
            </div>
            <ul className="grid gap-3 md:grid-cols-2">
              {agents.map((a) => (
                <li key={a.id}>
                  <AgentRow agent={a} />
                </li>
              ))}
            </ul>
          </div>
        );
      })}
    </div>
  );
}

function AgentRow({ agent }: { agent: AgentDescriptor }) {
  const group = groupForStatus(agent.status);
  const v = LIGHT_GROUP_VISUAL[group];
  const dashboardHref = `/user/admin/agents/${agent.id}`;
  const activityHref = `${dashboardHref}#runs`;
  const responsibilities = agent.responsibilities.slice(0, 2);
  return (
    <div className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-slate-50/40 p-3 transition-colors hover:border-forest-900 hover:bg-white">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <Link
              href={dashboardHref}
              className="truncate font-headline text-[13px] font-extrabold tracking-tight text-forest-900 hover:underline"
            >
              {agent.name}
            </Link>
            <span
              className={cn(
                "inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 font-headline text-[9px] font-extrabold uppercase tracking-widest ring-1",
                v.bg,
                v.ring,
                v.text,
              )}
            >
              <span
                aria-hidden
                className={cn("text-[8px] leading-none", v.pulse && "animate-pulse")}
              >
                {v.dot}
              </span>
              {group}
            </span>
          </div>
          <p className="mt-1 truncate text-[11.5px] leading-snug text-slate-500">
            {agent.workspace ?? "supervisory · cross-platform read"}
          </p>
        </div>
      </div>

      {/* responsibilities (top 2) */}
      {responsibilities.length > 0 && (
        <ul className="space-y-1">
          {responsibilities.map((r, idx) => (
            <li
              key={idx}
              className="flex items-start gap-1.5 text-[11px] leading-snug text-slate-500"
            >
              <span aria-hidden className="mt-1.5 inline-block h-1 w-1 shrink-0 rounded-full bg-slate-400" />
              <span className="line-clamp-1">{r}</span>
            </li>
          ))}
        </ul>
      )}

      {/* schedule + success rate strip */}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-[10.5px] text-slate-500">
        <span title="Last execution">last {formatLast(agent.lastExecution)}</span>
        <span aria-hidden className="text-slate-300">·</span>
        <span title="Cron schedule">{agent.cronSchedule ? agent.cronSchedule.split(" UTC")[0] : "—"}</span>
        <span aria-hidden className="text-slate-300">·</span>
        <span title="Success rate">success {agent.successRate}</span>
      </div>

      {/* CTA row */}
      <div className="flex flex-wrap items-center gap-1.5 border-t border-slate-200 pt-2">
        <CtaLink href={dashboardHref} icon={<ExternalLink size={11} />} label="Open dashboard" primary />
        <CtaLink href={activityHref} icon={<Activity size={11} />} label="View activity" />
        <CtaButton
          icon={<Pencil size={11} />}
          label="Edit"
          disabled
          title="Editing is gated on the Phase-3 ai_agents mutation layer."
        />
        <CtaButton
          icon={<PauseCircle size={11} />}
          label={group === "IDLE" ? "Resume" : "Pause"}
          disabled
          title="Pause/resume is gated on the Phase-3 ai_agents mutation layer."
        />
      </div>
    </div>
  );
}

function CtaLink({
  href,
  icon,
  label,
  primary = false,
}: {
  href: string;
  icon: React.ReactNode;
  label: string;
  primary?: boolean;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "inline-flex items-center gap-1 rounded-md px-2 py-1 font-headline text-[10px] font-bold uppercase tracking-[0.18em] ring-1 transition-colors",
        primary
          ? "bg-forest-900 text-lime-300 ring-forest-900 hover:bg-forest-900/90"
          : "bg-white text-slate-700 ring-slate-200 hover:border-forest-900 hover:text-forest-900",
      )}
    >
      {icon}
      {label}
    </Link>
  );
}

function CtaButton({
  icon,
  label,
  disabled = false,
  title,
}: {
  icon: React.ReactNode;
  label: string;
  disabled?: boolean;
  title?: string;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      title={title}
      aria-disabled={disabled}
      className={cn(
        "inline-flex items-center gap-1 rounded-md px-2 py-1 font-headline text-[10px] font-bold uppercase tracking-[0.18em] ring-1 transition-colors",
        disabled
          ? "cursor-not-allowed bg-slate-50 text-slate-400 ring-slate-200"
          : "bg-white text-slate-700 ring-slate-200 hover:border-forest-900 hover:text-forest-900",
      )}
    >
      {icon}
      {label}
    </button>
  );
}

const LIGHT_GROUP_VISUAL: Record<
  AgentStatusGroup,
  { bg: string; ring: string; text: string; dot: string; pulse: boolean }
> = {
  ACTIVE:  { bg: "bg-emerald-50", ring: "ring-emerald-200", text: "text-emerald-700", dot: "●", pulse: true },
  IDLE:    { bg: "bg-slate-100",  ring: "ring-slate-200",   text: "text-slate-500",   dot: "○", pulse: false },
  WARNING: { bg: "bg-amber-50",   ring: "ring-amber-200",   text: "text-amber-700",   dot: "◐", pulse: false },
  ERROR:   { bg: "bg-rose-50",    ring: "ring-rose-200",    text: "text-rose-700",    dot: "▲", pulse: true },
};

function tierLabel(tier: number): string {
  switch (tier) {
    case 0: return "Supervisory · orchestration";
    case 1: return "Operational ingestion + monitoring";
    case 2: return "Strategic moat — underwriting + benchmarking";
    case 3: return "Strategic — finance · brand · support (pre-PMF)";
    default: return "";
  }
}

function formatLast(iso: string | null): string {
  if (!iso) return "—";
  try {
    const ms = new Date(iso).getTime();
    if (!Number.isFinite(ms)) return "—";
    const diff = Date.now() - ms;
    if (diff < 60_000) return "just now";
    if (diff < 3600_000) return `${Math.round(diff / 60_000)}m`;
    if (diff < 86400_000) return `${Math.round(diff / 3600_000)}h`;
    return `${Math.round(diff / 86400_000)}d`;
  } catch {
    return "—";
  }
}
