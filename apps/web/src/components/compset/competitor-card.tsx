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

function KpiPill({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col items-center">
      <span className="text-[9px] font-bold tracking-wider text-slate-400 uppercase leading-none mb-0.5">
        {label}
      </span>
      <span className="text-[11px] font-bold text-slate-700 leading-none">{value}</span>
    </div>
  );
}

interface CompetitorCardProps {
  hotel: CompetitorHotel;
  variant: "active" | "suggested";
  onAdd?: (hotel: CompetitorHotel) => void;
  onRemove?: (id: string) => void;
}

export function CompetitorCard({
  hotel,
  variant,
  onAdd,
  onRemove,
}: CompetitorCardProps) {
  return (
    <div
      className={cn(
        "bg-white rounded-xl p-3 border transition-all",
        variant === "active"
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

      {/* KPI bar */}
      <div className="grid grid-cols-4 gap-1 bg-slate-50 rounded-lg px-2 py-1.5">
        <KpiPill label="ADR"    value={`€${hotel.adr}`}       />
        <KpiPill label="RevPAR" value={`€${hotel.revpar}`}    />
        <KpiPill label="Occ"    value={`${hotel.occupancy}%`} />
        <div className="flex flex-col items-center">
          <span className="text-[9px] font-bold tracking-wider text-slate-400 uppercase leading-none mb-0.5">
            Cat.
          </span>
          <span className="text-[9px] font-semibold text-slate-600 text-center leading-tight">
            {hotel.category}
          </span>
        </div>
      </div>
    </div>
  );
}
