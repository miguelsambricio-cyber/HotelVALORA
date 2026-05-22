"use client";

/**
 * CompsetMapGL · institutional Mapbox surface for /compset and /report/*.
 *
 * Phase 2.C.2 (2026-05-22 · operator-approved simplification):
 *
 *   · AVUXI is injected when the feature flag is ON and is fully
 *     self-managed via its OWN native UI (vertical button strip
 *     top-right · sightseeing / eating / shopping / nightlife /
 *     transport · metro). React does NOT try to drive AVUXI's
 *     categories any more.
 *   · The HotelVALORA CAPAS panel owns only the HV-native polygon
 *     (Centro Histórico) plus the static pin legend (Hotel Ref +
 *     CompSet · visual reference only).
 *   · No CSS hides AVUXI's UI · no click delegation · no DOM
 *     selectors · no tracked-intent refs · no MutationObserver.
 *     The 3 previous iterations of sync code (commits dcfc769,
 *     19f6cf7, 641f6d5) are all retired.
 *
 * Flag contract (NEXT_PUBLIC_AVUXI_ENABLED · parent passes via `avuxi`):
 *
 *   avuxi=true (Production today · Preview)
 *     · AVUXI script injected · mapStart with 4-arg signature ·
 *       AVUXI renders its categories + UI top-right
 *     · Centro Histórico polygon STILL renders · HV-native · independent
 *
 *   avuxi=false (rollback only · current Production has flag ON)
 *     · No AVUXI · just the Mapbox base + HV markers + Centro Histórico
 *     · Manual heatmap and manual metro are no longer rendered in
 *       either state · the corresponding `geo-data.ts` exports stay
 *       in the repo as dormant references in case we ever need them
 *       back, but they are NOT wired here.
 */

import { useRef, useState, useEffect, useCallback } from "react";
import Map from "react-map-gl/mapbox";
import type { MapRef, MapMouseEvent } from "react-map-gl/mapbox";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";

import { MAPBOX_TOKEN, MAPBOX_STYLE } from "@/lib/maps/map-config";
import { HISTORIC_CENTER_POLYGON } from "@/lib/maps/geo-data";
import { AVUXI_SCRIPT_ID, AVUXI_SCRIPT_URL } from "@/lib/maps/avuxi";
import type { MapViewport } from "@/lib/maps/types";
import type { CompetitorHotel, MapLayer } from "@/types/compset";

import { HotelMarker }      from "./hotel-marker";
import { MapPolygonLayer }  from "./map-polygon-layer";

// ── Props ─────────────────────────────────────────────────────────────────────

interface CompsetMapGLBaseProps {
  viewState: MapViewport;
  onViewStateChange: (vs: MapViewport) => void;
  layers: MapLayer[];
  /** Feature flag · NEXT_PUBLIC_AVUXI_ENABLED (parent reads env).
   *  When true · AVUXI mounts. AVUXI's own UI then manages its categories. */
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

  // AVUXI lifecycle state
  const [avuxiScriptReady, setAvuxiScriptReady] = useState(false);
  const [avuxiMapStartStatus, setAvuxiMapStartStatus] =
    useState<"idle" | "called" | "error">("idle");
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

  // AVUXI · expose mapboxgl on window (SDK references window.mapboxgl)
  useEffect(() => {
    if (!avuxi) return;
    if (typeof window === "undefined") return;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if (!(window as any).mapboxgl) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (window as any).mapboxgl = mapboxgl;
    }
  }, [avuxi]);

  // Belt-and-suspenders CSS fallback. If AVUXI's `showZoomControl: false`
  // option above fails to suppress the zoom container in some SDK version,
  // this hides it by id (`#zoom-control-container`) which the SDK source
  // assigns when the container is created.
  useEffect(() => {
    if (!avuxi) return;
    if (typeof document === "undefined") return;
    const STYLE_ID = "hv-avuxi-hide-zoom";
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = `
      #zoom-control-container,
      [id^='zoom-control-container'] {
        display: none !important;
      }
    `;
    document.head.appendChild(style);
  }, [avuxi]);

  // AVUXI · inject script once per session · poll for window.AVUXI on onload
  useEffect(() => {
    if (!avuxi) return;
    if (typeof window === "undefined") return;
    if (window.AVUXI && typeof window.AVUXI.mapStart === "function") {
      setAvuxiScriptReady(true);
      return;
    }
    const existing = document.querySelector<HTMLScriptElement>(
      `script[src="${AVUXI_SCRIPT_URL}"]`,
    );
    const onScriptReady = () => {
      let attempts = 0;
      const probe = window.setInterval(() => {
        attempts++;
        if (window.AVUXI && typeof window.AVUXI.mapStart === "function") {
          window.clearInterval(probe);
          setAvuxiScriptReady(true);
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

  // AVUXI · callMapStart with same guards as experiment-avuxi
  const callAvuxiMapStart = useCallback(() => {
    if (avuxiMapStartStatus !== "idle") return false;
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
        mapInstance.getContainer()?.id || "(empty)",
      );
      window.AVUXI.mapStart(mapInstance, mapboxgl, AVUXI_SCRIPT_ID, {
        // Phase 2.E layout (2026-05-22) · AVUXI moves to top-LEFT so the
        // right edge is fully reserved for the HV hotel selection panel.
        // HV zoom (previously top-left) relocates to a bottom-right
        // stack alongside CAPAS · no two providers share the same corner.
        buttonOrientation: "horizontal",
        buttonLocation: "tl",
        buttonBackgroundColor: "#ffffff",
        buttonForegroundColor: "#0E4B31",
        showLegend: true,
        language: "es",
        showMetro: true,
        defaultCategory: "sightseeing",
        opacity: 60,
        // AVUXI's own zoom (+/-) container is hidden · HV Mapbox zoom in
        // the top-left is the single zoom surface. Verified against the
        // AVUXI SDK source: the option exists, accepts boolean, default
        // is true (zoom shown). Set to false here.
        showZoomControl: false,
      });
      setAvuxiMapStartStatus("called");
      // eslint-disable-next-line no-console
      console.log("[avuxi] AVUXI.mapStart returned · AVUXI now manages its own UI");
      return true;
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error("[avuxi] mapStart threw:", e);
      setAvuxiMapStartStatus("error");
      return false;
    }
  }, [avuxiMapStartStatus]);

  // AVUXI · auto-fire when preconditions met
  useEffect(() => {
    if (!avuxi) return;
    if (avuxiMapStartStatus !== "idle") return;
    if (!avuxiScriptReady) return;
    if (!mapReady) return;
    callAvuxiMapStart();
  }, [avuxi, avuxiScriptReady, mapReady, avuxiMapStartStatus, callAvuxiMapStart]);

  if (!MAPBOX_TOKEN) return <TokenMissing />;

  const historicoEnabled = layers.find((l) => l.id === "historico")?.enabled ?? false;

  function handleMapClick(e: MapMouseEvent) {
    if (!(e.originalEvent.target as HTMLElement).closest(".hotel-popup")) {
      setPopupHotelId(null);
    }
  }

  const isExplore = props.mode === "explore";

  return (
    <>
    {/* QA #002 diagnostic banner · visible to operator without DevTools. */}
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
      {/* HV-native · Centro Histórico polygon · independent of AVUXI */}
      {historicoEnabled && <MapPolygonLayer data={HISTORIC_CENTER_POLYGON} />}

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
