"use client";

/**
 * <AvuxiInsideMap> · Phase 2 functional controller · child of <Map>.
 *
 * Lifted from `/experiment-avuxi` v9 baseline (validation surface ·
 * confirmed working 2026-05-21). Encapsulates the AVUXI Map Layers
 * for Mapbox integration so consuming surfaces never reference AVUXI
 * directly. CAPAS panel state drives this · AVUXI's own native UI
 * is CSS-hidden so CAPAS is the only end-user control surface.
 *
 * Responsibilities:
 *   1. Inject AVUXI script (idempotent · session-singleton)
 *   2. Wait for both window.AVUXI.mapStart + Map onLoad → call mapStart
 *      with the 4-arg signature: (map, mapboxgl, scriptId, options)
 *   3. Inject CSS rule that hides AVUXI's native control container
 *      (`.category-control-container { display: none !important; }`)
 *   4. React to CAPAS toggles · programmatically click AVUXI category
 *      buttons to match desired state · radio behavior for the two
 *      heatmap categories (only one active at a time)
 *
 * Operator constraints honoured (2026-05-22):
 *   · AVUXI native UI hidden · CAPAS único control surface
 *   · Radio behavior for sightseeing + eating (mutually exclusive)
 *   · No DOM mutations on AVUXI's own buttons · only event dispatch
 *   · Feature-flag gated · parent decides when to mount this component
 */

import { useEffect, useRef } from "react";
import mapboxgl from "mapbox-gl";
import { useMap } from "react-map-gl/mapbox";

const AVUXI_SCRIPT_URL =
  "https://scripts.avuxi.com/travel/map-layers/latest/map-layers-for-mapbox.js";
const AVUXI_SCRIPT_ID = "fad4d930-e615-4c0c-9d15-e5f8fdd2224a";
const HIDE_STYLE_ID = "hv-avuxi-hide-native";

/** Class-templated category container · matches eating | sightseeing | shopping | nightlife | food */
const AVUXI_CONTAINER_CLASS_RE = /^category-btn-container-(.+)$/;
const AVUXI_T_CONTAINER_CLASS_RE = /^category-btn-t-container-(.+)$/;
const AVUXI_METRO_ID_PREFIX = "category-control-container-metro-button";

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
    __hvAvuxiMounted?: boolean;
  }
}

export interface AvuxiOverlayProps {
  /** Phase 2 flag · when false the component renders nothing. */
  enabled?: boolean;
  /** CAPAS Demanda Turística toggle · drives AVUXI Sightseeing category. */
  sightseeingOn?: boolean;
  /** CAPAS Gastronomía toggle · drives AVUXI Eating category.
   *  Radio with sightseeing · operator constraint. */
  eatingOn?: boolean;
  /** CAPAS Conectividad toggle · drives AVUXI transport+metro. */
  transitOn?: boolean;
}

/* ─── DOM helpers · scoped to AVUXI's known DOM signature ──────────── */

function findCategoryButton(category: string): HTMLElement | null {
  const els = document.querySelectorAll<HTMLElement>(
    `[class*='category-btn-container-${category}'], [class*='category-btn-t-container-${category}']`,
  );
  return els[0] ?? null;
}

function findActiveHeatmapButton(): { el: HTMLElement; category: string } | null {
  const all = document.querySelectorAll<HTMLElement>(
    `[class*='category-btn-container-'], [class*='category-btn-t-container-']`,
  );
  for (const el of Array.from(all)) {
    // AVUXI marks active state via a class · we search heuristically
    // for any of "selected" / "active" / "on" in classList
    const cls = Array.from(el.classList);
    const isActive = cls.some((c) => /selected|active|on$|--on/i.test(c));
    if (!isActive) continue;
    for (const c of cls) {
      const m = c.match(AVUXI_CONTAINER_CLASS_RE) || c.match(AVUXI_T_CONTAINER_CLASS_RE);
      if (m) return { el, category: m[1].toLowerCase() };
    }
  }
  return null;
}

function findMetroButton(): HTMLElement | null {
  return document.querySelector<HTMLElement>(
    `[id^='${AVUXI_METRO_ID_PREFIX}']`,
  );
}

function isMetroActive(el: HTMLElement | null): boolean {
  if (!el) return false;
  return Array.from(el.classList).some((c) => /selected|active|on$|--on/i.test(c));
}

/* ─── Component ────────────────────────────────────────────────────── */

