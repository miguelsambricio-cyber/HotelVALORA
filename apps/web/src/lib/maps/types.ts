import type { FeatureCollection, Feature, Point, LineString, Polygon } from "geojson";

export type { FeatureCollection, Feature, Point, LineString, Polygon };

/** Controlled viewport state — mirrors react-map-gl ViewState */
export interface MapViewport {
  longitude: number;
  latitude: number;
  zoom: number;
  pitch: number;
  bearing: number;
}

/** GeoJSON FeatureCollection with typed point features for heatmap */
export type HeatmapGeoJSON = FeatureCollection<
  Point,
  { weight: number }
>;

/** GeoJSON FeatureCollection with typed line features for metro/routes */
export type LineGeoJSON = FeatureCollection<
  LineString,
  { color: string; name: string; width?: number }
>;

/** GeoJSON Feature with a polygon for zone overlays */
export type PolygonGeoJSON = Feature<
  Polygon,
  { name: string; fillColor: string; strokeColor: string; fillOpacity: number }
>;

/**
 * Shape for the future backend geo endpoint.
 * GET /api/v1/assets/hotels/{id}/compset/geo
 */
export interface CompsetGeoResponse {
  referenceHotel: { id: string; coordinates: [number, number] };
  competitors: Array<{ id: string; coordinates: [number, number] }>;
  suggested: Array<{ id: string; coordinates: [number, number] }>;
  heatmap?: HeatmapGeoJSON;
  metroLines?: LineGeoJSON;
  historicCenter?: PolygonGeoJSON;
}
