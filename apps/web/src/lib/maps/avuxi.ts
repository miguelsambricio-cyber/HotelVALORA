/**
 * AVUXI · shared types + constants.
 *
 * Used by /experiment-avuxi (validation playground) and the
 * <CompsetAvuxiPure> mount in /compset. Centralising the global
 * Window augmentation prevents TS2717 ("Subsequent property
 * declarations must have the same type") when two surfaces declare
 * `window.AVUXI` with their own local AVUXIOptions interface.
 */

export const AVUXI_SCRIPT_ID = "fad4d930-e615-4c0c-9d15-e5f8fdd2224a";

export const AVUXI_SCRIPT_URL =
  "https://scripts.avuxi.com/travel/map-layers/latest/map-layers-for-mapbox.js";

export interface AvuxiOptions {
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
      /** Canonical 4-arg signature confirmed by SDK source audit
       *  2026-05-21: (mapInstance, mapboxgl-namespace, scriptId, options) */
      mapStart: (
        mapInstance: unknown,
        mapboxglNamespace: unknown,
        scriptId: string,
        options: AvuxiOptions,
      ) => void;
    };
  }
}
