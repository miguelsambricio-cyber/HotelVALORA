import { Star, Plus, X } from "lucide-react";
import type { CompetitorHotel } from "@/types/compset";
import { cn } from "@/lib/utils";

function StarRow({ count }: { count: number }) {
  return (
    <span className="flex gap-0.5" aria-label={`${count} estrellas`}>
      {Array.from({ length: 5 }).map((_, i) => (
        <Star
          key={i}
          size={10}
          className={
            i < count
              ? "fill-amber-400 text-amber-400"
              : "fill-slate-200 text-slate-200"
          }
        />
      ))}
    </span>
  );
}

interface CompetitorCardProps {
  hotel: CompetitorHotel;
  variant: "active" | "suggested";
  onAdd?: (hotel: CompetitorHotel) => void;
  onRemove?: (id: string) => void;
  /** Map↔Panel sync · matching map pin is inspected · highlight + lift. */
  isInspected?: boolean;
}

export function CompetitorCard({
  hotel,
  variant,
  onAdd,
  onRemove,
  isInspected = false,
}: CompetitorCardProps) {
  return (
    <div
      data-competitor-card-id={hotel.id}
      className={cn(
        "bg-white rounded-xl p-3 border transition-all",
        isInspected
          // Inspected state overrides variant border · same brand glow
          // as RecommendedAssetCard / panel inspect treatment.
          ? "border-forest-900 shadow-md ring-1 ring-forest-900/20 bg-forest-900/[0.04] opacity-100"
          : variant === "active"
            ? "border-forest-900/20 shadow-sm"
            : "border-slate-200 opacity-75 hover:opacity-100"
      )}
    >
      {/* Header row */}
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-bold text-slate-800 truncate leading-tight">
            {hotel.name}
          </p>
          <StarRow count={hotel.stars} />
        </div>

        {variant === "active" ? (
          <button
            type="button"
            onClick={() => onRemove?.(hotel.id)}
            aria-label={`Eliminar ${hotel.name}`}
            className="flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-slate-400 hover:bg-red-50 hover:text-red-500 transition-colors"
          >
            <X size={12} />
          </button>
        ) : (
          <button
            type="button"
            onClick={() => onAdd?.(hotel)}
            aria-label={`Añadir ${hotel.name}`}
            className="flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-forest-900 bg-forest-900/10 hover:bg-forest-900 hover:text-white transition-colors"
          >
            <Plus size={12} />
          </button>
        )}
      </div>

      {/* Info strip · brand · submarket (left) + distance to subject (right).
       *  D2-Option-2 · no per-hotel ADR/RevPAR/Occ (the corpus has none). */}
      <div className="flex items-center justify-between gap-2 bg-slate-50 rounded-lg px-2.5 py-1.5">
        <span className="min-w-0 truncate text-[10px] font-medium text-slate-500">
          {[hotel.brand, hotel.submarket].filter(Boolean).join(" · ") || "—"}
        </span>
        {hotel.distanceKm != null && (
          <span className="shrink-0 text-[10px] font-bold tabular-nums text-forest-900">
            {hotel.distanceKm.toFixed(1).replace(".", ",")} km
          </span>
        )}
      </div>
    </div>
  );
}
