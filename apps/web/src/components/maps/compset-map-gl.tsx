"use client";

import { useRef, useState } from "react";
import Map from "react-map-gl/mapbox";
import type { MapRef, MapMouseEvent } from "react-map-gl/mapbox";
import "mapbox-gl/dist/mapbox-gl.css";

import { MAPBOX_TOKEN, MAPBOX_STYLE } from "@/lib/maps/map-config";
import {
  TOURIST_HEATMAP_DATA,
  METRO_LINE_DATA,
  HISTORIC_CENTER_POLYGON,
} from "@/lib/maps/geo-data";
import type { MapViewport } from "@/lib/maps/types";
import type { CompetitorHotel, MapLayer } from "@/types/compset";

import { HotelMarker }      from "./hotel-marker";
import { MapHeatmapLayer }  from "./map-heatmap-layer";
import { MapMetroLayer }    from "./map-metro-layer";
import { MapPolygonLayer }  from "./map-polygon-layer";

// ── Props ─────────────────────────────────────────────────────────────────────

interface CompsetMapGLBaseProps {
  viewState: MapViewport;
  onViewStateChange: (vs: MapViewport) => void;
  layers: MapLayer[];
}

interface CompsetMapGLAnalysisProps extends CompsetMapGLBaseProps {
  mode?: "analysis";
  referenceHotel: CompetitorHotel;
  competitors: CompetitorHotel[];
  suggested: CompetitorHotel[];
  /** Optional · /compset panel-sync contract. When provided:
   *   · pins switch to direct-click-no-popup behavior (same as explore)
   *   · matching pin gets the inspected halo
   *   · parent owns inspectedHotelId state · panel reacts in sync
   *  Standalone embedded usages (report-map.tsx) omit this prop so the
   *  KPI popup behavior is preserved where there's no side panel. */
  onPinClick?: (hotelId: string) => void;
  inspectedHotelId?: string | null;
}

interface CompsetMapGLExploreProps extends CompsetMapGLBaseProps {
  mode: "explore";
  /** All hotels rendered as uniform pins when no subject is selected. */
  exploreHotels: CompetitorHotel[];
  /** Direct pin click handler · NO popup · parent owns two-click
   *  inspect/commit state. Receives the clicked hotel id. */
  onPinClick: (hotelId: string) => void;
  /** When set, the matching pin gets the inspect halo (glow + scale). */
  inspectedHotelId?: string | null;
}

export type CompsetMapGLProps = CompsetMapGLAnalysisProps | CompsetMapGLExploreProps;

// ── Token fallback ────────────────────────────────────────────────────────────

/**
 * Institutional fallback when NEXT_PUBLIC_MAPBOX_TOKEN is missing. The
 * previous version surfaced a dev-facing message ("Configura
 * NEXT_PUBLIC_MAPBOX_TOKEN en .env.local") which leaked operational
 * detail to anyone visiting /compset in production. This version
 * mirrors the SharedMapCard placeholder language used across the Full
 * Report flow · clean · institutional · honest.
 */
function TokenMissing() {
  return (
    <div className="w-full h-full bg-slate-50 flex flex-col items-center justify-center gap-3 text-center px-6">
      <p className="font-headline text-[10px] font-bold uppercase tracking-[0.24em] text-slate-500">
        Map integration pending
      </p>
      <p className="font-mono text-[11px] leading-relaxed text-slate-600 max-w-sm">
        Live cartography integration in progress · the CompSet workspace
        will surface the interactive Madrid Centro map once the
        production map provider is wired.
      </p>
    </div>
  );
}

// ── CompsetMapGL ──────────────────────────────────────────────────────────────

