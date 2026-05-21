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
 * MapLayerId · the four institutional CAPAS toggles (Phase 2 · 2026-05-22).
 *
 * Internal IDs preserved across Phase 2:
 *   · "heatmap"   · drives the Demanda Turística toggle (AVUXI Sightseeing
 *                   when flag on · manual MapHeatmapLayer when flag off)
 *   · "eating"    · NEW · drives the Gastronomía toggle (AVUXI Eating when
 *                   flag on · no manual fallback when flag off · renders nothing)
 *   · "metro"     · drives the Conectividad toggle (AVUXI transit when flag
 *                   on · manual MapMetroLayer when flag off)
 *   · "historico" · drives the Centro Histórico toggle · HV-native
 *                   MapPolygonLayer · independent of AVUXI · unchanged
 *
 * Future categories reserved (NOT implemented · Phase 6+):
 *   Seguridad · Walkability · Demanda Corporativa · Mercado Hotelero
 */
export interface MapLayer {
  id: "heatmap" | "eating" | "metro" | "historico";
  label: string;
  enabled: boolean;
}

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
}
