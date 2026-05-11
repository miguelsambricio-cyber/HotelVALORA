import type {
  ActivityEntry,
  InfraEntry,
  KpiEntry,
  PipelineEntry,
} from "./types";

/**
 * Mock data for the /user/admin Executive Control Room.
 *
 * Phase 3+ replaces these constants with realtime reads. The shape stays
 * stable so the dashboard components don't have to change.
 */

// ─────────────────────────────────────────────────────────────────────────
// 1. Executive Overview — 10 institutional KPI tiles
// ─────────────────────────────────────────────────────────────────────────
export const EXECUTIVE_KPIS: KpiEntry[] = [
  {
    id: "platform_status",
    label: "Platform Status",
    value: "Operational",
    subline: "All institutional surfaces healthy",
    trend: "stable",
    trendLevel: "ok",
    signal: "ok",
  },
  {
    id: "agents_active",
    label: "AI Agents Active",
    value: "3 / 10",
    subline: "Tier 1 beta — Market Intel · Data Ingestion · QA",
    trend: "+0",
    trendLevel: "neutral",
    signal: "ok",
  },
  {
    id: "last_deploy",
    label: "Last Deploy",
    value: "3 min ago",
    subline: "main @ fdda651 · auto-deploy",
    trend: "READY",
    trendLevel: "ok",
    signal: "ok",
  },
  {
    id: "last_cron",
    label: "Last Cron Run",
    value: "07:48 UTC",
    subline: "hospitality-intel · 31 rows ingested",
    trend: "on-schedule",
    trendLevel: "ok",
    signal: "ok",
  },
  {
    id: "data_freshness",
    label: "Data Freshness",
    value: "< 4h",
    subline: "Oldest: market_news source thp-news (3h 42m)",
    trend: "fresh",
    trendLevel: "ok",
    signal: "ok",
  },
  {
    id: "new_transactions_today",
    label: "New Transactions Today",
    value: "0",
    subline: "services/transactions/MASTER — awaiting operator drop",
    trend: "−",
    trendLevel: "neutral",
    signal: "neutral",
  },
  {
    id: "new_projects_today",
    label: "New Projects Today",
    value: "0",
    subline: "services/transactions/MASTER — pipeline corpus idle",
    trend: "−",
    trendLevel: "neutral",
    signal: "neutral",
  },
  {
    id: "underwriting_jobs",
    label: "Underwriting Jobs",
    value: "0",
    subline: "Operator-driven · agent in Standby (Phase 6)",
    trend: "−",
    trendLevel: "neutral",
    signal: "neutral",
  },
  {
    id: "error_alerts",
    label: "Error Alerts",
    value: "0",
    subline: "QA / Monitoring · last 24h",
    trend: "all clear",
    trendLevel: "ok",
    signal: "ok",
  },
  {
    id: "infra_health",
    label: "Infrastructure Health",
    value: "100%",
    subline: "Vercel · Supabase · Resend · CRON · Storage · API",
    trend: "100%",
    trendLevel: "ok",
    signal: "ok",
  },
];

// ─────────────────────────────────────────────────────────────────────────
// 2. Data Pipeline Center — 6 operational pipeline cards
// ─────────────────────────────────────────────────────────────────────────
export const PIPELINES: PipelineEntry[] = [
  {
    id: "costar",
    name: "COSTAR Warehouse",
    domain: "country · market · submarket · class",
    lastUpdate: "—",
    ingestionStatus: "Manual",
    queueSize: 0,
    successRate: "—",
    signal: "warn",
    workspace: "services/costar/",
  },
  {
    id: "transactions",
    name: "Transactions",
    domain: "institutional deals · acquisitions · JVs",
    lastUpdate: "2026-05-10T16:42:18Z",
    ingestionStatus: "Active",
    queueSize: 0,
    successRate: "100%",
    signal: "ok",
    workspace: "services/transactions/",
  },
  {
    id: "projects",
    name: "Projects",
    domain: "developments · pipeline · openings",
    lastUpdate: "—",
    ingestionStatus: "Idle",
    queueSize: 0,
    successRate: "—",
    signal: "neutral",
    workspace: "services/transactions/",
  },
  {
    id: "market_intelligence",
    name: "Market Intelligence",
    domain: "RSS · scrape · news corpus",
    lastUpdate: "2026-05-11T07:48:00Z",
    ingestionStatus: "Active",
    queueSize: 31,
    successRate: "98.4%",
    signal: "ok",
    workspace: "public.market_news",
  },
  {
    id: "compset",
    name: "CompSet Builder",
    domain: "per-hotel MPI / ARI / RGI · positioning snapshots",
    lastUpdate: "—",
    ingestionStatus: "Manual",
    queueSize: 0,
    successRate: "—",
    signal: "warn",
    workspace: "services/compset/",
  },
  {
    id: "reports",
    name: "Reports",
    domain: "institutional PDF · valuations · positioning",
    lastUpdate: "—",
    ingestionStatus: "Idle",
    queueSize: 0,
    successRate: "—",
    signal: "neutral",
    workspace: "public.saved_reports",
  },
];

