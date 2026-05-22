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
 * CAPAS panel data model · Phase 2.C.2 (2026-05-22 · operator-approved).
 *
 * AVUXI category sync via React→DOM click delegation proved unreliable
 * across 3 iterations · AVUXI's active-class signature was never
 * confirmed and tracked-intent drifted from AVUXI's real state on edge
 * cases. Operator directive: stop trying to sync · let AVUXI manage its
 * own categories via its native UI · CAPAS only owns the HV-native
 * polygon (Centro Histórico) plus the static pin legend (Hotel Ref +
 * CompSet · visual reference only · NOT toggleable).
 *
 * The Phase 2.C heatmap radio + metro toggle + HeatmapCategory union
 * have been removed entirely. If we ever bring back AVUXI controls,
 * it will be via a stable proxy pattern (e.g. AVUXI's own programmatic
 * API once they expose one) and NOT by re-implementing this DOM-coupling.
 */
export interface MapLayer {
  id: "historico";
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
