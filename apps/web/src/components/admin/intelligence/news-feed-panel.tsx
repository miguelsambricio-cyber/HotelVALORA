import { Newspaper } from "lucide-react";
import type { NewsItem } from "@/lib/admin/intelligence";
import { NewsItemRow } from "./news-item-row";

/**
 * Vertical feed of recent news items, ordered by relevanceScore desc.
 * Renders inside the institutional terminal — dark-canvas card.
 */
export function NewsFeedPanel({ items }: { items: NewsItem[] }) {
  const sorted = [...items].sort((a, b) => b.relevanceScore - a.relevanceScore);
  return (
    <section className="overflow-hidden rounded-2xl border border-slate-800/60 bg-gradient-to-b from-forest-900 to-slate-950 shadow-sm">
      <header className="flex items-center justify-between border-b border-slate-800/60 px-5 py-3.5">
        <div className="flex items-center gap-2">
          <Newspaper size={14} className="text-slate-400" aria-hidden />
          <h3 className="font-headline text-[10px] font-extrabold uppercase tracking-[0.25em] text-slate-400">
            Latest Hospitality Intelligence
          </h3>
        </div>
        <span className="font-mono text-[10.5px] text-slate-500">
          {sorted.length} items · ordered by relevance
        </span>
      </header>
      <div className="space-y-3 p-4">
        {sorted.length === 0 ? (
          <p className="px-2 py-8 text-center text-[13px] text-slate-500">
            No ingested news in the last 7 days.
          </p>
        ) : (
          sorted.map((item) => <NewsItemRow key={item.id} item={item} />)
        )}
      </div>
    </section>
  );
}
