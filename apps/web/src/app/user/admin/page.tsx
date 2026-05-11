import type { Metadata } from "next";
import Link from "next/link";
import {
  Activity,
  ArrowRight,
  CircuitBoard,
  Database,
  Gauge,
  ScrollText,
} from "lucide-react";
import { ALL_AGENTS, getStatusVisual } from "@/lib/admin/agents";
import { AgentStatusBadge } from "@/components/admin";

export const metadata: Metadata = {
  title: "Administrator",
  description:
    "HOTELVALORA institutional operations center — supervise the AI ecosystem, ingestion workspaces, cost controls, and audit trail.",
};

/**
 * /user/admin — landing page. The operational control layer entry point.
 *
 * The page is a clear institutional dashboard that orients the operator
 * toward three things:
 *   1. The AI Operations Center (live · orbital view of all agents)
 *   2. The data warehouses and ingestion workspaces (planned surfaces)
 *   3. Recent operational signals (mocked today; real-time Phase 3)
 *
 * Bloomberg-terminal inspiration meets HOTELVALORA institutional look —
 * dark hero strip · structured cards · uppercase tracked-out labels.
 */
export default function AdminLandingPage() {
  const fleetStatusCounts = ALL_AGENTS.reduce<Record<string, number>>(
    (acc, agent) => {
      const v = getStatusVisual(agent.status);
      acc[v.label] = (acc[v.label] ?? 0) + 1;
      return acc;
    },
    {},
  );

  return (
    <div className="space-y-6">
      {/* Hero band — institutional dark, tracked-out caption */}
      <section className="overflow-hidden rounded-2xl border border-slate-900 bg-gradient-to-br from-slate-950 via-forest-900 to-slate-950 text-white">
        <div className="flex flex-col gap-5 p-8">
          <div className="flex items-center gap-3">
            <span className="rounded-md bg-lime-300 px-2 py-0.5 font-headline text-[9px] font-extrabold uppercase tracking-[0.25em] text-forest-900">
              Live
            </span>
            <span className="font-headline text-[10px] font-extrabold uppercase tracking-[0.32em] text-lime-300/80">
              HOTELVALORA · Administrator
            </span>
          </div>
          <h1 className="font-headline text-3xl font-extrabold tracking-tighter sm:text-4xl">
            Institutional Operations Center
          </h1>
          <p className="max-w-3xl text-[14px] leading-relaxed text-slate-300">
            The Administrator surface is HOTELVALORA&apos;s control tower — supervisory
            visibility over the AI agent fleet, the ingestion workspaces
            (transactions · CoStar warehouse · CompSet underwriting), the cost
            controls, and the audit trail. Read-only today; mutation surfaces
            ship phase by phase per the AI Operations Layer roadmap.
          </p>
          <div className="flex flex-wrap items-center gap-2 pt-2">
            <Link
              href="/user/admin/agents"
              className="inline-flex items-center gap-1.5 rounded-lg bg-lime-300 px-4 py-2 font-headline text-[12px] font-extrabold uppercase tracking-widest text-forest-900 transition-transform hover:brightness-110 active:scale-95"
            >
              Open AI Operations Center <ArrowRight size={14} />
            </Link>
            <span className="hidden font-mono text-[10px] uppercase tracking-widest text-lime-300/60 md:inline">
              · static fixture · v0.1
            </span>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4 border-t border-lime-300/10 bg-slate-950/60 px-8 py-5 sm:grid-cols-4">
          <StatTile label="Agents in fleet" value={String(ALL_AGENTS.length)} />
          <StatTile label="Active beta+" value={String((fleetStatusCounts["Healthy"] ?? 0) + (fleetStatusCounts["Active"] ?? 0) + (fleetStatusCounts["Monitoring"] ?? 0))} />
          <StatTile label="Manual mode" value={String(fleetStatusCounts["Manual Mode"] ?? 0)} />
          <StatTile label="Standby" value={String(fleetStatusCounts["Standby"] ?? 0)} />
        </div>
      </section>

      {/* Primary CTAs */}
      <div className="grid gap-4 md:grid-cols-2">
        <PrimaryCard
          href="/user/admin/agents"
          icon={<CircuitBoard size={20} className="text-forest-900" strokeWidth={2.2} />}
          status="Live"
          title="AI Operations Center"
          description="Orbital view of all 10 agents. Click any agent for its operational dashboard — purpose, integrations, KPIs, mock log feed, roadmap."
        />
        <PlannedCard
          icon={<Database size={20} className="text-slate-500" strokeWidth={2.2} />}
          status="Phase 3"
          title="Workspaces"
          description="services/transactions/ · services/costar/ · services/compset/ INGESTION_LOG aggregation across the three institutional masters workspaces."
        />
        <PlannedCard
          icon={<Activity size={20} className="text-slate-500" strokeWidth={2.2} />}
          status="Phase 3"
          title="Observability"
          description="ai_agent_runs streaming · per-agent latency + cost trends · cron execution heartbeat panel."
        />
        <PlannedCard
          icon={<Gauge size={20} className="text-slate-500" strokeWidth={2.2} />}
          status="Phase 3"
          title="Cost Controls"
          description="Per-agent daily / monthly caps · fleet spend rollup · projection vs cap · 80%/100% threshold visualization."
        />
        <PlannedCard
          icon={<ScrollText size={20} className="text-slate-500" strokeWidth={2.2} />}
          status="Phase 3"
          title="Audit Log"
          description="Cross-workspace audit lens — ai_agent_runs cross-referenced with the per-master INGESTION_LOG sheets + ai_human_review queue."
        />
        <FleetSnapshotCard />
      </div>
    </div>
  );
}

