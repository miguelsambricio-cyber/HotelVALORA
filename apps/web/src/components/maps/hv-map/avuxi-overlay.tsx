"use client";

/**
 * <AvuxiOverlay> · Phase 2.A.2 · sibling-of-Map controller.
 *
 * Validation-stage rewrite 2026-05-21 (post-crash debug). The previous
 * iteration tried to read the Mapbox instance via `useMap()` from
 * INSIDE the `<Map>` subtree. That path led to an "Application error"
 * client-side exception on Preview (root cause unverified · likely
 * tied to `useMap()` timing inside a dynamic-imported child + `map.once`
 * call ordering). This version mirrors `/experiment-avuxi` byte-for-byte
 * which is known to work in production:
 *
 *   · No `useMap` hook · mapRef + mapReady passed in as props
 *   · No `mapInstance.once("load", …)` · we rely on the parent passing
 *     `mapReady=true` once Mapbox `onLoad` fires
 *   · Pure setTimeout polling for `window.AVUXI` after script injection
 *   · Component renders nothing · safe as a sibling of `<Map>`, no
 *     dependency on the Map context tree
 *
 * Operator constraint (2026-05-21):
 *   "Replicar exactamente el comportamiento funcional de /experiment-avuxi
 *    dentro de /compset · UI nativa AVUXI visible."
 */

import { useEffect, useRef, useState } from "react";
import mapboxgl from "mapbox-gl";
import type { MapRef } from "react-map-gl/mapbox";

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
  /** Master enable flag · when false the component is a no-op. */
  enabled?: boolean;
  /** Mapbox map ref from the parent's useRef · used to access the
   *  underlying mapbox-gl Map via .getMap(). */
  mapRef: React.RefObject<MapRef | null>;
  /** Parent should set this to true once Map `onLoad` has fired.
   *  We will not call AVUXI.mapStart until both this AND the AVUXI
   *  script are ready. */
  mapReady?: boolean;
}

export function AvuxiOverlay(props: AvuxiOverlayProps): React.ReactElement | null {
  const { enabled = false, mapRef, mapReady = false } = props;

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

  // Call AVUXI.mapStart once script + map are ready. Pure polling on
  // mapRef.current?.getMap() so we never call .once on the mapbox
  // instance. The polling stops as soon as we succeed or after a
  // bounded number of attempts.
  useEffect(() => {
    if (!enabled) return;
    if (!scriptReady) return;
    if (!mapReady) return;
    if (mapStartCalledRef.current) return;
    if (typeof window === "undefined") return;
    if (!window.AVUXI || typeof window.AVUXI.mapStart !== "function") return;

    let cancelled = false;
    let attempts = 0;

    const tryStart = () => {
      if (cancelled) return;
      attempts++;

      const ref = mapRef.current;
      if (!ref) {
        if (attempts < 40) window.setTimeout(tryStart, 100);
        return;
      }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const mapInstance = (ref as any).getMap ? (ref as any).getMap() : null;
      if (!mapInstance) {
        if (attempts < 40) window.setTimeout(tryStart, 100);
        return;
      }
      if (typeof mapInstance.loaded === "function" && !mapInstance.loaded()) {
        if (attempts < 40) window.setTimeout(tryStart, 100);
        return;
      }

      try {
        const containerId =
          typeof mapInstance.getContainer === "function"
            ? mapInstance.getContainer()?.id || "(empty)"
            : "(no getContainer)";
        // eslint-disable-next-line no-console
        console.log(
          "[avuxi-overlay] calling AVUXI.mapStart · container id:",
          containerId,
        );
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

    tryStart();

    return () => {
      cancelled = true;
    };
  }, [enabled, scriptReady, mapReady, mapRef]);

  return null;
}
