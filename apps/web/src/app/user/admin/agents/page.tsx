import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { AgentOrbit } from "@/components/admin";
import { loadAiOpsLive } from "@/lib/admin/ai-ops/live";
import { SectionShell } from "@/components/admin/ai-ops/section-shell";
import { AgentRoster } from "@/components/admin/ai-ops/agent-roster";
import { IntelligenceFeedCapped } from "@/components/admin/ai-ops/intelligence-feed-capped";
import {
  TotalsStrip,
  ThroughputCard,
  RecentRunsTable,
  DegradedPanel,
  AlertsFeed,
} from "@/components/admin/ai-ops/operational-dashboard";
import { TopSignalsSummary } from "@/components/admin/ai-ops/priority-intelligence-feed";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "AI Operations Center · Admin",
  description:
    "HOTELVALORA executive AI command center — CEO Agent orchestrating the operational fleet, drillable metrics, priority intelligence feed, ingestion telemetry, and alerts.",
};

/**
 * /user/admin/agents — Executive AI Command Center.
 *
 * Six-section operational hierarchy (top → bottom):
 *
 *   01 · Command Center        · CEO + orbital fleet · primary visual surface
 *   02 · Agent Roster by Tier  · operator management · per-agent CTAs
 *   03 · Operational Metrics   · drillable totem strip (in-page anchors)
 *   04 · Priority Intelligence · cross-source dealflow · top 5 + scrollable rest
 *   05 · Ingestion Monitoring  · throughput + recent runs · compact
 *   06 · Alerts & Failures     · degraded sources + audit-driven alerts
 *
 * Every panel reads from the live `loadAiOpsLive()` aggregator (zero mock).
 * Bloomberg-Palantir aesthetic: dark forest-900 / slate-950 panels on
 * white canvas, lime-300 numerals, tracked-out micro-labels.
 */
export default async function AgentsPage() {
  const aiOps = await loadAiOpsLive();

  return (
    <div className="space-y-8">
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
          Executive AI Command Center
        </h1>
        <p className="max-w-3xl text-[13.5px] leading-relaxed text-slate-600">
          The institutional control room for HotelVALORA&rsquo;s autonomous
          intelligence infrastructure. CEO Agent on top, specialised
          departments in orbit, drillable telemetry below — every panel
          reads live from the operational data tier.
        </p>
      </header>

      {/* 01 · COMMAND CENTER (primary visual surface) */}
      <SectionShell
        id="command-center"
        index="01"
        title="AI Operation Center"
        subtitle="CEO Agent at the center · 9 specialised departments orbiting · click any node for its operational dossier."
        trailing={
          <span className="rounded-md bg-forest-900 px-2 py-0.5 font-headline text-[9px] font-extrabold uppercase tracking-[0.25em] text-lime-300">
            Primary
          </span>
        }
      >
        <AgentOrbit />
      </SectionShell>

      {/* 02 · AGENT ROSTER BY TIER (operator management) */}
      <SectionShell
        id="agent-roster"
        index="02"
        title="Agent Roster by Tier"
        subtitle="Operator management · responsibilities · schedules · linked dashboards. Edit / Pause gated on the Phase-3 mutation layer."
      >
        <AgentRoster />
      </SectionShell>

      {/* 03 · OPERATIONAL METRICS (drillable) */}
      <SectionShell
        id="operational-metrics"
        index="03"
        title="Operational Metrics"
        subtitle="Drill any totem to its source — runs / partial / failed jump to monitoring, articles to /library, priority to the feed below."
      >
        <div className="space-y-4">
          <TotalsStrip data={aiOps} />
          <TopSignalsSummary signals={aiOps.topSignals} />
        </div>
      </SectionShell>

      {/* 04 · PRIORITY INTELLIGENCE FEED */}
      <SectionShell
        id="priority-intel-feed"
        index="04"
        title="Priority Intelligence Feed"
        subtitle="Cross-source dealflow ranked by signal strength — M&A · debt / refi · pipeline · luxury · operator movements. Top 5 above the fold; backlog scrolls below."
      >
        <IntelligenceFeedCapped
          items={aiOps.priorityFeed}
          totalPriority7d={aiOps.totals.priorityArticles7d}
          visible={5}
        />
      </SectionShell>

      {/* 05 · INGESTION MONITORING (compact) */}
      <SectionShell
        id="ingestion-monitoring"
        index="05"
        title="Ingestion Monitoring"
        subtitle="Throughput sparkline + last 20 runs · source health · auth state · cron cadence. Compact — does not dominate the page."
      >
        <div className="grid gap-5 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <RecentRunsTable runs={aiOps.recentRuns} />
          </div>
          <ThroughputCard
            buckets={aiOps.throughput}
            articlesTotal={aiOps.totals.articlesInserted7d}
          />
        </div>
      </SectionShell>

      {/* 06 · ALERTS & FAILURES (anchored at bottom) */}
      <SectionShell
        id="alerts-failures"
        index="06"
        title="Alerts & Failures"
        subtitle="Degraded sources · failed jobs · stalled feeds · authentication warnings · audit-driven alert entries from the last 7 days."
      >
        <div className="grid gap-5 lg:grid-cols-2">
          <DegradedPanel sources={aiOps.degradedSources} />
          <AlertsFeed alerts={aiOps.alerts} />
        </div>
      </SectionShell>
    </div>
  );
}
