import type {
  LibraryReport,
  ReportAmenities,
  ReportFinancials,
  ReportListing,
  ReportLocation,
  ReportPriceBlock,
} from "@/types/library";

// Mock institutional dataset for /library/favorites-map and
// /library/favorites-list.
//
// Coordinates are intentionally real so the swap to a real map provider
// (Mapbox/MapLibre) is a transport change only. `mockPosition` drives the
// static grayscale-image markers used today and is removable once a real
// projection takes over.
//
// The rich fields (amenities, location, listing, financials, reportType,
// indicators) power the institutional list-view table. `financials`
// values are nullable — null = locked for the current viewer tier (the
// list view renders a lock icon). The lock pattern is set per
// reportType: Premium = nothing locked; PRO = a few advanced fields
// locked (capex / irrEquity); Public + Private = most premium fields
// locked (capex, totalInvest, exitPrice/exitYear, yield, irrProject,
// irrEquity).

// ── Helpers ─────────────────────────────────────────────────────────────────

const A = (
  bar: boolean,
  restaurant: boolean,
  rooftop: boolean,
  meetingRooms: boolean,
  gym: boolean,
  spa: boolean,
  pool: boolean,
  parking: boolean,
): ReportAmenities => ({ bar, restaurant, rooftop, meetingRooms, gym, spa, pool, parking });

const block = (total: number, perRoom: number, perM2: number): ReportPriceBlock => ({
  total,
  perRoom,
  perM2,
});

// Premium-tier financials (everything visible).
const finPremium = (overrides: Partial<ReportFinancials>): ReportFinancials => ({
  capex: 14_200_000,
  totalInvest: block(128_500_000, 524_000, 9_400),
  capRate: 5.4,
  marketValueTtm: block(135_200_000, 551_000, 9_800),
  exitYear: 2031,
  exitPrice: block(164_200_000, 425_000, 9_400),
  yield: 6.8,
  irrProject: 12.4,
  irrEquity: 18.2,
  ...overrides,
});

// PRO-tier — capex + IRR Equity gated.
const finPro = (overrides: Partial<ReportFinancials>): ReportFinancials => ({
  capex: null,
  totalInvest: block(64_200_000, 356_000, 5_200),
  capRate: 6.1,
  marketValueTtm: block(68_400_000, 380_000, 5_600),
  exitYear: 2027,
  exitPrice: block(78_200_000, 280_000, 5_200),
  yield: 7.2,
  irrProject: 14.1,
  irrEquity: null,
  ...overrides,
});

// Public-tier — only Cap Rate + Market Value TTM visible.
const finPublic = (overrides: Partial<ReportFinancials>): ReportFinancials => ({
  capex: null,
  totalInvest: null,
  capRate: 4.8,
  marketValueTtm: block(95_800_000, 307_000, 7_100),
  exitYear: null,
  exitPrice: null,
  yield: null,
  irrProject: null,
  irrEquity: null,
  ...overrides,
});

const loc = (address: string, zip: string, subMarket: string, locationScore: number): ReportLocation => ({
  address,
  zip,
  subMarket,
  locationScore,
});

const listing = (
  role: ReportListing["role"],
  objective: ReportListing["objective"],
  openYear: number,
  classLabel: string,
): ReportListing => ({ role, objective, openYear, classLabel });

