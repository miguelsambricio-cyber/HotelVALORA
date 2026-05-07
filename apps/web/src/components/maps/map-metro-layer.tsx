"use client";

import { Source, Layer } from "react-map-gl/mapbox";
import type { LineGeoJSON } from "@/lib/maps/types";
import { MAP_LAYER_IDS } from "@/lib/maps/map-config";

interface MapMetroLayerProps {
  data: LineGeoJSON;
}

export function MapMetroLayer({ data }: MapMetroLayerProps) {
  return (
    <Source id={MAP_LAYER_IDS.metroSource} type="geojson" data={data}>
      {/* Line casing (white outline for contrast) */}
      <Layer
        id={`${MAP_LAYER_IDS.metroLayer}-casing`}
        type="line"
        layout={{ "line-join": "round", "line-cap": "round" }}
        paint={{
          "line-color": "#ffffff",
          "line-width": ["*", ["coalesce", ["get", "width"], 2], 2.5],
          "line-opacity": 0.9,
        }}
      />
      {/* Coloured line */}
      <Layer
        id={MAP_LAYER_IDS.metroLayer}
        type="line"
        layout={{ "line-join": "round", "line-cap": "round" }}
        paint={{
          "line-color": ["coalesce", ["get", "color"], "#ef4444"],
          "line-width": ["coalesce", ["get", "width"], 2],
          "line-opacity": 0.85,
        }}
      />
    </Source>
  );
}
