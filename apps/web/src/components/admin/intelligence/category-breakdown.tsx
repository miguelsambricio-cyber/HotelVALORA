import { cn } from "@/lib/utils";
import { SIGNAL_VISUAL } from "@/components/admin/dashboard/signal-tints";
import type { CategoryBreakdownRow } from "@/lib/admin/intelligence";
import { CATEGORY_VISUAL } from "@/lib/admin/intelligence";

/**
 * Category-breakdown bar chart — distribution of last 7d articles by
 * news_category. The institutional view of "what's the market doing"
 * — Bloomberg-style horizontal bars with category-tinted rails.
 */
export function CategoryBreakdown({ rows }: { rows: CategoryBreakdownRow[] }) {
  const sorted = [...rows].sort((a, b) => b.count - a.count);
  const maxCount = sorted.length === 0 ? 1 : sorted[0].count;
  const total = sorted.reduce((acc, r) => acc + r.count, 0);

  return (
    <section className="overflow-hidden rounded-2xl border border-slate-800/60 bg-gradient-to-b from-forest-900 to-slate-950 shadow-sm">
      <header className="flex items-center justify-between border-b border-slate-800/60 px-5 py-3.5">
        <h3 className="font-headline text-[10px] font-extrabold uppercase tracking-[0.25em] text-slate-400">
          Category Distribution · 7d
        </h3>
        <span className="font-mono text-[10.5px] text-slate-500">{total} items</span>
      </header>
      <div className="space-y-2 p-5">
        {sorted.map((row) => {
          const visual = CATEGORY_VISUAL[row.category];
          const signal = SIGNAL_VISUAL[visual.signal];
          const widthPct = (row.count / maxCount) * 100;
          return (
            <div key={row.category} className="flex items-center gap-3">
              <span className="w-32 shrink-0 font-headline text-[10.5px] font-bold uppercase tracking-[0.18em] text-slate-300">
                {visual.label}
              </span>
              <div className="relative h-2 flex-1 overflow-hidden rounded bg-slate-800/40">
                <span
                  aria-hidden
                  className={cn("absolute inset-y-0 left-0", signal.rail)}
                  style={{ width: `${widthPct}%` }}
                />
              </div>
              <span className="w-14 text-right font-mono text-[11px] text-lime-300">
                {row.count}
              </span>
              <span className="w-12 text-right font-mono text-[10.5px] text-slate-500">
                {row.share.toFixed(1)}%
              </span>
            </div>
          );
        })}
      </div>
    </section>
  );
}
