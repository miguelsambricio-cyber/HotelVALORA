"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import type { RecentArticle } from "@/lib/admin/integrations/live";
import { ArticleDrawer, type ArticleWindow } from "./article-drawer";

export interface InteractiveMetricsProps {
  sourceName: string;
  articlesToday: number;
  articles7d: number;
  articles30d: number;
  runsSuccess7d: number;
  runsFailed7d: number;
  /** All articles in the 30d window · the drawer filters client-side. */
  recentArticles: RecentArticle[];
}

/**
 * Replaces the static four-Strip telemetry block on the integration
 * detail page with three CLICKABLE article-count tiles + one read-only
 * runs tile. Clicking an article tile opens a Bloomberg-style drawer
 * listing the underlying articles for that time window.
 *
 * Data flow: the parent Server Component pre-fetches the 30d article
 * set and passes it down. The drawer filters / sorts entirely client-
 * side — no extra round-trip when switching windows.
 */
export function InteractiveMetrics({
  sourceName,
  articlesToday,
  articles7d,
  articles30d,
  runsSuccess7d,
  runsFailed7d,
  recentArticles,
}: InteractiveMetricsProps) {
  const [activeWindow, setActiveWindow] = useState<ArticleWindow | null>(null);
  return (
    <>
      <dl className="mt-7 grid grid-cols-2 gap-y-4 border-t border-slate-800/60 pt-5 sm:grid-cols-4">
        <MetricButton
          label="Articles · Today"
          value={String(articlesToday)}
          disabled={articles30d === 0}
          onClick={() => setActiveWindow("today")}
        />
        <MetricButton
          label="Articles · 7 Days"
          value={String(articles7d)}
          disabled={articles30d === 0}
          onClick={() => setActiveWindow("7d")}
        />
        <MetricButton
          label="Articles · 30 Days"
          value={String(articles30d)}
          disabled={articles30d === 0}
          onClick={() => setActiveWindow("30d")}
        />
        <Strip
          label="Runs OK / Failed · 7d"
          value={`${runsSuccess7d} / ${runsFailed7d}`}
        />
      </dl>

      <ArticleDrawer
        open={activeWindow !== null}
        view={activeWindow ?? "30d"}
        articles={recentArticles}
        sourceName={sourceName}
        onClose={() => setActiveWindow(null)}
      />
    </>
  );
}

// ── tile primitives ────────────────────────────────────────────────────────

function MetricButton({
  label,
  value,
  onClick,
  disabled,
}: {
  label: string;
  value: string;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "group flex flex-col text-left transition-colors",
        disabled
          ? "cursor-default opacity-70"
          : "cursor-pointer hover:bg-slate-900/40 rounded-md -mx-1.5 px-1.5",
      )}
      aria-label={`Open ${label} drawer`}
    >
      <dt className="font-headline text-[9px] font-bold uppercase tracking-[0.22em] text-slate-500 group-enabled:group-hover:text-slate-300">
        {label}
      </dt>
      <dd className="mt-1 font-headline text-sm font-extrabold text-lime-300">
        {value}
        {!disabled && (
          <span aria-hidden className="ml-1.5 text-[11px] font-mono text-slate-500 group-hover:text-lime-200">
            ›
          </span>
        )}
      </dd>
    </button>
  );
}

function Strip({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="font-headline text-[9px] font-bold uppercase tracking-[0.22em] text-slate-500">
        {label}
      </dt>
      <dd className="mt-1 font-headline text-sm font-extrabold text-lime-300">
        {value}
      </dd>
    </div>
  );
}
