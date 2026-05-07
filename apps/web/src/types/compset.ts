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

export type HotelPinType = "reference" | "competitor" | "suggested";

export interface MapLayer {
  id: "heatmap" | "metro" | "historico";
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
