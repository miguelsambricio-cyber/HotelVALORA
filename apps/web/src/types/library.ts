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
  /** Estimated valuation in EUR */
  estValueEur: number;
  /** Cap rate as percentage points (e.g., 4.85 → 4.85%) */
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

export type LibraryFilterTab = "favoritos" | "top";

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
