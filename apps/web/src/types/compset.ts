/** Slim hotel record used within the competitor selection workflow. */
export interface CompetitorHotel {
  id: string;
  name: string;
  city: string;
  address?: string;
  stars: number;
  /** Average Daily Rate in EUR */
  adr: number;
  /** Revenue Per Available Room in EUR */
  revpar: number;
  /** Occupancy rate 0–100 */
  occupancy: number;
  /** Market segment label */
  category: string;
  brand?: string;
  /** Real geographic coordinates for Mapbox */
  coordinates: { lng: number; lat: number };
}

export type HotelPinType = "reference" | "competitor" | "suggested" | "explore";

/**
 * CAPAS panel data model · Phase 2.C (2026-05-22).
 *
 * Single CAPAS surface, no native AVUXI UI. Three independent layer
 * groups in the panel:
 *
 *   HEATMAP DE ATRACCIÓN
 *     · `heatmap.enabled`  · master ON/OFF
 *     · `heatmap.category` · radio of 5 AVUXI categories · the chosen
 *       one drives both the AVUXI button-click delegation and the
 *       manual fallback (manual only has data for "sightseeing"; other
 *       categories render nothing when AVUXI is OFF)
 *
 *   MOVILIDAD
 *     · `metro.enabled` · drives the AVUXI metro layer (button)
 *
 *   ZONIFICACIÓN
 *     · `historico.enabled` · HV-native MapPolygonLayer · independent
 *       of AVUXI · same as today
 *
 * AVUXI free-tier exposes one heatmap category at a time, so the
 * radio model is honest about the underlying constraint. The previous
 * 4-toggle shape ("heatmap"/"eating"/"metro"/"historico") with
 * mutually-exclusive heatmap pair is retired here.
 */
export type HeatmapCategory =
  | "sightseeing"
  | "eating"
  | "shopping"
  | "nightlife"
  | "transport";

interface HeatmapLayer {
  id: "heatmap";
  label: string;
  enabled: boolean;
  category: HeatmapCategory;
}

interface SimpleLayer {
  id: "metro" | "historico";
  label: string;
  enabled: boolean;
}

export type MapLayer = HeatmapLayer | SimpleLayer;
export type MapLayerId = MapLayer["id"];

export interface UseCompsetReturn {
  referenceHotel: CompetitorHotel;
  competitors: CompetitorHotel[];
  suggested: CompetitorHotel[];
  layers: MapLayer[];
  isLoading: boolean;
  error: string | null;
  panelOpen: boolean;
  setPanelOpen: (open: boolean) => void;
  addCompetitor: (hotel: CompetitorHotel) => void;
  removeCompetitor: (id: string) => void;
  toggleLayer: (id: MapLayerId) => void;
  setHeatmapCategory: (category: HeatmapCategory) => void;
}
