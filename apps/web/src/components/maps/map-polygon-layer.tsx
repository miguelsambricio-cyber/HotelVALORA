"use client";

import { Source, Layer } from "react-map-gl/mapbox";
import type { PolygonGeoJSON } from "@/lib/maps/types";
import { MAP_LAYER_IDS } from "@/lib/maps/map-config";

interface MapPolygonLayerProps {
  data: PolygonGeoJSON;
}

export function MapPolygonLayer({ data }: MapPolygonLayerProps) {
  const { fillColor, strokeColor, fillOpacity } = data.properties;

  return (
    <Source id={MAP_LAYER_IDS.historicoSource} type="geojson" data={data}>
      {/* Fill */}
      <Layer
        id={MAP_LAYER_IDS.historicoFill}
        type="fill"
        paint={{
          "fill-color":   fillColor,
          "fill-opacity": fillOpacity,
        }}
      />
      {/* Dashed stroke */}
      <Layer
        id={MAP_LAYER_IDS.historicoStroke}
        type="line"
        layout={{ "line-join": "round", "line-cap": "round" }}
        paint={{
          "line-color":     strokeColor,
          "line-width":     2,
          "line-opacity":   0.5,
          "line-dasharray": [6, 4],
        }}
      />
    </Source>
  );
}
