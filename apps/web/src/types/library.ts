// Library — institutional reports library types.
//
// The Library is the future home of:
//   • saved reports (FAVORITOS — private, owned by the user)
//   • community reports (COMUNIDAD — public, shared by other users)
//   • promoted reports (TOP PROMOTE — paid, surfaced in marketplace views)
//
// Today every record is mock. The shapes below are intentionally
// future-ready — every field that will eventually live in the database
// is already named, so the swap to a TanStack Query hook later is just
// a transport change, not a type rewrite.

export type ReportCategory = "saved" | "community" | "top-promote";

export type ReportVisibility = "private" | "team" | "public" | "top-promote";

export type ReportStatus = "draft" | "published" | "archived";

export interface ReportPromotion {
  promoted: boolean;
  /** ISO 8601 — paid promotion expiry */
  promotedUntil?: string;
  /** Engagement-derived ranking score (0–100) */
  boostScore?: number;
  /** ISO region or market id used for geo-targeting */
  featuredRegion?: string;
  impressions?: number;
  clicks?: number;
}

// ── Rich shapes used by the institutional list view ─────────────────────────

export interface ReportAmenities {
  bar: boolean;
  restaurant: boolean;
  rooftop: boolean;
  meetingRooms: boolean;
  gym: boolean;
  spa: boolean;
  pool: boolean;
  parking: boolean;
}

export interface ReportLocation {
  /** Street + number */
  address: string;
  /** Postal code */
  zip: string;
  /** Neighbourhood / sub-market label (e.g., "Madrid Centro") */
  subMarket: string;
  /** 0–10 institutional location score */
  locationScore: number;
}

export type ReportRole = "Principal" | "Broker" | "Lender" | "Developer";
export type ReportObjective =
  | "For Sale"
  | "Rent HMA"
  | "Lending"
  | "Develop"
  | "CoInvest";

export interface ReportListing {
  role: ReportRole;
  objective: ReportObjective;
  /** Year of opening / latest renovation */
  openYear: number;
  /** Asset class label — "Luxury", "Upper Upscale", "Upscale", … */
  classLabel: string;
}

/** EUR price block with total + per-room + per-m2 unitization */
export interface ReportPriceBlock {
  total: number;
  perRoom: number;
  perM2: number;
}

export interface ReportFinancials {
  /** EUR. null = locked for the current viewer tier */
  capex: number | null;
  totalInvest: ReportPriceBlock | null;
  /** Percentage points (e.g., 5.4 → 5.4%) */
  capRate: number;
  marketValueTtm: ReportPriceBlock;
  exitYear: number | null;
  exitPrice: ReportPriceBlock | null;
  /** Percentage points */
  yield: number | null;
  irrProject: number | null;
  irrEquity: number | null;
}

export type ReportTypeBadge = "Premium" | "PRO" | "Public" | "Private";

/** Contact details surfaced in the on-hover card for top-promoted reports. */
export interface ReportContactInfo {
  /** Display name of the listing owner / account manager */
  accountManager: string;
  /** Internal id surfaced in the popover header (e.g., "2578") */
  accountManagerId: string;
  /** Email — rendered as a mailto link */
  email: string;
  /** Phone — plain text */
  phone: string;
}

export interface ReportIndicators {
  /** Hot / paid promotion currently active */
  topPromote: boolean;
  /** User has edited the auto-generated report */
  userModified: boolean;
  /** Private (only the owner sees the unlocked numbers) */
  private: boolean;
}

export interface LibraryReport {
  id: string;
  hotelName: string;
  city: string;
  country: string;
  /** Real-world coordinates — ready for Mapbox/MapLibre handoff */
  coordinates: { lat: number; lng: number };
  /** Mock-map percentage placement (0–100). Replaced by lat/lng projection
   *  once a real provider is wired. */
  mockPosition: { topPct: number; leftPct: number };
  category: ReportCategory;
  visibility: ReportVisibility;
  /** Estimated valuation in EUR (legacy — favorites-map floating card) */
  estValueEur: number;
  /** Cap rate as percentage points (legacy — favorites-map floating card) */
  capRate: number;
  rooms: number;
  starRating: number;
  /** Free-text classification ("Gran Lujo", "Luxury Boutique", …) */
  classification: string;
  owner: string;
  /** Tier label shown alongside TOP PROMOTE in the floating card */
  tierBadge?: "PREMIUM" | "INSTITUTIONAL" | "PRO";
  promotion: ReportPromotion;
  tags?: string[];
  status: ReportStatus;
  /** ISO 8601 — last edited */
  updatedAt?: string;

