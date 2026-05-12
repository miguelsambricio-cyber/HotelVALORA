import "server-only";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { INTEGRATIONS_REGISTRY } from "@/lib/admin/integrations/registry";

/**
 * Live aggregator for the AI Operations Center dashboard. Pulls
 * operational signals straight from the DB · zero mock data · so the
 * page reflects last-cron-run reality:
 *
 *   - recent ingestion runs (joined with sources for display name)
 *   - per-source 7d success / failure / partial counts
 *   - 7d throughput timeline (articles inserted per day)
 *   - degraded sources (refresh_failed sessions OR low-success runs)
 *   - alerts feed (recent failure audit events)
 *
 * Read posture: service-role. All rows are non-secret aggregates.
 */

export type IngestionRunStatus = "queued" | "running" | "success" | "partial" | "failed";

export interface RecentRunRow {
  id: string;
  source_id: string;
  source_slug: string;
  source_name: string;
  status: IngestionRunStatus;
  run_started_at: string;
  run_completed_at: string | null;
  items_seen: number;
  items_inserted: number;
  items_updated: number;
  duration_ms: number | null;
  error_message: string | null;
  /** Discriminator from ingest.ts metadata · how the cron handled auth. */
  session_health: "ok" | "failed_auto_degraded" | "no_session" | "no_auth_required" | null;
  body_fetch_successes: number | null;
  body_fetch_failures: number | null;
}

export interface DegradedSource {
  slug: string;
  name: string;
  reason: "session_refresh_failed" | "consecutive_failures" | "auto_degraded" | "no_recent_runs";
  detail: string;
  /** ISO of the most recent event that flagged it. */
  flagged_at: string | null;
}

export interface ThroughputBucket {
  date: string; // YYYY-MM-DD UTC
  articles: number;
  runs: number;
}

export interface AlertEntry {
  id: string;
  kind: "ingestion_failure" | "session_validation_failed" | "auth_failure";
  source_slug: string;
  occurred_at: string;
  headline: string;
  detail: string | null;
}

/**
 * Single row in the cross-source Priority Intelligence Feed. Mirrors
 * the per-source drawer row but enriched with the source name so the
 * feed can headline who produced the signal.
 */
export interface PriorityFeedItem {
  id: string;
  title: string;
  source_slug: string;
  source_name: string;
  premium_source: boolean;
  published_at: string;
  first_seen_at: string;
  body_preview: string | null;
  url: string;
  relevance_signal: string | null;
  /**
   * Heuristic 0–100 score used to surface the most institutionally
   * relevant items first. Drives ordering inside a single source bucket
   * BEFORE source-balanced interleave. See `scoreItem` for the rule book.
   */
  score: number;
  fetched_authed: boolean | null;
}

/**
 * One row in the rolling-7d signal summary. Drives the horizontal
 * "Top Signals · 7d" band above the feed.
 */
export interface TopSignalRow {
  signal: string;
  /** Human-readable label · derived from a small lookup. */
  label: string;
  count: number;
}

export interface AiOpsLive {
  totals: {
    runs7d: number;
    successes7d: number;
    failures7d: number;
    partials7d: number;
    articlesInserted7d: number;
    sourcesActive: number;
    sourcesDegraded: number;
    priorityArticles7d: number;
  };
  recentRuns: RecentRunRow[];
  degradedSources: DegradedSource[];
  throughput: ThroughputBucket[];
  alerts: AlertEntry[];
  /** Cross-source priority-tier articles · last 7d · source-balanced. */
  priorityFeed: PriorityFeedItem[];
  /** 7d rolling counts per priority signal · ordered by count DESC. */
  topSignals: TopSignalRow[];
  /** When this snapshot was computed · server time. */
  fetchedAt: string;
}

const EMPTY: AiOpsLive = {
  totals: {
    runs7d: 0,
    successes7d: 0,
    failures7d: 0,
    partials7d: 0,
    articlesInserted7d: 0,
    sourcesActive: 0,
    sourcesDegraded: 0,
    priorityArticles7d: 0,
  },
  recentRuns: [],
  degradedSources: [],
  throughput: [],
  alerts: [],
  priorityFeed: [],
  topSignals: [],
  fetchedAt: new Date().toISOString(),
};

