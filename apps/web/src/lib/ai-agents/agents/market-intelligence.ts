import "server-only";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import {
  emitEvent,
  getCursor,
  logStep,
  requirePermission,
  setCursor,
  type AgentDefinition,
  type RunContext,
} from "../core";

/**
 * Market Intelligence Agent — Phase 2 / Tier 1 / regex-only.
 *
 * Reads news_ingested rows since the last cursor, produces an aggregate
 * snapshot (counts by category / region / source / tags), writes it to
 * ai_memory under scope=agent_global, then emits an `intel_daily_summary_ready`
 * (kind=custom) event with the totals so downstream agents can react.
 *
 * No LLM in Phase 2. The agent is the "consumer" half of the Intelligence
 * Engine; LLM enrichment lands in Phase 4 alongside pgvector.
 */

const CURSOR_KEY = "market_news_processed_until";
const DEFAULT_LOOKBACK_HOURS = 36; // first run + safety margin

interface DailySummary {
  window: { from: string; to: string };
  total_rows: number;
  by_category: Record<string, number>;
  by_region: Record<string, number>;
  by_source: Record<string, number>;
  top_tags: Array<{ tag: string; n: number }>;
  spotlight: Array<{ id: string; title: string; url: string; category: string; published_at: string | null }>;
}

async function readNewWindow(
  ctx: RunContext,
  sinceIso: string,
  toIso: string,
): Promise<DailySummary> {
  await requirePermission(ctx, "table", "market_news", "select");
  await requirePermission(ctx, "table", "sources", "select");

  const admin = getSupabaseAdmin();

  const { data: rows, error } = await admin
    .from("market_news")
    .select(
      "id, title, url, category, region, country, source_id, published_at, first_seen_at, sources(slug, name)",
    )
    .gte("first_seen_at", sinceIso)
    .lt("first_seen_at", toIso)
    .order("first_seen_at", { ascending: false })
    .limit(1000);
  if (error) throw new Error(`market_news select: ${error.message}`);

  const byCategory: Record<string, number> = {};
  const byRegion: Record<string, number> = {};
  const bySource: Record<string, number> = {};
  const spotlight: DailySummary["spotlight"] = [];
  const ids: string[] = [];

  (rows ?? []).forEach((r) => {
    const cat = String(r.category);
    byCategory[cat] = (byCategory[cat] ?? 0) + 1;
    const reg = r.region ?? r.country ?? "unknown";
    byRegion[reg] = (byRegion[reg] ?? 0) + 1;
    const src =
      ((r as unknown as { sources: { slug: string } | null }).sources?.slug) ?? "unknown";
    bySource[src] = (bySource[src] ?? 0) + 1;
    ids.push(r.id);
    if (cat !== "other" && spotlight.length < 10) {
      spotlight.push({
        id: r.id,
        title: r.title,
        url: r.url,
        category: cat,
        published_at: r.published_at ?? null,
      });
    }
  });

  let topTags: Array<{ tag: string; n: number }> = [];
  if (ids.length) {
    const { data: tagRows } = await admin
      .from("news_tags")
      .select("tag")
      .in("news_id", ids);
    const tally: Record<string, number> = {};
    (tagRows ?? []).forEach((t) => {
      tally[t.tag] = (tally[t.tag] ?? 0) + 1;
    });
    topTags = Object.entries(tally)
      .map(([tag, n]) => ({ tag, n }))
      .sort((a, b) => b.n - a.n)
      .slice(0, 15);
  }

  return {
    window: { from: sinceIso, to: toIso },
    total_rows: rows?.length ?? 0,
    by_category: byCategory,
    by_region: byRegion,
    by_source: bySource,
    top_tags: topTags,
    spotlight,
  };
}

function formatSummaryText(summary: DailySummary): string {
  const lines: string[] = [];
  lines.push(`Window ${summary.window.from} → ${summary.window.to}`);
  lines.push(`Total rows: ${summary.total_rows}`);
  if (summary.total_rows === 0) return lines.join("\n");
  lines.push("");
  lines.push("By category:");
  Object.entries(summary.by_category)
    .sort(([, a], [, b]) => b - a)
    .forEach(([k, v]) => lines.push(`  ${k}: ${v}`));
  lines.push("");
  lines.push("By region:");
  Object.entries(summary.by_region)
    .sort(([, a], [, b]) => b - a)
    .forEach(([k, v]) => lines.push(`  ${k}: ${v}`));
  if (summary.top_tags.length) {
    lines.push("");
    lines.push("Top tags: " + summary.top_tags.map((t) => `${t.tag}(${t.n})`).join(", "));
  }
  if (summary.spotlight.length) {
    lines.push("");
    lines.push("Spotlight (non-other categories):");
    summary.spotlight.forEach((s) => lines.push(`  [${s.category}] ${s.title}`));
  }
  return lines.join("\n");
}

export const marketIntelligenceAgent: AgentDefinition = {
  id: "market_intelligence",
  async run(_input, ctx) {
    const now = new Date();
    const fallback = new Date(
      now.getTime() - DEFAULT_LOOKBACK_HOURS * 3600_000,
    ).toISOString();
    const sinceIso = await getCursor(ctx.agent_id, CURSOR_KEY, fallback);
    const toIso = now.toISOString();

    logStep(ctx, {
      step: "load_window",
      status: "ok",
      meta: { since: sinceIso, to: toIso },
    });

    const summary = await readNewWindow(ctx, sinceIso, toIso);

    if (await checkMemoryWrite(ctx)) {
      ctx.memory.push({
        scope: "agent_global",
        content: `daily_summary:${toIso.slice(0, 10)}\n${formatSummaryText(summary)}`,
        importance_score: 0.7,
        meta: summary as unknown as Record<string, unknown>,
      });
    }

    await setCursor(ctx.agent_id, CURSOR_KEY, toIso);

    emitEvent(ctx, "custom", {
      kind: "intel_daily_summary_ready",
      total_rows: summary.total_rows,
      by_category: summary.by_category,
      by_region: summary.by_region,
      window: summary.window,
    });

    return { output: { summary } };
  },
};

async function checkMemoryWrite(ctx: RunContext): Promise<boolean> {
  // soft check — denials short-circuit the write but don't fail the run
  try {
    await requirePermission(ctx, "table", "ai_memory", "insert");
    return true;
  } catch {
    return false;
  }
}