// ── Mock dataset ────────────────────────────────────────────────────────────

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
    amenities: A(true, true, true, true, true, true, true, false),
    location: loc("Plaza de la Lealtad 5", "28014", "Madrid Centro", 9.85),
    listing: listing("Principal", "For Sale", 1910, "Luxury"),
    financials: finPremium({
      capex: 14_200_000,
      totalInvest: block(250_000_000, 1_000_000, 12_500),
      capRate: 4.85,
      marketValueTtm: block(252_000_000, 1_008_000, 12_600),
      exitYear: 2031,
      exitPrice: block(310_000_000, 1_240_000, 14_200),
      yield: 6.4,
      irrProject: 11.8,
      irrEquity: 17.5,
    }),
    reportType: "Premium",
    indicators: { topPromote: true, userModified: false, private: false },
    hasContact: false,
    favorited: true,
    hasPdf: true,
    referenceCode: "HV-2024-001",
    visibilityTier: "promoted",
    contactInfo: {
      accountManager: "Carlos Velasco",
      accountManagerId: "2578",
      email: "carlos.velasco@hotelvalora.com",
      phone: "(+34) 91 555 0101",
    },
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
    amenities: A(true, true, true, true, true, true, false, true),
    location: loc("Plaza de la Lealtad 5", "28014", "Madrid Centro", 9.92),
    listing: listing("Principal", "For Sale", 1910, "Luxury"),
    financials: finPremium({
      capex: 18_500_000,
      totalInvest: block(320_000_000, 2_091_000, 14_200),
      capRate: 4.55,
      marketValueTtm: block(322_000_000, 2_104_000, 14_300),
      exitYear: 2032,
      exitPrice: block(395_000_000, 2_582_000, 16_400),
      yield: 6.1,
      irrProject: 10.9,
      irrEquity: 16.8,
    }),
    reportType: "Premium",
    indicators: { topPromote: true, userModified: true, private: false },
    hasContact: true,
    favorited: true,
    hasPdf: true,
    referenceCode: "HV-2024-002",
    visibilityTier: "promoted",
    contactInfo: {
      accountManager: "Marina López",
      accountManagerId: "3014",
      email: "marina.lopez@mandarinoriental.com",
      phone: "(+34) 91 701 6767",
    },
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
    amenities: A(true, true, true, true, true, true, true, true),
    location: loc("Calle de Sevilla 3", "28014", "Madrid Centro", 9.78),
    listing: listing("Principal", "Develop", 2020, "Luxury"),
    financials: finPremium({
      capex: 22_400_000,
      totalInvest: block(410_000_000, 2_050_000, 13_400),
      capRate: 4.6,
      marketValueTtm: block(415_000_000, 2_075_000, 13_550),
      exitYear: 2033,
      exitPrice: block(510_000_000, 2_550_000, 15_800),
      yield: 6.0,
      irrProject: 11.2,
      irrEquity: 17.0,
    }),
    reportType: "Premium",
    indicators: { topPromote: false, userModified: true, private: false },
    hasContact: true,
    favorited: true,
    hasPdf: true,
    referenceCode: "HV-2024-003",
    visibilityTier: "institutional",
    contactInfo: null,
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
    amenities: A(true, true, true, true, true, true, true, false),
    location: loc("Plaza de Celenque 2", "28013", "Madrid Centro", 9.45),
    listing: listing("Lender", "Lending", 2022, "Upper Upscale"),
    financials: finPublic({
      capRate: 5.1,
      marketValueTtm: block(185_000_000, 925_000, 9_200),
    }),
    reportType: "Public",
    indicators: { topPromote: false, userModified: false, private: false },
    hasContact: false,
    favorited: true,
    hasPdf: true,
    referenceCode: "HV-2024-004",
    visibilityTier: "community",
    contactInfo: null,
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
    amenities: A(true, true, false, true, true, true, true, true),
    location: loc("Av. de las Tres Olas 1", "29603", "Costa del Sol", 8.6),
    listing: listing("Broker", "Rent HMA", 2018, "Upper Upscale"),
    financials: finPro({
      capex: null,
      totalInvest: block(95_000_000, 259_000, 4_400),
      capRate: 6.4,
      marketValueTtm: block(98_500_000, 269_000, 4_550),
      exitYear: 2028,
      exitPrice: block(118_000_000, 322_000, 5_200),
      yield: 7.1,
      irrProject: 13.6,
      irrEquity: null,
    }),
    reportType: "PRO",
    indicators: { topPromote: false, userModified: true, private: false },
    hasContact: true,
    favorited: true,
    hasPdf: true,
    referenceCode: "HV-2024-005",
    visibilityTier: "verified",
    contactInfo: null,
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
    amenities: A(true, true, true, true, true, true, true, true),
    location: loc("Plaça de la Rosa dels Vents 1", "08039", "Barceloneta", 9.7),
    listing: listing("Principal", "CoInvest", 2009, "Luxury"),
    financials: finPublic({
      capRate: 5.05,
      marketValueTtm: block(305_000_000, 645_000, 8_100),
    }),
    reportType: "Private",
    indicators: { topPromote: false, userModified: false, private: true },
    hasContact: false,
    favorited: true,
    hasPdf: true,
    referenceCode: "HV-2024-006",
    visibilityTier: "community",
    contactInfo: null,
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
