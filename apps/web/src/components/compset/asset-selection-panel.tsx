"use client";

import { useEffect, useRef, useState, useMemo } from "react";
import { ChevronLeft, ChevronRight, MapPinned } from "lucide-react";
import { cn } from "@/lib/utils";
import type { CompetitorHotel } from "@/types/compset";
import type { HotelSearchHit } from "@/types/hotel-search";
import { RECOMMENDED_MADRID_ANCHOR_IDS } from "@/lib/data/madrid-hotels";
import { PanelSearchBar } from "./panel-search-bar";
import { RecommendedAssetCard } from "./recommended-asset-card";

/**
 * Right-edge panel rendered on bare `/compset` (explore mode).
 *
 * Replaces the older `<ExploreHelper />` narrative card and shares the
 * shell geometry of `<CompetitorPanel />` (analysis mode) so the user
 * perceives ONE workspace evolving between two states:
 *
 *   Estado A · explore  · "Selección de activo" · search + tile list
 *   Estado B · analysis · "CompSet activo"      · subject + competitors
 *
 * Map↔Panel sync contract (this panel is one half of it):
 *   · `inspectedHotelId`  · prop · the hotel currently highlighted on
 *                                  the map (from the parent ExploreMode).
 *                                  Matching card glows + scrolls into view.
 *   · `onInspect(id)`     · prop · called when the user clicks a card the
 *                                  FIRST time · parent sets inspectedHotelId
 *                                  · pin glows in sync.
 *   · `onCommit(id)`      · prop · called when the user clicks an already-
 *                                  inspected card OR confirms the selection
 *                                  · parent navigates to /compset?ref=<id>.
 *
 * Two-click pattern is symmetric across map AND panel: the FIRST click on
 * a card inspects (highlight only) · the SECOND click commits navigation.
 * Search results commit directly · the search bar is an explicit intent
 * channel where the visitor already typed a known hotel.
 */

interface AssetSelectionPanelProps {
  /** Full 18-hotel list rendered as scrollable tiles. */
  recommended: CompetitorHotel[];
  /** Currently inspected hotel id (from the map · single source of truth). */
  inspectedHotelId: string | null;
  /** Inspect callback · sets the inspectedHotelId in parent. */
  onInspect: (hotelId: string | null) => void;
  /** Commit callback · navigates to /compset?ref=<id>. */
  onCommit: (hotelId: string) => void;
  className?: string;
}

export function AssetSelectionPanel({
  recommended,
  inspectedHotelId,
  onInspect,
  onCommit,
  className,
}: AssetSelectionPanelProps) {
  const [panelOpen, setPanelOpen] = useState(true);
  const bodyRef = useRef<HTMLDivElement>(null);

  // Sort anchors first (5 curated names) · then the remaining 13 hotels.
  const sortedAssets = useMemo(() => {
    const anchorSet = new Set(RECOMMENDED_MADRID_ANCHOR_IDS);
    const anchors = recommended.filter((h) => anchorSet.has(h.id));
    const rest = recommended.filter((h) => !anchorSet.has(h.id));
    return [...anchors, ...rest];
  }, [recommended]);

  // When the map inspects a hotel, scroll the matching card into view AND
  // auto-open the panel if it was collapsed (so the highlight is visible).
  useEffect(() => {
    if (!inspectedHotelId) return;
    if (!panelOpen) setPanelOpen(true);
    const body = bodyRef.current;
    if (!body) return;
    const el = body.querySelector<HTMLElement>(
      `[data-asset-card-id="${inspectedHotelId}"]`
    );
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
    // panelOpen intentionally omitted from deps · we only auto-open on
    // inspect transitions, not on user-driven toggles.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inspectedHotelId]);

  function handleSearchSelect(hotel: HotelSearchHit) {
    // Search is explicit intent · commit directly (no inspect intermediate).
    onCommit(hotel.id);
  }

  function handleCardClick(hotel: CompetitorHotel) {
    // Two-click pattern · mirrors pin behavior.
    if (inspectedHotelId === hotel.id) {
      onCommit(hotel.id);
    } else {
      onInspect(hotel.id);
    }
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

          {/* Body · scrollable asset tiles */}
          <div
            ref={bodyRef}
            className="flex-1 overflow-y-auto p-3 space-y-2 min-h-0"
          >
            <div className="flex items-center justify-between mb-1 px-0.5">
              <p className="text-[10px] font-bold tracking-widest text-slate-400 uppercase">
                Recommended nearby assets
              </p>
              <span className="text-[10px] font-bold text-slate-400 tabular-nums">
                {sortedAssets.length}
              </span>
            </div>
            {sortedAssets.map((hotel) => (
              <RecommendedAssetCard
                key={hotel.id}
                hotel={hotel}
                isInspected={inspectedHotelId === hotel.id}
                onSelect={handleCardClick}
              />
            ))}
          </div>

          {/* Footer · minimal status · mirrors CompetitorPanel CTA slot */}
          <div className="px-3 py-3 border-t border-slate-200/60 flex-shrink-0 text-center">
            {inspectedHotelId ? (
              <p className="text-[10px] font-medium text-forest-900 tracking-tight">
                Click de nuevo en el pin o card para confirmar selección
              </p>
            ) : (
              <p className="text-[10px] font-medium text-slate-500 tracking-tight">
                Click pin · 1 inspect · 2 commit
              </p>
            )}
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
