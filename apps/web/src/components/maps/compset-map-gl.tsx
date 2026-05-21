"use client";

/**
 * CompsetMapGL · institutional Mapbox surface for /compset + /report/*.
 *
 * Phase 2.A.3 · 2026-05-21 · AVUXI integration inlined byte-for-byte
 * from /experiment-avuxi. Operator constraint:
 *   "hacer que /compset renderice exactamente el mismo mapa que
 *    /experiment-avuxi · misma inicialización AVUXI · mismos heatmaps ·
 *    misma red de metro · mismas estaciones · mismos controles AVUXI"
 *
 * The previous architecture (separate <AvuxiOverlay> component lifted
 * via dynamic import) introduced enough indirection layers (useMap()
 * hook · dynamic chunk boundary · prop drilling · sibling-vs-child
 * positioning) that we got a client-side render exception we couldn't
 * diagnose remotely. This rewrite inlines AVUXI initialisation logic
 * directly here · same useState / useEffect / useCallback layout as
 * the experiment-avuxi page · zero indirection.
 */

import { useRef, useState, useEffect, useCallback } from "react";
import Map from "react-map-gl/mapbox";
import type { MapRef, MapMouseEvent } from "react-map-gl/mapbox";
import mapboxgl from "mapbox-gl";
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

// ── AVUXI · inlined from /experiment-avuxi ────────────────────────────────────

const AVUXI_SCRIPT_URL =
  "https://scripts.avuxi.com/travel/map-layers/latest/map-layers-for-mapbox.js";
const AVUXI_SCRIPT_ID = "fad4d930-e615-4c0c-9d15-e5f8fdd2224a";

interface AvuxiOptions {
  buttonOrientation?: "horizontal" | "vertical";
  buttonBackgroundColor?: string;
  buttonForegroundColor?: string;
  buttonLocation?: "tr" | "tl" | "br" | "bl";
  showLegend?: boolean;
  language?: string;
  showMetro?: boolean;
  defaultCategory?: string;
  initialZoom?: number;
  initialLocation?: { lat: number; lng: number };
  opacity?: number;
}

declare global {
  interface Window {
    AVUXI?: {
      mapStart: (
        mapInstance: unknown,
        mapboxglNamespace: unknown,
        scriptId: string,
        options: AvuxiOptions,
      ) => void;
    };
  }
}

// ── Props ─────────────────────────────────────────────────────────────────────

interface CompsetMapGLBaseProps {
  viewState: MapViewport;
  onViewStateChange: (vs: MapViewport) => void;
  layers: MapLayer[];
  /** Phase 2 feature flag · NEXT_PUBLIC_AVUXI_ENABLED.
   *  When true: skips ALL manual layers · injects + initialises AVUXI ·
   *  AVUXI native UI is left visible (top-right of map).
   *  When false (default): manual heatmap + metro + historic polygon
   *  render exactly as today · zero AVUXI footprint. */
  avuxi?: boolean;
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
  const [diagnosticError, setDiagnosticError] = useState<string | null>(null);
  const [styleLoaded, setStyleLoaded] = useState(false);

  // AVUXI state · mirror experiment-avuxi naming exactly
  const [avuxiGlobalReady, setAvuxiGlobalReady] = useState(false);
  const [mapStartStatus, setMapStartStatus] = useState<"idle" | "called" | "error">("idle");
  const [mapReady, setMapReady] = useState(false);

  const avuxi = props.avuxi ?? false;

