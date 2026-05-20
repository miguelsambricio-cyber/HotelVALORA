/**
 * Madrid hotels · canonical Tier-2 mock dataset
 *
 * Single source of truth for both:
 *   · HeroSearch autocomplete (lib/api/search.ts)
 *   · /compset workflow data (lib/api/compset.ts)
 *
 * Tier 2 scope: institutional-grade mock that makes the search bar
 * feel "credible · real Madrid coverage" without yet wiring a real
 * DB (Supabase canonical · Tier 3 territory · agent-2 coordination
 * required).
 *
 * Each hotel carries the fields required to:
 *   · render in the search autocomplete row
 *   · seed a compset map (real WGS84 coordinates · plausible KPIs)
 *   · drive the compset-around-subject geometry (Haversine distance
 *     against other entries in this same registry)
 *
 * Data conventions:
 *   · id            · URL-safe slug · stable
 *   · coordinates   · approximate Madrid lat/lng · institutional plausible
 *   · adr / revpar  · plausible 2025 H1 figures · NOT contractual
 *   · keys          · published room counts
 *   · operator      · canonical operator label
 *   · district      · Madrid submarket label (matches CoStar conventions)
 *
 * All entries are anonymised by the project disclosure: "Illustrative
 * institutional dataset · live market intelligence integration in
 * progress". Real Supabase wiring replaces this file in Tier 3.
 */

export type MadridDistrict =
  | "Centro"
  | "Salamanca"
  | "Chamberí"
  | "Chamartín"
  | "Cuatro Caminos"
  | "Aeropuerto";

export interface MadridHotelEntry {
  /** URL-safe slug · stable id used in routing (?ref=<id>) */
  id: string;
  /** Display name as it appears in autocomplete + map popups */
  name: string;
  /** Optional brand label */
  brand?: string;
  /** Canonical operator name */
  operator?: string;
  /** Star rating · 4 or 5 in this Phase 1 Madrid set */
  stars: 3 | 4 | 5;
  /** Total room count */
  keys: number;
  /** Madrid submarket · drives CoStar-aligned categorisation */
  district: MadridDistrict;
  /** Free-text address line */
  address: string;
  /** Institutional category label */
  category: string;
  /** 2025 H1 plausible ADR (EUR) */
  adr: number;
  /** 2025 H1 plausible RevPAR (EUR) */
  revpar: number;
  /** 2025 H1 plausible occupancy (0-100) */
  occupancy: number;
  /** WGS84 coordinates · approximate Madrid placement */
  coordinates: { lng: number; lat: number };
}