// ── signal labelling ────────────────────────────────────────────────────────
// Centralised here so both the aggregator and dashboard components share
// the same mapping. Slug shows up in the chip when label is missing — the
// classifier signal is the source of truth.

const SIGNAL_LABEL: Record<string, string> = {
  acquisition_sale: "M&A",
  joint_venture_partnership: "JV / Partnership",
  refinancing_debt: "Debt / Refinancing",
  investment_fund: "Investment Fund",
  socimi_reit: "SOCIMI / REIT",
  operator_agreement: "Operator",
  lease_agreement: "Lease",
  development: "Development",
  pipeline_expansion: "Pipeline",
  conversion_repositioning: "Conversion",
  branded_residences: "Branded Residences",
  flex_living: "Flex Living",
  distress: "Distress",
};

/**
 * Heuristic per-item score so source-balanced feeds can rank within a
 * single source's bucket before interleave. Rules ordered by weight:
 *   - SOCIMI / REIT, M&A with price-tag, large investment fund mentions
 *     anchor the top
 *   - Authed fetches outrank anon (we paid the auth cost · should show
 *     the operator the result)
 *   - Body preview presence outranks summary-only rows
 *   - Recency tie-breaks within ±1 day
 */
function scoreItem(args: {
  signal: string | null;
  bodyPreview: string | null;
  fetchedAuthed: boolean | null;
  publishedAt: string;
}): number {
  let score = 0;
  switch (args.signal) {
    case "socimi_reit": score += 30; break;
    case "acquisition_sale": score += 25; break;
    case "investment_fund": score += 22; break;
    case "refinancing_debt": score += 20; break;
    case "joint_venture_partnership": score += 18; break;
    case "operator_agreement": score += 16; break;
    case "lease_agreement": score += 15; break;
    case "development": score += 13; break;
    case "pipeline_expansion": score += 12; break;
    case "conversion_repositioning": score += 11; break;
    case "branded_residences": score += 10; break;
    case "flex_living": score += 8; break;
    case "distress": score += 14; break;
    default: score += 5; break;
  }
  if (args.bodyPreview && args.bodyPreview.length > 200) score += 8;
  else if (args.bodyPreview) score += 4;
  if (args.fetchedAuthed === true) score += 6;
  // Recency boost · linear over 7 days.
  const ageH = Math.max(0, (Date.now() - new Date(args.publishedAt).getTime()) / 3600_000);
  const ageDays = Math.min(7, ageH / 24);
  score += Math.round((7 - ageDays) * 2); // 0..14
  return score;
}

/**
 * Source-balanced interleave · prevents one prolific feed (Hosteltur,
 * Expansión) from drowning out lower-volume sources. Strategy: take
 * the top `perSourceCap` items per source ordered by score, then
 * re-sort the union by score+recency DESC.
 *
 * Round-robin would smooth volume even further but the operator-facing
 * priority is "show me the biggest deals first regardless of source";
 * capping is a defensive middle-ground.
 */
function balanceBySource<T extends { source_slug: string; score: number; published_at: string }>(
  items: T[],
  perSourceCap: number,
): T[] {
  const buckets = new Map<string, T[]>();
  for (const item of items) {
    const bucket = buckets.get(item.source_slug) ?? [];
    bucket.push(item);
    buckets.set(item.source_slug, bucket);
  }
  const capped: T[] = [];
  for (const [, bucket] of buckets) {
    bucket.sort((a, b) => b.score - a.score);
    capped.push(...bucket.slice(0, perSourceCap));
  }
  capped.sort((a, b) => {
    const byScore = b.score - a.score;
    if (byScore !== 0) return byScore;
    return new Date(b.published_at).getTime() - new Date(a.published_at).getTime();
  });
  return capped;
}

function extractBodyPreview(body: string | null): string | null {
  if (!body || typeof body !== "string") return null;
  const trimmed = body.trim();
  if (trimmed.length === 0) return null;
  if (trimmed.length <= 280) return trimmed;
  const slice = trimmed.slice(0, 280);
  const lastSpace = slice.lastIndexOf(" ");
  return `${slice.slice(0, lastSpace > 200 ? lastSpace : 280)}…`;
}

/**
 * Single entry point · the page calls this once per request. Everything
 * the page renders comes from the returned object.
 */
