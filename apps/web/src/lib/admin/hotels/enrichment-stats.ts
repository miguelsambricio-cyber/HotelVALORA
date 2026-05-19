import "server-only";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

// Tables from migration 0024 (hotel_canonical / hotel_source_record /
// hotel_field_provenance / hotel_duplicate_candidate) and the
// hotel_coverage_madrid_v view are not yet in the generated Database
// types. Cast the client to an untyped form for these calls until the
// types generator is rerun.

export interface EnrichmentSnapshot {
  city: string;
  scope: {
    core_n: number;
    hidden_non_core_n: number;
    hidden_names_sample: string[];
  };
  totals: {
    hotels: number;
    gold: number;
    silver: number;
    bronze: number;
    quarantined: number;
    t1_passing: number;
    t2_v1_passing_deprecated: number;
    avg_t1_pct: number;
    avg_t2_pct_deprecated: number;
    institutional_passing_rate_deprecated: number;
    goal_reached_deprecated: boolean;
    /** v2-oriented · count of CORE-UNDERWRITING fields filled per hotel · 8 fields */
    avg_underwriting_fields_filled: number;
    underwriting_fields_total: number;
  };
  cohort: {
    branded_n: number;
    indie_n: number;
    branded_with_operator: number;
    indie_no_parent_operator: number;
  };
  priorityFields: {
    phone: number;
    website_url: number;
    google_place_id: number;
    address_line1: number;
    total_rooms: number;
    year_opened: number;
    wikidata_qid: number;
    /** branded-only denominator for operator_id */
    operator_id_branded: number;
  };
  provenance: {
    source_records: number;
    field_provenance_rows: number;
    by_source: { source: string; n: number }[];
  };
  dedup: {
    pending_review: number;
    auto_merge: number;
    sibling_listing: number;
    dismissed: number;
  };
  structuralBlockers: { field: string; missing: number; note: string }[];
  lastEnrichedAt: string | null;
}

const CITY = "Madrid";

// Excluded from the admin / underwriting scope (hidden, NOT deleted).
// Stays enriched + indexed in canonical; just out-of-view for the
// Phase D admin panel until the v2 readiness model lands.
const NAME_EXCLUDE_REGEX =
  /\b(hostel|albergue|aparthotel|apartahotel|apartamentos|apartments|bob\s?w|smartrental|smart\s?rental|the social hub)\b/i;
const TYPE_EXCLUDE = new Set(["hostel", "aparthotel", "serviced_apartments", "flex_living"]);

function isCore(h: { canonical_name: string | null; hotel_type: string | null }): boolean {
  if (h.hotel_type && TYPE_EXCLUDE.has(h.hotel_type)) return false;
  if (h.canonical_name && NAME_EXCLUDE_REGEX.test(h.canonical_name)) return false;
  return true;
}

