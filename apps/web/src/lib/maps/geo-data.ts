import type { HeatmapGeoJSON, LineGeoJSON, PolygonGeoJSON } from "./types";

/**
 * Tourist density heatmap — clustered around Sevilla's main attractions.
 * Real endpoint: GET /api/v1/maps/heatmap?city=sevilla&type=tourist
 */
export const TOURIST_HEATMAP_DATA: HeatmapGeoJSON = {
  type: "FeatureCollection",
  features: [
    // Cathedral + Giralda (highest density)
    { type: "Feature", geometry: { type: "Point", coordinates: [-5.9926, 37.3861] }, properties: { weight: 1.0 } },
    { type: "Feature", geometry: { type: "Point", coordinates: [-5.9921, 37.3858] }, properties: { weight: 0.9 } },
    { type: "Feature", geometry: { type: "Point", coordinates: [-5.9930, 37.3865] }, properties: { weight: 0.85 } },
    // Real Alcázar
    { type: "Feature", geometry: { type: "Point", coordinates: [-5.9913, 37.3833] }, properties: { weight: 0.95 } },
    { type: "Feature", geometry: { type: "Point", coordinates: [-5.9908, 37.3825] }, properties: { weight: 0.8 } },
    // Barrio de Santa Cruz (dense tourist area)
    { type: "Feature", geometry: { type: "Point", coordinates: [-5.9915, 37.3848] }, properties: { weight: 0.75 } },
    { type: "Feature", geometry: { type: "Point", coordinates: [-5.9920, 37.3842] }, properties: { weight: 0.7 } },
    { type: "Feature", geometry: { type: "Point", coordinates: [-5.9910, 37.3855] }, properties: { weight: 0.65 } },
    { type: "Feature", geometry: { type: "Point", coordinates: [-5.9905, 37.3840] }, properties: { weight: 0.6 } },
    // Torre del Oro
    { type: "Feature", geometry: { type: "Point", coordinates: [-5.9972, 37.3829] }, properties: { weight: 0.7 } },
    { type: "Feature", geometry: { type: "Point", coordinates: [-5.9968, 37.3835] }, properties: { weight: 0.55 } },
    // Plaza de España
    { type: "Feature", geometry: { type: "Point", coordinates: [-5.9869, 37.3773] }, properties: { weight: 0.8 } },
    { type: "Feature", geometry: { type: "Point", coordinates: [-5.9875, 37.3780] }, properties: { weight: 0.65 } },
    // Plaza Nueva / Centro comercial
    { type: "Feature", geometry: { type: "Point", coordinates: [-5.9972, 37.3869] }, properties: { weight: 0.6 } },
    { type: "Feature", geometry: { type: "Point", coordinates: [-5.9964, 37.3875] }, properties: { weight: 0.55 } },
    // Archivo de Indias
    { type: "Feature", geometry: { type: "Point", coordinates: [-5.9930, 37.3856] }, properties: { weight: 0.72 } },
    // Museo de Bellas Artes area
    { type: "Feature", geometry: { type: "Point", coordinates: [-6.0002, 37.3889] }, properties: { weight: 0.5 } },
    // Las Setas (Metropol Parasol)
    { type: "Feature", geometry: { type: "Point", coordinates: [-5.9938, 37.3924] }, properties: { weight: 0.65 } },
  ],
};

/**
 * Sevilla Metro Line 1 — simplified route through the historic center.
 * Real endpoint: GET /api/v1/maps/transit?city=sevilla
 */
export const METRO_LINE_DATA: LineGeoJSON = {
  type: "FeatureCollection",
  features: [
    {
      type: "Feature",
      geometry: {
        type: "LineString",
        // Line 1: Olivar de Quintos → Mairena del Aljarafe (W-SE axis)
        coordinates: [
          [-6.0550, 37.3715], // Mairena del Aljarafe (W terminus)
          [-6.0380, 37.3740],
          [-6.0220, 37.3780],
          [-6.0080, 37.3830], // Ciudad Expo
          [-5.9985, 37.3865], // Plaza de Cuba
          [-5.9960, 37.3870], // Centro (near Puerta Jerez)
          [-5.9940, 37.3860], // Puerta Jerez
          [-5.9900, 37.3840], // San Bernardo
          [-5.9850, 37.3810],
          [-5.9800, 37.3780], // Nervión
          [-5.9710, 37.3720], // Gran Plaza
          [-5.9610, 37.3650], // Olivar de Quintos (SE terminus)
        ],
      },
      properties: { color: "#ef4444", name: "Línea 1", width: 3 },
    },
    {
      type: "Feature",
      geometry: {
        type: "LineString",
        // Future Line 2 (planned N-S axis through centro)
        coordinates: [
          [-5.9942, 37.4060], // Norte (planned)
          [-5.9940, 37.3980],
          [-5.9938, 37.3924], // Las Setas
          [-5.9935, 37.3880], // Alameda
          [-5.9930, 37.3840], // Centro Norte
          [-5.9925, 37.3800],
          [-5.9920, 37.3750], // Sur
        ],
      },
      properties: { color: "#3b82f6", name: "Línea 2", width: 2 },
    },
  ],
};

/**
 * Sevilla Centro Histórico boundary polygon (approximate).
 * Real endpoint: GET /api/v1/maps/zones?city=sevilla&zone=historico
 */
export const HISTORIC_CENTER_POLYGON: PolygonGeoJSON = {
  type: "Feature",
  geometry: {
    type: "Polygon",
    coordinates: [
      [
        [-6.0025, 37.3912], // NW — near Plaza Nueva
        [-5.9860, 37.3940], // NE — near Alameda Hércules
        [-5.9800, 37.3860], // E — Nervión
        [-5.9820, 37.3780], // SE — near Prado de San Sebastián
        [-5.9900, 37.3750], // S — near Torre del Oro
        [-5.9995, 37.3760], // SW — near Parque María Luisa
        [-6.0070, 37.3820], // W — Triana bridge
        [-6.0060, 37.3880], // W-NW
        [-6.0025, 37.3912], // close polygon
      ],
    ],
  },
  properties: {
    name: "Centro Histórico",
    fillColor: "#0E4B31",
    strokeColor: "#0E4B31",
    fillOpacity: 0.04,
  },
};
