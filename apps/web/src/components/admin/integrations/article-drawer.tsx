"use client";

import { useEffect, useMemo, useState } from "react";
import { ExternalLink, Newspaper, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { CATEGORY_VISUAL } from "@/lib/admin/intelligence";
import type { NewsCategory } from "@/lib/admin/intelligence";
import { SIGNAL_VISUAL } from "@/components/admin/dashboard/signal-tints";
import type { RecentArticle } from "@/lib/admin/integrations/live";

export type ArticleWindow = "today" | "7d" | "30d";

const WINDOW_LABEL: Record<ArticleWindow, string> = {
  today: "Last 24 Hours",
  "7d": "Last 7 Days",
  "30d": "Last 30 Days",
};

const WINDOW_DAYS: Record<ArticleWindow, number> = {
  today: 1, // rolling 24-hour window
  "7d": 7,
  "30d": 30,
};

type RelevanceFilter = "priority" | "operational" | "noise" | "all";

const RELEVANCE_FILTER_LABEL: Record<RelevanceFilter, string> = {
  priority: "Priority",
  operational: "Operational",
  noise: "Noise",
  all: "All",
};

/**
 * Human-facing label for the regex signal · keeps the chip readable.
 * Falls back to the raw signal slug when unknown.
 */
const RELEVANCE_SIGNAL_LABEL: Record<string, string> = {
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
  performance_metric: "Performance Metric",
  tourism_demand: "Demand",
  event_conference: "Event",
  awards: "Award",
  opinion_editorial: "Opinion",
  lifestyle_travel: "Lifestyle",
  marketing_pr: "Marketing",
  generic_ai: "Generic AI",
};

export interface ArticleDrawerProps {
  open: boolean;
  /** Time window being displayed · renamed from `window` to avoid
   *  shadowing the browser global inside the effect below. */
  view: ArticleWindow;
  articles: RecentArticle[];
  sourceName: string;
  onClose: () => void;
}

/**
 * Slide-in right-side drawer with the underlying articles backing an
 * interactive metric tile. Bloomberg-terminal aesthetic — dark canvas,
 * lime-300 numerals, tracked-out micro-labels, per-category status tints.
 *
 * Reuses the data already server-fetched on page render (30d window).
 * Filters client-side for today / 7d / 30d, sorts newest-first.
 *
 * Each row: title (Spanish-aware), source · pubdate, country chip,
 * category chip (status-tinted), external-link icon. Click anywhere on
 * the row to open the canonical URL in a new tab.
 */
export function ArticleDrawer({
  open,
  view,
  articles,
  sourceName,
  onClose,
}: ArticleDrawerProps) {
  // Lock body scroll + ESC to close.
  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handler);
    return () => {
      document.body.style.overflow = previous;
      document.removeEventListener("keydown", handler);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Default to Priority · institutional intelligence terminal, not a media feed.
  const [relevanceFilter, setRelevanceFilter] = useState<RelevanceFilter>("priority");

  // Window-filtered first (24h / 7d / 30d), then partition by tier so the
  // tab counts reflect the time window the user is exploring.
  const windowFiltered = useMemo(() => {
    if (!articles || articles.length === 0) return [];
    if (view === "30d") return [...articles];
    const since = Date.now() - WINDOW_DAYS[view] * 86400_000;
    return articles.filter((a) => new Date(a.first_seen_at).getTime() >= since);
  }, [articles, view]);

  const tierCounts = useMemo(() => {
    const c = { priority: 0, operational: 0, noise: 0, all: windowFiltered.length };
    for (const a of windowFiltered) c[a.relevanceTier] += 1;
    return c;
  }, [windowFiltered]);

  const filtered = useMemo(() => {
    if (relevanceFilter === "all") return windowFiltered;
    return windowFiltered.filter((a) => a.relevanceTier === relevanceFilter);
  }, [windowFiltered, relevanceFilter]);

  if (!open) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        aria-hidden
        onClick={onClose}
        className="fixed inset-0 z-[200] bg-slate-950/60 backdrop-blur-[2px]"
      />

      {/* Drawer */}
      <aside
        role="dialog"
        aria-label={`Articles · ${WINDOW_LABEL[view]} · ${sourceName}`}
        className="fixed right-0 top-0 z-[210] flex h-screen w-full max-w-[640px] flex-col border-l border-slate-800/60 bg-gradient-to-b from-forest-900 to-slate-950 shadow-2xl"
      >
        {/* Header */}
        <header className="border-b border-slate-800/60 px-5 py-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="font-headline text-[9px] font-bold uppercase tracking-[0.24em] text-lime-300/80">
                Investment Intelligence Feed · {sourceName}
              </p>
              <h2 className="mt-1 font-headline text-lg font-extrabold tracking-tight text-white">
                {WINDOW_LABEL[view]}
              </h2>
              <p className="mt-0.5 font-mono text-[11px] text-slate-400">
                {filtered.length} of {windowFiltered.length} · {RELEVANCE_FILTER_LABEL[relevanceFilter]} tier
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close drawer"
              className="rounded-md border border-slate-700 p-1.5 text-slate-300 transition-colors hover:border-slate-500 hover:text-white"
            >
              <X size={16} aria-hidden />
            </button>
          </div>

          {/* Tier tab strip · default = Priority */}
          <div className="mt-3 flex flex-wrap gap-1.5" role="tablist" aria-label="Relevance tier">
            <TierTab
              tier="priority"
              active={relevanceFilter === "priority"}
              count={tierCounts.priority}
              onClick={() => setRelevanceFilter("priority")}
            />
            <TierTab
              tier="operational"
              active={relevanceFilter === "operational"}
              count={tierCounts.operational}
              onClick={() => setRelevanceFilter("operational")}
            />
            <TierTab
              tier="noise"
              active={relevanceFilter === "noise"}
              count={tierCounts.noise}
              onClick={() => setRelevanceFilter("noise")}
            />
            <TierTab
              tier="all"
              active={relevanceFilter === "all"}
              count={tierCounts.all}
              onClick={() => setRelevanceFilter("all")}
            />
          </div>
        </header>

        {/* Body */}
        <div className="flex-1 overflow-y-auto">
          {filtered.length === 0 ? (
            <EmptyState view={view} sourceName={sourceName} relevanceFilter={relevanceFilter} />
          ) : (
            <ul className="divide-y divide-slate-800/60">
              {filtered.map((article) => (
                <ArticleRow key={article.id} article={article} showTierChip={relevanceFilter === "all"} />
              ))}
            </ul>
          )}
        </div>

        {/* Footer hint */}
        <footer className="border-t border-slate-800/60 px-5 py-3">
          <p className="flex items-center gap-1.5 font-headline text-[9px] font-bold uppercase tracking-[0.22em] text-slate-500">
            <Newspaper size={11} aria-hidden /> Default view is Priority · institutional deal-flow signal · click any row to open the source
          </p>
        </footer>
      </aside>
    </>
  );
}