  // QA #002 active diagnostic · server-side probe Mapbox endpoints from
  // the browser to surface 401/403/CORS/network failures visibly.
  useEffect(() => {
    if (!MAPBOX_TOKEN) return;
    let cancelled = false;
    const probes = [
      { name: "style.json", url: `https://api.mapbox.com/styles/v1/mapbox/light-v11?access_token=${MAPBOX_TOKEN}` },
      { name: "tile", url: `https://api.mapbox.com/styles/v1/mapbox/light-v11/tiles/14/8044/6212?access_token=${MAPBOX_TOKEN}` },
    ];
    (async () => {
      const results: string[] = [];
      for (const p of probes) {
        try {
          const r = await fetch(p.url, { method: "GET", mode: "cors" });
          results.push(`${p.name}=${r.status}`);
        } catch (e) {
          results.push(`${p.name}=ERR:${(e as Error).message?.slice(0, 40) ?? "unknown"}`);
        }
      }
      if (!cancelled) {
        // eslint-disable-next-line no-console
        console.log("[mapbox-probe]", results.join(" · "));
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // AVUXI · expose mapboxgl on window (SDK references it internally)
  useEffect(() => {
    if (!avuxi) return;
    if (typeof window === "undefined") return;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if (!(window as any).mapboxgl) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (window as any).mapboxgl = mapboxgl;
    }
  }, [avuxi]);

  // AVUXI · inject script once · idempotent across remounts
  useEffect(() => {
    if (!avuxi) return;
    if (typeof window === "undefined") return;
    if (window.AVUXI && typeof window.AVUXI.mapStart === "function") {
      setAvuxiGlobalReady(true);
      return;
    }
    // Reuse an in-flight script tag if another instance already injected it
    const existing = document.querySelector<HTMLScriptElement>(
      `script[src="${AVUXI_SCRIPT_URL}"]`,
    );
    const onScriptReady = () => {
      let attempts = 0;
      const probe = window.setInterval(() => {
        attempts++;
        if (window.AVUXI && typeof window.AVUXI.mapStart === "function") {
          window.clearInterval(probe);
          setAvuxiGlobalReady(true);
        } else if (attempts >= 30) {
          window.clearInterval(probe);
          // eslint-disable-next-line no-console
          console.error("[avuxi] window.AVUXI never appeared after 3s");
        }
      }, 100);
    };
    if (existing) {
      onScriptReady();
      return;
    }
    const script = document.createElement("script");
    script.src = AVUXI_SCRIPT_URL;
    script.async = true;
    script.onload = onScriptReady;
    script.onerror = () => {
      // eslint-disable-next-line no-console
      console.error("[avuxi] script failed to load");
    };
    document.body.appendChild(script);
  }, [avuxi]);

  // AVUXI · callMapStart · same guarded shape as experiment-avuxi
  const callMapStart = useCallback(() => {
    if (mapStartStatus !== "idle") return false;
    if (typeof window === "undefined") return false;
    if (!window.AVUXI || typeof window.AVUXI.mapStart !== "function") return false;
    const ref = mapRef.current;
    if (!ref) return false;
    const mapInstance = ref.getMap();
    if (!mapInstance) return false;
    if (typeof mapInstance.loaded === "function" && !mapInstance.loaded()) return false;
    try {
      // eslint-disable-next-line no-console
      console.log(
        "[avuxi] calling AVUXI.mapStart · container id:",
        mapInstance.getContainer()?.id || "(empty · SDK will no-op)",
      );
      window.AVUXI.mapStart(mapInstance, mapboxgl, AVUXI_SCRIPT_ID, {
        buttonOrientation: "vertical",
        buttonLocation: "tr",
        buttonBackgroundColor: "#ffffff",
        buttonForegroundColor: "#0E4B31",
        showLegend: true,
        language: "es",
        showMetro: true,
        defaultCategory: "eating",
        opacity: 60,
      });
      setMapStartStatus("called");
      // eslint-disable-next-line no-console
      console.log("[avuxi] AVUXI.mapStart returned · awaiting fetches");
      return true;
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error("[avuxi] mapStart threw:", e);
      setMapStartStatus("error");
      return false;
    }
  }, [mapStartStatus]);

  // AVUXI · auto-fire when preconditions ready (same shape as experiment-avuxi)
  useEffect(() => {
    if (!avuxi) return;
    if (mapStartStatus !== "idle") return;
    if (!avuxiGlobalReady) return;
    if (!mapReady) return;
    callMapStart();
  }, [avuxi, avuxiGlobalReady, mapReady, mapStartStatus, callMapStart]);

  if (!MAPBOX_TOKEN) return <TokenMissing />;

  const heatmapEnabled   = layers.find((l) => l.id === "heatmap")?.enabled   ?? false;
  const metroEnabled     = layers.find((l) => l.id === "metro")?.enabled     ?? false;
  const historicoEnabled = layers.find((l) => l.id === "historico")?.enabled ?? false;

  function handleMapClick(e: MapMouseEvent) {
    if (!(e.originalEvent.target as HTMLElement).closest(".hotel-popup")) {
      setPopupHotelId(null);
    }
  }

  const isExplore = props.mode === "explore";

  return (
    <>
    {/* QA #002 diagnostic banner */}
    {(diagnosticError || !styleLoaded) && (
      <div className="pointer-events-none absolute top-3 left-1/2 -translate-x-1/2 z-[60] max-w-[90%]">
        <div className={diagnosticError
          ? "pointer-events-auto bg-rose-50 border border-rose-300 text-rose-900 text-[11px] font-mono px-3 py-2 rounded-md shadow-lg"
          : "pointer-events-auto bg-amber-50 border border-amber-300 text-amber-900 text-[10px] font-mono px-3 py-1.5 rounded-md shadow-md opacity-80"
        }>
          {diagnosticError ? `Mapbox error: ${diagnosticError}` : "Map style loading…"}
        </div>
      </div>
    )}
    <Map
      id="hv-compset-mapbox-map"
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
      onLoad={() => {
        // eslint-disable-next-line no-console
        console.log("[mapbox-gl] map loaded");
        setMapReady(true);
      }}
      onStyleData={() => {
        if (!styleLoaded) {
          setStyleLoaded(true);
          // eslint-disable-next-line no-console
          console.log("[mapbox-gl] style data loaded");
        }
      }}
      onError={(e) => {
        const msg = e?.error?.message ?? "unknown error";
        // eslint-disable-next-line no-console
        console.error("[mapbox-gl]", e?.error ?? e);
        setDiagnosticError(msg);
      }}
      style={{ width: "100%", height: "100%" }}
      mapStyle={MAPBOX_STYLE}
      attributionControl={false}
      reuseMaps
    >
      {/* ── GL Layers · Phase 2.A validation rewrite ────────────────────────
       *  When avuxi=false (Production · flag OFF): manual heatmap + metro +
       *    historic polygon render as before · zero behavior change.
       *  When avuxi=true (Preview · flag ON): all manual layers skipped ·
       *    AVUXI initialisation runs in the parent effects · AVUXI's native
       *    UI is visible top-right of the map. */}
      {!avuxi && heatmapEnabled && <MapHeatmapLayer  data={TOURIST_HEATMAP_DATA} />}
      {!avuxi && metroEnabled   && <MapMetroLayer    data={METRO_LINE_DATA}     />}
      {!avuxi && historicoEnabled && <MapPolygonLayer data={HISTORIC_CENTER_POLYGON} />}

      {isExplore ? (
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
          <HotelMarker
            hotel={props.referenceHotel}
            type="reference"
            isSelected={popupHotelId === props.referenceHotel.id}
            onSelect={setPopupHotelId}
            onPinClick={props.onPinClick}
          />
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
    </>
  );
}
