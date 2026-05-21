"use client";

/**
 * <CompsetAvuxiPure> · Phase 2.A.4 · 2026-05-22.
 *
 * Operator directive (2026-05-22):
 *   "/compset debe renderizar exactamente el mismo mapa que /experiment-avuxi,
 *    utilizando el mismo código y la misma inicialización AVUXI. No quiero
 *    sincronización de botones, wrappers, overlays intermedios ni traducción
 *    de estados en esta fase."
 *
 * This is a literal byte-for-byte clone of the working AVUXI initialisation
 * core from `apps/web/src/app/experiment-avuxi/page.tsx` (validated 2026-05-21).
 *
 * Everything stripped that isn't part of the AVUXI mount:
 *   · LandingHeader · removed
 *   · city selector + flyTo · removed (hardcoded Madrid)
 *   · top-left badges · removed
 *   · bottom-left diagnostic panel (scriptId / interceptions / DOM
 *     inspector / category cycler / event log) · removed
 *   · fetch + XHR interceptors · removed
 *   · PerformanceObserver · removed
 *   · DOM MutationObserver · removed
 *
 * What remains is the exact same logic that produces the working AVUXI map:
 *   1. expose window.mapboxgl (AVUXI SDK reads it)
 *   2. inject the AVUXI script + poll for window.AVUXI
 *   3. callMapStart with the 4-arg signature once script + map are ready
 *   4. <div id="hv-compset-avuxi-host"> wrapping the Map for the SDK
 *      precondition `map.getContainer().id`
 *
 * AVUXI native UI (top-right vertical button strip) is left visible. The
 * HotelVALORA UI (CompetitorPanel, AssetSelectionPanel, MapLegend, pins)
 * will return on top of this in a later phase.
 */

import { useEffect, useRef, useState, useCallback } from "react";
import Map, { type MapRef } from "react-map-gl/mapbox";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { MAPBOX_TOKEN } from "@/lib/maps/map-config";
import { AVUXI_SCRIPT_ID, AVUXI_SCRIPT_URL } from "@/lib/maps/avuxi";

const MADRID = { lng: -3.7038, lat: 40.4168, zoom: 13 };

export function CompsetAvuxiPure() {
  const mapRef = useRef<MapRef>(null);
  const [scriptStatus, setScriptStatus] = useState<"idle" | "loading" | "loaded" | "error">("idle");
  const [mapStartStatus, setMapStartStatus] = useState<"idle" | "called" | "error">("idle");
  const [mapReady, setMapReady] = useState(false);
  const [avuxiGlobalReady, setAvuxiGlobalReady] = useState(false);

  // window.mapboxgl exposure · AVUXI SDK references it internally.
  // react-map-gl bundles mapbox-gl but does NOT attach to window ·
  // experiment-avuxi mirrors this exact pattern.
  useEffect(() => {
    if (typeof window === "undefined") return;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if (!(window as any).mapboxgl) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (window as any).mapboxgl = mapboxgl;
    }
  }, []);

  // Inject AVUXI script · poll for window.AVUXI on script onload.
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.AVUXI && typeof window.AVUXI.mapStart === "function") {
      setScriptStatus("loaded");
      setAvuxiGlobalReady(true);
      return;
    }
    setScriptStatus("loading");
    const script = document.createElement("script");
    script.src = AVUXI_SCRIPT_URL;
    script.async = true;
    script.onload = () => {
      setScriptStatus("loaded");
      let attempts = 0;
      const probe = window.setInterval(() => {
        attempts++;
        if (window.AVUXI && typeof window.AVUXI.mapStart === "function") {
          window.clearInterval(probe);
          setAvuxiGlobalReady(true);
        } else if (attempts >= 30) {
          window.clearInterval(probe);
          // eslint-disable-next-line no-console
          console.error("[compset-avuxi-pure] window.AVUXI never appeared after 3s");
        }
      }, 100);
    };
    script.onerror = () => setScriptStatus("error");
    document.body.appendChild(script);
  }, []);

  // callMapStart · same guards + same 4-arg call as experiment-avuxi.
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
        "[compset-avuxi-pure] calling AVUXI.mapStart · container id:",
        mapInstance.getContainer()?.id || "(empty)",
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
      console.log("[compset-avuxi-pure] AVUXI.mapStart returned · awaiting fetches");
      return true;
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error("[compset-avuxi-pure] mapStart threw:", e);
      setMapStartStatus("error");
      return false;
    }
  }, [mapStartStatus]);

  // Auto-fire when preconditions are satisfied.
  useEffect(() => {
    if (mapStartStatus !== "idle") return;
    if (!avuxiGlobalReady) return;
    if (!mapReady) return;
    callMapStart();
  }, [avuxiGlobalReady, mapReady, mapStartStatus, callMapStart]);

  if (!MAPBOX_TOKEN) {
    return (
      <div className="w-full h-full bg-slate-50 flex items-center justify-center text-slate-500 text-xs font-mono">
        NEXT_PUBLIC_MAPBOX_TOKEN missing
      </div>
    );
  }

  return (
    <div
      id="hv-compset-avuxi-host"
      className="absolute inset-0 z-0 bg-slate-200"
    >
      <Map
        id="hv-compset-avuxi-map"
        ref={mapRef}
        mapboxAccessToken={MAPBOX_TOKEN}
        initialViewState={{
          longitude: MADRID.lng,
          latitude: MADRID.lat,
          zoom: MADRID.zoom,
          pitch: 0,
          bearing: 0,
        }}
        style={{ width: "100%", height: "100%" }}
        mapStyle="mapbox://styles/mapbox/light-v11"
        attributionControl={false}
        reuseMaps
        onLoad={() => {
          // eslint-disable-next-line no-console
          console.log("[compset-avuxi-pure] mapbox-gl onLoad");
          setMapReady(true);
        }}
        onError={(e) => {
          // eslint-disable-next-line no-console
          console.error("[compset-avuxi-pure] mapbox-gl onError:", e?.error ?? e);
        }}
      />
      {/* Diagnostic status badge · removed in Phase 2.A.5 once validation closes. */}
      <div className="absolute top-3 left-3 z-30 text-[10px] font-mono px-2 py-1 rounded shadow bg-white/95 border border-slate-200 pointer-events-none">
        AVUXI: {scriptStatus} · map: {mapReady ? "ready" : "loading"} · start:{" "}
        {mapStartStatus}
      </div>
    </div>
  );
}
