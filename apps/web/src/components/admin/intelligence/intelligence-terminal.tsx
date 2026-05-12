import Link from "next/link";
import { ArrowLeft, Globe2 } from "lucide-react";
import type { IntelligenceTerminalData } from "@/lib/admin/intelligence";
import { VolumeKpis } from "./volume-kpis";
import { RelevanceAlertsPanel } from "./relevance-alerts-panel";
import { NewsFeedPanel } from "./news-feed-panel";
import { ExtractedDealsPanel } from "./extracted-deals-panel";
import { CategoryBreakdown } from "./category-breakdown";
import { EntityMentionsPanel } from "./entity-mentions-panel";
import { SourceCoveragePanel } from "./source-coverage-panel";
import {
  AuthenticatedSourcesPanel,
  type AuthenticatedSourceCard,
} from "./authenticated-sources-panel";

/**
 * Market Intelligence Terminal — the institutional hospitality intelligence
 * dashboard. Composes:
 *
 *   01. Hero header — terminal identity + Madrid timestamp
 *   02. Volume KPIs strip — today / 7d / transactions / projects / deal volume
 *   03. High-relevance alerts band — critical + high items
 *   04. Source-coverage matrix — per-source ingestion health (links to integrations)
 *   05. Two-column body:
 *        left  · category breakdown · entity mentions
 *        right · extracted deals + projects table
 *   06. Latest intelligence feed — all recent items with full metadata
 *
 * Bloomberg-terminal aesthetic throughout: dark forest-900 / slate-950
 * surface, lime-300 numerals, tracked-out uppercase micro-labels.
 */
export function IntelligenceTerminal({
  data,
  authenticatedSources,
}: {
  data: IntelligenceTerminalData;
  authenticatedSources: AuthenticatedSourceCard[];
}) {
  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <Link
        href="/user/admin/agents"
        className="inline-flex items-center gap-1.5 font-headline text-[11px] font-bold uppercase tracking-[0.22em] text-slate-500 hover:text-forest-900"
      >
        <ArrowLeft size={12} /> AI Operations Center
      </Link>

      {/* Hero */}
      <section className="overflow-hidden rounded-2xl border border-slate-800/60 bg-gradient-to-b from-forest-900 to-slate-950 p-6 shadow-sm sm:p-8">
        <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
          <div className="space-y-2.5">
            <p className="font-headline text-[9px] font-bold uppercase tracking-[0.24em] text-lime-300/80">
              HotelVALORA · Market Intelligence Terminal
            </p>
            <h1 className="font-headline text-3xl font-extrabold tracking-tighter text-white sm:text-4xl">
              Institutional Hospitality Intelligence
            </h1>
            <p className="max-w-3xl text-[13.5px] leading-relaxed text-slate-300/90">
              Daily-refreshed corpus of hospitality transactions, projects, refinancings, JVs, repositionings,
              and operator activity across European and global markets. Every article preserves its original
              source URL for institutional traceability and underwriting validation.
            </p>
          </div>
          <Clock />
        </div>
      </section>

      {/* KPI strip */}
      <VolumeKpis kpis={data.volumeKpis} />

      {/* Authenticated sources · institutional paid-tier access */}
      {authenticatedSources.length > 0 && (
        <AuthenticatedSourcesPanel cards={authenticatedSources} />
      )}

      {/* Alerts */}
      <RelevanceAlertsPanel alerts={data.relevanceAlerts} />

      {/* Source coverage */}
      <SourceCoveragePanel rows={data.sourceCoverage} />

      {/* Two-column body */}
      <div className="grid gap-5 lg:grid-cols-3">
        <div className="space-y-5 lg:col-span-1">
          <CategoryBreakdown rows={data.categoryBreakdown} />
          <EntityMentionsPanel rows={data.entityMentions} />
        </div>
        <div className="lg:col-span-2">
          <ExtractedDealsPanel deals={data.extractedDeals} projects={data.extractedProjects} />
        </div>
      </div>

      {/* News feed */}
      <NewsFeedPanel items={data.recentNews} />
    </div>
  );
}

function Clock() {
  // Static SSR-friendly Madrid timestamp; realtime ticker is a Phase 3
  // candidate when this becomes a client island.
  return (
    <div className="rounded-xl border border-slate-800/60 bg-slate-900/40 px-5 py-3">
      <div className="flex items-center gap-2">
        <Globe2 size={14} className="text-slate-400" aria-hidden />
        <p className="font-headline text-[9px] font-bold uppercase tracking-[0.24em] text-slate-400">
          Madrid · Coverage Window
        </p>
      </div>
      <p className="mt-1 font-mono text-[13px] text-lime-300">2026-04-13 → 2026-05-12</p>
      <p className="mt-0.5 font-headline text-[9px] font-bold uppercase tracking-[0.22em] text-slate-500">
        Daily refresh · 08:48 Madrid · cron
      </p>
    </div>
  );
}
