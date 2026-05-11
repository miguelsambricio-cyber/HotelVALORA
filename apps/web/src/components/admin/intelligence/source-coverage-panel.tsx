import Link from "next/link";
import { cn } from "@/lib/utils";
import { SIGNAL_VISUAL } from "@/components/admin/dashboard/signal-tints";
import type { SourceCoverageRow } from "@/lib/admin/intelligence";

/**
 * Source-coverage matrix — one row per source the Market Intelligence
 * Agent reads from, with article counts + last run + status. Links each
 * row through to the integration detail page.
 */
export function SourceCoveragePanel({ rows }: { rows: SourceCoverageRow[] }) {
  return (
    <section className="overflow-hidden rounded-2xl border border-slate-800/60 bg-gradient-to-b from-forest-900 to-slate-950 shadow-sm">
      <header className="flex items-center justify-between border-b border-slate-800/60 px-5 py-3.5">
        <h3 className="font-headline text-[10px] font-extrabold uppercase tracking-[0.25em] text-slate-400">
          Source Coverage
        </h3>
        <span className="font-mono text-[10.5px] text-slate-500">{rows.length} sources</span>
      </header>
      <div className="overflow-x-auto">
        <table className="w-full text-left font-mono text-[11.5px]">
          <thead>
            <tr className="text-slate-500">
              <th className="px-5 py-2 font-headline text-[9px] font-bold uppercase tracking-[0.22em]">Source</th>
              <th className="px-3 py-2 font-headline text-[9px] font-bold uppercase tracking-[0.22em]">Region</th>
              <th className="px-3 py-2 text-right font-headline text-[9px] font-bold uppercase tracking-[0.22em]">Today</th>
              <th className="px-3 py-2 text-right font-headline text-[9px] font-bold uppercase tracking-[0.22em]">7d</th>
              <th className="px-3 py-2 font-headline text-[9px] font-bold uppercase tracking-[0.22em]">Last Run</th>
              <th className="px-5 py-2 font-headline text-[9px] font-bold uppercase tracking-[0.22em]">Status</th>
            </tr>
          </thead>
          <tbody className="text-slate-300">
            {rows.map((r) => {
              const sig = SIGNAL_VISUAL[r.signal];
              return (
                <tr key={r.sourceSlug} className="border-t border-slate-800/40">
                  <td className="px-5 py-2.5">
                    <Link
                      href={`/user/admin/integrations/${r.sourceSlug}`}
                      className="font-headline text-[12.5px] font-extrabold text-white hover:text-lime-300"
                    >
                      {r.sourceName}
                    </Link>
                    <p className="font-mono text-[10px] text-slate-500">{r.sourceSlug}</p>
                  </td>
                  <td className="px-3 py-2.5 text-slate-300">{r.region}</td>
                  <td className="px-3 py-2.5 text-right text-lime-300">{r.articlesToday}</td>
                  <td className="px-3 py-2.5 text-right text-lime-300">{r.articles7d}</td>
                  <td className="px-3 py-2.5 text-slate-400">{formatRelativeUtc(r.lastRunAt)}</td>
                  <td className="px-5 py-2.5">
                    <span className={cn(
                      "inline-flex items-center gap-1.5 rounded px-2 py-0.5 font-headline text-[10px] font-bold uppercase tracking-[0.18em] ring-1",
                      sig.bg, sig.ring, sig.text,
                    )}>
                      <span aria-hidden className={cn(sig.text, sig.pulse && "animate-pulse")}>{sig.dot}</span>
                      {r.statusLabel}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function formatRelativeUtc(iso: string | null): string {
  if (!iso) return "Never";
  const ts = new Date(iso).getTime();
  if (!Number.isFinite(ts)) return "Never";
  const diffMs = Date.now() - ts;
  const mins = Math.round(diffMs / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.round(mins / 60);
  if (hours < 36) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  return `${days}d ago`;
}
