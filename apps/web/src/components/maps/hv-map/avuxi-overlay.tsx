"use client";

/**
 * <AvuxiOverlay> · Phase 2.A · pure AVUXI mount · child of <Map>.
 *
 * Validation-stage rewrite 2026-05-21 (Option A · operator-approved).
 * Mirrors `/experiment-avuxi` byte-for-byte: AVUXI's native UI is left
 * VISIBLE, no CSS hide, no React→AVUXI sync, no DOM click delegation.
 * Only responsibility: inject script + call mapStart once · everything
 * else is AVUXI's own UI driving its own state.
 *
 * Earlier (Phase 2 pre-validation) this component also:
 *   · Injected CSS to hide `.category-control-container`
 *   · Mirrored 3 CAPAS toggle states via `findCategoryButton(...).click()`
 *   · Used heuristic regex `/selected|active|on$/` for active state
 * Those layers were brittle (AVUXI exposes no programmatic category
 * API · synthetic clicks on display:none buttons were unreliable) and
 * blocked validation of whether AVUXI itself was rendering correctly.
 * Removed temporarily. Future Phase 2.B may re-introduce a CAPAS proxy
 * AFTER per-category DOM identifiers are confirmed by the v9 inspector
 * in /experiment-avuxi.
 *
 * mapStart options match /experiment-avuxi exactly:
 *   showLegend: true · defaultCategory: "eating" · button colors set ·
 *   buttonLocation: "tr" · showMetro: true · language: "es" · opacity: 60
 */

import { useEffect, useRef, useState } from "react";
import mapboxgl from "mapbox-gl";
import { useMap } from "react-map-gl/mapbox";

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

export interface AvuxiOverlayProps {
  /** When false the component renders nothing · zero side effects. */
  enabled?: boolean;
}

export function AvuxiOverlay(props: AvuxiOverlayProps): React.ReactElement | null {
  const { enabled = false } = props;
  const { current: mapRef } = useMap();
  const mapInstance = mapRef?.getMap();

  const scriptInjectedRef = useRef(false);
  const mapStartCalledRef = useRef(false);
  const [scriptReady, setScriptReady] = useState(false);

  // Expose mapboxgl on window · AVUXI SDK references window.mapboxgl
  // internally. react-map-gl bundles mapbox-gl but doesn't attach to
  // window · mirror the experiment-avuxi pattern.
  useEffect(() => {
    if (!enabled) return;
    if (typeof window === "undefined") return;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if (!(window as any).mapboxgl) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (window as any).mapboxgl = mapboxgl;
    }
  }, [enabled]);

  // Inject AVUXI script · once per session · poll for window.AVUXI
  // after onload before declaring ready (same as experiment-avuxi).
  useEffect(() => {
    if (!enabled) return;
    if (typeof window === "undefined") return;
    if (window.AVUXI && typeof window.AVUXI.mapStart === "function") {
      setScriptReady(true);
      return;
    }
    if (scriptInjectedRef.current) return;
    scriptInjectedRef.current = true;
    const script = document.createElement("script");
    script.src = AVUXI_SCRIPT_URL;
    script.async = true;
    script.onload = () => {
      let attempts = 0;
      const probe = window.setInterval(() => {
        attempts++;
        if (window.AVUXI && typeof window.AVUXI.mapStart === "function") {
          window.clearInterval(probe);
          setScriptReady(true);
        } else if (attempts >= 30) {
          window.clearInterval(probe);
          // eslint-disable-next-line no-console
          console.error("[avuxi-overlay] window.AVUXI never appeared after 3s");
        }
      }, 100);
    };
    script.onerror = () => {
      // eslint-disable-next-line no-console
      console.error("[avuxi-overlay] script failed to load");
    };
    document.body.appendChild(script);
  }, [enabled]);

  // Call AVUXI.mapStart once both script + map are ready · 4-arg
  // signature confirmed by SDK source audit 2026-05-21:
  //   (mapInstance, mapboxgl-namespace, scriptId, options)
  useEffect(() => {
    if (!enabled) return;
    if (mapStartCalledRef.current) return;
    if (!scriptReady) return;
    if (!mapInstance) return;
    if (typeof window === "undefined") return;
    if (!window.AVUXI || typeof window.AVUXI.mapStart !== "function") return;

    // Wait for map style to be ready · AVUXI needs the style loaded
    // before adding its sources/layers
    const callMapStart = () => {
      if (mapStartCalledRef.current) return;
      try {
        // eslint-disable-next-line no-console
        console.log("[avuxi-overlay] calling AVUXI.mapStart · container id:",
          mapInstance.getContainer()?.id || "(empty · SDK will no-op)");
        window.AVUXI!.mapStart(mapInstance, mapboxgl, AVUXI_SCRIPT_ID, {
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
        mapStartCalledRef.current = true;
        // eslint-disable-next-line no-console
        console.log("[avuxi-overlay] AVUXI.mapStart returned · awaiting fetches");
      } catch (e) {
        // eslint-disable-next-line no-console
        console.error("[avuxi-overlay] mapStart threw:", e);
      }
    };

    if (typeof mapInstance.loaded === "function" && mapInstance.loaded()) {
      callMapStart();
    } else {
      mapInstance.once("load", callMapStart);
    }
  }, [enabled, scriptReady, mapInstance]);

  return null;
}
