import type { LibraryReport } from "@/types/library";

// Mock institutional dataset for /library/favorites-map.
//
// Coordinates are intentionally real so the swap to a real map provider
// (Mapbox/MapLibre) is a transport change only. `mockPosition` drives the
// static grayscale-image markers used today and is removable once a real
// projection takes over.

export const MOCK_LIBRARY_REPORTS: LibraryReport[] = [
  {
    id: "rpt-ritz-carlton-madrid",
    hotelName: "The Ritz-Carlton Madrid",
    city: "Madrid",
    country: "España",
    coordinates: { lat: 40.4159, lng: -3.6925 },
    mockPosition: { topPct: 42, leftPct: 48 },
    category: "top-promote",
    visibility: "top-promote",
    estValueEur: 250_000_000,
    capRate: 4.85,
    rooms: 250,
    starRating: 5,
    classification: "5* Gran Lujo",
    owner: "Mandarin Oriental Group",
    tierBadge: "PREMIUM",
    promotion: {
      promoted: true,
      promotedUntil: "2026-12-31",
      boostScore: 92,
      featuredRegion: "ES-MAD",
      impressions: 12_400,
      clicks: 480,
    },
    tags: ["luxury", "trophy-asset", "madrid-centro"],
    status: "published",
    updatedAt: "2026-04-22",
  },
  {
    id: "rpt-mandarin-oriental-ritz",
    hotelName: "Mandarin Oriental Ritz",
    city: "Madrid",
    country: "España",
    coordinates: { lat: 40.4156, lng: -3.6932 },
    mockPosition: { topPct: 45, leftPct: 56 },
    category: "top-promote",
    visibility: "top-promote",
    estValueEur: 320_000_000,
    capRate: 4.55,
    rooms: 153,
    starRating: 5,
    classification: "5* Gran Lujo",
    owner: "Mandarin Oriental Hotel Group",
    tierBadge: "INSTITUTIONAL",
    promotion: {
      promoted: true,
      promotedUntil: "2026-09-30",
      boostScore: 95,
      featuredRegion: "ES-MAD",
      impressions: 18_900,
      clicks: 720,
    },
    tags: ["luxury", "heritage", "trophy-asset"],
    status: "published",
    updatedAt: "2026-05-02",
  },
  {
    id: "rpt-four-seasons-madrid",
    hotelName: "Four Seasons Madrid",
    city: "Madrid",
    country: "España",
    coordinates: { lat: 40.4181, lng: -3.6972 },
    mockPosition: { topPct: 32, leftPct: 38 },
    category: "saved",
    visibility: "private",
    estValueEur: 410_000_000,
    capRate: 4.6,
    rooms: 200,
    starRating: 5,
    classification: "5* Gran Lujo",
    owner: "OHLA / Mohari Hospitality",
    tierBadge: "PREMIUM",
    promotion: { promoted: false },
    tags: ["luxury", "centro-canalejas"],
    status: "published",
    updatedAt: "2026-03-15",
  },
  {
    id: "rpt-edition-madrid",
    hotelName: "The Madrid EDITION",
    city: "Madrid",
    country: "España",
    coordinates: { lat: 40.4163, lng: -3.7066 },
    mockPosition: { topPct: 28, leftPct: 30 },
    category: "community",
    visibility: "public",
    estValueEur: 185_000_000,
    capRate: 5.1,
    rooms: 200,
    starRating: 5,
    classification: "5* Lifestyle",
    owner: "Marriott / RLH Properties",
    promotion: { promoted: false },
    tags: ["lifestyle", "marriott"],
    status: "published",
    updatedAt: "2026-04-04",
  },
  {
    id: "rpt-hard-rock-marbella",
    hotelName: "Hard Rock Hotel Marbella",
    city: "Marbella",
    country: "España",
    coordinates: { lat: 36.4944, lng: -4.8868 },
    mockPosition: { topPct: 70, leftPct: 22 },
    category: "saved",
    visibility: "team",
    estValueEur: 95_000_000,
    capRate: 6.4,
    rooms: 366,
    starRating: 4,
    classification: "4* Resort",
    owner: "Palladium Hotel Group",
    tierBadge: "PRO",
    promotion: { promoted: false },
    tags: ["resort", "leisure", "costa-del-sol"],
    status: "published",
    updatedAt: "2026-02-28",
  },
  {
    id: "rpt-w-barcelona",
    hotelName: "W Barcelona",
    city: "Barcelona",
    country: "España",
    coordinates: { lat: 41.3683, lng: 2.1893 },
    mockPosition: { topPct: 58, leftPct: 78 },
    category: "community",
    visibility: "public",
    estValueEur: 305_000_000,
    capRate: 5.05,
    rooms: 473,
    starRating: 5,
    classification: "5* Iconic",
    owner: "Marriott / Híspanos del Inmueble",
    promotion: { promoted: false },
    tags: ["iconic", "barceloneta", "leisure"],
    status: "published",
    updatedAt: "2026-04-18",
  },
];

// ── Pure helpers (no React) ─────────────────────────────────────────────────

export function getMockReportById(id: string | null): LibraryReport | undefined {
  if (!id) return undefined;
  return MOCK_LIBRARY_REPORTS.find((r) => r.id === id);
}

export function getDefaultSelectedReport(): LibraryReport {
  // The floating preview card defaults to the headline TOP PROMOTE — the
  // Stitch reference uses Ritz-Carlton Madrid for this slot.
  return (
    MOCK_LIBRARY_REPORTS.find((r) => r.id === "rpt-ritz-carlton-madrid") ??
    MOCK_LIBRARY_REPORTS[0]
  );
}
