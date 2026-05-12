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
  today: "Today",
  "7d": "Last 7 Days",
  "30d": "Last 30 Days",
};

const WINDOW_DAYS: Record<ArticleWindow, number> = {
  today: 0,
  "7d": 7,
  "30d": 30,
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

  const filtered = useMemo(() => {
    if (!articles || articles.length === 0) return [];
    if (view === "30d") return [...articles];
    if (view === "today") {
      const startToday = new Date(new Date().setUTCHours(0, 0, 0, 0)).getTime();
      return articles.filter(
        (a) => new Date(a.first_seen_at).getTime() >= startToday,
      );
    }
    const since = Date.now() - WINDOW_DAYS[view] * 86400_000;
    return articles.filter((a) => new Date(a.first_seen_at).getTime() >= since);
  }, [articles, view]);

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
        <header className="flex items-center justify-between gap-3 border-b border-slate-800/60 px-5 py-4">
          <div className="min-w-0">
            <p className="font-headline text-[9px] font-bold uppercase tracking-[0.24em] text-lime-300/80">
              Article Feed · {sourceName}
            </p>
            <h2 className="mt-1 font-headline text-lg font-extrabold tracking-tight text-white">
              {WINDOW_LABEL[view]}
            </h2>
            <p className="mt-0.5 font-mono text-[11px] text-slate-400">
              {filtered.length} of {articles.length} · sorted newest first
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
        </header>

        {/* Body */}
        <div className="flex-1 overflow-y-auto">
          {filtered.length === 0 ? (
            <EmptyState view={view} sourceName={sourceName} />
          ) : (
            <ul className="divide-y divide-slate-800/60">
              {filtered.map((article) => (
                <ArticleRow key={article.id} article={article} />
              ))}
            </ul>
          )}
        </div>

        {/* Footer hint */}
        <footer className="border-t border-slate-800/60 px-5 py-3">
          <p className="flex items-center gap-1.5 font-headline text-[9px] font-bold uppercase tracking-[0.22em] text-slate-500">
            <Newspaper size={11} aria-hidden /> Click any row to open the original article in a new tab
          </p>
        </footer>
      </aside>
    </>
  );
}

// ── row ─────────────────────────────────────────────────────────────────────

function ArticleRow({ article }: { article: RecentArticle }) {
  const visual = CATEGORY_VISUAL[article.category as NewsCategory];
  const sig = SIGNAL_VISUAL[visual?.signal ?? "neutral"];
  return (
    <li>
      <a
        href={article.url}
        target="_blank"
        rel="noopener noreferrer"
        className="block px-5 py-4 transition-colors hover:bg-slate-900/60"
      >
        {/* Top row · category chip + pubdate + external-link icon */}
        <div className="flex flex-wrap items-center gap-2">
          <span
            className={cn(
              "inline-flex items-center gap-1.5 rounded px-2 py-0.5 font-headline text-[10px] font-bold uppercase tracking-[0.18em] ring-1",
              sig.bg, sig.ring, sig.text,
            )}
          >
            <span aria-hidden className={sig.text}>{sig.dot}</span>
            {visual?.label ?? article.category}
          </span>
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

        {/* Summary */}
        {article.summary && (
          <p className="mt-1.5 line-clamp-2 text-[12px] leading-relaxed text-slate-300/90">
            {article.summary}
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

// ── empty state ─────────────────────────────────────────────────────────────

function EmptyState({ view, sourceName }: { view: ArticleWindow; sourceName: string }) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-3 px-5 py-12 text-center">
      <Newspaper size={28} className="text-slate-600" aria-hidden />
      <p className="font-headline text-sm font-extrabold uppercase tracking-[0.22em] text-slate-300">
        No articles
      </p>
      <p className="max-w-xs text-[12.5px] leading-relaxed text-slate-500">
        No articles ingested for {sourceName} in the {WINDOW_LABEL[view].toLowerCase()} window.
        The next scheduled ingestion run will refresh this view.
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