// ── tier tab ────────────────────────────────────────────────────────────────

function TierTab({
  tier,
  active,
  count,
  onClick,
}: {
  tier: RelevanceFilter;
  active: boolean;
  count: number;
  onClick: () => void;
}) {
  const activeTone =
    tier === "priority"
      ? "bg-emerald-500/20 text-emerald-200 ring-emerald-500/40"
      : tier === "operational"
        ? "bg-amber-500/20 text-amber-200 ring-amber-500/40"
        : tier === "noise"
          ? "bg-rose-500/20 text-rose-200 ring-rose-500/40"
          : "bg-slate-600/30 text-slate-200 ring-slate-500/40";
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-1.5 rounded px-2.5 py-1 font-headline text-[10px] font-bold uppercase tracking-[0.18em] ring-1 transition-colors",
        active
          ? activeTone
          : "bg-slate-900/60 text-slate-400 ring-slate-700/60 hover:text-slate-200 hover:ring-slate-500/60",
      )}
    >
      {RELEVANCE_FILTER_LABEL[tier]}
      <span className={cn("font-mono text-[10px]", active ? "" : "text-slate-500")}>{count}</span>
    </button>
  );
}

// ── row ─────────────────────────────────────────────────────────────────────

function ArticleRow({ article, showTierChip }: { article: RecentArticle; showTierChip: boolean }) {
  const visual = CATEGORY_VISUAL[article.category as NewsCategory];
  const sig = SIGNAL_VISUAL[visual?.signal ?? "neutral"];
  // Authenticated body fetch is a green-flag · means the cookie jar
  // actually pulled the premium body for this row. The chip is suppressed
  // for public sources because it would be redundant noise.
  const authedChipVisible = article.premiumSource;
  // Signal chip · always visible (it's the institutional headline of the row).
  // When the regex couldn't tag a signal we suppress it so we don't print "—".
  const signalLabel = article.relevanceSignal
    ? RELEVANCE_SIGNAL_LABEL[article.relevanceSignal] ?? article.relevanceSignal
    : null;
  return (
    <li>
      <a
        href={article.url}
        target="_blank"
        rel="noopener noreferrer"
        className="block px-5 py-4 transition-colors hover:bg-slate-900/60"
      >
        {/* Top row · signal chip + tier chip (in All view) + category + pubdate + premium/authed + external-link */}
        <div className="flex flex-wrap items-center gap-2">
          {signalLabel && <SignalChip tier={article.relevanceTier} label={signalLabel} />}
          {showTierChip && <TierChip tier={article.relevanceTier} />}
          <span
            className={cn(
              "inline-flex items-center gap-1.5 rounded px-2 py-0.5 font-headline text-[10px] font-bold uppercase tracking-[0.18em] ring-1",
              sig.bg, sig.ring, sig.text,
            )}
          >
            <span aria-hidden className={sig.text}>{sig.dot}</span>
            {visual?.label ?? article.category}
          </span>
          <span
            className={cn(
              "inline-flex items-center rounded px-2 py-0.5 font-headline text-[10px] font-bold uppercase tracking-[0.18em] ring-1",
              article.premiumSource
                ? "bg-violet-500/15 text-violet-200 ring-violet-500/40"
                : "bg-slate-800/60 text-slate-300 ring-slate-700/60",
            )}
          >
            {article.premiumSource ? "Premium" : "Public"}
          </span>
          {authedChipVisible && article.fetchedAuthed === true && (
            <span className="inline-flex items-center gap-1 rounded bg-emerald-500/15 px-2 py-0.5 font-headline text-[10px] font-bold uppercase tracking-[0.18em] text-emerald-200 ring-1 ring-emerald-500/40">
              <span aria-hidden>●</span> Authed Fetch
            </span>
          )}
          {authedChipVisible && article.fetchedAuthed === false && (
            <span className="inline-flex items-center gap-1 rounded bg-amber-500/15 px-2 py-0.5 font-headline text-[10px] font-bold uppercase tracking-[0.18em] text-amber-200 ring-1 ring-amber-500/40">
              <span aria-hidden>●</span> Anon Body
            </span>
          )}
          {article.country && (
            <span className="inline-flex items-center rounded bg-slate-800/60 px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.18em] text-slate-300 ring-1 ring-slate-700/60">
              {article.country}
            </span>
          )}
          <span className="font-mono text-[10.5px] text-slate-400">
            {formatTs(article.published_at)}
          </span>
          <span className="ml-auto inline-flex items-center text-slate-400">
            <ExternalLink size={12} aria-hidden />
          </span>
        </div>

        {/* Title */}
        <h3 className="mt-2 font-headline text-[14px] font-extrabold leading-snug text-white">
          {article.title}
        </h3>

        {/* Summary (RSS) */}
        {article.summary && (
          <p className="mt-1.5 line-clamp-2 text-[12px] leading-relaxed text-slate-300/90">
            {article.summary}
          </p>
        )}

        {/* Body preview (Phase 2.6 authed/anon body fetch · richer than summary) */}
        {article.bodyPreview && article.bodyPreview !== article.summary && (
          <p className="mt-2 line-clamp-3 border-l-2 border-slate-700/60 pl-3 text-[11.5px] leading-relaxed text-slate-400">
            {article.bodyPreview}
          </p>
        )}

        {/* Source URL truncated */}
        <p className="mt-2 font-mono text-[10.5px] text-slate-500">
          {truncateUrl(article.url, 84)}
        </p>
      </a>
    </li>
  );
}

