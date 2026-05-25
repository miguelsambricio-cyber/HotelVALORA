"use client";

import { useEffect, useRef } from "react";
import { ChevronLeft, ChevronRight, Building2, X } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import type { CompetitorHotel } from "@/types/compset";
import { CompetitorCard } from "./competitor-card";

interface CompetitorPanelProps {
  referenceHotel: CompetitorHotel;
  competitors: CompetitorHotel[];
  suggested: CompetitorHotel[];
  isLoading: boolean;
  panelOpen: boolean;
  onToggle: () => void;
  onAdd: (hotel: CompetitorHotel) => void;
  onRemove: (id: string) => void;
  /** Map↔Panel sync · matching card gets highlight + scrollIntoView.
   *  Source of truth lives in <AnalysisMode /> (compset-map.tsx). */
  inspectedHotelId?: string | null;
  /** When true, the panel's built-in pull-tab toggle is hidden. Use when
   *  the parent surface supplies an external trigger (e.g. a top-right
   *  HotelsButton) so the user has a single, unambiguous entry point. */
  hideToggle?: boolean;
  className?: string;
}

export function CompetitorPanel({
  referenceHotel,
  competitors,
  suggested,
  isLoading,
  panelOpen,
  onToggle,
  onAdd,
  onRemove,
  inspectedHotelId = null,
  hideToggle = false,
  className,
}: CompetitorPanelProps) {
  const bodyRef = useRef<HTMLDivElement>(null);

  // When the map inspects a competitor / suggested, scroll the matching
  // card into view. Mirrors the AssetSelectionPanel pattern.
  useEffect(() => {
    if (!inspectedHotelId) return;
    const body = bodyRef.current;
    if (!body) return;
    const el = body.querySelector<HTMLElement>(
      `[data-competitor-card-id="${inspectedHotelId}"]`
    );
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
  }, [inspectedHotelId]);
  return (
    /*
     * flex-row-reverse: panel body renders on the RIGHT, toggle tab on the LEFT.
     * Container is absolute right-4, so it naturally hugs the right edge of the map.
     * When panel closes (w-0), only the toggle tab (w-8) remains visible near the edge.
     *
     * Mobile sizing (< md, 2026-05-20):
     *   Panel width is clamped to min(w-72, calc(100vw-72px)) so on narrow
     *   viewports it doesn't cover the entire map. On md+ it stays w-72.
     */
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
          {/* Header · adds inline close X when the parent supplies an
           *  external trigger (HotelsButton). Lets the panel sit corner-
           *  flush without losing a way to close it. */}
          <div className="px-4 py-3 border-b border-slate-200/60 flex-shrink-0 flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="text-[10px] font-bold tracking-[0.2em] text-slate-400 uppercase">
                CompSet Activo
              </p>
              <div className="flex items-center gap-2 mt-1">
                <Building2 size={14} className="text-forest-900 flex-shrink-0" />
                <p className="text-xs font-bold text-forest-900 truncate">
                  {referenceHotel.name}
                </p>
              </div>
            </div>
            {hideToggle && (
              <button
                type="button"
                onClick={onToggle}
                aria-label="Cerrar panel"
                className="flex-shrink-0 -mr-1 -mt-0.5 w-7 h-7 rounded-md flex items-center justify-center text-slate-400 hover:text-forest-900 hover:bg-slate-100 transition-colors"
              >
                <X size={14} />
              </button>
            )}
          </div>

          {/* Scrollable list */}
          <div
            ref={bodyRef}
            className="flex-1 overflow-y-auto p-3 space-y-4 min-h-0"
          >
            {isLoading ? (
              <div className="flex items-center justify-center h-32">
                <div className="w-5 h-5 rounded-full border-2 border-forest-900/30 border-t-forest-900 animate-spin" />
              </div>
            ) : (
              <>
                {/* Active competitors */}
                <section>
                  <p className="text-[10px] font-bold tracking-widest text-slate-400 uppercase mb-2">
                    Seleccionados ({competitors.length})
                  </p>
                  {competitors.length === 0 ? (
                    <p className="text-xs text-slate-400 text-center py-4">
                      Sin competidores seleccionados
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {competitors.map((h) => (
                        <CompetitorCard
                          key={h.id}
                          hotel={h}
                          variant="active"
                          onRemove={onRemove}
                          isInspected={inspectedHotelId === h.id}
                        />
                      ))}
                    </div>
                  )}
                </section>

                {/* Suggested by AI */}
                {suggested.length > 0 && (
                  <section>
                    <p className="text-[10px] font-bold tracking-widest text-slate-400 uppercase mb-2">
                      Sugeridos por IA
                    </p>
                    <div className="space-y-2">
                      {suggested.map((h) => (
                        <CompetitorCard
                          key={h.id}
                          hotel={h}
                          variant="suggested"
                          onAdd={onAdd}
                          isInspected={inspectedHotelId === h.id}
                        />
                      ))}
                    </div>
                  </section>
                )}
              </>
            )}
          </div>

          {/* CTA footer · href carries `?ref=<referenceHotel.id>` so the
           *  legacy bridge bootstraps a hotel_report row and redirects to
           *  /report/<reportId>/executive-summary. Without the ref the user
           *  falls to the mock fallback — that's the BLESS bug from 2026-05-26.
           *  Same pattern as compset-pricing.tsx "Continuar". */}
          <div className="px-3 py-3 border-t border-slate-200/60 flex-shrink-0">
            <Link
              href={`/report/executive-summary?ref=${encodeURIComponent(referenceHotel.id)}`}
              className="block w-full py-2.5 bg-forest-900 text-white text-xs font-bold rounded-lg tracking-widest uppercase hover:brightness-110 transition-all shadow-lg shadow-forest-900/20 text-center"
            >
              Confirmar CompSet →
            </Link>
          </div>
        </div>
      </div>

      {/* Toggle tab — sits to the left of the panel body. Hidden when
       *  the parent provides an external trigger (HotelsButton). */}
      {!hideToggle && (
        <button
          type="button"
          onClick={onToggle}
          aria-label={panelOpen ? "Cerrar panel" : "Abrir panel de competidores"}
          className="flex-shrink-0 mt-4 w-8 h-12 glass-overlay rounded-l-xl flex items-center justify-center text-forest-900 shadow-md border-y border-l border-white/50"
        >
          {panelOpen ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
        </button>
      )}
    </div>
  );
}
