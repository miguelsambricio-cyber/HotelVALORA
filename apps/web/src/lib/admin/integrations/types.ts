/**
 * Types for the Integrations admin surface.
 *
 * Shaped 1:1 against the live Supabase reality so Phase 3 swaps to a
 * realtime read with no component changes:
 *
 *   public.sources                       → IntegrationDescriptor (registry meta)
 *   public.intelligence_source_sessions  → SessionStatusDescriptor
 *   public.news_ingestion_runs           → IngestionHealthDescriptor (rollup)
 *   public.market_news                   → article-volume aggregates
 *
 * Mock data sits in registry.ts. Real reads land in lib/intelligence/store.ts
 * (Phase 3 candidate). Components import from this module only.
 */

import type { SignalLevel } from "@/lib/admin/dashboard";

/** Mirror of `public.ingestion_source_kind` enum. */
export type IngestionKind = "rss" | "scrape" | "api" | "manual";

/** Mirror of the `intelligence_auth_strategy` enum introduced in migration 0009. */
export type AuthStrategy = "none" | "cookie_session" | "bearer_token" | "oauth2";

/** Connection-level state — the integration as a whole (network + auth + freshness). */
export type ConnectionStatus =
  | "operational"          // green · daily ingestion succeeding, session (if any) valid
  | "degraded"             // amber · partial failures, stale session, RSS slow
  | "session_expired"      // amber · auth required, session lapsed — operator action
  | "awaiting_credentials" // amber · configured but credentials not yet provisioned
  | "failing"              // red · last N ingestion runs failed
  | "not_configured";      // slate · source row absent or disabled

/** Auth-level state — derived from `intelligence_source_sessions.status` + source.requires_auth. */
export type AuthStatus =
  | "no_auth_required"     // public RSS / API · no T2 row needed
  | "active_session"       // T2 row with status='active', expires_at in future
  | "session_expiring"     // T2 row active but expires_at within 24h
  | "session_expired"      // T2 row status='expired' OR expires_at past
  | "refresh_failed"       // last refresh attempt failed; operator needed
  | "not_provisioned";     // T1 credentials not yet set in env vars

/** Per-integration session descriptor — null when source.requires_auth=false. */
export interface SessionStatusDescriptor {
  status: AuthStatus;
  /** Encryption-key id that wraps the active row. Defaults "v1". */
  encKeyId: string | null;
  /** When the active row was last refreshed (ISO). */
  refreshedAt: string | null;
  /** When the active row expires (ISO). */
  expiresAt: string | null;
  /** Hours-to-expiry, computed for tile rendering. Null when no auth. */
  hoursToExpiry: number | null;
  /** Refresh count — operator forensics. */
  refreshCount: number;
  /** Last refresh error, redacted by the writer. Never includes credentials. */
  lastRefreshError: string | null;
}

/** Ingestion-health rollup over the last 7 days of `news_ingestion_runs`. */
export interface IngestionHealthDescriptor {
  /** Last completed run timestamp (ISO). */
  lastRunAt: string | null;
  /** Status of the last run (mirrors `ingestion_status` enum). */
  lastRunStatus: "success" | "partial" | "failed" | "queued" | "running" | "unknown";
  /** Successful runs in the last 7d. */
  runsSuccess7d: number;
  /** Failed runs in the last 7d. */
  runsFailed7d: number;
  /** Articles inserted today (00:00 Madrid → now). */
  articlesToday: number;
  /** Articles inserted last 7d. */
  articles7d: number;
  /** Articles inserted last 30d. */
  articles30d: number;
  /** Mean items-per-run last 7d. */
  meanItemsPerRun7d: number;
}

/** Top-level integration record surfaced on /user/admin/integrations. */
export interface IntegrationDescriptor {
  /** Slug — matches `public.sources.slug`. Used as URL segment. */
  id: string;
  /** Display name — `public.sources.name`. */
  name: string;
  /** Region — ISO 3166-1 alpha-2 or "EU" / "GLOBAL". */
  region: string;
  /** Language — ISO 639-1. */
  language: string;
  /** Origin URL — `public.sources.base_url`. */
  baseUrl: string;
  /** RSS URL when applicable. */
  rssUrl: string | null;
  /** Ingestion kind. */
  ingestionKind: IngestionKind;
  /** Auth strategy. */
  authStrategy: AuthStrategy;
  /** Reliability score 0..1. */
  reliabilityScore: number;
  /** Whether ingestion is currently enabled. */
  enabled: boolean;
  /** Whether the source needs authentication to fetch premium content. */
  requiresAuth: boolean;
  /** Vendor tier — institutional context for the operator. */
  tier: "free_public" | "freemium_premium" | "paid_subscription" | "paid_api";
  /** Short tag line describing what the source contributes. */
  tagline: string;
  /** Connection status (derived). */
  connection: ConnectionStatus;
  /** Computed signal tint for the card border + rail. */
  signal: SignalLevel;
  /** Session descriptor when requiresAuth=true, else null. */
  session: SessionStatusDescriptor | null;
  /** Ingestion-health rollup. */
  health: IngestionHealthDescriptor;
  /** Notes shown on the detail page — operator-facing. */
  notes: string[];
  /** External links surfaced on the detail page (login, premium portal, docs). */
  externalLinks: Array<{ label: string; href: string }>;
  /** Where this source lives in the institutional taxonomy. */
  category: "spain_market" | "european_market" | "global_market" | "research_house" | "wire_service";
}

/** Connection-status visual contract — drives card border + dot + label. */
export interface ConnectionVisual {
  label: string;
  signal: SignalLevel;
  /** Operator-facing one-liner explaining the state. */
  hint: string;
}

export const CONNECTION_VISUAL: Record<ConnectionStatus, ConnectionVisual> = {
  operational: {
    label: "Operational",
    signal: "ok",
    hint: "Daily ingestion succeeding · session valid",
  },
  degraded: {
    label: "Degraded",
    signal: "warn",
    hint: "Partial failures in the last 7 days",
  },
  session_expired: {
    label: "Session Expired",
    signal: "warn",
    hint: "Operator refresh required",
  },
  awaiting_credentials: {
    label: "Awaiting Credentials",
    signal: "warn",
    hint: "Configured · credentials not yet provisioned",
  },
  failing: {
    label: "Failing",
    signal: "error",
    hint: "Consecutive ingestion failures · investigate",
  },
  not_configured: {
    label: "Not Configured",
    signal: "neutral",
    hint: "Source row disabled or missing",
  },
};

export const AUTH_STATUS_VISUAL: Record<AuthStatus, ConnectionVisual> = {
  no_auth_required: { label: "No Auth", signal: "neutral", hint: "Public source · no credentials" },
  active_session: { label: "Active Session", signal: "ok", hint: "Encrypted session valid" },
  session_expiring: { label: "Expiring Soon", signal: "warn", hint: "Refresh within 24h" },
  session_expired: { label: "Expired", signal: "warn", hint: "Operator refresh required" },
  refresh_failed: { label: "Refresh Failed", signal: "error", hint: "Last refresh attempt failed" },
  not_provisioned: { label: "Not Provisioned", signal: "warn", hint: "T1 credentials missing from env" },
};
