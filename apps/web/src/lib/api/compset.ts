import type { CompetitorHotel, MapLayer } from "@/types/compset";

export const REFERENCE_HOTEL: CompetitorHotel = {
  id: "ref-001",
  name: "Hotel Las Casas de la Judería",
  city: "Sevilla",
  address: "Callejón Dos Hermanas, 7",
  stars: 4,
  adr: 185,
  revpar: 138,
  occupancy: 74,
  category: "Urban Luxury",
  coordinates: { lng: -5.9927, lat: 37.3845 },
};

export const MOCK_ACTIVE_COMPETITORS: CompetitorHotel[] = [
  {
    id: "comp-001",
    name: "Hotel Alfonso XIII",
    city: "Sevilla",
    address: "Calle San Fernando, 2",
    stars: 5,
    adr: 420,
    revpar: 315,
    occupancy: 75,
    category: "Luxury",
    brand: "Marriott",
    coordinates: { lng: -5.9950, lat: 37.3820 },
  },
  {
    id: "comp-002",
    name: "Hotel Mercer Sevilla",
    city: "Sevilla",
    address: "Calle Castelar, 26",
    stars: 5,
    adr: 310,
    revpar: 248,
    occupancy: 80,
    category: "Boutique Luxury",
    coordinates: { lng: -5.9938, lat: 37.3897 },
  },
  {
    id: "comp-003",
    name: "EME Catedral Hotel",
    city: "Sevilla",
    address: "Calle Alemanes, 27",
    stars: 5,
    adr: 265,
    revpar: 198,
    occupancy: 75,
    category: "Design Hotel",
    coordinates: { lng: -5.9921, lat: 37.3865 },
  },
];

export const MOCK_SUGGESTED_COMPETITORS: CompetitorHotel[] = [
  {
    id: "sugg-001",
    name: "Hotel Palacio de Villapanés",
    city: "Sevilla",
    address: "Calle Santiago, 31",
    stars: 5,
    adr: 290,
    revpar: 218,
    occupancy: 75,
    category: "Palace Hotel",
    coordinates: { lng: -5.9940, lat: 37.3884 },
  },
  {
    id: "sugg-002",
    name: "Gran Meliá Colón",
    city: "Sevilla",
    address: "Canalejas, 1",
    stars: 5,
    adr: 245,
    revpar: 184,
    occupancy: 75,
    category: "Urban Luxury",
    brand: "Meliá",
    coordinates: { lng: -5.9951, lat: 37.3862 },
  },
];

export const DEFAULT_LAYERS: MapLayer[] = [
  { id: "heatmap",   label: "Heatmap",         enabled: true },
  { id: "metro",     label: "Líneas de Metro",  enabled: true },
  { id: "historico", label: "Centro Histórico", enabled: true },
];

/**
 * Fetches the compset for a given reference hotel.
 * Real endpoint: GET /api/v1/assets/hotels/{id}/compset
 */
export async function fetchCompset(_hotelId: string) {
  // TODO: replace with real API call when endpoint is ready
  await new Promise<void>((r) => setTimeout(r, 400));
  return {
    referenceHotel: REFERENCE_HOTEL,
    competitors:    MOCK_ACTIVE_COMPETITORS,
    suggested:      MOCK_SUGGESTED_COMPETITORS,
  };
}
