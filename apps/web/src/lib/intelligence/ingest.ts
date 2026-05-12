import "server-only";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { fetchForSource } from "./fetchers";
import { normalise } from "./normalise";
import { getRecipe } from "./source-recipes";
import {
  loadActiveCookieJar,
  validateSessionHealth,
  markSessionRefreshFailed,
  markSessionHealthOk,
  type CookieJar,
} from "./session-fetch";
import { fetchArticleBody } from "./body-fetch";
import type {
  IngestionBatchResult,
  IngestionRunResult,
  NormalisedNewsItem,
  SourceRow,
} from "./types";

/**
 * Daily orchestrator. Runs per source serially (parallelism reserved
 * for Phase 3 once we have telemetry to confirm rate-limits hold).
 *
 *   - opens a news_ingestion_runs row (status='running')
 *   - fetches, normalises, upserts market_news
 *   - inserts news_tags
 *   - closes the run with counters + status
 *   - bumps sources.last_ingested_at on success
 *
 * Always returns a result — never throws. Per-source failures land in
 * the run row's error_message; the batch result records both successes
 * and failures so QA / Monitoring can act on them.
 */

export async function loadEnabledSources(): Promise<SourceRow[]> {
  const admin = getSupabaseAdmin();
  const { data, error } = await admin
    .from("sources")
    .select(
      "id, slug, name, base_url, ingestion_kind, rss_url, api_endpoint, scrape_selector, region, language, reliability_score, enabled",
    )
    .eq("enabled", true)
    .order("reliability_score", { ascending: false, nullsFirst: false });
  if (error) throw new Error(`loadEnabledSources: ${error.message}`);
  return (data ?? []) as SourceRow[];
}

async function openRunRow(source: SourceRow): Promise<string> {
  const admin = getSupabaseAdmin();
  const { data, error } = await admin
    .from("news_ingestion_runs")
    .insert({
      source_id: source.id,
      status: "running",
      run_started_at: new Date().toISOString(),
    })
    .select("id")
    .single();
  if (error) throw new Error(`openRunRow(${source.slug}): ${error.message}`);
  return data.id as string;
}

async function closeRunRow(
  runId: string,
  outcome: Omit<IngestionRunResult, "source_id" | "source_slug">,
): Promise<void> {
  const admin = getSupabaseAdmin();
  await admin
    .from("news_ingestion_runs")
    .update({
      run_completed_at: new Date().toISOString(),
      status: outcome.status,
      items_seen: outcome.items_seen,
      items_inserted: outcome.items_inserted,
      items_updated: outcome.items_updated,
      items_skipped: outcome.items_skipped,
      error_message: outcome.error_message ?? null,
      metadata: (outcome.metadata ?? null) as never,
    })
    .eq("id", runId);
}

async function bumpSourceLastIngested(sourceId: string): Promise<void> {
  const admin = getSupabaseAdmin();
  await admin
    .from("sources")
    .update({ last_ingested_at: new Date().toISOString() })
    .eq("id", sourceId);
}

/**
 * Upsert one normalised item into market_news.
 *
 * Behaviour:
 *   - never-seen url_hash → insert (items_inserted++)
 *   - same url_hash + same content_hash → bump last_seen_at + occurrences (items_skipped++)
 *   - same url_hash + different content_hash → update content + bump (items_updated++)
 */
interface EnrichedMeta {
  fetched_at: string;
  via: "cron";
  body_via: string;
  body_length: number;
  html_length: number;
  authed: boolean;
  session_id?: string;
  status: number;
}

