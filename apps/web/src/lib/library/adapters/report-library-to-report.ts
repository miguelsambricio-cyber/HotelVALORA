/**
 * Adapter · `hotel_report_library` row → `LibraryReport` shape.
 *
 * Mirrors the legacy `adaptValuationToLibraryReport` API so the existing
 * `HotelMap` / `FavoritesTable` / `useLibraryReports` consumers don't
 * need changes. The library page now reads the persistent auto-generated
 * report log (one row per canonical hotel that has ever produced a
 * report) instead of the manually-seeded `valuations` marketplace.
 */

import type {
  LibraryReport,
  ReportAmenities,
  ReportFinancials,
  ReportIndicators,
  ReportObjective,
  ReportRole,
  ReportStatus,
  ReportTypeBadge,
  ReportVisibility,
  VisibilityTier,
} from "@/types/library";

/** Shape returned by `select * from hotel_report_library`. */
export interface HotelReportLibraryRow {
  id: string;
  canonical_id: string;
  hotel_name: string;
  city: string | null;
  market: string | null;
  submarket: string | null;
  chain_scale: string | null;
  star_rating: number | null;
  total_rooms: number | null;
  brand_family: string | null;
  lat: number | null;
  lng: number | null;
  estimated_value_eur: number | null;
  valuation_range_low_eur: number | null;
  valuation_range_high_eur: number | null;
  cap_rate_pct: number | null;
  confidence_score: number | null;
  per_key_eur: number | null;
  per_sqm_eur: number | null;
  gop_margin_pct: number | null;
  report_url: string;
  report_status: string;
  scenario_label: string | null;
  keys_from_heuristic: boolean;
  created_at: string;
  updated_at: string;
  last_rendered_at: string;
  render_count: number;
}

export interface AdapterContext {
  /** Library entry ids the current viewer has favourited. */
  favoriteIds: ReadonlySet<string>;
  /** When true, every row renders as favourited · default demo UX. */
  treatAllAsFavorited?: boolean;
}

function chainScaleToClassification(scale: string | null): string {
  switch (scale) {
    case "luxury": return "Luxury";
    case "upper_upscale": return "Upper Upscale";
    case "upscale": return "Upscale";
    case "upper_midscale": return "Upper Midscale";
    case "midscale": return "Midscale";
    case "economy": return "Economy";
    case "lifestyle": return "Lifestyle";
    case "boutique": return "Boutique";
    case "resort": return "Resort";
    default: return "Hotel";
  }
}

function isoToDate(iso: string): string {
  return iso.slice(0, 10);
}

function pickEstValueEur(row: HotelReportLibraryRow): number {
  return row.estimated_value_eur ?? 0;
}

function pickCapRatePct(row: HotelReportLibraryRow): number {
  return row.cap_rate_pct ?? 0;
}

/** Map confidence_score 0-100 → visibilityTier. */
function visibilityTierFor(row: HotelReportLibraryRow): VisibilityTier {
  if ((row.confidence_score ?? 0) >= 75) return "institutional";
  if ((row.confidence_score ?? 0) >= 60) return "verified";
  return "community";
}

export function adaptReportLibraryToLibraryReport(
  row: HotelReportLibraryRow,
  ctx: AdapterContext,
): LibraryReport {
  const favorited = ctx.treatAllAsFavorited === true || ctx.favoriteIds.has(row.id);

  const financials: ReportFinancials = {
    capex: null,
    totalInvest: null,
    capRate: pickCapRatePct(row),
    marketValueTtm: {
      total: pickEstValueEur(row),
      perRoom: row.per_key_eur ?? 0,
      perM2: row.per_sqm_eur ?? 0,
    },
    exitYear: null,
    exitPrice: null,
    yield: null,
    irrProject: null,
    irrEquity: null,
  };

  // Amenities · unknown from the library row · default to all-false.
  // Future: snapshot the amenities JSONB from canonical at persistence time.
  const amenities: ReportAmenities = {
    bar: false,
    restaurant: false,
    rooftop: false,
    meetingRooms: false,
    gym: false,
    spa: false,
    pool: false,
    parking: false,
  };

  const indicators: ReportIndicators = {
    topPromote: false,
    userModified: false,
    private: false,
  };

  return {
    id: row.id,
    hotelName: row.hotel_name,
    city: row.city ?? "—",
    country: "Spain",
    coordinates: {
      lat: row.lat ?? 0,
      lng: row.lng ?? 0,
    },
    mockPosition: { topPct: 50, leftPct: 50 },
    category: favorited ? "saved" : "community",
    visibility: "public" as ReportVisibility,
    estValueEur: pickEstValueEur(row),
    capRate: pickCapRatePct(row),
    rooms: row.total_rooms ?? 0,
    starRating: row.star_rating ?? 0,
    classification: chainScaleToClassification(row.chain_scale),
    owner: row.brand_family ?? "",
    tierBadge: undefined,
    promotion: { promoted: false },
    tags: row.scenario_label ? [row.scenario_label] : [],
    // Map report_library status → ReportStatus enum. "generated" / "partial"
    // map to "published" so the institutional library row reads as live ·
    // "archived" preserves itself · anything else falls to "draft".
    status: (
      row.report_status === "generated" || row.report_status === "partial"
        ? "published"
        : row.report_status === "archived"
        ? "archived"
        : "draft"
    ) as ReportStatus,
    updatedAt: isoToDate(row.last_rendered_at),
    amenities,
    location: {
      address: "",
      zip: "",
      subMarket: row.submarket ?? "",
      locationScore: 0,
    },
    listing: {
      role: "Principal" as ReportRole,
      objective: "For Sale" as ReportObjective,
      openYear: 2020,
      classLabel: row.chain_scale ?? "",
    },
    financials,
    reportType: "Public" as ReportTypeBadge,
    indicators,
    hasContact: false,
    favorited,
    hasPdf: true,
    referenceCode: row.canonical_id.slice(0, 8).toUpperCase(),
    visibilityTier: visibilityTierFor(row),
    contactInfo: null,
    canonicalId: row.canonical_id,
    reportUrl: row.report_url,
  };
}
