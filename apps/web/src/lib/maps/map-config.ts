import type { MapViewport } from "./types";

export const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN ?? "";

/** Mapbox Light style — clean institutional aesthetic */
export const MAPBOX_STYLE = "mapbox://styles/mapbox/light-v11";

/** Sevilla historic center — default viewport */
export const DEFAULT_VIEWPORT: MapViewport = {
  longitude: -5.9940,
  latitude:  37.3860,
  zoom:      15,
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
