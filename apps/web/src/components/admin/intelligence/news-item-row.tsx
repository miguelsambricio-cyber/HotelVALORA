import { ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";
import { SIGNAL_VISUAL } from "@/components/admin/dashboard/signal-tints";
import type { NewsItem } from "@/lib/admin/intelligence";
import { CATEGORY_VISUAL } from "@/lib/admin/intelligence";

/**
 * One news row in the institutional feed. Surfaces every field the
 * Market Intelligence Agent extracts:
 *   - title · source · publication date
 *   - country · market · category · tags
 *   - hotel segment · brand affiliation
 *   - entity mentions (chip-rendered with role)
 *   - relevance band
 *   - original source URL (preserved verbatim for institutional traceability)
 */
export function NewsItemRow({ item }: { item: NewsItem }) {
  const categoryVisual = CATEGORY_VISUAL[item.category];
  const catSignal = SIGNAL_VISUAL[categoryVisual.signal];
  const relSignal = relevanceSignal(item.relevanceBand);

  return (
    <article className="group rounded-xl border border-slate-800/60 bg-slate-900/40 p-5 transition-colors hover:border-lime-300/40">
      <header className="flex flex-wrap items-center gap-2">
        <span className={cn(
          "inline-flex items-center gap-1.5 rounded px-2 py-0.5 font-headline text-[10px] font-bold uppercase tracking-[0.18em] ring-1",
          catSignal.bg, catSignal.ring, catSignal.text,
        )}>
          <span aria-hidden className={catSignal.text}>{catSignal.dot}</span>
          {categoryVisual.label}
        </span>
        <span className="font-mono text-[10.5px] text-slate-500">
          {item.sourceSlug.toUpperCase()}
        </span>
        <span className="font-mono text-[10.5px] text-slate-500">·</span>
        <time className="font-mono text-[10.5px] text-slate-400">{formatTs(item.publishedAt)}</time>
        {item.country && (
          <>
            <span className="font-mono text-[10.5px] text-slate-500">·</span>
            <span className="font-mono text-[10.5px] text-slate-300">{item.country}</span>
          </>
        )}
        {item.market && (
          <>
            <span className="font-mono text-[10.5px] text-slate-500">·</span>
            <span className="font-mono text-[10.5px] text-slate-300">{item.market}</span>
          </>
        )}
        <span className="ml-auto inline-flex items-center gap-1.5">
          <span className={cn("font-headline text-[10px] font-bold uppercase tracking-[0.18em]", relSignal.text)}>
            Relevance {item.relevanceScore}
          </span>
          <span className={cn("rounded px-2 py-0.5 font-headline text-[9.5px] font-bold uppercase tracking-[0.18em] ring-1", relSignal.bg, relSignal.ring, relSignal.text)}>
            {item.relevanceBand}
          </span>
        </span>
      </header>

      <h4 className="mt-2.5 font-headline text-base font-extrabold leading-snug tracking-tight text-white">
        {item.title}
      </h4>

      {item.summary && (
        <p className="mt-2 text-[12.5px] leading-relaxed text-slate-300/90">{item.summary}</p>
      )}

      {/* Entities + tags */}
      <div className="mt-3 flex flex-wrap items-center gap-1.5">
        {item.entities.slice(0, 6).map((e, i) => (
          <span
            key={i}
            className="inline-flex items-center gap-1.5 rounded bg-slate-800/60 px-2 py-0.5 font-mono text-[10.5px] text-slate-300 ring-1 ring-slate-700/60"
            title={`${e.kind} · ${e.role} · confidence ${(e.confidence * 100).toFixed(0)}%`}
          >
            <span className="font-headline text-[9px] font-bold uppercase tracking-[0.18em] text-slate-500">
              {e.role.replace("_", " ")}
            </span>
            {e.rawMention}
          </span>
        ))}
        {item.hotelSegment && (
          <span className="inline-flex items-center rounded bg-forest-900/60 px-2 py-0.5 font-headline text-[10px] font-bold uppercase tracking-[0.18em] text-lime-300 ring-1 ring-lime-300/20">
            {hotelSegmentLabel(item.hotelSegment)}
          </span>
        )}
        {item.brandAffiliation !== "unknown" && (
          <span className="inline-flex items-center rounded bg-slate-800/40 px-2 py-0.5 font-headline text-[10px] font-bold uppercase tracking-[0.18em] text-slate-300 ring-1 ring-slate-700/60">
            {item.brandAffiliation.replace("_", " ")}
          </span>
        )}
        {item.tags.slice(0, 6).map((tag, i) => (
          <span
            key={i}
            className="inline-flex items-center rounded bg-slate-800/30 px-1.5 py-0.5 font-mono text-[10px] text-slate-400 ring-1 ring-slate-800/60"
          >
            #{tag}
          </span>
        ))}
      </div>

      {/* Original source URL — preserved for institutional traceability */}
      <footer className="mt-4 flex items-center justify-between border-t border-slate-800/60 pt-3">
        <a
          href={item.url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 font-mono text-[10.5px] text-slate-400 underline-offset-2 hover:text-lime-300 hover:underline"
          title="Original source URL (preserved verbatim)"
        >
          {truncateUrl(item.url, 72)}
          <ExternalLink size={12} aria-hidden />
        </a>
        <span className="font-headline text-[9px] font-bold uppercase tracking-[0.22em] text-slate-500">
          {item.language.toUpperCase()} · Verified Trace
        </span>
      </footer>
    </article>
  );
}

// ── helpers ─────────────────────────────────────────────────────────────────

function relevanceSignal(band: NewsItem["relevanceBand"]) {
  if (band === "critical") return SIGNAL_VISUAL.error;
  if (band === "high")     return SIGNAL_VISUAL.warn;
  if (band === "standard") return SIGNAL_VISUAL.ok;
  return SIGNAL_VISUAL.neutral;
}

function hotelSegmentLabel(segment: NonNullable<NewsItem["hotelSegment"]>): string {
  const map: Record<NonNullable<NewsItem["hotelSegment"]>, string> = {
    luxury: "Luxury",
    upper_upscale: "Upper Upscale",
    upscale: "Upscale",
    upper_midscale: "Upper Midscale",
    midscale: "Midscale",
    economy: "Economy",
    lifestyle: "Lifestyle",
    resort: "Resort",
    boutique: "Boutique",
    mixed_use: "Mixed-Use",
    serviced_apartments: "Serviced Apt",
    unknown: "Unknown",
  };
  return map[segment];
}

function truncateUrl(url: string, max: number): string {
  if (url.length <= max) return url;
  return `${url.slice(0, max - 1)}…`;
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