// ── atoms ───────────────────────────────────────────────────────────────────

function StatTile({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <span className="block font-headline text-[9px] font-bold uppercase tracking-[0.22em] text-lime-300/70">
        {label}
      </span>
      <span className="mt-1 block font-headline text-2xl font-extrabold tracking-tight text-white">
        {value}
      </span>
    </div>
  );
}

function PrimaryCard({
  href,
  icon,
  status,
  title,
  description,
}: {
  href: string;
  icon: React.ReactNode;
  status: string;
  title: string;
  description: string;
}) {
  return (
    <Link
      href={href}
      className="group block rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-all hover:border-forest-900 hover:shadow-md"
    >
      <div className="mb-3 flex items-center justify-between">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-slate-50">
          {icon}
        </div>
        <span className="rounded-md bg-emerald-50 px-2 py-0.5 font-headline text-[9px] font-extrabold uppercase tracking-widest text-emerald-700 ring-1 ring-emerald-200">
          {status}
        </span>
      </div>
      <h3 className="font-headline text-lg font-extrabold tracking-tight text-forest-900">
        {title}
      </h3>
      <p className="mt-1 text-[13px] leading-relaxed text-slate-600">{description}</p>
      <div className="mt-3 flex items-center gap-1.5 font-headline text-[11px] font-bold uppercase tracking-widest text-forest-900 opacity-0 transition-opacity group-hover:opacity-100">
        Open <ArrowRight size={12} />
      </div>
    </Link>
  );
}

function PlannedCard({
  icon,
  status,
  title,
  description,
}: {
  icon: React.ReactNode;
  status: string;
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50/50 p-5">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white">
          {icon}
        </div>
        <span className="rounded-md bg-slate-100 px-2 py-0.5 font-headline text-[9px] font-extrabold uppercase tracking-widest text-slate-500 ring-1 ring-slate-200">
          {status}
        </span>
      </div>
      <h3 className="font-headline text-lg font-extrabold tracking-tight text-slate-500">
        {title}
      </h3>
      <p className="mt-1 text-[13px] leading-relaxed text-slate-500">{description}</p>
    </div>
  );
}

function FleetSnapshotCard() {
  return (
    <div className="md:col-span-2 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <h3 className="mb-3 font-headline text-[10px] font-extrabold uppercase tracking-[0.25em] text-slate-500">
        Fleet snapshot
      </h3>
      <ul className="divide-y divide-slate-100">
        {ALL_AGENTS.map((agent) => (
          <li
            key={agent.id}
            className="flex items-center justify-between gap-3 py-2"
          >
            <div className="flex items-center gap-3">
              <span className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-slate-200 bg-slate-50 font-headline text-[10px] font-extrabold uppercase tracking-widest text-forest-900">
                T{agent.tier}
              </span>
              <Link
                href={`/user/admin/agents/${agent.id}`}
                className="font-headline text-[13px] font-extrabold tracking-tight text-forest-900 hover:underline underline-offset-2"
              >
                {agent.name}
              </Link>
            </div>
            <div className="flex items-center gap-3">
              <span className="hidden text-[11px] text-slate-500 sm:inline">
                {agent.workspace ?? "—"}
              </span>
              <AgentStatusBadge status={agent.status} label={agent.statusLabel} size="sm" />
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
