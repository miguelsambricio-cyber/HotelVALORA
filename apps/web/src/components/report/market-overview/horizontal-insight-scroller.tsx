"use client";

import {
  Children,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

export interface HorizontalInsightScrollerProps {
  children: ReactNode;
  /**
   * Cards visible per page on desktop (lg+). Defaults to 2 — the
   * institutional dashboard pattern (2 visible + 2 hidden, paged).
   */
  visibleCount?: number;
  className?: string;
}

/**
 * Three modes driven by CSS + a single React `--page` state:
 *
 *   mobile / tablet:  free horizontal swipe with snap (overflow-x-auto).
 *   desktop (lg+):    paged carousel — viewport hides overflow, the track
 *                     translates by exactly `100% + gap` per click on the
 *                     floating arrows. Each click moves N slides at once.
 *   print:            track collapses to a 2 × 2 grid; arrows are hidden.
 *
 * Implementation lives in `globals.css` under `.market-carousel-*` so the
 * mode switch is media-query driven (no runtime resize listeners). The
 * track reads its X-offset from the CSS custom property `--page`.
 */
export function HorizontalInsightScroller({
  children,
  visibleCount = 2,
  className,
}: HorizontalInsightScrollerProps) {
  const items = Children.toArray(children);
  const totalPages = Math.max(1, Math.ceil(items.length / visibleCount));
  const [page, setPage] = useState(0);

  const canPrev = page > 0;
  const canNext = page < totalPages - 1;

  return (
    <div className={cn("relative", className)}>
      <div className="market-carousel-viewport">
        <div
          className="market-carousel-track"
          style={{ "--page": page } as CSSProperties}
        >
          {items.map((child, idx) => (
            <div key={idx} className="market-carousel-slide">
              {child}
            </div>
          ))}
        </div>
      </div>

      {/* Floating arrows — desktop only, hidden in print */}
      <button
        type="button"
        aria-label="Previous insights"
        onClick={() => setPage((p) => Math.max(0, p - 1))}
        disabled={!canPrev}
        className={cn(
          "hidden lg:flex print:hidden",
          "absolute top-1/2 -translate-y-1/2 -left-5 z-20",
          "h-10 w-10 rounded-full bg-white border border-slate-200 shadow-md",
          "items-center justify-center text-forest-900",
          "hover:bg-slate-50 active:scale-95 transition-all",
          "disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-white",
        )}
      >
        <ChevronLeft size={20} />
      </button>

      <button
        type="button"
        aria-label="Next insights"
        onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
        disabled={!canNext}
        className={cn(
          "hidden lg:flex print:hidden",
          "absolute top-1/2 -translate-y-1/2 -right-5 z-20",
          "h-10 w-10 rounded-full bg-white border border-slate-200 shadow-md",
          "items-center justify-center text-forest-900",
          "hover:bg-slate-50 active:scale-95 transition-all",
          "disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-white",
        )}
      >
        <ChevronRight size={20} />
      </button>
    </div>
  );
}
