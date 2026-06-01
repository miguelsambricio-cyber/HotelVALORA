"use client";

import { Star, ArrowRight } from "lucide-react";
import type { CompetitorHotel } from "@/types/compset";
import { cn } from "@/lib/utils";

/**
 * Compact clickable tile rendered under "Recommended nearby assets"
 * in the `/compset` asset-selection panel. Mirrors the geometry of
 * <CompetitorCard> (same width + KPI strip family) but is a single
 * button-like surface that triggers `onSelect(hotel)` on click.
 *
 * The card is deliberately denser than its CompetitorCard sibling:
 * no add/remove control · the entire surface is the click target ·
 * a subtle "→" affordance signals navigation, not selection-in-place.
 */

interface RecommendedAssetCardProps {
  hotel: CompetitorHotel;
  onSelect: (hotel: CompetitorHotel) => void;
  /** True when the matching map pin is inspected · card glows + lifts. */
  isInspected?: boolean;
}

export function RecommendedAssetCard({
  hotel,
  onSelect,
  isInspected = false,
}: RecommendedAssetCardProps) {
  return (
    <button
      type="button"
      onClick={() => onSelect(hotel)}
      data-asset-card-id={hotel.id}
      aria-label={
        isInspected
          ? `Confirmar selección de ${hotel.name}`
          : `Inspeccionar ${hotel.name}`
      }
      aria-pressed={isInspected}
      className={cn(
        "w-full text-left rounded-xl p-2.5 border shadow-sm transition-all group",
        isInspected
          ? "bg-forest-900/[0.04] border-forest-900 shadow-md ring-1 ring-forest-900/20"
          : "bg-white border-slate-200/80 hover:border-forest-900/40 hover:shadow-md"
      )}
    >
      {/* Header row · name + arrow */}
      <div className="flex items-start justify-between gap-2 mb-1.5">
        <div className="min-w-0 flex-1">
          <p className="text-[12px] font-bold text-slate-800 truncate leading-tight">
            {hotel.name}
          </p>
          <div className="flex items-center gap-1.5 mt-0.5">
            <span className="flex gap-0.5">
              {Array.from({ length: 5 }).map((_, i) => (
                <Star
                  key={i}
                  size={9}
                  className={
                    i < hotel.stars
                      ? "fill-amber-400 text-amber-400"
                      : "fill-slate-200 text-slate-200"
                  }
                />
              ))}
            </span>
            <span className="text-[9px] font-semibold text-slate-400 truncate">
              {hotel.submarket}
            </span>
          </div>
        </div>
        <ArrowRight
          size={12}
          className={cn(
            "flex-shrink-0 transition-all mt-0.5",
            isInspected
              ? "text-forest-900 translate-x-0.5"
              : "text-slate-300 group-hover:text-forest-900 group-hover:translate-x-0.5"
          )}
          aria-hidden
        />
      </div>

      {/* Brand strip · D2-Option-2 · no per-hotel ADR/RevPAR/Occ (corpus has
       *  none). Hidden for independents (no brand) so the tile stays clean. */}
      {hotel.brand && (
        <div className="truncate rounded-md bg-slate-50 px-2 py-1 text-[10px] font-medium text-slate-500">
          {hotel.brand}
        </div>
      )}
    </button>
  );
}
