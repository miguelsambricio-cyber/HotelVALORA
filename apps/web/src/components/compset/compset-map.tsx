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

// Phase 2 feature flag · Vercel env var · default OFF (production behavior
// unchanged). Strict equality on "true" · any other value falls back to false.
// Rollback: flip to "false" on Vercel env · ~3-min redeploy.
const AVUXI_ENABLED = process.env.NEXT_PUBLIC_AVUXI_ENABLED === "true";
import type { CompsetMapGLProps } from "@/components/maps/compset-map-gl";
import type { HeatmapCategory, MapLayer, MapLayerId } from "@/types/compset";
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
  // Phase 2.B (2026-05-22) · the AVUXI flag now toggles the layer engine
  // INSIDE CompsetMapGL · the full HV workspace (CompetitorPanel + pins +
  // MapLegend + zoom controls) renders identically in both states. The
  // bare-AVUXI validation surface (CompsetAvuxiPure) was retired now that
  // /compset has been confirmed to load AVUXI tiles correctly on Preview.
  if (mode === "explore") {
    return <ExploreMode />;
  }
  return <AnalysisMode referenceHotelId={referenceHotelId} />;
}

/* ─── Analysis mode · subject + competitors + suggested ──────────────────
 *
 * Map↔Panel sync contract (mirrors ExploreMode below):
 *   1st click on a competitor/suggested pin → inspect: pin halo + card
 *     highlight + scrollIntoView + panel auto-opens if collapsed
 *   2nd click on the same pin → toggle off (clear inspection · pin halo
 *     removed · card highlight removed)
 *   Click on a different pin → switch inspection
 *   Click on subject (reference) pin → clear competitor inspection
 *
 * No popups in /compset analysis mode · all communication via pin glow
 * + panel card sync. The embedded /report map (report-map.tsx) is a
 * separate consumer of CompsetMapGL that does NOT pass onPinClick · it
 * keeps the legacy popup behavior since it has no side panel.        */

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
    setHeatmapCategory,
  } = useCompset(referenceHotelId);

  const { viewState, setViewState, zoomIn, zoomOut } = useMapViewport();
  const [inspectedHotelId, setInspectedHotelId] = useState<string | null>(null);
  const [layersPanelOpen, setLayersPanelOpen] = useState(false);

  // Re-center the map on the subject hotel when it loads / changes.
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

  // Auto-open the panel when a pin is inspected so the highlighted
  // card is visible. Mirrors the AssetSelectionPanel behavior.
  useEffect(() => {
    if (inspectedHotelId && !panelOpen) {
      setPanelOpen(true);
    }
    // panelOpen intentionally omitted from deps — only react to inspect
    // transitions, not to user-driven toggles.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inspectedHotelId]);

  // Reset inspection when the subject hotel changes (route navigation).
  useEffect(() => {
    setInspectedHotelId(null);
  }, [referenceHotel.id]);

  function handlePinClick(hotelId: string) {
    if (hotelId === referenceHotel.id) {
      // Subject click · clear any active competitor inspection.
      setInspectedHotelId(null);
      return;
    }
    // Competitor / suggested · toggle (same pin clicked twice clears).
    setInspectedHotelId((prev) => (prev === hotelId ? null : hotelId));
  }

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
          onPinClick={handlePinClick}
          inspectedHotelId={inspectedHotelId}
          avuxi={AVUXI_ENABLED}
        />
      </div>

      <MapControls
        className="absolute left-4 top-4 md:left-auto md:right-8 md:top-8 z-30"
        onZoomIn={zoomIn}
        onZoomOut={zoomOut}
        layersPanelOpen={layersPanelOpen}
        onToggleLayersPanel={() => setLayersPanelOpen((o) => !o)}
      />

      {/* Layers panel · on-demand · anchored just below the Layers button.
       *  Mobile (controls top-left): panel appears top-left below controls.
       *  Desktop (controls top-right): panel appears top-right below. */}
      {layersPanelOpen && (
        <MapLegend
          layers={layers}
          onToggleLayer={toggleLayer}
          onSetHeatmapCategory={setHeatmapCategory}
          onClose={() => setLayersPanelOpen(false)}
          className="absolute left-4 top-44 md:left-auto md:right-8 md:top-48 z-30"
        />
      )}

      <CompetitorPanel
        referenceHotel={referenceHotel}
        competitors={competitors}
        suggested={suggested}
        isLoading={isLoading}
        panelOpen={panelOpen}
        onToggle={() => setPanelOpen(!panelOpen)}
        onAdd={addCompetitor}
        onRemove={removeCompetitor}
        inspectedHotelId={inspectedHotelId}
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
  const [layersPanelOpen, setLayersPanelOpen] = useState(false);

  function toggleLayer(id: MapLayerId) {
    setLayers((prev) => prev.map((l) => (l.id === id ? { ...l, enabled: !l.enabled } : l)));
  }

  function setHeatmapCategory(category: HeatmapCategory) {
    setLayers((prev) =>
      prev.map((l) => (l.id === "heatmap" ? { ...l, category } : l)),
    );
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
          avuxi={AVUXI_ENABLED}
        />
      </div>

      <MapControls
        className="absolute left-4 top-4 md:left-auto md:right-8 md:top-8 z-30"
        onZoomIn={zoomIn}
        onZoomOut={zoomOut}
        layersPanelOpen={layersPanelOpen}
        onToggleLayersPanel={() => setLayersPanelOpen((o) => !o)}
      />

      {layersPanelOpen && (
        <MapLegend
          layers={layers}
          onToggleLayer={toggleLayer}
          onSetHeatmapCategory={setHeatmapCategory}
          onClose={() => setLayersPanelOpen(false)}
          className="absolute left-4 top-44 md:left-auto md:right-8 md:top-48 z-30"
        />
      )}

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
