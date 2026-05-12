import { ExternalLink, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";
import type { PriorityFeedItem, TopSignalRow } from "@/lib/admin/ai-ops/live";

/**
 * Cross-source Priority Intelligence Feed for `/admin/ai-operations`.
 *
 * Sits at the top of the dashboard as the executive-level institutional
 * read · "what deals happened across every source in the last 7 days,
 * ranked by signal strength." Replaces the per-source drill-down for
 * the operator's first glance.
 *
 * Source-balanced upstream (lib/admin/ai-ops/live.ts caps each source
 * at 6 items before ranking) · this component just renders.
 */
export function PriorityIntelligenceFeed({
  items,
  totalPriority7d,
}: {
  items: PriorityFeedItem[];
  totalPriority7d: number;
}) {
  return (
    <section className="overflow-hidden rounded-2xl border border-slate-800/60 bg-gradient-to-b from-forest-900 to-slate-950 p-5 shadow-sm">
      <header className="mb-4 flex items-baseline justify-between">
        <div>
          <p className="font-headline text-[10px] font-extrabold uppercase tracking-[0.25em] text-lime-300/80">
            Priority Intelligence Feed · 7d
          </p>
          <p className="mt-1 font-headline text-2xl font-extrabold text-lime-300">
            {items.length}
            <span className="ml-2 font-mono text-[12px] font-normal text-slate-400">
              of {totalPriority7d} priority articles · source-balanced
            </span>
          </p>
        </div>
        <TrendingUp size={16} className="text-slate-600" aria-hidden />
      </header>
      {items.length === 0 ? (
        <p className="rounded-lg border border-slate-700/50 bg-slate-900/40 p-4 text-[12px] leading-relaxed text-slate-400">
          No priority-tier articles ingested in the last 7 days. The next
          scheduled cron run will refresh this feed.
        </p>
      ) : (
        <ul className="divide-y divide-slate-800/60">
          {items.map((item) => (
            <PriorityRow key={item.id} item={item} />
          ))}
        </ul>
      )}
    </section>
  );
}

// ── row ────────────────────────────────────────────────────────────────────

function PriorityRow({ item }: { item: PriorityFeedItem }) {
  const signalLabel = item.relevance_signal
    ? SIGNAL_LABEL[item.relevance_signal] ?? item.relevance_signal
    : null;
  return (
    <li>
      <a
        href={item.url}
        target="_blank"
        rel="noopener noreferrer"
        className="block px-1 py-4 transition-colors hover:bg-slate-900/40 sm:rounded-md sm:px-3"
      >
        {/* Chip row · signal + source + premium/public + authed + pubdate */}
        <div className="flex flex-wrap items-center gap-2">
          {signalLabel && (
            <span className="inline-flex items-center rounded bg-emerald-500/15 px-2 py-0.5 font-headline text-[10px] font-bold uppercase tracking-[0.18em] text-emerald-200 ring-1 ring-emerald-500/40">
              {signalLabel}
            </span>
          )}
          {/* Source name chip · informational only. Nesting an anchor
           *  inside the outer article-link would be invalid HTML. The
           *  per-source detail page is reachable from the integrations
           *  directory · this chip just identifies the origin. */}
          <span className="inline-flex items-center rounded bg-slate-800/60 px-2 py-0.5 font-headline text-[10px] font-bold uppercase tracking-[0.18em] text-slate-300 ring-1 ring-slate-700/60">
            {item.source_name}
          </span>
          <span
            className={cn(
              "inline-flex items-center rounded px-2 py-0.5 font-headline text-[10px] font-bold uppercase tracking-[0.18em] ring-1",
              item.premium_source
                ? "bg-violet-500/15 text-violet-200 ring-violet-500/40"
                : "bg-slate-800/60 text-slate-300 ring-slate-700/60",
            )}
          >
            {item.premium_source ? "Premium" : "Public"}
          </span>
          {item.premium_source && item.fetched_authed === true && (
            <span className="inline-flex items-center gap-1 rounded bg-emerald-500/15 px-2 py-0.5 font-headline text-[10px] font-bold uppercase tracking-[0.18em] text-emerald-200 ring-1 ring-emerald-500/40">
              <span aria-hidden>●</span> Authed
            </span>
          )}
          <span className="ml-auto flex items-center gap-2 font-mono text-[10.5px] text-slate-400">
            <span className="rounded bg-slate-900/60 px-1.5 py-0.5 text-emerald-200/80 ring-1 ring-slate-700/60">
              score {item.score}
            </span>
            <span>{formatRel(item.published_at)}</span>
            <ExternalLink size={11} className="text-slate-400" aria-hidden />
          </span>
        </div>

        {/* Title */}
        <h3 className="mt-2 font-headline text-[14px] font-extrabold leading-snug text-white">
          {item.title}
        </h3>

        {/* Body preview (from Phase 2.6 authed/anon body fetch) */}
        {item.body_preview && (
          <p className="mt-2 line-clamp-3 border-l-2 border-emerald-500/30 pl-3 text-[12px] leading-relaxed text-slate-300/90">
            {item.body_preview}
          </p>
        )}
      </a>
    </li>
  );
}

// ── top signals strip ──────────────────────────────────────────────────────

export function TopSignalsSummary({ signals }: { signals: TopSignalRow[] }) {
  if (signals.length === 0) {
    return null;
  }
  // Highlight the named institutional signals · the user explicitly
  // called out these as the canonical operator-facing categories.
  const featuredOrder = [
    "acquisition_sale",
    "refinancing_debt",
    "pipeline_expansion",
    "socimi_reit",
    "operator_agreement",
    "development",
  ];
  const indexed = new Map(signals.map((s) => [s.signal, s]));
  const featured = featuredOrder.flatMap((slug) => {
    const row = indexed.get(slug);
    return row ? [row] : [];
  });
  const others = signals.filter((s) => !featuredOrder.includes(s.signal)).slice(0, 6);
  const rendered = [...featured, ...others];

  return (
    <section className="overflow-hidden rounded-2xl border border-slate-800/60 bg-gradient-to-b from-forest-900 to-slate-950 p-5 shadow-sm">
      <header className="mb-3 flex items-baseline justify-between">
        <p className="font-headline text-[10px] font-extrabold uppercase tracking-[0.25em] text-lime-300/80">
          Top Signals · 7d
        </p>
        <p className="font-mono text-[10.5px] text-slate-400">
          {signals.reduce((acc, s) => acc + s.count, 0)} priority articles
        </p>
      </header>
      <div className="flex flex-wrap gap-2">
        {rendered.map((s) => (
          <SignalCell key={s.signal} signal={s} />
        ))}
      </div>
    </section>
  );
}

function SignalCell({ signal }: { signal: TopSignalRow }) {
  const featured = signal.count > 0;
  return (
    <div
      className={cn(
        "flex items-center gap-2 rounded-lg border px-3 py-2",
        featured
          ? "border-emerald-500/30 bg-emerald-500/5"
          : "border-slate-700/60 bg-slate-900/40",
      )}
    >
      <span className="font-headline text-[10px] font-bold uppercase tracking-[0.18em] text-slate-300">
        {signal.label}
      </span>
      <span className="font-headline text-xl font-extrabold text-lime-300">{signal.count}</span>
    </div>
  );
}

// ── shared ────────────────────────────────────────────────────────────────

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

function formatRel(iso: string | null): string {
  if (!iso) return "—";
  const ms = new Date(iso).getTime();
  if (!Number.isFinite(ms)) return "—";
  const diff = Date.now() - ms;
  if (diff < 60_000) return "just now";
  if (diff < 3600_000) return `${Math.round(diff / 60_000)}m ago`;
  if (diff < 86400_000) return `${Math.round(diff / 3600_000)}h ago`;
  return `${Math.round(diff / 86400_000)}d ago`;
}
