"use client";

import { Source, Layer } from "react-map-gl/mapbox";
import type { HeatmapGeoJSON } from "@/lib/maps/types";
import { MAP_LAYER_IDS } from "@/lib/maps/map-config";

interface MapHeatmapLayerProps {
  data: HeatmapGeoJSON;
}

// mapbox-gl expression for heatmap colour ramp
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const HEATMAP_COLOR: any = [
  "interpolate",
  ["linear"],
  ["heatmap-density"],
  0,   "rgba(251, 191, 36, 0)",
  0.2, "rgba(251, 191, 36, 0.3)",
  0.4, "rgba(245, 158, 11, 0.5)",
  0.6, "rgba(217, 119,  6, 0.7)",
  0.8, "rgba(180,  83,  9, 0.85)",
  1.0, "rgba(146,  64, 14, 1.0)",
];

export function MapHeatmapLayer({ data }: MapHeatmapLayerProps) {
  return (
    <Source id={MAP_LAYER_IDS.heatmapSource} type="geojson" data={data}>
      <Layer
        id={MAP_LAYER_IDS.heatmapLayer}
        type="heatmap"
        paint={{
          "heatmap-weight":    ["interpolate", ["linear"], ["get", "weight"], 0, 0, 1, 1],
          "heatmap-intensity": ["interpolate", ["linear"], ["zoom"], 0, 1, 15, 3],
          "heatmap-color":     HEATMAP_COLOR,
          "heatmap-radius":    ["interpolate", ["linear"], ["zoom"], 0, 2, 15, 40],
          "heatmap-opacity":   ["interpolate", ["linear"], ["zoom"], 13, 0.8, 16, 0.4],
        }}
      />
    </Source>
  );
}
