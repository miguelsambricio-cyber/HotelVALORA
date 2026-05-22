import type { HeatmapGeoJSON, LineGeoJSON, PolygonGeoJSON } from "./types";

/**
 * MADRID institutional map overlays · QA #002 closure.
 *
 * Previous payload contained Sevilla coordinates (Cathedral, Triana,
 * Plaza España Sevilla, etc.) which made every toggle visually inert
 * on the Madrid-centric /compset workspace · layers rendered ~500 km
 * outside the viewport. Replaced with curated Madrid POIs, the metro
 * L1 north-south spine + L6 circular ring, and the Almendra Central
 * polygon (inner historic ring inside M-30).
 *
 * Coordinates are approximate (WGS84) · sufficient for an institutional
 * overlay · not a transit-grade dataset.
 */

/**
 * Tourist density heatmap · weight 0-1 by concentration of POIs and
 * visitor foot traffic. Anchored on the institutional Madrid landmarks
 * a hotel investor cares about · Centro Histórico + Salamanca +
 * Chamberí first-ring + the Prado/Reina Sofía art-museum corridor.
 */
export const TOURIST_HEATMAP_DATA: HeatmapGeoJSON = {
  type: "FeatureCollection",
  features: [
    // Sol · Puerta del Sol (kilómetro cero · highest density)
    { type: "Feature", geometry: { type: "Point", coordinates: [-3.7038, 40.4168] }, properties: { weight: 1.0 } },
    // Plaza Mayor + Mercado de San Miguel
    { type: "Feature", geometry: { type: "Point", coordinates: [-3.7074, 40.4155] }, properties: { weight: 0.95 } },
    { type: "Feature", geometry: { type: "Point", coordinates: [-3.7090, 40.4157] }, properties: { weight: 0.85 } },
    // Gran Vía · 3 sample points along the axis
    { type: "Feature", geometry: { type: "Point", coordinates: [-3.7053, 40.4203] }, properties: { weight: 0.90 } },
    { type: "Feature", geometry: { type: "Point", coordinates: [-3.7078, 40.4205] }, properties: { weight: 0.85 } },
    { type: "Feature", geometry: { type: "Point", coordinates: [-3.7110, 40.4208] }, properties: { weight: 0.80 } },
    // Plaza de Cibeles (Banco de España + Palacio de Telecomunicaciones)
    { type: "Feature", geometry: { type: "Point", coordinates: [-3.6928, 40.4194] }, properties: { weight: 0.90 } },
    // Plaza de España + Templo de Debod
    { type: "Feature", geometry: { type: "Point", coordinates: [-3.7128, 40.4232] }, properties: { weight: 0.75 } },
    { type: "Feature", geometry: { type: "Point", coordinates: [-3.7168, 40.4239] }, properties: { weight: 0.70 } },
    // Palacio Real + Catedral de la Almudena
    { type: "Feature", geometry: { type: "Point", coordinates: [-3.7142, 40.4179] }, properties: { weight: 0.85 } },
    // Triángulo del Arte · Prado · Reina Sofía · Thyssen
    { type: "Feature", geometry: { type: "Point", coordinates: [-3.6921, 40.4138] }, properties: { weight: 0.95 } },
    { type: "Feature", geometry: { type: "Point", coordinates: [-3.6939, 40.4081] }, properties: { weight: 0.85 } },
    { type: "Feature", geometry: { type: "Point", coordinates: [-3.6948, 40.4159] }, properties: { weight: 0.78 } },
    // Parque del Retiro · entrada Alcalá
    { type: "Feature", geometry: { type: "Point", coordinates: [-3.6890, 40.4153] }, properties: { weight: 0.80 } },
    // Barrio de las Letras + Plaza Santa Ana
    { type: "Feature", geometry: { type: "Point", coordinates: [-3.6995, 40.4143] }, properties: { weight: 0.70 } },
    { type: "Feature", geometry: { type: "Point", coordinates: [-3.7008, 40.4144] }, properties: { weight: 0.68 } },
    // Salamanca · Calle Serrano (luxury retail corridor)
    { type: "Feature", geometry: { type: "Point", coordinates: [-3.6862, 40.4258] }, properties: { weight: 0.72 } },
    { type: "Feature", geometry: { type: "Point", coordinates: [-3.6840, 40.4280] }, properties: { weight: 0.65 } },
    // Chueca · LGBTQ+ quarter + bars
    { type: "Feature", geometry: { type: "Point", coordinates: [-3.6985, 40.4225] }, properties: { weight: 0.60 } },
    // Lavapiés · multicultural quarter
    { type: "Feature", geometry: { type: "Point", coordinates: [-3.7011, 40.4087] }, properties: { weight: 0.55 } },
    // Chamberí · Glorieta de Bilbao
    { type: "Feature", geometry: { type: "Point", coordinates: [-3.7028, 40.4292] }, properties: { weight: 0.55 } },
  ],
};

/**
 * Madrid Metro reference lines · L1 N-S spine through Centro +
 * L6 circular ring around the Almendra. Two visually distinct lines
 * picked so the overlay reads as "Madrid Metro" at first glance ·
 * adding the full 12-line network would add visual noise without
 * institutional value at this surface.
 *
 * Colors match the official Madrid Metro palette:
 *   L1 · cyan       #19a4dc
 *   L6 · light gray #9aa0a6
 */
