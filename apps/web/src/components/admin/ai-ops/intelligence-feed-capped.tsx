import { ExternalLink, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";
import type { PriorityFeedItem } from "@/lib/admin/ai-ops/live";

/**
 * Section 04 · Priority Intelligence Feed (capped).
 *
 * Editorial wrapper around the priority feed: at most 5 articles render
 * above the fold; the remainder lives in a scrollable region below with
 * a thin slate divider. The signal taxonomy explicitly prioritised by
 * the operator — M&A · debt/refi · pipeline · luxury hospitality ·
 * operator movements — is already applied upstream in
 * `lib/admin/ai-ops/live.ts` (source-balanced + signal-ranked).
 *
 * Each row carries: title · source · timestamp · relevance tag · linked
 * agent attribution. The detail panel is reached via the external link
 * (article URL); per-source drill-down sits in the integrations registry.
 */
export function IntelligenceFeedCapped({
  items,
  totalPriority7d,
  visible = 5,
}: {
  items: PriorityFeedItem[];
  totalPriority7d: number;
  /** Number of rows above the fold before the scrollable area kicks in. */
  visible?: number;
}) {
  const top = items.slice(0, visible);
  const rest = items.slice(visible);
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
        <>
          <ul className="divide-y divide-slate-800/60">
            {top.map((item) => (
              <PriorityRow key={item.id} item={item} />
            ))}
          </ul>
          {rest.length > 0 && (
            <div className="mt-2 border-t border-slate-800/60 pt-2">
              <p className="mb-2 font-headline text-[9px] font-bold uppercase tracking-[0.22em] text-slate-500">
                Backlog · {rest.length} more · scroll
              </p>
              <div className="max-h-[28rem] overflow-y-auto rounded-md bg-slate-950/40 ring-1 ring-inset ring-slate-800/60">
                <ul className="divide-y divide-slate-800/60">
                  {rest.map((item) => (
                    <PriorityRow key={item.id} item={item} />
                  ))}
                </ul>
              </div>
            </div>
          )}
        </>
      )}
    </section>
  );
}

function PriorityRow({ item }: { item: PriorityFeedItem }) {
  const signalLabel = item.relevance_signal
    ? SIGNAL_LABEL[item.relevance_signal] ?? item.relevance_signal
    : null;
  // Attribute the article to the agent that owns the source's ingestion
  // path. For now every market_news row is owned by the Market
  // Intelligence Agent (the only Tier-1 agent that writes to that table).
  const agentAttribution = "Market Intelligence Agent";
  return (
    <li>
      <a
        href={item.url}
        target="_blank"
        rel="noopener noreferrer"
        className="block px-1 py-3.5 transition-colors hover:bg-slate-900/40 sm:rounded-md sm:px-3"
      >
        <div className="flex flex-wrap items-center gap-2">
          {signalLabel && (
            <span className="inline-flex items-center rounded bg-emerald-500/15 px-2 py-0.5 font-headline text-[10px] font-bold uppercase tracking-[0.18em] text-emerald-200 ring-1 ring-emerald-500/40">
              {signalLabel}
            </span>
          )}
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
          <span className="inline-flex items-center rounded bg-sky-500/10 px-2 py-0.5 font-headline text-[10px] font-bold uppercase tracking-[0.18em] text-sky-200 ring-1 ring-sky-500/30">
            {agentAttribution}
          </span>
          <span className="ml-auto flex items-center gap-2 font-mono text-[10.5px] text-slate-400">
            <span className="rounded bg-slate-900/60 px-1.5 py-0.5 text-emerald-200/80 ring-1 ring-slate-700/60">
              score {item.score}
            </span>
            <span>{formatRel(item.published_at)}</span>
            <ExternalLink size={11} className="text-slate-400" aria-hidden />
          </span>
        </div>
        <h3 className="mt-2 font-headline text-[14px] font-extrabold leading-snug text-white">
          {item.title}
        </h3>
        {item.body_preview && (
          <p className="mt-2 line-clamp-2 border-l-2 border-emerald-500/30 pl-3 text-[12px] leading-relaxed text-slate-300/90">
            {item.body_preview}
          </p>
        )}
      </a>
    </li>
  );
}

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