export function CompsetMapGL(props: CompsetMapGLProps) {
  const { viewState, onViewStateChange, layers } = props;
  const mapRef = useRef<MapRef>(null);
  const [popupHotelId, setPopupHotelId] = useState<string | null>(null);

  if (!MAPBOX_TOKEN) return <TokenMissing />;

  const heatmapEnabled   = layers.find((l) => l.id === "heatmap")?.enabled   ?? false;
  const metroEnabled     = layers.find((l) => l.id === "metro")?.enabled     ?? false;
  const historicoEnabled = layers.find((l) => l.id === "historico")?.enabled ?? false;

  function handleMapClick(e: MapMouseEvent) {
    // Deselect popup when clicking on empty map area
    if (!(e.originalEvent.target as HTMLElement).closest(".hotel-popup")) {
      setPopupHotelId(null);
    }
  }

  const isExplore = props.mode === "explore";

  return (
    <Map
      ref={mapRef}
      mapboxAccessToken={MAPBOX_TOKEN}
      longitude={viewState.longitude}
      latitude={viewState.latitude}
      zoom={viewState.zoom}
      pitch={viewState.pitch}
      bearing={viewState.bearing}
      onMove={(e) =>
        onViewStateChange({
          longitude: e.viewState.longitude,
          latitude:  e.viewState.latitude,
          zoom:      e.viewState.zoom,
          pitch:     e.viewState.pitch,
          bearing:   e.viewState.bearing,
        })
      }
      onClick={handleMapClick}
      onError={(e) => {
        // Surface mapbox-gl errors (style fetch · tile fetch · worker
        // initialization) so silent failures (uniform-gray canvas with
        // pins + watermark visible) are loud in production logs and
        // Sentry/Vercel runtime logs instead of being invisible.
        // Most common causes: token URL/scope restriction · worker
        // bundle corrupted by transpilation · CSP blocking workers.
        // eslint-disable-next-line no-console
        console.error("[mapbox-gl]", e?.error?.message ?? e);
      }}
      style={{ width: "100%", height: "100%" }}
      mapStyle={MAPBOX_STYLE}
      attributionControl={false}
      reuseMaps
    >
      {/* ── GL Layers (order matters: heatmap first, then lines, then polygons) ── */}
      {heatmapEnabled   && <MapHeatmapLayer  data={TOURIST_HEATMAP_DATA}     />}
      {metroEnabled     && <MapMetroLayer    data={METRO_LINE_DATA}          />}
      {historicoEnabled && <MapPolygonLayer  data={HISTORIC_CENTER_POLYGON}  />}

      {isExplore ? (
        /* ── Explore mode · uniform pins · two-click pattern via onPinClick ──
         *   1st click → inspect (parent sets inspectedHotelId · pin glows)
         *   2nd click on same pin → commit (parent navigates to ?ref=<id>) */
        props.exploreHotels.map((hotel) => (
          <HotelMarker
            key={hotel.id}
            hotel={hotel}
            type="explore"
            isSelected={false}
            onSelect={() => { /* unused in explore mode */ }}
            isInspected={props.inspectedHotelId === hotel.id}
            onPinClick={props.onPinClick}
          />
        ))
      ) : (
        <>
          {/* ── Reference hotel pin ─────────────────────────────────────── *
           *  Reference pin never gets the inspected halo (it already has
           *  its own brand-color emphasis). Click still goes through
           *  onPinClick when provided · parent handles "subject clicked"
           *  semantics (typically clears competitor inspection).        */}
          <HotelMarker
            hotel={props.referenceHotel}
            type="reference"
            isSelected={popupHotelId === props.referenceHotel.id}
            onSelect={setPopupHotelId}
            onPinClick={props.onPinClick}
          />

          {/* ── Active competitor pins ──────────────────────────────────── */}
          {props.competitors.map((hotel) => (
            <HotelMarker
              key={hotel.id}
              hotel={hotel}
              type="competitor"
              isSelected={popupHotelId === hotel.id}
              onSelect={setPopupHotelId}
              isInspected={props.inspectedHotelId === hotel.id}
              onPinClick={props.onPinClick}
            />
          ))}

          {/* ── Suggested pins ──────────────────────────────────────────── */}
          {props.suggested.map((hotel) => (
            <HotelMarker
              key={hotel.id}
              hotel={hotel}
              type="suggested"
              isSelected={popupHotelId === hotel.id}
              onSelect={setPopupHotelId}
              isInspected={props.inspectedHotelId === hotel.id}
              onPinClick={props.onPinClick}
            />
          ))}
        </>
      )}
    </Map>
  );
}