// ── signal + tier chips ─────────────────────────────────────────────────────

function SignalChip({
  tier,
  label,
}: {
  tier: "priority" | "operational" | "noise";
  label: string;
}) {
  const tone =
    tier === "priority"
      ? "bg-emerald-500/15 text-emerald-200 ring-emerald-500/40"
      : tier === "operational"
        ? "bg-amber-500/15 text-amber-200 ring-amber-500/40"
        : "bg-rose-500/15 text-rose-200 ring-rose-500/40";
  return (
    <span
      className={cn(
        "inline-flex items-center rounded px-2 py-0.5 font-headline text-[10px] font-bold uppercase tracking-[0.18em] ring-1",
        tone,
      )}
    >
      {label}
    </span>
  );
}

function TierChip({ tier }: { tier: "priority" | "operational" | "noise" }) {
  const tone =
    tier === "priority"
      ? "bg-emerald-500/10 text-emerald-300 ring-emerald-500/30"
      : tier === "operational"
        ? "bg-amber-500/10 text-amber-300 ring-amber-500/30"
        : "bg-rose-500/10 text-rose-300 ring-rose-500/30";
  return (
    <span
      className={cn(
        "inline-flex items-center rounded px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-[0.18em] ring-1",
        tone,
      )}
    >
      {tier}
    </span>
  );
}

