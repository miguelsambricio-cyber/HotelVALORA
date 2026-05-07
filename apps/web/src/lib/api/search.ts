/**
 * Hotel search adapter — mock implementation.
 *
 * Real integration path:
 *   GET /api/v1/assets/hotels?search={query}&limit={limit}
 *   Response: PagedResponse<HotelListItem>
 *
 * To switch to real data, replace the function body of `searchHotels` with:
 *
 *   import { apiClient } from "./client";
 *   const res = await apiClient.get("/assets/hotels", {
 *     params: { search: query, limit },
 *   });
 *   return res.data.data.map((h) => ({
 *     id: h.id,
 *     name: h.name,
 *     city: h.city,
 *     country: h.country,
 *     brand: h.brand,
 *     star_rating: h.star_rating,
 *   }));
 */

import type { HotelSearchHit } from "@/types/hotel-search";

const MOCK_HOTELS: HotelSearchHit[] = [
  { id: "1", name: "Hotel Arts Barcelona",                   city: "Barcelona", country: "ES", brand: "Ritz-Carlton",          operator: "Marriott International",  star_rating: 5 },
  { id: "2", name: "Gran Hotel Havana",                      city: "Barcelona", country: "ES", brand: "Silken Hotels",          operator: "Silken Hotels",           star_rating: 5 },
  { id: "3", name: "W Barcelona",                            city: "Barcelona", country: "ES", brand: "W Hotels",               operator: "Marriott International",  star_rating: 5 },
  { id: "4", name: "Mandarin Oriental Barcelona",            city: "Barcelona", country: "ES", brand: "Mandarin Oriental",      operator: "Mandarin Oriental Group", star_rating: 5 },
  { id: "5", name: "Hotel Único Madrid",                     city: "Madrid",    country: "ES", brand: null,                    operator: "Small Luxury Hotels",     star_rating: 5 },
  { id: "6", name: "Four Seasons Hotel Madrid",              city: "Madrid",    country: "ES", brand: "Four Seasons",           operator: "Four Seasons Hotels",     star_rating: 5 },
  { id: "7", name: "Palacio de los Duques Gran Meliá",       city: "Madrid",    country: "ES", brand: "Gran Meliá",             operator: "Meliá Hotels International", star_rating: 5 },
  { id: "8", name: "Hotel The Westin Palace Madrid",         city: "Madrid",    country: "ES", brand: "Westin",                 operator: "Marriott International",  star_rating: 5 },
  { id: "9", name: "Vincci Selección La Plantación del Sur", city: "Tenerife",  country: "ES", brand: "Vincci",                 operator: "Vincci Hotels",           star_rating: 5 },
  { id: "10", name: "Hospes Palacio del Bailío",             city: "Córdoba",   country: "ES", brand: "Hospes",                 operator: "Hospes Hotels",           star_rating: 5 },
  { id: "11", name: "Eurostars Grand Marina Hotel",          city: "Barcelona", country: "ES", brand: "Eurostars",              operator: "Grupo Hotusa",            star_rating: 5 },
  { id: "12", name: "NH Collection Gran Hotel de Zaragoza",  city: "Zaragoza",  country: "ES", brand: "NH Collection",          operator: "NH Hotel Group",          star_rating: 4 },
];

export async function searchHotels(
  query: string,
  limit = 6
): Promise<HotelSearchHit[]> {
  // Simulate realistic network latency
  await new Promise((r) => setTimeout(r, 120 + Math.random() * 80));

  const q = query.toLowerCase().trim();
  if (!q) return [];

  return MOCK_HOTELS.filter(
    (h) =>
      h.name.toLowerCase().includes(q) ||
      h.city.toLowerCase().includes(q) ||
      h.operator?.toLowerCase().includes(q) ||
      h.brand?.toLowerCase().includes(q)
  ).slice(0, limit);
}