export async function loadEnrichmentSnapshot(): Promise<EnrichmentSnapshot | null> {
  const sb = getSupabaseAdmin() as unknown as {
    from: (table: string) => {
      select: (cols: string, opts?: { count?: "exact"; head?: boolean }) => {
        eq: (col: string, val: string) => Promise<{ data: unknown[] | null; error: unknown }>;
        in: (col: string, vals: string[]) => Promise<{ data: unknown[] | null; error: unknown; count: number | null }>;
        limit: (n: number) => Promise<{ data: unknown[] | null; error: unknown }>;
        order: (col: string, opts: { ascending: boolean; nullsFirst?: boolean }) => {
          limit: (n: number) => Promise<{ data: unknown[] | null; error: unknown }>;
        };
      } & Promise<{ data: unknown[] | null; error: unknown; count: number | null }>;
    };
  };

  type CanonRow = {
    id: string;
    canonical_name: string | null;
    hotel_type: string | null;
    brand_family: string | null;
    data_quality_tier: string | null;
    phone: string | null;
    website_url: string | null;
    google_place_id: string | null;
    address_line1: string | null;
    postal_code: string | null;
    market_id: string | null;
    submarket_id: string | null;
    chain_scale: string | null;
    segment: string | null;
    operator_type: string | null;
    total_rooms: number | null;
    year_opened: number | null;
    operator_id: string | null;
    wikidata_qid: string | null;
    last_enriched_at: string | null;
  };

  const canonRes = await sb
    .from("hotel_canonical")
    .select(
      "id,canonical_name,hotel_type,brand_family,data_quality_tier,phone,website_url,google_place_id,address_line1,postal_code,market_id,submarket_id,chain_scale,segment,operator_type,total_rooms,year_opened,operator_id,wikidata_qid,last_enriched_at",
    )
    .eq("city_normalized", CITY);

  if (canonRes.error || !canonRes.data) return null;
  const allHotels = canonRes.data as unknown as CanonRow[];
  if (allHotels.length === 0) return null;

  // Split: core (visible) vs hidden non-core
  const hotels = allHotels.filter(isCore);
  const hidden = allHotels.filter((h) => !isCore(h));
  const hotelIds = hotels.map((h) => h.id);

  const [coverageRes, sourcesRes, provRowsRes, dedupRes] = await Promise.all([
    sb.from("hotel_coverage_madrid_v").select("*").limit(1),
    sb.from("hotel_source_record").select("source").in("hotel_id", hotelIds),
    sb
      .from("hotel_field_provenance")
      .select("id", { count: "exact", head: true })
      .in("hotel_id", hotelIds),
    sb.from("hotel_duplicate_candidate").select("status, tier"),
  ]);

  const coverageRow = (coverageRes.data?.[0] ?? null) as
    | {
        country_code: string;
        city_normalized: string;
        hotels_total: number;
        hotels_gold: number;
        hotels_silver: number;
        hotels_bronze: number;
        hotels_quarantined: number;
        hotels_t1_passing: number;
        hotels_t2_passing: number;
        avg_t1_pct: string | number | null;
        avg_t2_pct: string | number | null;
        institutional_passing_rate: string | number | null;
        goal_reached: boolean;
      }
    | null;

  if (!coverageRow) return null;

  const total = hotels.length;
  const branded = hotels.filter((h) => h.brand_family);
  const indie = hotels.filter((h) => !h.brand_family);

  // Per-tier counts on the CORE-SCOPE only (coverage view counts the full
  // 224; we re-derive on the filtered subset so the panel is internally
  // consistent).
  const gold = hotels.filter((h) => h.data_quality_tier === "gold").length;
  const silver = hotels.filter((h) => h.data_quality_tier === "silver").length;
  const bronze = hotels.filter((h) => h.data_quality_tier === "bronze").length;
  const quarantined = hotels.filter((h) => h.data_quality_tier === "quarantined").length;

  const priorityFields = {
    phone: hotels.filter((h) => h.phone).length,
    website_url: hotels.filter((h) => h.website_url).length,
    google_place_id: hotels.filter((h) => h.google_place_id).length,
    address_line1: hotels.filter((h) => h.address_line1).length,
    total_rooms: hotels.filter((h) => h.total_rooms != null).length,
    year_opened: hotels.filter((h) => h.year_opened != null).length,
    wikidata_qid: hotels.filter((h) => h.wikidata_qid).length,
    operator_id_branded: branded.filter((h) => h.operator_id).length,
  };

  // CORE underwriting fields per cap-rate engine — counts how many of
  // the 8 fields each hotel has populated. Bypasses the equal-weight v1
  // T2 trap; surfaces actual underwriting readiness signal.
  // Note: market_id / submarket_id are 0% globally today (PostGIS pending).
  const UW_FIELDS_TOTAL = 8;
  const underwritingFilledPerHotel = hotels.map(
    (h) =>
      (h.chain_scale ? 1 : 0) +
      (h.segment ? 1 : 0) +
      (h.total_rooms != null ? 1 : 0) +
      (h.market_id ? 1 : 0) +
      (h.submarket_id ? 1 : 0) +
      (h.postal_code ? 1 : 0) +
      ((h.year_opened != null) ? 1 : 0) +
      (h.operator_type ? 1 : 0),
  );
  const avg_underwriting_fields_filled =
    underwritingFilledPerHotel.length === 0
      ? 0
      : underwritingFilledPerHotel.reduce((a, b) => a + b, 0) / underwritingFilledPerHotel.length;

  const sourceRows = (sourcesRes.data ?? []) as Array<{ source: string }>;
  const bySourceMap = new Map<string, number>();
  for (const r of sourceRows) {
    bySourceMap.set(r.source, (bySourceMap.get(r.source) ?? 0) + 1);
  }
  const by_source = Array.from(bySourceMap.entries())
    .map(([source, n]) => ({ source, n }))
    .sort((a, b) => b.n - a.n);

  const dedupRows = (dedupRes.data ?? []) as Array<{ status: string; tier: string }>;
  const dedupCounts = {
    pending_review: dedupRows.filter((d) => d.status === "pending_review").length,
    auto_merge: dedupRows.filter((d) => d.tier === "auto_merge").length,
    sibling_listing: dedupRows.filter((d) => d.status === "sibling_listing").length,
    dismissed: dedupRows.filter((d) => d.status === "dismissed").length,
  };

  // Structural blockers (gap to 100%) — exclude operator_id which is
  // by-design split (branded vs indie · surfaced in the cohort section
  // instead of as a defect).
  const structuralBlockers = (
    [
      {
        field: "total_rooms",
        missing: total - priorityFields.total_rooms,
        note: "Booking E2 does not expose · Wikidata P1106 sparse for ES · path forward: D-8",
      },
      {
        field: "year_opened",
        missing: total - priorityFields.year_opened,
        note: "Wikidata P571 sparse for ES (1 hit in 66) · path forward: D-8 chain websites",
      },
      {
        field: "market_id / submarket_id",
        missing: total,
        note: "0% across the corpus · path forward: PostGIS Madrid polygons workstream",
      },
      {
        field: "wikidata_qid",
        missing: total - priorityFields.wikidata_qid,
        note: "59% hit rate on branded · not applicable to indies without notability",
      },
    ] as Array<{ field: string; missing: number; note: string }>
  )
    .filter((r) => r.missing > 0)
    .sort((a, b) => b.missing - a.missing);

  const lastEnrichedAt =
    hotels
      .map((h) => h.last_enriched_at)
      .filter((t): t is string => Boolean(t))
      .sort()
      .at(-1) ?? null;

  return {
    city: CITY,
    scope: {
      core_n: total,
      hidden_non_core_n: hidden.length,
      hidden_names_sample: hidden.slice(0, 5).map((h) => h.canonical_name ?? "—"),
    },
    totals: {
      hotels: total,
      gold,
      silver,
      bronze,
      quarantined,
      t1_passing: coverageRow.hotels_t1_passing, // approximation — view counts full 224
      t2_v1_passing_deprecated: coverageRow.hotels_t2_passing,
      avg_t1_pct: Number(coverageRow.avg_t1_pct ?? 0),
      avg_t2_pct_deprecated: Number(coverageRow.avg_t2_pct ?? 0),
      institutional_passing_rate_deprecated: Number(coverageRow.institutional_passing_rate ?? 0),
      goal_reached_deprecated: coverageRow.goal_reached,
      avg_underwriting_fields_filled,
      underwriting_fields_total: UW_FIELDS_TOTAL,
    },
    cohort: {
      branded_n: branded.length,
      indie_n: indie.length,
      branded_with_operator: branded.filter((h) => h.operator_id).length,
      indie_no_parent_operator: indie.length, // by design
    },
    priorityFields,
    provenance: {
      source_records: sourceRows.length,
      field_provenance_rows: provRowsRes.count ?? 0,
      by_source,
    },
    dedup: dedupCounts,
    structuralBlockers,
    lastEnrichedAt,
  };
}