// ── empty state ─────────────────────────────────────────────────────────────

function EmptyState({
  view,
  sourceName,
  relevanceFilter,
}: {
  view: ArticleWindow;
  sourceName: string;
  relevanceFilter: RelevanceFilter;
}) {
  const isFilteredOut = relevanceFilter !== "all";
  return (
    <div className="flex h-full flex-col items-center justify-center gap-3 px-5 py-12 text-center">
      <Newspaper size={28} className="text-slate-600" aria-hidden />
      <p className="font-headline text-sm font-extrabold uppercase tracking-[0.22em] text-slate-300">
        {isFilteredOut ? `No ${RELEVANCE_FILTER_LABEL[relevanceFilter].toLowerCase()} articles` : "No articles"}
      </p>
      <p className="max-w-xs text-[12.5px] leading-relaxed text-slate-500">
        {isFilteredOut
          ? `No ${RELEVANCE_FILTER_LABEL[relevanceFilter].toLowerCase()}-tier signal from ${sourceName} in the ${WINDOW_LABEL[view].toLowerCase()} window. Switch to "All" to see what was ingested.`
          : `No articles ingested for ${sourceName} in the ${WINDOW_LABEL[view].toLowerCase()} window. The next scheduled ingestion run will refresh this view.`}
      </p>
    </div>
  );
}

// ── helpers ─────────────────────────────────────────────────────────────────

function formatTs(iso: string): string {
  try {
    const d = new Date(iso);
    const pad = (n: number) => n.toString().padStart(2, "0");
    return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())} ${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())} UTC`;
  } catch {
    return iso;
  }
}

function truncateUrl(url: string, max: number): string {
  if (!url) return "";
  if (url.length <= max) return url;
  return `${url.slice(0, max - 1)}…`;
}
