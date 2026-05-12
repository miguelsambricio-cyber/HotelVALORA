import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { AgentOrbit } from "@/components/admin";
import { ALL_AGENTS, groupForStatus, type AgentStatusGroup } from "@/lib/admin/agents";
import { loadAiOpsLive } from "@/lib/admin/ai-ops/live";
import { OperationalDashboard } from "@/components/admin/ai-ops/operational-dashboard";

export const dynamic = "force-dynamic";

/**
 * Light-canvas variant of the status group visual contract.
 * `getGroupVisual()` returns the dark-canvas variant used by the orbital
 * SVG; this map is for the white agent directory below.
 */
const LIGHT_GROUP_VISUAL: Record<AgentStatusGroup, { bg: string; ring: string; text: string; dot: string; pulse: boolean }> = {
  ACTIVE:  { bg: "bg-emerald-50", ring: "ring-emerald-200", text: "text-emerald-700", dot: "●", pulse: true  },
  IDLE:    { bg: "bg-slate-100",  ring: "ring-slate-200",   text: "text-slate-500",   dot: "○", pulse: false },
  WARNING: { bg: "bg-amber-50",   ring: "ring-amber-200",   text: "text-amber-700",   dot: "◐", pulse: false },
  ERROR:   { bg: "bg-rose-50",    ring: "ring-rose-200",    text: "text-rose-700",    dot: "▲", pulse: true  },
};

export const metadata: Metadata = {
  title: "AI Operations Center · Admin",
  description:
    "HOTELVALORA AI orchestration dashboard — orbital view of every operational agent, supervised by the CEO Agent at the center.",
};

/**
 * /user/admin/agents — AI Operations Center.
 *
 * Top of fold: AgentOrbit — CEO at the centre, 9 operational agents in
 * orbit. Clicking any node opens the right-side AgentDetailPanel
 * (mission · cron · linked systems · operational metrics · latest events
 * · blockers · future integrations).
 *
 * Below: institutional agent directory grouped by Tier with the ACTIVE /
 * IDLE / WARNING / ERROR readout per agent. Each row deep-links to the
 * dedicated per-agent dashboard at /user/admin/agents/<id>.
 */
export default async function AgentsPage() {
  const byTier: Record<number, typeof ALL_AGENTS> = { 0: [], 1: [], 2: [], 3: [] };
  ALL_AGENTS.forEach((a) => byTier[a.tier].push(a));
  const aiOps = await loadAiOpsLive();

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <Link
        href="/user/admin"
        className="inline-flex items-center gap-1.5 font-headline text-[11px] font-bold uppercase tracking-[0.22em] text-slate-500 hover:text-forest-900"
      >
        <ArrowLeft size={12} /> Executive Control Room
      </Link>

      {/* Header */}
      <header className="space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-md bg-forest-900 px-2 py-0.5 font-headline text-[9px] font-extrabold uppercase tracking-[0.25em] text-lime-300">
            Live
          </span>
          <span
            title="Operator-only · internal infrastructure with no customer-facing counterpart by design"
            className="rounded-md bg-slate-100 px-2 py-0.5 font-headline text-[9px] font-extrabold uppercase tracking-[0.25em] text-slate-600 ring-1 ring-inset ring-slate-200"
          >
            Operator only · internal infrastructure
          </span>
          <span className="font-headline text-[10px] font-extrabold uppercase tracking-[0.32em] text-slate-500">
            AI Operations Center
          </span>
        </div>
        <h1 className="font-headline text-3xl font-extrabold tracking-tighter text-forest-900 sm:text-[34px]">
          Orchestration Dashboard
        </h1>
        <p className="max-w-3xl text-[13.5px] leading-relaxed text-slate-600">
          Institutional operations console — live signals from the daily
          ingestion cron + authenticated session validators. The
          orchestration roster sits below; the dashboard above shows what
          actually ran last night.
        </p>
      </header>

      {/* LIVE operational dashboard · zero mock data · reads from DB per request */}
      <OperationalDashboard data={aiOps} />

      {/* Orbital layout */}
      <AgentOrbit />

      {/* Directory grouped by tier */}
      <section className="space-y-5">
        <div className="flex items-end justify-between">
          <div>
            <span className="font-mono text-[10px] uppercase tracking-[0.28em] text-slate-400">
              Directory
            </span>
            <h2 className="font-headline text-xl font-extrabold tracking-tight text-forest-900">
              Agent Roster by Tier
            </h2>
            <p className="text-[12px] text-slate-500">
              9 operational + 1 supervisor · ACTIVE / IDLE / WARNING / ERROR readout
            </p>
          </div>
        </div>

        {[0, 1, 2, 3].map((tier) => {
          const agents = byTier[tier];
          if (!agents || agents.length === 0) return null;
          return (
            <div key={tier} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
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
              <ul className="grid gap-2 sm:grid-cols-2">
                {agents.map((agent) => {
                  const group = groupForStatus(agent.status);
                  const light = LIGHT_GROUP_VISUAL[group];
                  return (
                    <li key={agent.id}>
                      <Link
                        href={`/user/admin/agents/${agent.id}`}
                        className="group flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50/40 p-3 transition-colors hover:border-forest-900 hover:bg-white"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="truncate font-headline text-[13px] font-extrabold tracking-tight text-forest-900">
                              {agent.name}
                            </span>
                            <span
                              className={cn(
                                "inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 font-headline text-[9px] font-extrabold uppercase tracking-widest ring-1",
                                light.bg,
                                light.ring,
                                light.text,
                              )}
                            >
                              <span
                                aria-hidden
                                className={cn("text-[8px] leading-none", light.pulse && "animate-pulse")}
                              >
                                {light.dot}
                              </span>
                              {group}
                            </span>
                          </div>
                          <p className="mt-1 truncate text-[11.5px] leading-snug text-slate-500">
                            {agent.workspace ?? "supervisory · cross-platform read"}
                          </p>
                          <p className="mt-0.5 font-mono text-[10.5px] tracking-tight text-slate-500">
                            success {agent.successRate} · last {formatLastShort(agent.lastExecution)}
                          </p>
                        </div>
                        <ArrowRight
                          size={14}
                          className="shrink-0 text-slate-300 group-hover:text-forest-900"
                        />
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          );
        })}
      </section>
    </div>
  );
}

function tierLabel(tier: number): string {
  switch (tier) {
    case 0: return "Supervisory · orchestration";
    case 1: return "Operational ingestion + monitoring";
    case 2: return "Strategic moat — underwriting + benchmarking";
    case 3: return "Strategic — finance · brand · support (pre-PMF)";
    default: return "";
  }
}

function formatLastShort(iso: string | null): string {
  if (!iso) return "—";
  try {
    const d = new Date(iso);
    const pad = (n: number) => n.toString().padStart(2, "0");
    return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
  } catch {
    return "—";
  }
}
