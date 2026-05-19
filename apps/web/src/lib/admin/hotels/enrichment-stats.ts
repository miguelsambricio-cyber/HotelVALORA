import "server-only";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

// Tables from migration 0024 (hotel_canonical / hotel_source_record /
// hotel_field_provenance / hotel_duplicate_candidate) and the
// hotel_coverage_madrid_v view are not yet in the generated Database
// types. Cast the client to an untyped form for these calls until the
// types generator is rerun.
type AnySupabase = {
  from(table: string): {
    select(cols: string, opts?: { count?: "exact"; head?: boolean }): unknown;
  };
};

export interface EnrichmentSnapshot {
  city: string;
  totals: {
    hotels: number;
    gold: number;
    silver: number;
    bronze: number;
    quarantined: number;
    t1_passing: number;
    t2_passing: number;
    avg_t1_pct: number;
    avg_t2_pct: number;
    institutional_passing_rate: number;
    goal_reached: boolean;
  };
  priorityFields: {
    phone: number;
    website_url: number;
    google_place_id: number;
    address_line1: number;
    total_rooms: number;
    year_opened: number;
    operator_id: number;
    wikidata_qid: number;
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
  topMissingFields: { field: string; missing: number }[];
  lastEnrichedAt: string | null;
}

const CITY = "Madrid";

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
  void ({} as AnySupabase); // silence unused import path

  type CanonRow = {
    id: string;
    phone: string | null;
    website_url: string | null;
    google_place_id: string | null;
    address_line1: string | null;
    total_rooms: number | null;
    year_opened: number | null;
    operator_id: string | null;
    wikidata_qid: string | null;
    last_enriched_at: string | null;
  };

  const canonRes = await sb
    .from("hotel_canonical")
    .select(
      "id,phone,website_url,google_place_id,address_line1,total_rooms,year_opened,operator_id,wikidata_qid,last_enriched_at",
    )
    .eq("city_normalized", CITY);

  if (canonRes.error || !canonRes.data) return null;
  const hotels = canonRes.data as unknown as CanonRow[];
  if (hotels.length === 0) return null;
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

  const priorityFields = {
    phone: hotels.filter((h) => h.phone).length,
    website_url: hotels.filter((h) => h.website_url).length,
    google_place_id: hotels.filter((h) => h.google_place_id).length,
    address_line1: hotels.filter((h) => h.address_line1).length,
    total_rooms: hotels.filter((h) => h.total_rooms != null).length,
    year_opened: hotels.filter((h) => h.year_opened != null).length,
    operator_id: hotels.filter((h) => h.operator_id).length,
    wikidata_qid: hotels.filter((h) => h.wikidata_qid).length,
  };

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

  const total = coverageRow.hotels_total;
  const topMissingFields = (
    [
      { field: "total_rooms", missing: total - priorityFields.total_rooms },
      { field: "year_opened", missing: total - priorityFields.year_opened },
      { field: "operator_id (indie)", missing: total - priorityFields.operator_id },
      { field: "wikidata_qid", missing: total - priorityFields.wikidata_qid },
      { field: "phone", missing: total - priorityFields.phone },
      { field: "website_url", missing: total - priorityFields.website_url },
      { field: "google_place_id", missing: total - priorityFields.google_place_id },
    ] as Array<{ field: string; missing: number }>
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
    totals: {
      hotels: coverageRow.hotels_total,
      gold: coverageRow.hotels_gold,
      silver: coverageRow.hotels_silver,
      bronze: coverageRow.hotels_bronze,
      quarantined: coverageRow.hotels_quarantined,
      t1_passing: coverageRow.hotels_t1_passing,
      t2_passing: coverageRow.hotels_t2_passing,
      avg_t1_pct: Number(coverageRow.avg_t1_pct ?? 0),
      avg_t2_pct: Number(coverageRow.avg_t2_pct ?? 0),
      institutional_passing_rate: Number(coverageRow.institutional_passing_rate ?? 0),
      goal_reached: coverageRow.goal_reached,
    },
    priorityFields,
    provenance: {
      source_records: sourceRows.length,
      field_provenance_rows: provRowsRes.count ?? 0,
      by_source,
    },
    dedup: dedupCounts,
    topMissingFields,
    lastEnrichedAt,
  };
}
