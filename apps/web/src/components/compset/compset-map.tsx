"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useCompset }      from "@/lib/hooks/use-compset";
import { useMapViewport }  from "@/hooks/maps/use-map-viewport";
import { MapControls }     from "./map-controls";
import { MapLegend }       from "./map-legend";
import { CompetitorPanel }        from "./competitor-panel";
import { AssetSelectionPanel }    from "./asset-selection-panel";
import { ALL_MADRID_AS_COMPETITORS, DEFAULT_LAYERS } from "@/lib/api/compset";
import type { CompsetMapGLProps } from "@/components/maps/compset-map-gl";
import type { MapLayer, MapLayerId } from "@/types/compset";
import { useState } from "react";

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
  /** When "explore", renders all Madrid hotels as uniform pins · no
   *  subject hotel · no CompetitorPanel. Defaults to "analysis". */
  mode?: "analysis" | "explore";
}

export function CompsetMap({ referenceHotelId, mode = "analysis" }: CompsetMapProps) {
  if (mode === "explore") {
    return <ExploreMode />;
  }
  return <AnalysisMode referenceHotelId={referenceHotelId} />;
}

/* ─── Analysis mode · subject + competitors + suggested ────────────────── */

function AnalysisMode({ referenceHotelId }: { referenceHotelId?: string }) {
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

      <MapControls
        className="absolute left-4 top-4 md:left-auto md:right-8 md:top-8 z-30"
        onZoomIn={zoomIn}
        onZoomOut={zoomOut}
      />

      <MapLegend
        layers={layers}
        onToggleLayer={toggleLayer}
        className="absolute left-4 bottom-4 md:left-8 md:bottom-8 z-30"
      />

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

/* ─── Explore mode · two-click pin pattern · map↔panel sync ──────────────
 *   1st click on a pin    → inspect: set inspectedHotelId · pin glows ·
 *                           panel scrolls to + highlights matching card
 *   2nd click on same pin → commit:  router.push(/compset?ref=<id>)
 *   click on different pin → reset previous · inspect new
 *   card click in panel   → direct commit (cards are explicit intent) */

function ExploreMode() {
  const router = useRouter();
  const { viewState, setViewState, zoomIn, zoomOut } = useMapViewport();
  const [layers, setLayers] = useState<MapLayer[]>(DEFAULT_LAYERS);
  const [inspectedHotelId, setInspectedHotelId] = useState<string | null>(null);

  function toggleLayer(id: MapLayerId) {
    setLayers((prev) => prev.map((l) => (l.id === id ? { ...l, enabled: !l.enabled } : l)));
  }

  function commitSelection(hotelId: string) {
    router.push(`/compset?ref=${encodeURIComponent(hotelId)}`);
  }

  function handlePinClick(hotelId: string) {
    // Same pin clicked twice → commit. Different pin → inspect new.
    if (inspectedHotelId === hotelId) {
      commitSelection(hotelId);
    } else {
      setInspectedHotelId(hotelId);
    }
  }

  return (
    <section
      aria-label="Mapa de exploración institucional"
      className="relative w-full overflow-hidden compset-map-container bg-slate-200"
    >
      <div className="absolute inset-0 z-0">
        <CompsetMapGL
          mode="explore"
          viewState={viewState}
          onViewStateChange={setViewState}
          exploreHotels={ALL_MADRID_AS_COMPETITORS}
          onPinClick={handlePinClick}
          inspectedHotelId={inspectedHotelId}
          layers={layers}
        />
      </div>

      <MapControls
        className="absolute left-4 top-4 md:left-auto md:right-8 md:top-8 z-30"
        onZoomIn={zoomIn}
        onZoomOut={zoomOut}
      />

      <MapLegend
        layers={layers}
        onToggleLayer={toggleLayer}
        className="absolute left-4 bottom-4 md:left-8 md:bottom-8 z-30"
      />

      <AssetSelectionPanel
        recommended={ALL_MADRID_AS_COMPETITORS}
        inspectedHotelId={inspectedHotelId}
        onInspect={setInspectedHotelId}
        onCommit={commitSelection}
        className="absolute top-4 right-4 bottom-4 z-30"
      />
    </section>
  );
}
