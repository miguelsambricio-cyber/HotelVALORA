import "server-only";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { INTEGRATIONS_REGISTRY, getIntegrationById } from "./registry";
import type {
  AuthStatus,
  ConnectionStatus,
  IngestionHealthDescriptor,
  IntegrationDescriptor,
  SessionStatusDescriptor,
} from "./types";
import { CONNECTION_VISUAL } from "./types";

/**
 * Server-side live-state aggregator for the Administrator → Integrations
 * surface. Merges the static registry (display metadata: name, tagline,
 * external links, region) with the live DB state for credentials,
 * sessions, and ingestion health.
 *
 * Replaces the previous compile-time `INTEGRATIONS_REGISTRY` reads on
 * the directory + detail pages, which stayed permanently stuck on
 * "NOT PROVISIONED · NOT CONFIGURED" regardless of operator action.
 *
 * Read posture: service-role (the targeted tables are RLS-closed; only
 * trusted server contexts may read). All rows are non-secret aggregates.
 */

interface LiveTelemetry {
  credentialsConfigured: boolean;
  credentialsStatus: "active" | "rotated" | "invalidated" | null;
  lastRotatedAt: string | null;
  lastLoginAt: string | null;
  lastLoginStatus: "success" | "failure" | null;
  session: SessionStatusDescriptor | null;
  health: IngestionHealthDescriptor;
}

const EMPTY_HEALTH: IngestionHealthDescriptor = {
  lastRunAt: null,
  lastRunStatus: "unknown",
  runsSuccess7d: 0,
  runsFailed7d: 0,
  articlesToday: 0,
  articles7d: 0,
  articles30d: 0,
  meanItemsPerRun7d: 0,
};

const EMPTY_TELEMETRY: LiveTelemetry = {
  credentialsConfigured: false,
  credentialsStatus: null,
  lastRotatedAt: null,
  lastLoginAt: null,
  lastLoginStatus: null,
  session: null,
  health: EMPTY_HEALTH,
};

