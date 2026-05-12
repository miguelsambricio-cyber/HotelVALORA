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
  /** True when an `intelligence_source_sessions` row was found in DB,
   *  regardless of its expiry / status. Used by the conservative
   *  connection inference so we never down-grade an integration that
   *  *has* exercised the full T1→T2 lifecycle. */
  sessionRowPresent: boolean;
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
  sessionRowPresent: false,
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
    // Defensive: use array+take[0] instead of maybeSingle(). maybeSingle()
    // adds a PostgREST single-row header that silently returns null when
    // anything unusual happens server-side (USER-DEFINED enum quirks have
    // been observed). Reading as an array is bulletproof — we already
    // limit to 1 and order by recency.
    let session: SessionStatusDescriptor | null = null;
    let sessionRowPresent = false;
    if (requiresAuth) {
      const sessRes = await sb
        .from("intelligence_source_sessions")
        .select("status, enc_key_id, refreshed_at, expires_at, refresh_count, last_refresh_error")
        .eq("source_slug", slug)
        .order("refreshed_at", { ascending: false })
        .limit(1);
      const rows = (sessRes.data as Array<{
        status: "active" | "expired" | "invalidated" | "refresh_failed";
        enc_key_id: string;
        refreshed_at: string;
        expires_at: string;
        refresh_count: number;
        last_refresh_error: string | null;
      }> | null) ?? [];
      const s = rows[0] ?? null;
      sessionRowPresent = s !== null;
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
      sessionRowPresent,
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

  // ── Authenticated source path ─────────────────────────────────────────
  // Source-of-truth signals (per the 2026-05-12 inference fix):
  //   1. T1 active credentials
  //   2. T2 session row exists (regardless of imminent expiry)
  //   3. Recent ingestion (success runs in last 7d OR last_login=success)
  //
  // If all three hold → operational. The previous logic flipped to
  // "session_expired" whenever the session query returned null even with
  // T1 active + ingestion succeeding, which produced contradictory UI
  // (cred panel green, top badges expired).

  if (!telemetry.credentialsConfigured) return "awaiting_credentials";

  // Real refresh failure is still a real failure.
  if (telemetry.session?.status === "refresh_failed") return "failing";
  if (telemetry.lastLoginStatus === "failure") return "degraded";

  const hasRecentIngestion =
    telemetry.health.runsSuccess7d > 0 || telemetry.health.articlesToday > 0;
  const sessionPresent = telemetry.sessionRowPresent;
  const sessionExplicitlyDead =
    telemetry.session?.status === "session_expired" && !sessionPresent;

  // Trio rule · all three positive signals → operational.
  if (telemetry.credentialsConfigured && sessionPresent && hasRecentIngestion) {
    return "operational";
  }

  // Trio rule · partial signals — still operational when at least
  // (creds + session-row) or (creds + recent-ingestion) hold. This
  // matches the institutional intent: don't flip the integration to
  // "expired" while real activity continues elsewhere in the lifecycle.
  if (telemetry.credentialsConfigured && (sessionPresent || hasRecentIngestion)) {
    return "operational";
  }

  // Only escalate to "session_expired" when the system genuinely has
  // no signs of life beyond T1 — no T2 row, no recent runs, no
  // successful logins.
  if (sessionExplicitlyDead) return "session_expired";

  // Provisioned credentials, but the first refresh has not yet
  // happened. Operator action needed.
  return "session_expired";
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

// ── Article fetcher · feeds the interactive metric drawer ──────────────────

/** A market_news row in the shape the drawer + counters need.  Mirrors
 *  the live DB column names so the swap-target shape is stable. */
export interface RecentArticle {
  id: string;
  title: string;
  summary: string | null;
  url: string;
  canonical_url: string;
  /** news_category enum value */
  category:
    | "acquisition" | "sale" | "joint_venture" | "development" | "refinancing"
    | "rebranding" | "operator_change" | "branded_residences" | "flex_living"
    | "pipeline_announcement" | "distress" | "investment" | "other";
  /** Country ISO-3166-1 alpha-2 (or NULL when unknown). */
  country: string | null;
  /** market_news.published_at OR fallback first_seen_at (ISO string). */
  published_at: string;
  /** ISO string for client-side filtering today/7d/30d. */
  first_seen_at: string;
  /** Source slug + display name · denormalised for the drawer header. */
  source_slug: string;
  source_name: string;
}

/**
 * Fetches the last `daysBack` of articles for a given integration slug.
 * Returns NEWEST-FIRST. The drawer filters this set client-side for the
 * today/7d/30d tabs, so we only pay one round-trip per page render.
 *
 * Limit is bounded to 200 rows — institutional sources rarely exceed
 * 50–100 articles in 30 days; the limit is a safety belt for unusual
 * data shapes.
 */
export async function getRecentArticlesForSource(
  slug: string,
  daysBack = 30,
  limit = 200,
): Promise<RecentArticle[]> {
  try {
    const sb = getSupabaseAdmin();
    const sourceRow = await sb
      .from("sources")
      .select("id, name, slug")
      .eq("slug", slug)
      .maybeSingle();
    const src = sourceRow.data as { id: string; name: string; slug: string } | null;
    if (!src) return [];
    const since = new Date(Date.now() - daysBack * 86400_000).toISOString();
    const res = await sb
      .from("market_news")
      .select("id, title, summary, url, canonical_url, category, country, published_at, first_seen_at")
      .eq("source_id", src.id)
      .gte("first_seen_at", since)
      .order("published_at", { ascending: false, nullsFirst: false })
      .order("first_seen_at", { ascending: false })
      .limit(limit);
    const rows = (res.data as Array<{
      id: string;
      title: string;
      summary: string | null;
      url: string;
      canonical_url: string;
      category: RecentArticle["category"];
      country: string | null;
      published_at: string | null;
      first_seen_at: string;
    }> | null) ?? [];
    return rows.map((r) => ({
      id: r.id,
      title: r.title,
      summary: r.summary,
      url: r.url,
      canonical_url: r.canonical_url,
      category: r.category,
      country: r.country,
      published_at: r.published_at ?? r.first_seen_at,
      first_seen_at: r.first_seen_at,
      source_slug: src.slug,
      source_name: src.name,
    }));
  } catch {
    return [];
  }
}