/** Canonical 18-hotel Madrid registry · Tier 2. */
export const MADRID_HOTELS: MadridHotelEntry[] = [
  {
    id: "bless-hotel-madrid",
    name: "Bless Hotel Madrid",
    brand: "Bless Collection",
    operator: "Palladium Hotel Group",
    stars: 5,
    keys: 110,
    district: "Salamanca",
    address: "Calle de Velázquez 62",
    category: "Luxury Lifestyle",
    adr: 380,
    revpar: 298,
    occupancy: 78,
    coordinates: { lng: -3.6843, lat: 40.4239 },
  },
  {
    id: "eurostars-madrid-tower",
    name: "Eurostars Madrid Tower",
    brand: "Eurostars Hotels",
    operator: "Grupo Hotusa",
    stars: 5,
    keys: 474,
    district: "Cuatro Caminos",
    address: "Paseo de la Castellana 259B",
    category: "Urban Luxury",
    adr: 245,
    revpar: 188,
    occupancy: 77,
    coordinates: { lng: -3.6900, lat: 40.4632 },
  },
  {
    id: "riu-plaza-espana",
    name: "Riu Plaza España",
    brand: "Riu Plaza",
    operator: "Riu Hotels & Resorts",
    stars: 4,
    keys: 583,
    district: "Centro",
    address: "Plaza de España 8",
    category: "Urban Upscale",
    adr: 215,
    revpar: 172,
    occupancy: 80,
    coordinates: { lng: -3.7117, lat: 40.4234 },
  },
  {
    id: "vp-plaza-espana-design",
    name: "VP Plaza España Design",
    brand: "VP Hoteles",
    operator: "VP Hoteles",
    stars: 5,
    keys: 214,
    district: "Centro",
    address: "Plaza de España 5",
    category: "Design Luxury",
    adr: 295,
    revpar: 230,
    occupancy: 78,
    coordinates: { lng: -3.7128, lat: 40.4220 },
  },
  {
    id: "four-seasons-madrid",
    name: "Four Seasons Hotel Madrid",
    brand: "Four Seasons",
    operator: "Four Seasons Hotels & Resorts",
    stars: 5,
    keys: 200,
    district: "Centro",
    address: "Calle de Sevilla 3 (Plaza Canalejas)",
    category: "Ultra Luxury",
    adr: 620,
    revpar: 480,
    occupancy: 77,
    coordinates: { lng: -3.7011, lat: 40.4178 },
  },
  {
    id: "rosewood-villa-magna",
    name: "Rosewood Villa Magna",
    brand: "Rosewood Hotels",
    operator: "Rosewood Hotel Group",
    stars: 5,
    keys: 154,
    district: "Salamanca",
    address: "Paseo de la Castellana 22",
    category: "Ultra Luxury",
    adr: 590,
    revpar: 460,
    occupancy: 78,
    coordinates: { lng: -3.6889, lat: 40.4286 },
  },
  {
    id: "nh-collection-eurobuilding",
    name: "NH Collection Madrid Eurobuilding",
    brand: "NH Collection",
    operator: "NH Hotel Group",
    stars: 5,
    keys: 469,
    district: "Chamartín",
    address: "Calle del Padre Damián 23",
    category: "Urban Luxury",
    adr: 235,
    revpar: 182,
    occupancy: 77,
    coordinates: { lng: -3.6831, lat: 40.4621 },
  },
  {
    id: "hyatt-regency-hesperia-madrid",
    name: "Hyatt Regency Hesperia Madrid",
    brand: "Hyatt Regency",
    operator: "Hyatt Hotels Corporation",
    stars: 5,
    keys: 171,
    district: "Chamberí",
    address: "Paseo de la Castellana 57",
    category: "Urban Luxury",
    adr: 320,
    revpar: 251,
    occupancy: 78,
    coordinates: { lng: -3.6900, lat: 40.4451 },
  },
  {
    id: "edition-madrid",
    name: "The Madrid EDITION",
    brand: "EDITION Hotels",
    operator: "Marriott International",
    stars: 5,
    keys: 200,
    district: "Centro",
    address: "Plaza de Celenque 2",
    category: "Lifestyle Luxury",
    adr: 425,
    revpar: 335,
    occupancy: 79,
    coordinates: { lng: -3.7036, lat: 40.4173 },
  },
  {
    id: "barcelo-torre-madrid",
    name: "Barceló Torre de Madrid",
    brand: "Barceló Hotels",
    operator: "Barceló Hotel Group",
    stars: 4,
    keys: 258,
    district: "Centro",
    address: "Plaza de España 18",
    category: "Urban Upscale",
    adr: 195,
    revpar: 156,
    occupancy: 80,
    coordinates: { lng: -3.7126, lat: 40.4234 },
  },
  {
    id: "only-you-atocha",
    name: "Only YOU Hotel Atocha",
    brand: "Only YOU",
    operator: "Palladium Hotel Group",
    stars: 4,
    keys: 205,
    district: "Centro",
    address: "Paseo de la Infanta Isabel 13",
    category: "Lifestyle Upscale",
    adr: 220,
    revpar: 178,
    occupancy: 81,
    coordinates: { lng: -3.6928, lat: 40.4071 },
  },
  {
    id: "hard-rock-madrid",
    name: "Hard Rock Hotel Madrid",
    brand: "Hard Rock Hotels",
    operator: "Hard Rock International",
    stars: 4,
    keys: 161,
    district: "Centro",
    address: "Calle de Atocha 14",
    category: "Lifestyle Upscale",
    adr: 210,
    revpar: 165,
    occupancy: 78,
    coordinates: { lng: -3.6987, lat: 40.4131 },
  },
  {
    id: "marriott-auditorium",
    name: "Madrid Marriott Auditorium Hotel & Conference Center",
    brand: "Marriott",
    operator: "Marriott International",
    stars: 5,
    keys: 869,
    district: "Aeropuerto",
    address: "Avenida de Aragón 400",
    category: "Convention Luxury",
    adr: 175,
    revpar: 132,
    occupancy: 75,
    coordinates: { lng: -3.6280, lat: 40.4665 },
  },
  {
    id: "ac-cuzco",
    name: "AC Hotel Cuzco by Marriott",
    brand: "AC Hotels",
    operator: "Marriott International",
    stars: 4,
    keys: 327,
    district: "Cuatro Caminos",
    address: "Paseo de la Castellana 133",
    category: "Urban Upscale",
    adr: 165,
    revpar: 128,
    occupancy: 78,
    coordinates: { lng: -3.6940, lat: 40.4517 },
  },
  {
    id: "westin-palace",
    name: "The Westin Palace Madrid",
    brand: "The Westin",
    operator: "Marriott International",
    stars: 5,
    keys: 470,
    district: "Centro",
    address: "Plaza de las Cortes 7",
    category: "Heritage Luxury",
    adr: 365,
    revpar: 285,
    occupancy: 78,
    coordinates: { lng: -3.6962, lat: 40.4147 },
  },
  {
    id: "hotel-unico-madrid",
    name: "Hotel Único Madrid",
    brand: "Small Luxury Hotels",
    operator: "Hoteles Único",
    stars: 5,
    keys: 44,
    district: "Salamanca",
    address: "Calle de Claudio Coello 67",
    category: "Boutique Luxury",
    adr: 415,
    revpar: 325,
    occupancy: 78,
    coordinates: { lng: -3.6850, lat: 40.4248 },
  },
  {
    id: "mandarin-oriental-ritz",
    name: "Mandarin Oriental Ritz, Madrid",
    brand: "Mandarin Oriental",
    operator: "Mandarin Oriental Hotel Group",
    stars: 5,
    keys: 153,
    district: "Centro",
    address: "Plaza de la Lealtad 5",
    category: "Ultra Luxury",
    adr: 685,
    revpar: 530,
    occupancy: 77,
    coordinates: { lng: -3.6938, lat: 40.4158 },
  },
  {
    id: "melia-castilla",
    name: "Meliá Castilla",
    brand: "Meliá Hotels",
    operator: "Meliá Hotels International",
    stars: 4,
    keys: 909,
    district: "Chamartín",
    address: "Calle del Capitán Haya 43",
    category: "Convention Upscale",
    adr: 158,
    revpar: 124,
    occupancy: 78,
    coordinates: { lng: -3.6927, lat: 40.4555 },
  },
];