async function loadTelemetry(slug: string, requiresAuth: boolean): Promise<LiveTelemetry> {
  try {
    const sb = getSupabaseAdmin();
    const sourceRow = await sb
      .from("sources")
      .select("id")
      .eq("slug", slug)
      .maybeSingle();
    const sourceId = (sourceRow.data as { id: string } | null)?.id;
    if (!sourceId) return EMPTY_TELEMETRY;

    // ── Credentials ──
    let credentialsConfigured = false;
    let credentialsStatus: LiveTelemetry["credentialsStatus"] = null;
    let lastRotatedAt: string | null = null;
    let lastLoginAt: string | null = null;
    let lastLoginStatus: LiveTelemetry["lastLoginStatus"] = null;
    if (requiresAuth) {
      const credRow = await sb
        .from("intelligence_source_credentials")
        .select("status, last_rotated_at, last_login_at, last_login_status")
        .eq("source_slug", slug)
        .eq("status", "active")
        .maybeSingle();
      const c = credRow.data as {
        status: "active" | "rotated" | "invalidated";
        last_rotated_at: string;
        last_login_at: string | null;
        last_login_status: "success" | "failure" | null;
      } | null;
      if (c) {
        credentialsConfigured = true;
        credentialsStatus = c.status;
        lastRotatedAt = c.last_rotated_at;
        lastLoginAt = c.last_login_at;
        lastLoginStatus = c.last_login_status;
      }
    }

    // ── Session ──
    let session: SessionStatusDescriptor | null = null;
    if (requiresAuth) {
      const sessRow = await sb
        .from("intelligence_source_sessions")
        .select("status, enc_key_id, refreshed_at, expires_at, refresh_count, last_refresh_error")
        .eq("source_slug", slug)
        .order("refreshed_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      const s = sessRow.data as {
        status: "active" | "expired" | "invalidated" | "refresh_failed";
        enc_key_id: string;
        refreshed_at: string;
        expires_at: string;
        refresh_count: number;
        last_refresh_error: string | null;
      } | null;
      session = deriveSessionStatus(s, credentialsConfigured);
    }

    // ── Ingestion health rollup ──
    const now = Date.now();
    const since7d = new Date(now - 7 * 86400_000).toISOString();
    const since30d = new Date(now - 30 * 86400_000).toISOString();
    const startToday = new Date(new Date().setUTCHours(0, 0, 0, 0)).toISOString();

    const [runsRecent, articlesToday, articles7d, articles30d, lastRun] = await Promise.all([
      sb
        .from("news_ingestion_runs")
        .select("status, items_inserted")
        .eq("source_id", sourceId)
        .gte("run_started_at", since7d),
      sb
        .from("market_news")
        .select("id", { count: "exact", head: true })
        .eq("source_id", sourceId)
        .gte("first_seen_at", startToday),
      sb
        .from("market_news")
        .select("id", { count: "exact", head: true })
        .eq("source_id", sourceId)
        .gte("first_seen_at", since7d),
      sb
        .from("market_news")
        .select("id", { count: "exact", head: true })
        .eq("source_id", sourceId)
        .gte("first_seen_at", since30d),
      sb
        .from("news_ingestion_runs")
        .select("status, run_started_at, run_completed_at")
        .eq("source_id", sourceId)
        .order("run_started_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);

    const runs = (runsRecent.data as Array<{
      status: "queued" | "running" | "success" | "partial" | "failed";
      items_inserted: number | null;
    }> | null) ?? [];
    const runsSuccess7d = runs.filter((r) => r.status === "success" || r.status === "partial").length;
    const runsFailed7d = runs.filter((r) => r.status === "failed").length;
    const insertedTotal = runs.reduce((acc, r) => acc + (r.items_inserted ?? 0), 0);
    const meanItemsPerRun7d =
      runs.length === 0 ? 0 : Number((insertedTotal / runs.length).toFixed(1));

    const last = lastRun.data as
      | { status: "queued" | "running" | "success" | "partial" | "failed"; run_started_at: string; run_completed_at: string | null }
      | null;

    const health: IngestionHealthDescriptor = {
      lastRunAt: last?.run_completed_at ?? last?.run_started_at ?? null,
      lastRunStatus: last?.status ?? "unknown",
      runsSuccess7d,
      runsFailed7d,
      articlesToday: articlesToday.count ?? 0,
      articles7d: articles7d.count ?? 0,
      articles30d: articles30d.count ?? 0,
      meanItemsPerRun7d,
    };

    return {
      credentialsConfigured,
      credentialsStatus,
      lastRotatedAt,
      lastLoginAt,
      lastLoginStatus,
      session,
      health,
    };
  } catch {
    return EMPTY_TELEMETRY;
  }
}

function deriveSessionStatus(
  row: {
    status: "active" | "expired" | "invalidated" | "refresh_failed";
    enc_key_id: string;
    refreshed_at: string;
    expires_at: string;
    refresh_count: number;
    last_refresh_error: string | null;
  } | null,
  credentialsConfigured: boolean,
): SessionStatusDescriptor {
  if (!row) {
    return {
      status: credentialsConfigured ? "session_expired" : "not_provisioned",
      encKeyId: null,
      refreshedAt: null,
      expiresAt: null,
      hoursToExpiry: null,
      refreshCount: 0,
      lastRefreshError: null,
    };
  }
  const expiresAtMs = new Date(row.expires_at).getTime();
  const now = Date.now();
  const hoursToExpiry = Math.max(0, Math.round((expiresAtMs - now) / 3600_000));

  let status: AuthStatus;
  if (row.status === "refresh_failed") {
    status = "refresh_failed";
  } else if (row.status === "invalidated") {
    status = "session_expired";
  } else if (row.status === "expired" || expiresAtMs <= now) {
    status = "session_expired";
  } else if (hoursToExpiry <= 24) {
    status = "session_expiring";
  } else {
    status = "active_session";
  }

  return {
    status,
    encKeyId: row.enc_key_id,
    refreshedAt: row.refreshed_at,
    expiresAt: row.expires_at,
    hoursToExpiry,
    refreshCount: row.refresh_count,
    lastRefreshError: row.last_refresh_error,
  };
}

function deriveConnection(
  requiresAuth: boolean,
  enabled: boolean,
  telemetry: LiveTelemetry,
): ConnectionStatus {
  if (!enabled) return "not_configured";
  if (!requiresAuth) {
    // Public sources. Reflect ingestion health.
    if (telemetry.health.runsFailed7d > 0 && telemetry.health.runsSuccess7d === 0) return "failing";
    if (telemetry.health.runsFailed7d > 0) return "degraded";
    return "operational";
  }
  // Authenticated source path.
  if (!telemetry.credentialsConfigured) return "awaiting_credentials";
  if (telemetry.session?.status === "session_expired") return "session_expired";
  if (telemetry.session?.status === "refresh_failed") return "failing";
  if (telemetry.lastLoginStatus === "failure") return "degraded";
  // Configured + valid session = operational, regardless of whether ingestion
  // has yet produced articles (those follow the next cron tick).
  return "operational";
}

/**
 * Return the IntegrationDescriptor for one source, with static metadata
 * from the registry overridden by live DB state where applicable.
 */
export async function getIntegrationLive(slug: string): Promise<IntegrationDescriptor | null> {
  const base = getIntegrationById(slug);
  if (!base) return null;
  const telemetry = await loadTelemetry(slug, base.requiresAuth);
  const connection = deriveConnection(base.requiresAuth, base.enabled, telemetry);
  const signal = CONNECTION_VISUAL[connection].signal;
  return {
    ...base,
    connection,
    signal,
    session: telemetry.session,
    health: telemetry.health,
  };
}

/** Return all integrations with live state merged in. */
export async function getIntegrationsLive(): Promise<IntegrationDescriptor[]> {
  return Promise.all(INTEGRATIONS_REGISTRY.map((row) => getIntegrationLive(row.id) as Promise<IntegrationDescriptor>));
}