async function upsertItem(
  item: NormalisedNewsItem,
  enriched: EnrichedMeta | null,
): Promise<"inserted" | "updated" | "skipped"> {
  const admin = getSupabaseAdmin();

  const { data: existing } = await admin
    .from("market_news")
    .select("id, content_hash, occurrences")
    .eq("url_hash", item.url_hash)
    .maybeSingle();

  if (existing) {
    const sameContent = existing.content_hash === item.content_hash;
    await admin
      .from("market_news")
      .update({
        last_seen_at: new Date().toISOString(),
        occurrences: (existing.occurrences ?? 1) + 1,
        // Always refresh body + enriched_meta when we just fetched the
        // full article — even when title/summary didn't change. The
        // authed-fetch path can recover a body that earlier anon runs
        // missed, so we never want to keep stale empty bodies.
        ...(enriched && item.body
          ? {
              body: item.body,
              enriched_meta: enriched as never,
            }
          : {}),
        ...(sameContent
          ? {}
          : {
              title: item.title,
              summary: item.summary ?? null,
              content_hash: item.content_hash,
              raw_meta: (item.raw ?? null) as never,
            }),
      })
      .eq("id", existing.id);
    return sameContent ? "skipped" : "updated";
  }

  const { data: inserted, error } = await admin
    .from("market_news")
    .insert({
      source_id: item.source_id,
      title: item.title,
      summary: item.summary ?? null,
      body: item.body ?? null,
      url: item.url,
      canonical_url: item.canonical_url,
      url_hash: item.url_hash,
      content_hash: item.content_hash,
      category: item.category,
      language: item.language ?? "en",
      region: item.region ?? null,
      published_at: item.published_at ?? null,
      raw_meta: (item.raw ?? null) as never,
      enriched_meta: (enriched ?? null) as never,
    })
    .select("id")
    .single();
  if (error) throw new Error(`market_news insert: ${error.message}`);

  if (item.tags.length) {
    await admin
      .from("news_tags")
      .upsert(
        item.tags.map((tag) => ({ news_id: inserted.id as string, tag })),
        { onConflict: "news_id,tag", ignoreDuplicates: true },
      );
  }
  return "inserted";
}

/**
 * Phase 2.6 per-source orchestration.
 *
 * Lifecycle per source
 *   1. Open run row (status='running')
 *   2. If recipe.requiresAuth: load active T2 cookie jar
 *        a. Session health check (anon vs authed differential on
 *           canonical target URL · cheap, 2 HTTP fetches)
 *        b. On pass → markSessionHealthOk · attach cookies for body fetch
 *        c. On fail → markSessionRefreshFailed · degrade to anon-only
 *           ingestion · run continues so RSS metadata still lands
 *   3. Fetch RSS items (RSS feeds themselves are usually public · cookie
 *      attachment doesn't hurt for non-public feeds either)
 *   4. For each item · fetch full article body with (or without) cookies
 *      · normalise · upsert into market_news with body + enriched_meta
 *   5. Close run row · bump sources.last_ingested_at
 *
 * The function NEVER throws — every error is captured into the run row.
 */
