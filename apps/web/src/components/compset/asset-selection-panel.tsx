"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight, MapPinned } from "lucide-react";
import { cn } from "@/lib/utils";
import type { CompetitorHotel } from "@/types/compset";
import type { HotelSearchHit } from "@/types/hotel-search";
import { PanelSearchBar } from "./panel-search-bar";
import { RecommendedAssetCard } from "./recommended-asset-card";

/**
 * Right-edge panel rendered on bare `/compset` (explore mode).
 *
 * Replaces the older `<ExploreHelper />` narrative card. Mirrors the
 * geometry and shell of `<CompetitorPanel />` (analysis mode) so the
 * user perceives ONE workspace evolving between two states:
 *
 *   Estado A · explore  · "Selección de activo" · search + recommended
 *   Estado B · analysis · "CompSet activo"      · subject + competitors
 *
 * The visible difference is ONLY the eyebrow label and the body content.
 * Width / toggle tab / glass-overlay shell / footer position are identical.
 *
 * Both selection paths (search and recommended tile click) navigate to
 * `/compset?ref=<hotel.id>` · the canonical entry into analysis mode.
 */

interface AssetSelectionPanelProps {
  /** Curated 5-tile anchor set rendered under the search bar. */
  recommended: CompetitorHotel[];
  className?: string;
}

export function AssetSelectionPanel({ recommended, className }: AssetSelectionPanelProps) {
  const router = useRouter();
  const [panelOpen, setPanelOpen] = useState(true);

  function goToAnalysis(hotelId: string) {
    router.push(`/compset?ref=${encodeURIComponent(hotelId)}`);
  }

  function handleSearchSelect(hotel: HotelSearchHit) {
    goToAnalysis(hotel.id);
  }

  function handleRecommendedSelect(hotel: CompetitorHotel) {
    goToAnalysis(hotel.id);
  }

  return (
    /* flex-row-reverse mirrors <CompetitorPanel /> · toggle tab on the LEFT,
     * panel body on the RIGHT. When closed (w-0) only the tab remains. */
    <div className={cn("flex flex-row-reverse items-start h-full", className)}>
      {/* Panel body */}
      <div
        className={cn(
          "h-full overflow-hidden transition-all duration-300",
          panelOpen
            ? "w-[min(288px,calc(100vw-72px))] md:w-72"
            : "w-0"
        )}
      >
        <div className="w-[min(288px,calc(100vw-72px))] md:w-72 h-full glass-overlay border border-white/50 rounded-xl shadow-xl flex flex-col overflow-hidden">
          {/* Header · eyebrow + integrated search */}
          <div className="px-4 py-3 border-b border-slate-200/60 flex-shrink-0 space-y-2.5">
            <div className="flex items-center gap-2">
              <MapPinned size={12} className="text-forest-900 flex-shrink-0" />
              <p className="text-[10px] font-bold tracking-[0.2em] text-slate-400 uppercase">
                Selección de activo
              </p>
            </div>
            <PanelSearchBar onSelectHotel={handleSearchSelect} />
          </div>

          {/* Body · recommended assets · NO narrative · institutional workflow density */}
          <div className="flex-1 overflow-y-auto p-3 space-y-2 min-h-0">
            <p className="text-[10px] font-bold tracking-widest text-slate-400 uppercase mb-1 px-0.5">
              Recommended nearby assets ({recommended.length})
            </p>
            {recommended.map((hotel) => (
              <RecommendedAssetCard
                key={hotel.id}
                hotel={hotel}
                onSelect={handleRecommendedSelect}
              />
            ))}
          </div>

          {/* Footer · minimal status · mirrors CompetitorPanel CTA slot */}
          <div className="px-3 py-3 border-t border-slate-200/60 flex-shrink-0 text-center">
            <p className="text-[10px] font-medium text-slate-500 tracking-tight">
              Cobertura Madrid Tier-2 · 18 activos institucionales
            </p>
          </div>
        </div>
      </div>

      {/* Toggle tab · identical geometry to CompetitorPanel */}
      <button
        type="button"
        onClick={() => setPanelOpen(!panelOpen)}
        aria-label={panelOpen ? "Cerrar panel" : "Abrir panel de selección"}
        className="flex-shrink-0 mt-4 w-8 h-12 glass-overlay rounded-l-xl flex items-center justify-center text-forest-900 shadow-md border-y border-l border-white/50"
      >
        {panelOpen ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
      </button>
    </div>
  );
}
