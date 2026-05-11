import "server-only";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { fetchForSource } from "./fetchers";
import { normalise } from "./normalise";
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
async function upsertItem(
  item: NormalisedNewsItem,
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
      url: item.url,
      canonical_url: item.canonical_url,
      url_hash: item.url_hash,
      content_hash: item.content_hash,
      category: item.category,
      language: item.language ?? "en",
      region: item.region ?? null,
      published_at: item.published_at ?? null,
      raw_meta: (item.raw ?? null) as never,
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

  try {
    const { items, note } = await fetchForSource(source);
    result.items_seen = items.length;
    if (note) {
      result.metadata = { ...(result.metadata ?? {}), note };
    }
    if (!items.length) {
      // Stubs (scrape/api/manual not yet implemented) + dry runs all land as
      // 'success' with items_seen=0 + metadata.note describing why. The QA
      // Agent reads metadata.note to surface "source has no fetcher yet".
      result.status = "success";
      await closeRunRow(runId, result);
      return result;
    }

    for (const raw of items) {
      try {
        const item = normalise(raw);
        const outcome = await upsertItem(item);
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
    result.status =
      result.items_inserted + result.items_updated > 0 ? "success" : "partial";
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
