import type { Metadata } from "next";
import Link from "next/link";
import { ArrowUpRight, Plug } from "lucide-react";
import {
  EXECUTIVE_KPIS,
  INFRA_SERVICES,
  PIPELINES,
  RECENT_ACTIVITY,
} from "@/lib/admin/dashboard";
import {
  ActivityTimeline,
  AiOpsFeatureCard,
  InfraIndicator,
  KpiCard,
  PipelineCard,
} from "@/components/admin";
import { getIntegrationsLive } from "@/lib/admin/integrations/live";
import { IntegrationCard } from "@/components/admin/integrations/integration-card";

export const metadata: Metadata = {
  title: "Executive Control Room · Admin",
  description:
    "HOTELVALORA institutional operations center — platform health, AI agent fleet, ingestion workspaces, infrastructure, and operational activity.",
};

/**
 * /user/admin — Executive Control Room.
 *
 * Institutional dashboard composed of 5 sections per the operations spec:
 *
 *   1. Executive Overview      — 10 KPI tiles (platform · agents · deploy · cron · …)
 *   2. AI Operations Center    — featured CTA into /user/admin/agents
 *   3. Data Pipeline Center    — 6 ingestion pipelines with status + queue + success rate
 *   4. Infrastructure Monitor  — 6 services (Vercel · Supabase · Resend · Cron · Storage · API)
 *   5. Recent Operational Act. — timeline of agent / ingest / cron / deploy events
 *
 * Visual direction: Bloomberg terminal · Palantir · MSCI Real Assets.
 * Dark slate-950 canvas + forest-900 / lime-300 accents · monospaced
 * structured details · tracked-out micro-labels · subtle pulse on
 * operational dots.
 */
export const dynamic = "force-dynamic";

export default async function ExecutiveControlRoom() {
  const liveIntegrations = await getIntegrationsLive();
  const featured = liveIntegrations.filter((i) =>
    ["hosteltur", "alimarket", "hospitalitynet"].includes(i.id),
  );
  return (
    <div className="space-y-8">
      {/* ── HEADER ───────────────────────────────────────────────────────── */}
      <header className="space-y-2">
        <div className="flex items-center gap-3">
          <span className="rounded-md bg-lime-300 px-2 py-0.5 font-headline text-[9px] font-extrabold uppercase tracking-[0.25em] text-forest-900">
            Live
          </span>
          <span className="font-headline text-[10px] font-extrabold uppercase tracking-[0.32em] text-slate-500">
            HOTELVALORA · Administrator
          </span>
        </div>
        <h1 className="font-headline text-3xl font-extrabold tracking-tighter text-forest-900 sm:text-[34px]">
          Executive Control Room
        </h1>
        <p className="max-w-3xl text-[13.5px] leading-relaxed text-slate-600">
          Real-time visibility over the institutional operations layer — platform
          health, the AI agent fleet, ingestion workspaces, infrastructure
          posture, and the operational activity feed. Read-only today; mutation
          surfaces ship phase by phase per the AI Operations Layer roadmap.
        </p>
      </header>

      {/* ── 1. EXECUTIVE OVERVIEW (KPI grid) ────────────────────────────── */}
      <section aria-labelledby="exec-overview-h">
        <SectionHeader
          id="exec-overview-h"
          eyebrow="Section 01"
          title="Executive Overview"
          subline="Institutional KPI tiles — platform · deploy · ingestion · alerts"
        />
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {EXECUTIVE_KPIS.map((kpi) => (
            <KpiCard key={kpi.id} entry={kpi} />
          ))}
        </div>
      </section>

      {/* ── 2. AI OPERATIONS CENTER (featured) ──────────────────────────── */}
      <section aria-labelledby="ai-ops-h">
        <SectionHeader
          id="ai-ops-h"
          eyebrow="Section 02"
          title="AI Operations Center"
          subline="Orbital orchestration of the institutional agent fleet · CEO at the centre"
        />
        <AiOpsFeatureCard />
      </section>

      {/* ── 3. INTEGRATIONS (institutional intelligence applications) ────── */}
      <section aria-labelledby="integrations-h">
        <SectionHeader
          id="integrations-h"
          eyebrow="Section 03"
          title="Integrations"
          subline="Institutional hospitality intelligence sources · connection · auth · ingestion"
          rightSlot={
            <Link
              href="/user/admin/integrations"
              className="inline-flex items-center gap-1.5 font-headline text-[10px] font-bold uppercase tracking-[0.22em] text-forest-900 hover:text-lime-600"
            >
              <Plug size={12} aria-hidden /> View directory
              <ArrowUpRight size={12} aria-hidden />
            </Link>
          }
        />
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
          {/* Surface the 3 most-relevant integrations on the overview:
              both authenticated sources + one anchor public source.
              Now reading LIVE state — no more stale "NOT PROVISIONED". */}
          {featured.map((integration) => (
            <IntegrationCard key={integration.id} integration={integration} />
          ))}
        </div>
      </section>

      {/* ── 4. DATA PIPELINE CENTER ─────────────────────────────────────── */}
      <section aria-labelledby="pipelines-h">
        <SectionHeader
          id="pipelines-h"
          eyebrow="Section 04"
          title="Data Pipeline Center"
          subline="6 institutional pipelines · last update · queue · success rate"
        />
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
          {PIPELINES.map((p) => (
            <PipelineCard key={p.id} entry={p} />
          ))}
        </div>
      </section>

      {/* ── 5. INFRASTRUCTURE MONITORING ────────────────────────────────── */}
      <section aria-labelledby="infra-h">
        <SectionHeader
          id="infra-h"
          eyebrow="Section 05"
          title="Infrastructure Monitoring"
          subline="Vercel · Supabase · Resend · Cron Jobs · Storage · API Status"
        />
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
          {INFRA_SERVICES.map((svc) => (
            <InfraIndicator key={svc.id} entry={svc} />
          ))}
        </div>
      </section>

      {/* ── 6. RECENT OPERATIONAL ACTIVITY ──────────────────────────────── */}
      <section aria-labelledby="activity-h">
        <SectionHeader
          id="activity-h"
          eyebrow="Section 06"
          title="Recent Operational Activity"
          subline="Timeline · agent runs · ingestions · cron firings · deploys"
        />
        <ActivityTimeline entries={RECENT_ACTIVITY} />
      </section>
    </div>
  );
}

// ─── Section header atom — uniform across all 5 sections ──────────────────

function SectionHeader({
  id,
  eyebrow,
  title,
  subline,
  rightSlot,
}: {
  id: string;
  eyebrow: string;
  title: string;
  subline: string;
  rightSlot?: React.ReactNode;
}) {
  return (
    <div className="mb-3 flex items-end justify-between gap-3">
      <div>
        <span className="font-mono text-[10px] uppercase tracking-[0.28em] text-slate-400">
          {eyebrow}
        </span>
        <h2
          id={id}
          className="font-headline text-xl font-extrabold tracking-tight text-forest-900"
        >
          {title}
        </h2>
        <p className="text-[12px] text-slate-500">{subline}</p>
      </div>
      {rightSlot && <div className="shrink-0">{rightSlot}</div>}
    </div>
  );
}