  // ── Rich list-view fields ────────────────────────────────────────────────
  amenities: ReportAmenities;
  location: ReportLocation;
  listing: ReportListing;
  financials: ReportFinancials;
  reportType: ReportTypeBadge;
  indicators: ReportIndicators;
  /** Has a contact channel exposed to viewers in this tier */
  hasContact: boolean;
  /** Contact card detail. Surfaced in the on-hover popover when the
   *  report carries the topPromote indicator. `null` = no popover. */
  contactInfo: ReportContactInfo | null;
  /** User-favourited (drives the ⭐ column) */
  favorited: boolean;
  /** PDF report exportable */
  hasPdf: boolean;
  /** Reference code (e.g., "HV-2024-001"). Surfaced on /library/top-list. */
  referenceCode: string;
  /** Visibility-tier label used by the Top Reports surface */
  visibilityTier: VisibilityTier;
  /** Supabase canonical_id (UUID) of the underlying hotel · present when
   *  the row came from `hotel_report_library`. Used to open the report
   *  and to deep-link into admin from the library row. */
  canonicalId?: string;
  /** Full institutional report URL · stable per canonical hotel · used
   *  by the library row click handler instead of routing by slug. */
  reportUrl?: string;
}

// ── UI state shapes ─────────────────────────────────────────────────────────

export interface LibraryLegendState {
  saved: boolean;
  community: boolean;
  topPromote: boolean;
}

export interface LibraryLayerState {
  heatmap: boolean;
  metroLines: boolean;
  historicCenter: boolean;
}

// ── Future-provider map abstraction ─────────────────────────────────────────
//
// Today the map is a static institutional grayscale image plus
// percentage-positioned markers. Tomorrow it becomes Mapbox/MapLibre/
// deck.gl. Components consume a `MapProvider` interface so the page
// never has to change.

export interface MapBounds {
  north: number;
  south: number;
  east: number;
  west: number;
}

export interface MapProviderHandles {
  /** Centre on a specific report (no-op for mock) */
  flyTo?: (reportId: string) => void;
  /** Fit bounds to all visible markers (no-op for mock) */
  fitToVisible?: () => void;
}

// ── Top Reports — forward-compat shapes ─────────────────────────────────────
//
// /library/top-map renders the same six mock reports today (Stitch design
// is a sibling to /library/favorites-map). The shapes below give the
// future "Top Promote" marketplace + ranking engine somewhere typed to
// live: visibility tiers, ranking score, IRR target, asset / segment /
// access classification. No render touches today — purely the type
// surface so a future PR can wire data without a rewrite.

export type VisibilityTier =
  | "promoted"        // paid Top Promote slot
  | "institutional"   // institutional partner (verified high-trust)
  | "community"       // public community contribution
  | "verified";       // automatically validated public report

export type MapMarkerType = ReportCategory | VisibilityTier;

export type AssetType =
  | "luxury"
  | "upscale"
  | "midscale"
  | "boutique"
  | "resort";

export type AccessTier = "public" | "institutional";

/** Investment size bucket (S < €25M · M €25–100M · L €100–250M · XL > €250M) */
export type InvestmentBand = "S" | "M" | "L" | "XL";

export interface ReportRanking {
  /** Composite ranking score 0–100 — drives default sort */
  rankingScore: number;
  /** Visibility weight applied by the marketplace (0–100) */
  visibilityScore: number;
  impressions: number;
  clicks: number;
  /** Higher served first when slots compete for the same map area */
  sponsorPriority: number;
  /** ISO 8601 — paid promotion expiry */
  promotedUntil?: string;
}

export interface TopReport {
  id: string;
  hotelName: string;
  city: string;
  country: string;
  coordinates: { lat: number; lng: number };
  mockPosition: { topPct: number; leftPct: number };
  visibilityTier: VisibilityTier;
  assetType: AssetType;
  starRating: number;
  rooms: number;
  /** Operator / brand / management company */
  operator: string;
  owner: string;
  /** Estimated valuation in EUR */
  valuation: number;
  /** Cap rate as percentage points (e.g., 4.85 → 4.85%) */
  capRate: number;
  /** Target IRR % (project-level, gross) */
  irrTarget?: number;
  investmentBand: InvestmentBand;
  /** Public listing flag — false hides the report from non-subscribers */
  publicAccess: boolean;
  ranking: ReportRanking;
  tierBadge?: "PREMIUM" | "INSTITUTIONAL" | "PRO";
  promoted: boolean;
}

export type PromotedReport = TopReport & {
  promoted: true;
  visibilityTier: "promoted";
};

export interface TopReportsLegendState {
  promoted: boolean;
  institutional: boolean;
  community: boolean;
  verified: boolean;
}

export interface TopReportsFilters {
  country: string | null;
  city: string | null;
  assetType: AssetType | null;
  investmentBand: InvestmentBand | null;
  segment: "luxury" | "upscale" | "midscale" | null;
  accessTier: AccessTier | null;
}

export type TopReportsViewMode = "top" | "map" | "list";