export async function loadAiOpsLive(): Promise<AiOpsLive> {
  try {
    const sb = getSupabaseAdmin();
    const since7d = new Date(Date.now() - 7 * 86400_000).toISOString();
    const sinceRecent = new Date(Date.now() - 14 * 86400_000).toISOString();

    // ── parallel reads ─────────────────────────────────────────────────────
    const [runsRecentRes, sources7dRes, articlesRes, sessionsRes, alertsRes, priority7dRes] =
      await Promise.all([
        sb
          .from("news_ingestion_runs")
          .select(
            "id, source_id, status, run_started_at, run_completed_at, items_seen, items_inserted, items_updated, error_message, metadata",
          )
          .gte("run_started_at", sinceRecent)
          .order("run_started_at", { ascending: false })
          .limit(40),
        sb
          .from("news_ingestion_runs")
          .select("source_id, status")
          .gte("run_started_at", since7d),
        sb
          .from("market_news")
          .select("first_seen_at")
          .gte("first_seen_at", since7d),
        sb
          .from("intelligence_source_sessions")
          .select("source_slug, status, last_refresh_error"),
        sb
          .from("intelligence_credentials_audit")
          .select("id, source_slug, event_kind, detail, error, created_at")
          .eq("event_kind", "auth_failure")
          .gte("created_at", since7d)
          .order("created_at", { ascending: false })
          .limit(20),
        // Priority-tier articles · last 7d · for the cross-source feed +
        // signal summary. Filtered server-side via PostgREST jsonb operator
        // so we only ship rows we'll actually render.
        sb
          .from("market_news")
          .select("id, title, source_id, url, body, published_at, first_seen_at, enriched_meta")
          .eq("enriched_meta->>relevance_tier", "priority")
          .gte("first_seen_at", since7d)
          .order("published_at", { ascending: false, nullsFirst: false })
          .order("first_seen_at", { ascending: false })
          .limit(80),
      ]);

    // ── source dictionary (slug + display name) ────────────────────────────
    // Registry IS the source of truth for display metadata.
    const sourceByIdRes = await sb.from("sources").select("id, slug, name").eq("enabled", true);
    const sourceById = new Map<string, { slug: string; name: string }>();
    for (const row of (sourceByIdRes.data as Array<{ id: string; slug: string; name: string }> | null) ?? []) {
      sourceById.set(row.id, { slug: row.slug, name: row.name });
    }
    const slugToRegistry = new Map(INTEGRATIONS_REGISTRY.map((r) => [r.id, r]));

    // ── recent runs · enriched with source slug + name ─────────────────────
    const rawRuns =
      (runsRecentRes.data as Array<{
        id: string;
        source_id: string;
        status: IngestionRunStatus;
        run_started_at: string;
        run_completed_at: string | null;
        items_seen: number | null;
        items_inserted: number | null;
        items_updated: number | null;
        error_message: string | null;
        metadata: Record<string, unknown> | null;
      }> | null) ?? [];

    // Skip runs for sources that aren't in the editorial registry. The
    // historic DB rows for removed sources (Skift, Expansion, THP, Hotel
    // News Now) remain for audit · they just don't pollute the
    // operator-facing dashboard. Keeps the table aligned with the
    // directory page · clicks always resolve to a real integration detail.
    const recentRuns: RecentRunRow[] = rawRuns.flatMap((r) => {
      const src = sourceById.get(r.source_id);
      if (!src || !slugToRegistry.has(src.slug)) return [];
      const meta = r.metadata ?? {};
      const startedMs = new Date(r.run_started_at).getTime();
      const completedMs = r.run_completed_at ? new Date(r.run_completed_at).getTime() : null;
      const sessionHealthRaw = meta.session_health;
      const sessionHealth =
        sessionHealthRaw === "ok" ||
        sessionHealthRaw === "failed_auto_degraded" ||
        sessionHealthRaw === "no_session" ||
        sessionHealthRaw === "no_auth_required"
          ? sessionHealthRaw
          : null;
      return [{
        id: r.id,
        source_id: r.source_id,
        source_slug: src.slug,
        source_name: src.name,
        status: r.status,
        run_started_at: r.run_started_at,
        run_completed_at: r.run_completed_at,
        items_seen: r.items_seen ?? 0,
        items_inserted: r.items_inserted ?? 0,
        items_updated: r.items_updated ?? 0,
        duration_ms: completedMs && Number.isFinite(startedMs) ? completedMs - startedMs : null,
        error_message: r.error_message,
        session_health: sessionHealth,
        body_fetch_successes:
          typeof meta.body_fetch_successes === "number" ? meta.body_fetch_successes : null,
        body_fetch_failures:
          typeof meta.body_fetch_failures === "number" ? meta.body_fetch_failures : null,
      }];
    });

    // ── per-source 7d counts ───────────────────────────────────────────────
    const sources7d =
      (sources7dRes.data as Array<{ source_id: string; status: IngestionRunStatus }> | null) ?? [];
    let successes7d = 0;
    let failures7d = 0;
    let partials7d = 0;
    for (const row of sources7d) {
      if (row.status === "success") successes7d += 1;
      else if (row.status === "failed") failures7d += 1;
      else if (row.status === "partial") partials7d += 1;
    }

    // ── throughput buckets · last 7 UTC days ───────────────────────────────
    const articles = (articlesRes.data as Array<{ first_seen_at: string }> | null) ?? [];
    const buckets = new Map<string, ThroughputBucket>();
    const today = new Date();
    for (let i = 6; i >= 0; i -= 1) {
      const d = new Date(today.getTime() - i * 86400_000);
      const key = d.toISOString().slice(0, 10);
      buckets.set(key, { date: key, articles: 0, runs: 0 });
    }
    for (const row of articles) {
      const key = row.first_seen_at.slice(0, 10);
      const bucket = buckets.get(key);
      if (bucket) bucket.articles += 1;
    }
    // Tag run counts onto the buckets.
    for (const r of rawRuns) {
      const key = r.run_started_at.slice(0, 10);
      const bucket = buckets.get(key);
      if (bucket) bucket.runs += 1;
    }
    const throughput = Array.from(buckets.values());

    // ── degraded sources ───────────────────────────────────────────────────
    const sessions =
      (sessionsRes.data as Array<{
        source_slug: string;
        status: string;
        last_refresh_error: string | null;
      }> | null) ?? [];
    const degradedSet = new Map<string, DegradedSource>();

    for (const s of sessions) {
      if (s.status === "refresh_failed") {
        const meta = slugToRegistry.get(s.source_slug);
        degradedSet.set(s.source_slug, {
          slug: s.source_slug,
          name: meta?.name ?? s.source_slug,
          reason: "session_refresh_failed",
          detail: s.last_refresh_error ?? "Last refresh attempt failed",
          flagged_at: null,
        });
      }
    }

    // Sources with >=2 failures in 7d and no successes
    const perSource = new Map<string, { ok: number; failed: number; partial: number }>();
    for (const row of sources7d) {
      const src = sourceById.get(row.source_id);
      if (!src) continue;
      const slot = perSource.get(src.slug) ?? { ok: 0, failed: 0, partial: 0 };
      if (row.status === "success") slot.ok += 1;
      else if (row.status === "failed") slot.failed += 1;
      else if (row.status === "partial") slot.partial += 1;
      perSource.set(src.slug, slot);
    }
    for (const [slug, counts] of perSource) {
      if (degradedSet.has(slug)) continue;
      if (counts.failed >= 2 && counts.ok === 0) {
        const meta = slugToRegistry.get(slug);
        degradedSet.set(slug, {
          slug,
          name: meta?.name ?? slug,
          reason: "consecutive_failures",
          detail: `${counts.failed} consecutive failures in 7d · no successful run`,
          flagged_at: null,
        });
      } else if (counts.partial > 0 && counts.ok === 0) {
        const meta = slugToRegistry.get(slug);
        degradedSet.set(slug, {
          slug,
          name: meta?.name ?? slug,
          reason: "auto_degraded",
          detail: `${counts.partial} partial runs in 7d · likely auto-degraded session`,
          flagged_at: null,
        });
      }
    }

    // ── alerts feed ────────────────────────────────────────────────────────
    const alertRows =
      (alertsRes.data as Array<{
        id: string;
        source_slug: string;
        event_kind: string;
        detail: Record<string, unknown> | null;
        error: string | null;
        created_at: string;
      }> | null) ?? [];

    const alerts: AlertEntry[] = alertRows.map((row) => {
      const detail = row.detail ?? {};
      const ctx = typeof detail.context === "string" ? detail.context : null;
      const isHealthCheck = ctx === "cron_session_health";
      return {
        id: row.id,
        kind: isHealthCheck ? "session_validation_failed" : "auth_failure",
        source_slug: row.source_slug,
        occurred_at: row.created_at,
        headline: isHealthCheck
          ? `Session validation failed · ${row.source_slug}`
          : `Auth failure · ${row.source_slug}`,
        detail: row.error ?? (typeof detail.failure_reason === "string" ? detail.failure_reason : null),
      };
    });

    // Also surface failed ingestion runs as alerts (best-effort merge)
    for (const r of rawRuns) {
      if (r.status !== "failed") continue;
      alerts.push({
        id: `run:${r.id}`,
        kind: "ingestion_failure",
        source_slug: sourceById.get(r.source_id)?.slug ?? "(unknown)",
        occurred_at: r.run_started_at,
        headline: `Ingestion failed · ${sourceById.get(r.source_id)?.slug ?? "(unknown)"}`,
        detail: r.error_message,
      });
    }
    alerts.sort((a, b) => (a.occurred_at < b.occurred_at ? 1 : -1));

    // ── priority intelligence feed (cross-source · 7d) ─────────────────────
    const priorityRaw =
      (priority7dRes.data as Array<{
        id: string;
        title: string;
        source_id: string;
        url: string;
        body: string | null;
        published_at: string | null;
        first_seen_at: string;
        enriched_meta: Record<string, unknown> | null;
      }> | null) ?? [];

    const priorityCandidates: PriorityFeedItem[] = priorityRaw.flatMap((row) => {
      const src = sourceById.get(row.source_id);
      if (!src) return [];
      const registry = slugToRegistry.get(src.slug);
      if (!registry) return [];
      const enriched = row.enriched_meta ?? {};
      const signal = typeof enriched.relevance_signal === "string" ? enriched.relevance_signal : null;
      const fetchedAuthed = typeof enriched.authed === "boolean" ? enriched.authed : null;
      const publishedAt = row.published_at ?? row.first_seen_at;
      const bodyPreview = extractBodyPreview(row.body);
      const score = scoreItem({ signal, bodyPreview, fetchedAuthed, publishedAt });
      return [{
        id: row.id,
        title: row.title,
        source_slug: src.slug,
        source_name: src.name,
        premium_source: registry.requiresAuth,
        published_at: publishedAt,
        first_seen_at: row.first_seen_at,
        body_preview: bodyPreview,
        url: row.url,
        relevance_signal: signal,
        score,
        fetched_authed: fetchedAuthed,
      }];
    });

    // Cap at 6 articles per source so a single prolific feed (Hosteltur,
    // Expansión before its removal) doesn't crowd out lower-volume sources.
    // Then take the top 30 for the dashboard feed.
    const priorityFeed = balanceBySource(priorityCandidates, 6).slice(0, 30);

    // ── top signals · rolling 7d count per priority signal ─────────────────
    const signalCounts = new Map<string, number>();
    for (const item of priorityCandidates) {
      if (!item.relevance_signal) continue;
      signalCounts.set(item.relevance_signal, (signalCounts.get(item.relevance_signal) ?? 0) + 1);
    }
    const topSignals: TopSignalRow[] = Array.from(signalCounts.entries())
      .map(([signal, count]) => ({
        signal,
        label: SIGNAL_LABEL[signal] ?? signal,
        count,
      }))
      .sort((a, b) => b.count - a.count);

    // ── final assembly ─────────────────────────────────────────────────────
    return {
      totals: {
        runs7d: sources7d.length,
        successes7d,
        failures7d,
        partials7d,
        articlesInserted7d: articles.length,
        sourcesActive: perSource.size,
        sourcesDegraded: degradedSet.size,
        priorityArticles7d: priorityCandidates.length,
      },
      recentRuns,
      degradedSources: Array.from(degradedSet.values()),
      throughput,
      alerts: alerts.slice(0, 25),
      priorityFeed,
      topSignals,
      fetchedAt: new Date().toISOString(),
    };
  } catch {
    return EMPTY;
  }
}
