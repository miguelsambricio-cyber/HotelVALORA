"use client";

import dynamic from "next/dynamic";
import { useCompset }      from "@/lib/hooks/use-compset";
import { useMapViewport }  from "@/hooks/maps/use-map-viewport";
import { MapControls }     from "./map-controls";
import { MapLegend }       from "./map-legend";
import { CompetitorPanel } from "./competitor-panel";
import type { CompsetMapGLProps } from "@/components/maps/compset-map-gl";

// Dynamically import the Mapbox GL component — SSR disabled to avoid
// mapbox-gl touching the DOM during server rendering.
const CompsetMapGL = dynamic<CompsetMapGLProps>(
  () => import("@/components/maps/compset-map-gl").then((m) => m.CompsetMapGL),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-full bg-slate-200 animate-pulse" aria-hidden />
    ),
  }
);

interface CompsetMapProps {
  referenceHotelId?: string;
}

export function CompsetMap({ referenceHotelId }: CompsetMapProps) {
  const {
    referenceHotel,
    competitors,
    suggested,
    layers,
    isLoading,
    error,
    panelOpen,
    setPanelOpen,
    addCompetitor,
    removeCompetitor,
    toggleLayer,
  } = useCompset(referenceHotelId);

  const { viewState, setViewState, zoomIn, zoomOut } = useMapViewport();

  return (
    <section
      aria-label="Mapa de competidores"
      className="relative w-full overflow-hidden compset-map-container bg-slate-200"
    >
      {/* ── Real Mapbox GL map ──────────────────────────────────────────── */}
      <div className="absolute inset-0 z-0">
        <CompsetMapGL
          viewState={viewState}
          onViewStateChange={setViewState}
          referenceHotel={referenceHotel}
          competitors={competitors}
          suggested={suggested}
          layers={layers}
        />
      </div>

      {/* ── Map controls (top-right) ─────────────────────────────────────── */}
      <MapControls
        className="absolute right-8 top-8 z-30"
        onZoomIn={zoomIn}
        onZoomOut={zoomOut}
      />

      {/* ── Map legend (bottom-left) ─────────────────────────────────────── */}
      <MapLegend
        layers={layers}
        onToggleLayer={toggleLayer}
        className="absolute left-8 bottom-8 z-30"
      />

      {/* ── Competitor panel (right edge) ─────────────────────────────────── */}
      <CompetitorPanel
        referenceHotel={referenceHotel}
        competitors={competitors}
        suggested={suggested}
        isLoading={isLoading}
        panelOpen={panelOpen}
        onToggle={() => setPanelOpen(!panelOpen)}
        onAdd={addCompetitor}
        onRemove={removeCompetitor}
        className="absolute top-4 right-4 bottom-4 z-30"
      />

      {error && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-40 bg-red-50 text-red-700 text-xs font-semibold px-4 py-2 rounded-lg border border-red-200 shadow">
          {error}
        </div>
      )}
    </section>
  );
}
