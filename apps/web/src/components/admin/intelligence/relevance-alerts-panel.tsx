import { ExternalLink, Siren } from "lucide-react";
import { cn } from "@/lib/utils";
import { SIGNAL_VISUAL } from "@/components/admin/dashboard/signal-tints";
import type { RelevanceAlert } from "@/lib/admin/intelligence";
import { CATEGORY_VISUAL } from "@/lib/admin/intelligence";

/**
 * High-relevance alerts — items the operator should look at first.
 * Filter target: relevanceScore >= 80 OR band in ['critical','high'].
 */
export function RelevanceAlertsPanel({ alerts }: { alerts: RelevanceAlert[] }) {
  const sorted = [...alerts].sort((a, b) => bandWeight(b.band) - bandWeight(a.band));
  return (
    <section className="overflow-hidden rounded-2xl border border-rose-500/30 bg-gradient-to-b from-forest-900 to-slate-950 shadow-sm">
      <header className="flex items-center justify-between border-b border-rose-500/20 px-5 py-3.5">
        <div className="flex items-center gap-2">
          <Siren size={14} className="text-rose-400" aria-hidden />
          <h3 className="font-headline text-[10px] font-extrabold uppercase tracking-[0.25em] text-rose-300">
            High-Relevance Alerts
          </h3>
        </div>
        <span className="font-mono text-[10.5px] text-rose-200/70">
          {sorted.length} flagged · ordered by band
        </span>
      </header>
      <ul className="divide-y divide-slate-800/60">
        {sorted.length === 0 ? (
          <li className="px-5 py-6 text-[13px] text-slate-500">No high-relevance items in the window.</li>
        ) : (
          sorted.map((a) => {
            const catVisual = CATEGORY_VISUAL[a.category];
            const catSignal = SIGNAL_VISUAL[catVisual.signal];
            const bandSignal = a.band === "critical" ? SIGNAL_VISUAL.error : SIGNAL_VISUAL.warn;
            return (
              <li key={a.id} className="px-5 py-4">
                <div className="flex flex-wrap items-center gap-2">
                  <span className={cn(
                    "inline-flex items-center gap-1.5 rounded px-2 py-0.5 font-headline text-[10px] font-bold uppercase tracking-[0.18em] ring-1",
                    bandSignal.bg, bandSignal.ring, bandSignal.text,
                  )}>
                    {a.band}
                  </span>
                  <span className={cn(
                    "inline-flex items-center gap-1 rounded px-2 py-0.5 font-headline text-[10px] font-bold uppercase tracking-[0.18em] ring-1",
                    catSignal.bg, catSignal.ring, catSignal.text,
                  )}>
                    {catVisual.label}
                  </span>
                  <span className="font-mono text-[10.5px] text-slate-500">
                    {a.sourceSlug.toUpperCase()} · {formatTs(a.publishedAt)}
                  </span>
                </div>
                <p className="mt-2 font-headline text-[14px] font-extrabold leading-snug text-white">
                  {a.title}
                </p>
                <p className="mt-1 text-[12px] leading-relaxed text-slate-300/90">{a.reason}</p>
                <a
                  href={a.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-2 inline-flex items-center gap-1 font-mono text-[10.5px] text-slate-400 underline-offset-2 hover:text-lime-300 hover:underline"
                >
                  Original source
                  <ExternalLink size={10} aria-hidden />
                </a>
              </li>
            );
          })
        )}
      </ul>
    </section>
  );
}

function bandWeight(band: RelevanceAlert["band"]): number {
  return band === "critical" ? 2 : 1;
}

function formatTs(iso: string): string {
  try {
    const d = new Date(iso);
    const pad = (n: number) => n.toString().padStart(2, "0");
    return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())} ${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())} UTC`;
  } catch {
    return iso;
  }
}
