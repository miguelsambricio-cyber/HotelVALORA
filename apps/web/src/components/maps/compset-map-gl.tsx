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

export interface CompsetMapGLProps {
  viewState: MapViewport;
  onViewStateChange: (vs: MapViewport) => void;
  referenceHotel: CompetitorHotel;
  competitors: CompetitorHotel[];
  suggested: CompetitorHotel[];
  layers: MapLayer[];
}

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

export function CompsetMapGL({
  viewState,
  onViewStateChange,
  referenceHotel,
  competitors,
  suggested,
  layers,
}: CompsetMapGLProps) {
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
      style={{ width: "100%", height: "100%" }}
      mapStyle={MAPBOX_STYLE}
      attributionControl={false}
      reuseMaps
    >
      {/* ── GL Layers (order matters: heatmap first, then lines, then polygons) ── */}
      {heatmapEnabled   && <MapHeatmapLayer  data={TOURIST_HEATMAP_DATA}     />}
      {metroEnabled     && <MapMetroLayer    data={METRO_LINE_DATA}          />}
      {historicoEnabled && <MapPolygonLayer  data={HISTORIC_CENTER_POLYGON}  />}

      {/* ── Reference hotel pin ─────────────────────────────────────────── */}
      <HotelMarker
        hotel={referenceHotel}
        type="reference"
        isSelected={popupHotelId === referenceHotel.id}
        onSelect={setPopupHotelId}
      />

      {/* ── Active competitor pins ──────────────────────────────────────── */}
      {competitors.map((hotel) => (
        <HotelMarker
          key={hotel.id}
          hotel={hotel}
          type="competitor"
          isSelected={popupHotelId === hotel.id}
          onSelect={setPopupHotelId}
        />
      ))}

      {/* ── Suggested pins ──────────────────────────────────────────────── */}
      {suggested.map((hotel) => (
        <HotelMarker
          key={hotel.id}
          hotel={hotel}
          type="suggested"
          isSelected={popupHotelId === hotel.id}
          onSelect={setPopupHotelId}
        />
      ))}
    </Map>
  );
}