export async function runOneSource(source: SourceRow): Promise<IngestionRunResult> {
  const runId = await openRunRow(source);
  const result: IngestionRunResult = {
    source_id: source.id,
    source_slug: source.slug,
    status: "running",
    items_seen: 0,
    items_inserted: 0,
    items_updated: 0,
    items_skipped: 0,
  };

  const recipe = getRecipe(source.slug);
  let jar: CookieJar | null = null;
  let sessionHealth: "ok" | "failed_auto_degraded" | "no_auth_required" | "no_session" = "no_auth_required";

  try {
    // ── Session health gate (Phase 2.6) ───────────────────────────────────
    if (recipe?.requiresAuth) {
      jar = await loadActiveCookieJar(source.slug);
      if (!jar) {
        sessionHealth = "no_session";
        result.metadata = {
          ...(result.metadata ?? {}),
          session_health: "no_session",
          note: "no_active_T2_row_or_expired",
        };
      } else {
        const report = await validateSessionHealth(source.slug, jar);
        if (report.ok) {
          sessionHealth = "ok";
          await markSessionHealthOk(source.slug, jar, report);
        } else {
          sessionHealth = "failed_auto_degraded";
          await markSessionRefreshFailed(source.slug, jar, report);
          // Auto-degrade: continue without cookies so RSS metadata still
          // updates. The Admin UI red banner fires immediately because we
          // marked the T2 row as refresh_failed.
          jar = null;
          result.metadata = {
            ...(result.metadata ?? {}),
            session_health: "failed_auto_degraded",
            failure_reason: report.failureReason,
          };
        }
      }
    }
    if (sessionHealth !== "failed_auto_degraded" && sessionHealth !== "no_session") {
      result.metadata = {
        ...(result.metadata ?? {}),
        session_health: sessionHealth,
      };
    }

    // ── Fetch RSS items (or skip with note for non-RSS sources) ───────────
    const { items, note } = await fetchForSource(source);
    result.items_seen = items.length;
    if (note) {
      result.metadata = { ...(result.metadata ?? {}), note };
    }
    if (!items.length) {
      result.status = "success";
      await closeRunRow(runId, result);
      return result;
    }

    // ── Per-item body fetch + upsert ──────────────────────────────────────
    const bodySelectors = recipe?.bodySelectors ?? ["article", "main"];
    let bodyFetchSuccesses = 0;
    let bodyFetchFailures = 0;

    for (const raw of items) {
      try {
        const cookieHeader = jar ? jar.headerFor(raw.url) : "";
        const bodyResult = await fetchArticleBody(raw.url, cookieHeader, bodySelectors);

        const enriched: EnrichedMeta | null = bodyResult.status > 0
          ? {
              fetched_at: new Date().toISOString(),
              via: "cron",
              body_via: bodyResult.via,
              body_length: bodyResult.body.length,
              html_length: bodyResult.htmlLength,
              authed: jar !== null && cookieHeader.length > 0,
              ...(jar ? { session_id: jar.sessionId } : {}),
              status: bodyResult.status,
            }
          : null;
        if (bodyResult.status > 0 && bodyResult.body.length > 0) {
          bodyFetchSuccesses += 1;
        } else if (bodyResult.status > 0 && bodyResult.body.length === 0) {
          bodyFetchFailures += 1;
        } else {
          bodyFetchFailures += 1;
        }

        // Attach body to the raw item so normalise/categorise see the full
        // text — improves regex categorisation hit rate dramatically.
        const rawWithBody = bodyResult.body
          ? { ...raw, body: bodyResult.body }
          : raw;
        const item = normalise(rawWithBody);
        const outcome = await upsertItem(item, enriched);
        if (outcome === "inserted") result.items_inserted += 1;
        else if (outcome === "updated") result.items_updated += 1;
        else result.items_skipped += 1;
      } catch (err) {
        result.items_skipped += 1;
        result.metadata = {
          ...(result.metadata ?? {}),
          last_item_error: err instanceof Error ? err.message : String(err),
        };
      }
    }

    result.metadata = {
      ...(result.metadata ?? {}),
      body_fetch_successes: bodyFetchSuccesses,
      body_fetch_failures: bodyFetchFailures,
    };

    // ── Run-level status ──────────────────────────────────────────────────
    // 'partial' when auto-degraded · 'success' otherwise (when we
    // upserted anything). 'partial' is operator-visible in the Admin UI
    // so the cron's auto-degrade ALWAYS surfaces (even when RSS items
    // still landed).
    if (sessionHealth === "failed_auto_degraded" || sessionHealth === "no_session") {
      result.status = "partial";
    } else {
      result.status =
        result.items_inserted + result.items_updated > 0 ? "success" : "partial";
    }
    await closeRunRow(runId, result);
    await bumpSourceLastIngested(source.id);
    return result;
  } catch (err) {
    result.status = "failed";
    result.error_message = err instanceof Error ? err.message : String(err);
    await closeRunRow(runId, result).catch(() => undefined);
    return result;
  }
}

/** Run every enabled source. Phase 2 ingestion entry point. */
export async function runAllSources(): Promise<IngestionBatchResult> {
  const startedAt = Date.now();
  const sources = await loadEnabledSources();
  const per_source: IngestionRunResult[] = [];
  for (const src of sources) {
    per_source.push(await runOneSource(src));
  }
  const completedAt = Date.now();
  const totals = per_source.reduce(
    (acc, r) => {
      acc.sources_attempted += 1;
      if (r.status === "success" || r.status === "partial") {
        acc.sources_succeeded += 1;
      } else if (r.status === "failed") {
        acc.sources_failed += 1;
      }
      acc.items_seen += r.items_seen;
      acc.items_inserted += r.items_inserted;
      acc.items_updated += r.items_updated;
      return acc;
    },
    {
      sources_attempted: 0,
      sources_succeeded: 0,
      sources_failed: 0,
      items_seen: 0,
      items_inserted: 0,
      items_updated: 0,
    },
  );
  return {
    started_at: new Date(startedAt).toISOString(),
    completed_at: new Date(completedAt).toISOString(),
    duration_ms: completedAt - startedAt,
    per_source,
    totals,
  };
}
