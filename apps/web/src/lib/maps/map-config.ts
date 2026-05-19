import type { MapViewport } from "./types";

export const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN ?? "";

/** Mapbox Light style — clean institutional aesthetic */
export const MAPBOX_STYLE = "mapbox://styles/mapbox/light-v11";

/** Madrid Centro (Puerta del Sol) — default viewport · matches the
 * institutional Madrid Centro flow (/madrid-centro/*). Previous default
 * pointed at Sevilla which was a leftover from an earlier prototype. */
export const DEFAULT_VIEWPORT: MapViewport = {
  longitude: -3.7038,
  latitude:  40.4168,
  zoom:      14,
  pitch:     0,
  bearing:   0,
};

export const MAP_LAYER_IDS = {
  heatmapSource:    "tourist-heatmap-source",
  heatmapLayer:     "tourist-heatmap-layer",
  metroSource:      "metro-lines-source",
  metroLayer:       "metro-lines-layer",
  metroStations:    "metro-stations-layer",
  historicoSource:  "historico-source",
  historicoFill:    "historico-fill-layer",
  historicoStroke:  "historico-stroke-layer",
} as const;