/** Default hotel id when caller doesn't pass a ref param. */
export const DEFAULT_MADRID_HOTEL_ID = "bless-hotel-madrid";

/** Returns a hotel by id · null if not found. */
export function findHotelById(id: string): MadridHotelEntry | null {
  return MADRID_HOTELS.find((h) => h.id === id) ?? null;
}

/**
 * Soft-match a free-text query against the canonical Madrid registry.
 * Returns the first hotel whose name / brand / district / operator
 * contains the lowercased query as a substring · null if no match.
 *
 * Used by /compset/page.tsx to resolve ?q=<text> into a canonical
 * hotel id without forcing the visitor to pick from autocomplete first.
 */
export function findHotelByQuery(q: string): MadridHotelEntry | null {
  const needle = q.trim().toLowerCase();
  if (needle.length === 0) return null;
  return (
    MADRID_HOTELS.find((h) => {
      const hay = [h.name, h.brand ?? "", h.operator ?? "", h.district, h.address]
        .join(" ")
        .toLowerCase();
      return hay.includes(needle);
    }) ?? null
  );
}

// ─── Geographic helpers · used by compset compute layer ───────────────────────

/** Haversine distance in kilometres between two WGS84 points. */
export function haversineKm(
  a: { lng: number; lat: number },
  b: { lng: number; lat: number },
): number {
  const R = 6371;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

/**
 * Builds the compset for a subject hotel:
 *   · referenceHotel · the subject (found by id, with fallback)
 *   · competitors    · up to 4 closest hotels with ±1 star similarity
 *   · suggested      · next 3 closest after the competitors window
 *
 * Methodology:
 *   1. Filter all other hotels to ±1 star vs subject
 *   2. Sort by Haversine distance
 *   3. Top 4 → competitors · next 3 → suggested
 *
 * Stays deterministic given the same subject id · cache-friendly.
 */
export function buildCompsetForHotel(subjectId: string): {
  subject: MadridHotelEntry;
  competitors: MadridHotelEntry[];
  suggested: MadridHotelEntry[];
} {
  const subject = findHotelById(subjectId) ?? MADRID_HOTELS[0];
  const sorted = MADRID_HOTELS.filter((h) => h.id !== subject.id)
    .filter((h) => Math.abs(h.stars - subject.stars) <= 1)
    .map((h) => ({ hotel: h, distance: haversineKm(subject.coordinates, h.coordinates) }))
    .sort((a, b) => a.distance - b.distance);

  const competitors = sorted.slice(0, 4).map((x) => x.hotel);
  const suggested = sorted.slice(4, 7).map((x) => x.hotel);
  return { subject, competitors, suggested };
}
