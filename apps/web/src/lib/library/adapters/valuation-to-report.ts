// Adapter: Supabase `valuations` row (+ joined top_promote_reports) →
// frontend `LibraryReport` shape.
//
// The adapter exists because the DB is normalised — JSONB blobs cover
// `financials`, `amenities`, `indicators`, `contact_info` 1:1 with the
// frontend shapes — while several display-time concerns (favorited
// flag, derived category, default mock-map position, etc.) only make
// sense in the rendering context. Keeping that derivation in one pure
// function keeps the hooks dumb and the components untouched.

import type {
  LibraryReport,
  ReportAmenities,
  ReportCategory,
  ReportContactInfo,
  ReportFinancials,
  ReportIndicators,
  ReportObjective,
  ReportRole,
  ReportStatus,
  ReportTypeBadge,
  ReportVisibility,
  VisibilityTier,
} from "@/types/library";
import type { Database } from "@/lib/supabase/types";

type ValuationRow = Database["public"]["Tables"]["valuations"]["Row"];
type TopPromoteRow = Database["public"]["Tables"]["top_promote_reports"]["Row"];

// Shape of the row returned by `useLibraryReports`: the valuation row
// itself plus an optional 1:1 left-join on `top_promote_reports`
// (PostgREST nests it as an array even when uniqueness is enforced —
// hence the `[0]` / `null` handling here).
export interface ValuationWithJoins extends ValuationRow {
  top_promote_reports: TopPromoteRow[] | TopPromoteRow | null;
}

export interface AdapterContext {
  /** Valuation ids the current viewer has marked as favourite. */
  favoriteIds: ReadonlySet<string>;
  /** When true, every row renders as "favorited" — used for the
   *  unauthenticated demo state, mirroring the legacy mock dataset. */
  treatAllAsFavorited?: boolean;
}

// ─── Pure helpers ───────────────────────────────────────────────────────────

function asActivePromotion(row: TopPromoteRow | null | undefined): TopPromoteRow | null {
  if (!row) return null;
  return new Date(row.promoted_until).getTime() > Date.now() ? row : null;
}

function pickPromotion(value: ValuationWithJoins["top_promote_reports"]): TopPromoteRow | null {
  if (!value) return null;
  if (Array.isArray(value)) return asActivePromotion(value[0]);
  return asActivePromotion(value);
}

function isoToDate(iso: string): string {
  // Library cards display YYYY-MM-DD only.
  return iso.slice(0, 10);
}

function readNumber(value: unknown, fallback: number): number {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const n = Number(value);
    if (Number.isFinite(n)) return n;
  }
  return fallback;
}

function readJson<T>(value: unknown, fallback: T): T {
  return (value ?? fallback) as T;
}

function tierBadgeFromReportType(rt: ValuationRow["report_type"]): LibraryReport["tierBadge"] {
  switch (rt) {
    case "Premium":
      return "PREMIUM";
    case "PRO":
      return "PRO";
    case "Private":
      return "INSTITUTIONAL";
    default:
      return undefined;
  }
}

function visibilityTierFor(
  row: ValuationRow,
  hasActivePromotion: boolean,
  indicators: ReportIndicators & { visibilityTier?: VisibilityTier },
): VisibilityTier {
  if (indicators.visibilityTier) return indicators.visibilityTier;
  if (hasActivePromotion) return "promoted";
  if (row.report_type === "Premium") return "institutional";
  if (row.report_type === "PRO") return "verified";
  return "community";
}

function deriveCategory(
  hasActivePromotion: boolean,
  favorited: boolean,
): ReportCategory {
  if (hasActivePromotion) return "top-promote";
  if (favorited) return "saved";
  return "community";
}

// ─── Adapter ────────────────────────────────────────────────────────────────

export function adaptValuationToLibraryReport(
  row: ValuationWithJoins,
  ctx: AdapterContext,
): LibraryReport {
  const promotion = pickPromotion(row.top_promote_reports);
  const hasActivePromotion = promotion !== null;
  const favorited =
    ctx.treatAllAsFavorited === true ? true : ctx.favoriteIds.has(row.id);

  // JSONB blobs — shape mirrors the LibraryReport sub-types exactly
  // (enforced in `0005_seed_library_demo_data.sql`).
  const financials = readJson<ReportFinancials>(row.financials, {
    capex: null,
    totalInvest: null,
    capRate: 0,
    marketValueTtm: { total: 0, perRoom: 0, perM2: 0 },
    exitYear: null,
    exitPrice: null,
    yield: null,
    irrProject: null,
    irrEquity: null,
  });
  const amenities = readJson<ReportAmenities>(row.amenities, {
    bar: false,
    restaurant: false,
    rooftop: false,
    meetingRooms: false,
    gym: false,
    spa: false,
    pool: false,
    parking: false,
  });
  const indicatorsRaw = readJson<
    ReportIndicators & {
      tierBadge?: LibraryReport["tierBadge"];
      visibilityTier?: VisibilityTier;
      tags?: string[];
      mockPosition?: { topPct: number; leftPct: number };
      hasPdf?: boolean;
    }
  >(row.indicators, { topPromote: false, userModified: false, private: false });

  const contactInfo = readJson<ReportContactInfo | null>(row.contact_info, null);
  const indicators: ReportIndicators = {
    topPromote: hasActivePromotion || indicatorsRaw.topPromote,
    userModified: indicatorsRaw.userModified,
    private: indicatorsRaw.private,
  };

  const visibility = (row.visibility ?? "private") as ReportVisibility;
  const status = (row.status ?? "draft") as ReportStatus;

  return {
    id: row.id,
    hotelName: row.hotel_name,
    city: row.city,
    country: row.country,
    coordinates: {
      lat: readNumber(row.lat, 0),
      lng: readNumber(row.lng, 0),
    },
    mockPosition: indicatorsRaw.mockPosition ?? { topPct: 50, leftPct: 50 },
    category: deriveCategory(hasActivePromotion, favorited),
    visibility,
    estValueEur: financials.marketValueTtm?.total ?? 0,
    capRate: financials.capRate,
    rooms: row.rooms ?? 0,
    starRating: row.star_rating ?? 0,
    classification: row.classification ?? "",
    owner: row.owner_label ?? "",
    tierBadge: indicatorsRaw.tierBadge ?? tierBadgeFromReportType(row.report_type),
    promotion: promotion
      ? {
          promoted: true,
          promotedUntil: promotion.promoted_until,
          boostScore: promotion.boost_score ?? undefined,
          featuredRegion: promotion.featured_region ?? undefined,
          impressions: promotion.impressions,
          clicks: promotion.clicks,
        }
      : { promoted: false },
    tags: indicatorsRaw.tags ?? [],
    status,
    updatedAt: isoToDate(row.updated_at),
    amenities,
    location: {
      address: row.address ?? "",
      zip: row.zip ?? "",
      subMarket: row.sub_market ?? "",
      locationScore: readNumber(row.location_score, 0),
    },
    listing: {
      role: (row.role ?? "Principal") as ReportRole,
      objective: (row.objective ?? "For Sale") as ReportObjective,
      openYear: row.open_year ?? 2020,
      classLabel: row.class_label ?? "",
    },
    financials,
    reportType: (row.report_type ?? "Public") as ReportTypeBadge,
    indicators,
    hasContact: contactInfo !== null,
    favorited,
    hasPdf: indicatorsRaw.hasPdf ?? true,
    referenceCode: row.reference_code ?? "",
    visibilityTier: visibilityTierFor(row, hasActivePromotion, indicatorsRaw),
    contactInfo,
  };
}
