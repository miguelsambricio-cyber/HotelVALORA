"use client";

import { Marker, Popup } from "react-map-gl/mapbox";
import { Star } from "lucide-react";
import type { CompetitorHotel, HotelPinType } from "@/types/compset";
import { cn } from "@/lib/utils";

// ── Star row ─────────────────────────────────────────────────────────────────

function StarRow({ count }: { count: number }) {
  return (
    <span className="flex gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => (
        <Star
          key={i}
          size={9}
          className={i < count ? "fill-amber-400 text-amber-400" : "fill-slate-200 text-slate-200"}
        />
      ))}
    </span>
  );
}

// ── Popup card ────────────────────────────────────────────────────────────────

function HotelPopup({
  hotel,
  onClose,
}: {
  hotel: CompetitorHotel;
  onClose: () => void;
}) {
  return (
    <Popup
      longitude={hotel.coordinates.lng}
      latitude={hotel.coordinates.lat}
      anchor="bottom"
      offset={[0, -12] as [number, number]}
      onClose={onClose}
      closeButton={false}
      closeOnClick={false}
      className="hotel-popup"
    >
      <div className="glass-overlay border border-white/50 rounded-xl shadow-xl p-3 w-56 pointer-events-auto">
        <button
          type="button"
          onClick={onClose}
          aria-label="Cerrar"
          className="absolute top-2 right-2 text-slate-400 hover:text-slate-600 text-xs font-bold"
        >
          ✕
        </button>
        <p className="text-xs font-bold text-slate-800 pr-4 leading-snug mb-0.5">
          {hotel.name}
        </p>
        <StarRow count={hotel.stars} />
        <p className="text-[10px] text-slate-500 mt-0.5 mb-2">{hotel.category}</p>

        <div className="grid grid-cols-3 gap-1 bg-slate-50 rounded-lg px-2 py-1.5">
          {[
            { label: "ADR",    value: `€${hotel.adr}`       },
            { label: "RevPAR", value: `€${hotel.revpar}`    },
            { label: "Occ",    value: `${hotel.occupancy}%` },
          ].map(({ label, value }) => (
            <div key={label} className="flex flex-col items-center">
              <span className="text-[8px] font-bold tracking-wider text-slate-400 uppercase leading-none mb-0.5">
                {label}
              </span>
              <span className="text-[10px] font-bold text-slate-700">{value}</span>
            </div>
          ))}
        </div>
      </div>
    </Popup>
  );
}

// ── Pin dot ───────────────────────────────────────────────────────────────────

const PIN_STYLES: Record<HotelPinType, string> = {
  reference:  "w-6 h-6 bg-forest-900 border-4 border-white shadow-lg animate-pulse",
  competitor: "w-4 h-4 bg-blue-600 border-2 border-white shadow-md",
  suggested:  "w-4 h-4 bg-blue-400 border-2 border-dashed border-blue-300 shadow-md opacity-60",
  explore:    "w-5 h-5 bg-forest-700 border-2 border-white shadow-md",
};

// ── HotelMarker ───────────────────────────────────────────────────────────────

interface HotelMarkerProps {
  hotel: CompetitorHotel;
  type: HotelPinType;
  /** Analysis-mode popup toggle · true → popup is shown. */
  isSelected: boolean;
  /** Analysis-mode popup toggle callback. */
  onSelect: (id: string | null) => void;
  /** Explore-mode inspect highlight · true → halo + scale-up. */
  isInspected?: boolean;
  /** Explore-mode direct click handler. When provided:
   *    · pin click triggers `onPinClick(hotel.id)` instead of toggling popup
   *    · the popup is NEVER rendered for this marker
   *  This is the contract used by the asset-selection workspace where
   *  the two-click pattern (1 inspect · 2 commit) lives in parent state. */
  onPinClick?: (hotelId: string) => void;
}

export function HotelMarker({
  hotel,
  type,
  isSelected,
  onSelect,
  isInspected = false,
  onPinClick,
}: HotelMarkerProps) {
  const isRef = type === "reference";
  const isExploreMode = onPinClick !== undefined;

  function handleClick() {
    if (isExploreMode) {
      onPinClick!(hotel.id);
    } else {
      onSelect(isSelected ? null : hotel.id);
    }
  }

  return (
    <>
      <Marker
        longitude={hotel.coordinates.lng}
        latitude={hotel.coordinates.lat}
        anchor="center"
        onClick={handleClick}
      >
        <div className="flex flex-col items-center cursor-pointer group">
          <div
            className={cn(
              "rounded-full transition-all duration-200 group-hover:scale-110",
              PIN_STYLES[type],
              isSelected && "ring-2 ring-offset-1 ring-forest-700 scale-110",
              // Explore-mode inspect halo · scales up + glow ring + brand color
              isInspected && "!w-6 !h-6 !bg-forest-900 !shadow-lg ring-4 ring-forest-900/30 ring-offset-2 scale-110"
            )}
          />
          {isRef && (
            <span className="mt-0.5 bg-forest-900 text-white text-[9px] px-1.5 py-0.5 rounded-full font-bold uppercase tracking-tighter whitespace-nowrap shadow">
              Valora Ref
            </span>
          )}
        </div>
      </Marker>

      {/* Popup is rendered ONLY in analysis mode (when onPinClick is not
       *  provided). Explore mode shows NO popup · all communication
       *  happens via pin glow + panel sync. */}
      {isSelected && !isExploreMode && (
        <HotelPopup hotel={hotel} onClose={() => onSelect(null)} />
      )}
    </>
  );
}
