/**
 * Types for the Executive Control Room — the /user/admin landing dashboard.
 *
 * Mock data today. Phase 3 wires the realtime read path against:
 *   - public.ai_agent_runs · ai_events · ai_human_review
 *   - public.news_ingestion_runs
 *   - services/&lt;workspace&gt;/MASTER/INGESTION_LOG sheets
 *   - Vercel + Supabase + Resend health APIs
 */

export type SignalLevel = "ok" | "warn" | "error" | "neutral";

export interface KpiEntry {
  id: string;
  label: string;
  /** Headline value rendered in the KPI tile */
  value: string;
  /** One-line subline (delta / context) */
  subline: string;
  /** Optional trend pill ("+5%" / "−2pp" / "stable") */
  trend?: string;
  trendLevel?: SignalLevel;
  /** Overall signal tint for the card border + dot */
  signal: SignalLevel;
}

export interface PipelineEntry {
  id: string;
  name: string;
  domain: string;
  /** Last update — ISO string OR human label like "—" */
  lastUpdate: string;
  /** Ingestion status surfaced operationally */
  ingestionStatus: "Active" | "Manual" | "Idle" | "Degraded";
  /** Queue size — surfaces pending work */
  queueSize: number | string;
  /** Success rate label ("98.4%" or "—") */
  successRate: string;
  /** Signal tint mirrors ingestionStatus */
  signal: SignalLevel;
  /** Workspace path (when applicable) */
  workspace: string | null;
}

export interface InfraEntry {
  id: string;
  name: string;
  /** Short description of what the service powers */
  scope: string;
  /** Health verdict for the indicator */
  status: "Operational" | "Degraded" | "Maintenance" | "Outage" | "Unknown";
  /** Latency or uptime sub-label */
  detail: string;
  /** Region label for institutional context */
  region: string;
  signal: SignalLevel;
}

export interface ActivityEntry {
  id: string;
  ts: string;
  /** Short label (eg "AGENT" / "INGEST" / "CRON" / "DEPLOY") */
  channel: string;
  /** Title surfaced as the timeline bullet */
  title: string;
  /** One-line context */
  detail: string;
  signal: SignalLevel;
}
