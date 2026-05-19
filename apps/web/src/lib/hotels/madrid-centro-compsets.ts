/**
 * Per-hotel competitive set registry · Phase F
 *
 * Each Madrid Centro hotel in the registry gets a curated competitive
 * set consistent with its submarket and category. Sets are anonymised
 * ("Reference" suffix · alphabetic differentiation) to stay consistent
 * with the project-wide illustrative-dataset disclosure.
 *
 * Assumptions (documented · 2026-05-19):
 *   · Each set has 5 competitors · matches the canonical mock shape.
 *   · Competitors mix the hotel's own submarket with adjacent ones
 *     (e.g. Centro 4★ → some Centro + some Sol + some Gran Vía to
 *     reflect institutional CompSet construction).
 *   · Star ratings: ±0 from subject (Centro 4★ vs 4★; Salamanca 5★
 *     vs 5★; Chamberí 5★ vs 5★ boutique tier).
 *   · Key counts plausible for each category (4★ → 120-280; 5★ urban
 *     → 90-220; 5★ boutique → 60-130).
 *   · Distances are realistic walking-radius (subject is within 1.5 km
 *     for direct comparables · up to 2.5 km for adjacent-submarket comps).
 *   · `locationScore` 8.0-9.5 range · subject scoring intentionally
 *     middle-of-pack to keep the CompSet honest.
 *
 * Replace this file with a Supabase query against the canonical hotel
 * intelligence layer (Phase 6+ of bootstrap plan) when live data lands.
 */

import type { CompetitorProperty } from "../report/competitive-set-data";
import type { HotelId } from "./madrid-centro-registry";

/** Internal · the subject row id is always "subject"; competitors get hotel-specific ids. */
type CompetitorTemplate = Omit<CompetitorProperty, "id" | "isSubject"> & { id: string };

/** Centro 4★ · 240 keys subject · CompSet weighted toward Sol / Gran Vía 4★ upscale. */
const CENTRO_4STAR_COMPETITORS: CompetitorTemplate[] = [
  {
    id: "centro-comp-a",
    name: "Centro Sol Reference (4★ A)",
    stars: 4,
    keys: 218,
    submarket: "Madrid Centro",
    facilities: { bar: true, restaurant: true, rooftop: true, meeting: true, gym: true, spa: false },
    locationScore: 8.7,
    distance: "420 m",
  },
  {
    id: "centro-comp-b",
    name: "Gran Vía Heritage Reference (4★ B)",
    stars: 4,
    keys: 286,
    submarket: "Madrid Centro",
    facilities: { bar: true, restaurant: true, rooftop: false, meeting: true, gym: true, spa: false },
    locationScore: 8.4,
    distance: "650 m",
  },
  {
    id: "centro-comp-c",
    name: "Centro Norte Reference (4★ C)",
    stars: 4,
    keys: 174,
    submarket: "Madrid Centro",
    facilities: { bar: true, restaurant: true, rooftop: true, meeting: true, gym: true, spa: true },
    locationScore: 8.6,
    distance: "880 m",
  },
  {
    id: "centro-comp-d",
    name: "Atocha Edge Reference (4★ D)",
    stars: 4,
    keys: 132,
    submarket: "Madrid Centro",
    facilities: { bar: true, restaurant: true, rooftop: false, meeting: false, gym: true, spa: false },
    locationScore: 8.0,
    distance: "1.3 km",
  },
  {
    id: "centro-comp-e",
    name: "Chueca Boutique Reference (4★ E)",
    stars: 4,
    keys: 156,
    submarket: "Chueca",
    facilities: { bar: true, restaurant: true, rooftop: true, meeting: false, gym: false, spa: false },
    locationScore: 8.3,
    distance: "1.6 km",
  },
];

