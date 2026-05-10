"use client";

import { Bed, Star } from "lucide-react";
import type { LibraryReport } from "@/types/library";

const EUR_COMPACT = new Intl.NumberFormat("en-GB", {
  notation: "compact",
  maximumFractionDigits: 1,
});

export interface FloatingHotelCardProps {
  report: LibraryReport;
  onViewFullValuation?: (id: string) => void;
}

/**
 * Bottom-right glass card that previews the currently selected report.
 * Renders TOP PROMOTE / tier badges, two KPI tiles (EST. VALUE, CAP.
 * RATE) and a primary CTA. Reads nothing from global state — receives
 * the report explicitly so it stays portable for /library/* sub-pages
 * that may surface a different selection model.
 */
export function FloatingHotelCard({
  report,
  onViewFullValuation,
}: FloatingHotelCardProps) {
  const eurValue = `${EUR_COMPACT.format(report.estValueEur)} €`.replace(
    /(\d)([A-Z])/,
    "$1$2",
  );

  return (
    <article
      className="pointer-events-auto absolute bottom-5 right-5 w-[260px] rounded-xl border border-white/40 bg-white/85 p-3 shadow-[0_16px_32px_rgba(6,44,28,0.16)] backdrop-blur-xl"
      aria-live="polite"
    >
      <header className="mb-2.5 flex items-start justify-between gap-2.5">
        <div className="min-w-0">
          <h3 className="truncate font-headline text-base font-bold leading-tight text-forest-900">
            {report.hotelName}
          </h3>
          <div className="mt-1.5 flex flex-col gap-0.5 text-[10px] font-bold text-slate-600">
            <span className="flex items-center gap-1">
              <Star size={11} aria-hidden />
              {report.starRating}* {report.classification.replace(/^\d+\*\s*/, "")}
            </span>
            <span className="flex items-center gap-1">
              <Bed size={11} aria-hidden />
              {report.rooms} Habitaciones
            </span>
          </div>
        </div>
        <div className="flex flex-col items-end gap-1">
          {report.promotion.promoted && (
            <span className="rounded bg-lime-300 px-1.5 py-0.5 text-[9px] font-black uppercase text-forest-900 shadow-sm">
              TOP PROMOTE
            </span>
          )}
          {report.tierBadge && (
            <span className="rounded border border-slate-200 bg-white px-1.5 py-0.5 text-[9px] font-black uppercase text-forest-900 shadow-sm">
              {report.tierBadge}
            </span>
          )}
        </div>
      </header>

      <dl className="mb-2.5 grid grid-cols-2 gap-2">
        <div className="rounded-lg bg-forest-700/5 px-2 py-1.5">
          <dt className="text-[9px] font-bold uppercase tracking-wider text-slate-600">
            Est. Value
          </dt>
          <dd className="font-headline text-[15px] font-black text-forest-900">
            {eurValue}
          </dd>
        </div>
        <div className="rounded-lg bg-blue-700/5 px-2 py-1.5">
          <dt className="text-[9px] font-bold uppercase tracking-wider text-slate-600">
            Cap. Rate
          </dt>
          <dd className="font-headline text-[15px] font-black text-blue-700">
            {report.capRate.toFixed(2)}%
          </dd>
        </div>
      </dl>

      <button
        type="button"
        onClick={() => onViewFullValuation?.(report.id)}
        className="w-full rounded-lg bg-forest-900 py-1.5 text-[13px] font-bold text-white transition-opacity hover:opacity-90 active:scale-[0.99]"
      >
        View Full Valuation
      </button>
    </article>
  );
}
