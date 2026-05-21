"use client";

import { useRef, useState, useEffect } from "react";
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

import dynamic from "next/dynamic";

import { HotelMarker }      from "./hotel-marker";
import { MapHeatmapLayer }  from "./map-heatmap-layer";
import { MapMetroLayer }    from "./map-metro-layer";
import { MapPolygonLayer }  from "./map-polygon-layer";

import type { AvuxiOverlayProps } from "./hv-map/avuxi-overlay";

// AvuxiOverlay loaded ONLY when the avuxi feature flag is ON · dynamic
// import prevents mapbox-gl static dep from bleeding into the default
// /report/competitive-set First Load. When flag OFF · this chunk is
// never fetched · zero behavior change vs pre-Phase-2 production.
const AvuxiOverlay = dynamic<AvuxiOverlayProps>(
  () => import("./hv-map/avuxi-overlay").then((m) => m.AvuxiOverlay),
  { ssr: false, loading: () => null },
);

// ── Props ─────────────────────────────────────────────────────────────────────

interface CompsetMapGLBaseProps {
  viewState: MapViewport;
  onViewStateChange: (vs: MapViewport) => void;
  layers: MapLayer[];
  /** Phase 2 feature flag (operator-controlled · NEXT_PUBLIC_AVUXI_ENABLED).
   *  When true: skips manual `<MapHeatmapLayer>` + `<MapMetroLayer>` ·
   *  mounts `<AvuxiOverlay>` child of `<Map>` driven by CAPAS toggles.
   *  When false (default): manual layers render as today · zero AVUXI footprint.
   *  Centro Histórico (`<MapPolygonLayer>`) is UNAFFECTED in both states. */
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
  const [diagnosticError, setDiagnosticError] = useState<string | null>(null);
  const [styleLoaded, setStyleLoaded] = useState(false);

  // QA #002 active diagnostic · server-side probe Mapbox endpoints from
  // the browser to surface 401/403/CORS/network failures visibly. Token
  // is NEXT_PUBLIC so probing it client-side carries the same auth
  // posture as mapbox-gl itself · this is the canonical signal.
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

  if (!MAPBOX_TOKEN) return <TokenMissing />;

  const heatmapEnabled   = layers.find((l) => l.id === "heatmap")?.enabled   ?? false;
  const metroEnabled     = layers.find((l) => l.id === "metro")?.enabled     ?? false;
  const historicoEnabled = layers.find((l) => l.id === "historico")?.enabled ?? false;
  const avuxi = props.avuxi ?? false;

  function handleMapClick(e: MapMouseEvent) {
    // Deselect popup when clicking on empty map area
    if (!(e.originalEvent.target as HTMLElement).closest(".hotel-popup")) {
      setPopupHotelId(null);
    }
  }

  const isExplore = props.mode === "explore";

  return (
    <>
    {/* QA #002 diagnostic banner · visible to operator without DevTools.
     *  Shows mapbox-gl errors as they happen + a style-not-loaded warning
     *  if we get to N seconds without `onStyleData` firing. Self-removes
     *  on style load. */}
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
      {/* ── GL Layers · Phase 2.A validation rewrite (2026-05-21) ──────────
       *
       *  When `avuxi=false` (Production · flag OFF):
       *    · Manual heatmap + metro + historic polygon render as before ·
       *      unchanged from pre-Phase-2 production behavior.
       *
       *  When `avuxi=true` (Preview · flag ON):
       *    · ALL manual layers temporarily removed for a clean AVUXI
       *      validation (operator request 2026-05-21 · "no quiero seguir
       *      depurando mientras todavía existan capas legacy mezcladas").
       *    · Only AvuxiOverlay mounts · AVUXI's native UI is left VISIBLE
       *      so the operator can validate sightseeing / eating / transport
       *      / metro stations render correctly against the raw SDK.
       *    · Centro Histórico polygon will return as an HV-native layer
       *      in a later commit once AVUXI is confirmed working.       */}
      {!avuxi && heatmapEnabled && <MapHeatmapLayer  data={TOURIST_HEATMAP_DATA} />}
      {!avuxi && metroEnabled   && <MapMetroLayer    data={METRO_LINE_DATA}     />}
      {!avuxi && historicoEnabled && <MapPolygonLayer data={HISTORIC_CENTER_POLYGON} />}

      {avuxi && <AvuxiOverlay enabled />}

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
    </>
  );
}