// ─────────────────────────────────────────────────────────────────────────
// 3. Infrastructure Monitoring — 6 institutional services
// ─────────────────────────────────────────────────────────────────────────
export const INFRA_SERVICES: InfraEntry[] = [
  {
    id: "vercel",
    name: "Vercel",
    scope: "Hosting · auto-deploy · cron · serverless functions",
    status: "Operational",
    detail: "Last deploy READY · p50 70 ms",
    region: "fra1",
    signal: "ok",
  },
  {
    id: "supabase",
    name: "Supabase",
    scope: "Postgres 17 · auth · RLS · storage",
    status: "Operational",
    detail: "Region eu-central · advisors 0 critical",
    region: "eu-central",
    signal: "ok",
  },
  {
    id: "resend",
    name: "Resend",
    scope: "Transactional email · internal alerts",
    status: "Operational",
    detail: "Domain hotelvalora.com verified · DKIM + SPF green",
    region: "global",
    signal: "ok",
  },
  {
    id: "cron",
    name: "Cron Jobs",
    scope: "hospitality-intel · market-intel · qa-monitoring",
    status: "Operational",
    detail: "3 cron jobs · last firing 07:48 UTC",
    region: "vercel-cron",
    signal: "ok",
  },
  {
    id: "storage",
    name: "Storage",
    scope: "5 Supabase buckets · 19 RLS policies",
    status: "Operational",
    detail: "reports · pdfs · excel-uploads · renders · avatars",
    region: "eu-central",
    signal: "ok",
  },
  {
    id: "api",
    name: "API Status",
    scope: "/api/cron/* · /api/agents/* · /auth/callback",
    status: "Operational",
    detail: "Bearer guards · audit-sync receiving",
    region: "fra1",
    signal: "ok",
  },
];

// ─────────────────────────────────────────────────────────────────────────
// 4. Recent Operational Activity — timeline
// ─────────────────────────────────────────────────────────────────────────
export const RECENT_ACTIVITY: ActivityEntry[] = [
  {
    id: "1",
    ts: "2026-05-11T10:00:00Z",
    channel: "AGENT",
    title: "QA / Monitoring · hourly snapshot persisted",
    detail: "0 ingestion failures · 0 agent failures · 0 stuck approvals · cost-cap 0%",
    signal: "ok",
  },
  {
    id: "2",
    ts: "2026-05-11T08:20:14Z",
    channel: "AGENT",
    title: "Market Intelligence · daily summary aggregated",
    detail: "31 new rows · top tag: madrid (8) · category breakdown computed",
    signal: "ok",
  },
  {
    id: "3",
    ts: "2026-05-11T07:50:30Z",
    channel: "INGEST",
    title: "hospitality-intel cron · hosteltur",
    detail: "14 rows inserted · 0 failed · status=success",
    signal: "ok",
  },
  {
    id: "4",
    ts: "2026-05-11T07:48:12Z",
    channel: "CRON",
    title: "Vercel Cron fired",
    detail: "/api/cron/hospitality-intel · 6 sources processed · 28 ms cold start",
    signal: "ok",
  },
  {
    id: "5",
    ts: "2026-05-11T03:14:02Z",
    channel: "DEPLOY",
    title: "Production deploy READY",
    detail: "main @ fdda651 · feat(audit): unify Data Ingestion audit chain",
    signal: "ok",
  },
  {
    id: "6",
    ts: "2026-05-10T16:42:18Z",
    channel: "AGENT",
    title: "Data Ingestion · smoke_test.csv",
    detail: "5 ingested · 1 skipped (dedup) · 2 review (non_eur_currency, out_of_range) · 1 failed (missing_required)",
    signal: "ok",
  },
  {
    id: "7",
    ts: "2026-05-10T16:42:15Z",
    channel: "AUDIT",
    title: "audit-sync receipt persisted",
    detail: "POST /api/agents/data-ingestion-summary · ai_agent_run=c0c4ebf8",
    signal: "ok",
  },
  {
    id: "8",
    ts: "2026-05-10T11:30:00Z",
    channel: "INFRA",
    title: "Supabase advisors · 0 critical findings",
    detail: "RLS + index advisors clean · last weekly check",
    signal: "ok",
  },
];
