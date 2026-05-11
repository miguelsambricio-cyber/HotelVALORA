import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { AgentOrbit, AgentStatusBadge } from "@/components/admin";
import { ALL_AGENTS } from "@/lib/admin/agents";

export const metadata: Metadata = {
  title: "AI Operations Center · Admin",
  description:
    "HOTELVALORA AI orchestration dashboard — orbital view of every operational agent, supervised by the CEO Agent at the center.",
};

/**
 * /user/admin/agents — the AI Operations Center.
 *
 * Top-of-fold is the orbital layout (CEO center + 9 orbiting agents).
 * Below, a directory of every agent with status + workspace + drill-in.
 *
 * Static fixture today; Phase 3 wires realtime updates from ai_agent_runs.
 */
export default function AgentsPage() {
  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <Link
        href="/user/admin"
        className="inline-flex items-center gap-1.5 font-headline text-[11px] font-bold uppercase tracking-[0.22em] text-slate-500 hover:text-forest-900"
      >
        <ArrowLeft size={12} /> Administrator
      </Link>

      {/* Header */}
      <header className="space-y-2">
        <div className="flex items-center gap-3">
          <span className="rounded-md bg-forest-900 px-2 py-0.5 font-headline text-[9px] font-extrabold uppercase tracking-[0.25em] text-lime-300">
            Live
          </span>
          <span className="font-headline text-[10px] font-extrabold uppercase tracking-[0.32em] text-slate-500">
            AI Operations Center
          </span>
        </div>
        <h1 className="font-headline text-3xl font-extrabold tracking-tighter text-forest-900 sm:text-4xl">
          Orchestration Dashboard
        </h1>
        <p className="max-w-3xl text-[13.5px] leading-relaxed text-slate-600">
          The CEO Agent sits at the centre — supervisory, read-only, never an
          executor of heavy ingestion. Nine operational agents orbit around it.
          Click any node to open its dedicated operational dashboard.
        </p>
      </header>

      {/* Orbital layout */}
      <AgentOrbit />

      {/* Agent directory */}
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h3 className="mb-3 font-headline text-[10px] font-extrabold uppercase tracking-[0.25em] text-slate-500">
          Directory
        </h3>
        <ul className="grid gap-2.5 sm:grid-cols-2">
          {ALL_AGENTS.map((agent) => (
            <li key={agent.id}>
              <Link
                href={`/user/admin/agents/${agent.id}`}
                className="group flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50/40 p-3 transition-colors hover:border-forest-900 hover:bg-white"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-md border border-slate-200 bg-white font-headline text-[10px] font-extrabold uppercase tracking-widest text-forest-900">
                      T{agent.tier}
                    </span>
                    <span className="truncate font-headline text-[13px] font-extrabold tracking-tight text-forest-900">
                      {agent.name}
                    </span>
                  </div>
                  <p className="mt-1 truncate text-[11.5px] leading-snug text-slate-500">
                    {agent.workspace ?? "Supervisory · cross-platform read"}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <AgentStatusBadge status={agent.status} label={agent.statusLabel} size="sm" />
                  <ArrowRight
                    size={14}
                    className="text-slate-300 group-hover:text-forest-900"
                  />
                </div>
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