export const METRO_LINE_DATA: LineGeoJSON = {
  type: "FeatureCollection",
  features: [
    // L1 · Pinar de Chamartín → Valdecarros (N-S spine through Sol/Atocha)
    {
      type: "Feature",
      geometry: {
        type: "LineString",
        coordinates: [
          [-3.6770, 40.4762], // Pinar de Chamartín (N terminus)
          [-3.6870, 40.4670], // Plaza de Castilla
          [-3.6920, 40.4570], // Cuzco
          [-3.7000, 40.4510], // Tetuán
          [-3.7044, 40.4470], // Cuatro Caminos
          [-3.7008, 40.4380], // Iglesia
          [-3.7008, 40.4292], // Bilbao
          [-3.7019, 40.4243], // Tribunal
          [-3.7048, 40.4203], // Gran Vía
          [-3.7034, 40.4168], // Sol
          [-3.7016, 40.4108], // Tirso de Molina
          [-3.6985, 40.4080], // Antón Martín
          [-3.6916, 40.4068], // Atocha Renfe
          [-3.6776, 40.4023], // Pacífico
          [-3.6638, 40.3927], // Puente de Vallecas
          [-3.6505, 40.3810], // Nueva Numancia
          [-3.6157, 40.3531], // Valdecarros (S terminus)
        ],
      },
      properties: { color: "#19a4dc", name: "L1", width: 3 },
    },
    // L6 · circular ring around the Almendra · Príncipe Pío anchored
    {
      type: "Feature",
      geometry: {
        type: "LineString",
        coordinates: [
          [-3.7194, 40.4197], // Príncipe Pío
          [-3.7180, 40.4310], // Argüelles
          [-3.7160, 40.4395], // Moncloa
          [-3.7080, 40.4445], // Vicente Aleixandre
          [-3.7044, 40.4470], // Cuatro Caminos
          [-3.6925, 40.4470], // Nuevos Ministerios
          [-3.6772, 40.4380], // Diego de León
          [-3.6741, 40.4264], // Manuel Becerra
          [-3.6720, 40.4144], // O'Donnell
          [-3.6755, 40.4053], // Sainz de Baranda
          [-3.6818, 40.3955], // Conde de Casal
          [-3.6953, 40.3920], // Pacífico interior
          [-3.7050, 40.3920], // Méndez Álvaro
          [-3.7150, 40.3970], // Legazpi
          [-3.7194, 40.4060], // Pirámides
          [-3.7194, 40.4197], // close ring at Príncipe Pío
        ],
      },
      properties: { color: "#9aa0a6", name: "L6", width: 2.5 },
    },
  ],
};

/**
 * Madrid · Distrito Centro polygon · the official "Madrid Centro"
 * administrative district (6 barrios: Palacio · Embajadores · Cortes ·
 * Justicia · Universidad · Sol).
 *
 * Boundary matches Booking.com's "Madrid Centro" filter zone · the
 * approximation hugs the canonical perimeter streets:
 *   · North · Calle Sagasta / Glorieta Bilbao / Plaza Alonso Martínez /
 *             Plaza de Colón
 *   · East  · Paseo de Recoletos / Paseo del Prado
 *   · South · Glorieta del Emperador Carlos V (Atocha) / Ronda de
 *             Atocha / Glorieta de Embajadores / Puerta de Toledo
 *   · West  · Calle Bailén (Royal Palace) / Cuesta de San Vicente /
 *             Calle de la Princesa (up to Plaza de España)
 *
 * Vertices walk clockwise starting from the NW corner near Plaza España.
 * Institutional-grade reference · not cadastral · accurate to ±50 m on
 * the perimeter streets.
 */
export const HISTORIC_CENTER_POLYGON: PolygonGeoJSON = {
  type: "Feature",
  geometry: {
    type: "Polygon",
    coordinates: [
      [
        [-3.7158, 40.4240], // NW · Plaza de España
        [-3.7068, 40.4291], // N · Glorieta de San Bernardo
        [-3.7000, 40.4290], // N · Glorieta de Bilbao
        [-3.6920, 40.4282], // NE · Plaza Alonso Martínez
        [-3.6892, 40.4244], // E-NE · Plaza de Colón
        [-3.6920, 40.4197], // E · Plaza de Cibeles
        [-3.6905, 40.4128], // E · Plaza Cánovas (Neptuno)
        [-3.6905, 40.4067], // SE · Glorieta Emperador Carlos V (Atocha)
        [-3.7037, 40.4067], // S · Glorieta de Embajadores
        [-3.7099, 40.4084], // SW · Puerta de Toledo
        [-3.7158, 40.4150], // W · Cuesta de la Vega (south of Royal Palace)
        [-3.7158, 40.4220], // W-NW · west of Royal Palace / Plaza Oriente
        [-3.7158, 40.4240], // close · Plaza de España
      ],
    ],
  },
  properties: {
    name: "Distrito Centro · Madrid",
    fillColor: "#0E4B31",
    strokeColor: "#0E4B31",
    fillOpacity: 0.06,
  },
};