/** Salamanca 5★ · 180 keys subject · CompSet weighted toward Salamanca luxury. */
const SALAMANCA_5STAR_COMPETITORS: CompetitorTemplate[] = [
  {
    id: "salamanca-comp-a",
    name: "Velázquez Luxury Reference (5★ A)",
    stars: 5,
    keys: 168,
    submarket: "Salamanca",
    facilities: { bar: true, restaurant: true, rooftop: true, meeting: true, gym: true, spa: true },
    locationScore: 9.1,
    distance: "350 m",
  },
  {
    id: "salamanca-comp-b",
    name: "Serrano Grand Reference (5★ B)",
    stars: 5,
    keys: 220,
    submarket: "Salamanca",
    facilities: { bar: true, restaurant: true, rooftop: false, meeting: true, gym: true, spa: true },
    locationScore: 9.0,
    distance: "540 m",
  },
  {
    id: "salamanca-comp-c",
    name: "Retiro Edge Reference (5★ C)",
    stars: 5,
    keys: 145,
    submarket: "Retiro",
    facilities: { bar: true, restaurant: true, rooftop: true, meeting: true, gym: true, spa: true },
    locationScore: 8.9,
    distance: "1.2 km",
  },
  {
    id: "salamanca-comp-d",
    name: "Goya Heritage Reference (5★ D)",
    stars: 5,
    keys: 102,
    submarket: "Salamanca",
    facilities: { bar: true, restaurant: true, rooftop: false, meeting: false, gym: true, spa: true },
    locationScore: 8.7,
    distance: "780 m",
  },
  {
    id: "salamanca-comp-e",
    name: "Recoletos Boutique Reference (5★ E)",
    stars: 5,
    keys: 88,
    submarket: "Salamanca",
    facilities: { bar: true, restaurant: true, rooftop: true, meeting: false, gym: true, spa: false },
    locationScore: 8.8,
    distance: "920 m",
  },
];

/** Chamberí 5★ Boutique · 98 keys subject · CompSet weighted toward Chamberí / boutique upscale. */
const CHAMBERI_5STAR_BOUTIQUE_COMPETITORS: CompetitorTemplate[] = [
  {
    id: "chamberi-comp-a",
    name: "Almagro Boutique Reference (5★ A)",
    stars: 5,
    keys: 76,
    submarket: "Chamberí",
    facilities: { bar: true, restaurant: true, rooftop: true, meeting: false, gym: true, spa: true },
    locationScore: 8.9,
    distance: "380 m",
  },
  {
    id: "chamberi-comp-b",
    name: "Trafalgar Grand Reference (5★ B)",
    stars: 5,
    keys: 124,
    submarket: "Chamberí",
    facilities: { bar: true, restaurant: true, rooftop: false, meeting: true, gym: true, spa: true },
    locationScore: 8.7,
    distance: "590 m",
  },
  {
    id: "chamberi-comp-c",
    name: "Bilbao Edge Reference (5★ C)",
    stars: 5,
    keys: 92,
    submarket: "Chamberí",
    facilities: { bar: true, restaurant: true, rooftop: true, meeting: false, gym: false, spa: false },
    locationScore: 8.6,
    distance: "820 m",
  },
  {
    id: "chamberi-comp-d",
    name: "Argüelles Heritage Reference (5★ D)",
    stars: 5,
    keys: 110,
    submarket: "Argüelles",
    facilities: { bar: true, restaurant: true, rooftop: false, meeting: true, gym: true, spa: true },
    locationScore: 8.5,
    distance: "1.4 km",
  },
  {
    id: "chamberi-comp-e",
    name: "Salamanca Boutique Reference (5★ E)",
    stars: 5,
    keys: 88,
    submarket: "Salamanca",
    facilities: { bar: true, restaurant: true, rooftop: true, meeting: false, gym: true, spa: false },
    locationScore: 8.8,
    distance: "2.1 km",
  },
];

const COMPSET_REGISTRY: Record<HotelId, CompetitorTemplate[]> = {
  "centro-reference-4s-240": CENTRO_4STAR_COMPETITORS,
  "salamanca-reference-5s-180": SALAMANCA_5STAR_COMPETITORS,
  "chamberi-boutique-5s-98": CHAMBERI_5STAR_BOUTIQUE_COMPETITORS,
};

/**
 * Public · returns the per-hotel competitive set as CompetitorProperty[]
 * (without the subject row · subject is constructed from the hotel
 * profile in the overlay).
 */
export function getCompetitorsFor(hotelId: HotelId): CompetitorProperty[] {
  const list = COMPSET_REGISTRY[hotelId] ?? [];
  return list.map((c) => ({ ...c, isSubject: false }));
}