export function AvuxiOverlay(props: AvuxiOverlayProps): React.ReactElement | null {
  const { enabled = false, sightseeingOn = false, eatingOn = false, transitOn = false } = props;
  const { current: mapRef } = useMap();
  const mapInstance = mapRef?.getMap();

  const scriptInjectedRef = useRef(false);
  const mapStartCalledRef = useRef(false);
  const cssInjectedRef = useRef(false);

  // ─── Inject the CSS rule hiding AVUXI's native UI · once ──────────
  useEffect(() => {
    if (!enabled) return;
    if (cssInjectedRef.current) return;
    if (document.getElementById(HIDE_STYLE_ID)) {
      cssInjectedRef.current = true;
      return;
    }
    const style = document.createElement("style");
    style.id = HIDE_STYLE_ID;
    style.textContent = `
      /* Hide AVUXI's native control container · CAPAS is the only UI */
      .category-control-container {
        display: none !important;
        visibility: hidden !important;
      }
    `;
    document.head.appendChild(style);
    cssInjectedRef.current = true;
  }, [enabled]);

  // ─── Inject AVUXI script · once per session ────────────────────────
  useEffect(() => {
    if (!enabled) return;
    if (typeof window === "undefined") return;
    if (window.AVUXI && typeof window.AVUXI.mapStart === "function") return;
    if (scriptInjectedRef.current) return;
    scriptInjectedRef.current = true;
    const script = document.createElement("script");
    script.src = AVUXI_SCRIPT_URL;
    script.async = true;
    document.body.appendChild(script);
  }, [enabled]);

  // ─── Expose mapboxgl on window (AVUXI internals may reference it) ─
  useEffect(() => {
    if (!enabled) return;
    if (typeof window === "undefined") return;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if (!(window as any).mapboxgl) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (window as any).mapboxgl = mapboxgl;
    }
  }, [enabled]);

  // ─── Call AVUXI.mapStart once both script + map are ready ─────────
  useEffect(() => {
    if (!enabled) return;
    if (mapStartCalledRef.current) return;
    if (!mapInstance) return;
    if (typeof window === "undefined") return;

    // Poll for window.AVUXI · script may still be loading
    let cancelled = false;
    let attempts = 0;
    const tryStart = () => {
      if (cancelled) return;
      attempts++;
      if (!window.AVUXI || typeof window.AVUXI.mapStart !== "function") {
        if (attempts < 40) {
          window.setTimeout(tryStart, 100);
        }
        return;
      }
      if (typeof mapInstance.loaded === "function" && !mapInstance.loaded()) {
        // Map style not ready · wait for onLoad event
        if (attempts < 40) {
          window.setTimeout(tryStart, 100);
        }
        return;
      }
      try {
        window.AVUXI.mapStart(
          mapInstance,
          mapboxgl,
          AVUXI_SCRIPT_ID,
          {
            buttonOrientation: "vertical",
            buttonLocation: "tr",
            showLegend: false,
            language: "es",
            showMetro: true,
            defaultCategory: "sightseeing",
            opacity: 60,
          },
        );
        mapStartCalledRef.current = true;
      } catch (e) {
        // eslint-disable-next-line no-console
        console.error("[avuxi-overlay] mapStart threw:", e);
      }
    };
    tryStart();
    return () => {
      cancelled = true;
    };
  }, [enabled, mapInstance]);

  // ─── CAPAS · Demanda Turística (Sightseeing) toggle ───────────────
  useEffect(() => {
    if (!enabled || !mapStartCalledRef.current) return;
    if (sightseeingOn) {
      // Activate sightseeing · click button if not already active
      const active = findActiveHeatmapButton();
      if (active?.category !== "sightseeing") {
        // Click sightseeing button to activate
        const btn = findCategoryButton("sightseeing");
        btn?.click();
      }
    } else {
      // Deactivate sightseeing if it's the active one
      const active = findActiveHeatmapButton();
      if (active?.category === "sightseeing") {
        active.el.click();
      }
    }
  }, [enabled, sightseeingOn]);

  // ─── CAPAS · Gastronomía (Eating) toggle ──────────────────────────
  useEffect(() => {
    if (!enabled || !mapStartCalledRef.current) return;
    if (eatingOn) {
      const active = findActiveHeatmapButton();
      if (active?.category !== "eating") {
        const btn = findCategoryButton("eating");
        btn?.click();
      }
    } else {
      const active = findActiveHeatmapButton();
      if (active?.category === "eating") {
        active.el.click();
      }
    }
  }, [enabled, eatingOn]);

  // ─── CAPAS · Conectividad (Transit/Metro) toggle ──────────────────
  useEffect(() => {
    if (!enabled || !mapStartCalledRef.current) return;
    const metroBtn = findMetroButton();
    if (!metroBtn) return;
    const active = isMetroActive(metroBtn);
    if (transitOn && !active) {
      metroBtn.click();
    } else if (!transitOn && active) {
      metroBtn.click();
    }
  }, [enabled, transitOn]);

  // Renders nothing · pure controller
  return null;
}
