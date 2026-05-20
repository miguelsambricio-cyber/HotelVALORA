"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef } from "react";
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

  // Re-center the map on the subject hotel when it loads / changes.
  // The institutional flow expects `?ref=<hotel>` to drive the
  // viewport · without this effect the map would stay anchored on
  // DEFAULT_VIEWPORT (Madrid Centro / Puerta del Sol) regardless of
  // the resolved subject. We guard against re-centring twice for the
  // same subject id so user pan/zoom interactions are not reset.
  const lastCenteredId = useRef<string | null>(null);
  useEffect(() => {
    if (isLoading) return;
    if (lastCenteredId.current === referenceHotel.id) return;
    lastCenteredId.current = referenceHotel.id;
    setViewState({
      longitude: referenceHotel.coordinates.lng,
      latitude: referenceHotel.coordinates.lat,
      zoom: 15,
      pitch: 0,
      bearing: 0,
    });
  }, [isLoading, referenceHotel.id, referenceHotel.coordinates.lng, referenceHotel.coordinates.lat, setViewState]);

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

      {/* ── Map controls ─────────────────────────────────────────────────
       *  Desktop (md+): top-right · classic Mapbox convention.
       *  Mobile (< md): top-left so it doesn't collide with the
       *  CompetitorPanel that hugs the right edge. */}
      <MapControls
        className="absolute left-4 top-4 md:left-auto md:right-8 md:top-8 z-30"
        onZoomIn={zoomIn}
        onZoomOut={zoomOut}
      />

      {/* ── Map legend ───────────────────────────────────────────────────
       *  Bottom-left on all viewports · z-30 same as controls. */}
      <MapLegend
        layers={layers}
        onToggleLayer={toggleLayer}
        className="absolute left-4 bottom-4 md:left-8 md:bottom-8 z-30"
      />

      {/* ── Competitor panel (right edge) ─────────────────────────────── */}
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
