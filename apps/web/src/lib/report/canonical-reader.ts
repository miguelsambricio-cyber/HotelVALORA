import "server-only";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { loadHotelsSnapshot } from "@/lib/admin/hotels/snapshot-reader";

/**
 * Phase 4 · canonical data layer for reports.
 *
 * Single read path: `public.hotel_canonical` (Supabase). Resolves either
 * by Supabase UUID (`canonical_id`) or by synthetic snapshot hotel_id
 * (`h_<hex>` via the multi-path resolver mirrored from the admin
 * detail page).
 *
 * Market KPIs are read from the snapshot's `market_timeseries` block
 * (the same structure loadHotelsSnapshot already returns) so we don't
 * duplicate the CoStar warehouse fetch.
 */

export interface CanonicalHotelRow {
  id: string;
  canonical_name: string | null;
  brand: string | null;
  brand_family: string | null;
  chain_scale: string | null;
  star_rating: number | null;
  hotel_type: string | null;
  segment: string | null;
  operator_type: string | null;
  address_line1: string | null;
  city: string | null;
  city_normalized: string | null;
  postal_code: string | null;
  country_code: string | null;
  region: string | null;
  neighborhood: string | null;
  lat: number | null;
  lng: number | null;
  total_rooms: number | null;
  total_keys: number | null;
  meeting_rooms_count: number | null;
  meeting_space_sqm: number | null;
  year_opened: number | null;
  year_renovated_last: number | null;
  review_score: number | null;
  review_count: number | null;
  phone: string | null;
  website_url: string | null;
  booking_url: string | null;
  hero_image_path: string | null;
  google_place_id: string | null;
  wikidata_qid: string | null;
  data_quality_tier: string | null;
  documented_independent: boolean;
  last_enriched_at: string | null;
  // Joined lookups
  market_name: string | null;
  submarket_name: string | null;
  operator_name: string | null;
  amenities: Record<string, boolean | null> | null;
}

const SELECT_COLS =
  "id,canonical_name,brand,brand_family,chain_scale,star_rating,hotel_type,segment,operator_type,address_line1,city,city_normalized,postal_code,country_code,region,neighborhood,lat,lng,total_rooms,total_keys,meeting_rooms_count,meeting_space_sqm,year_opened,year_renovated_last,review_score,review_count,phone,website_url,booking_url,hero_image_path,google_place_id,wikidata_qid,data_quality_tier,documented_independent,last_enriched_at,amenities,market_id,submarket_id,operator_id";

type RawHotelRow = Omit<CanonicalHotelRow, "market_name" | "submarket_name" | "operator_name"> & {
  market_id?: string | null;
  submarket_id?: string | null;
  operator_id?: string | null;
};

async function joinLookups(row: RawHotelRow): Promise<CanonicalHotelRow> {
  const sb = getSupabaseAdmin() as unknown as {
    from: (t: string) => {
      select: (cols: string) => {
        eq: (col: string, val: string) => {
          limit: (n: number) => Promise<{ data: unknown[] | null; error: unknown }>;
        };
      };
    };
  };

  const [marketRes, submarketRes, operatorRes] = await Promise.all([
    row.market_id
      ? sb.from("market").select("name").eq("id", row.market_id).limit(1)
      : Promise.resolve({ data: null, error: null }),
    row.submarket_id
      ? sb.from("submarket").select("name").eq("id", row.submarket_id).limit(1)
      : Promise.resolve({ data: null, error: null }),
    row.operator_id
      ? sb.from("operators").select("name").eq("id", row.operator_id).limit(1)
      : Promise.resolve({ data: null, error: null }),
  ]);

  const market = (marketRes.data?.[0] as { name?: string } | undefined)?.name ?? null;
  const submarket = (submarketRes.data?.[0] as { name?: string } | undefined)?.name ?? null;
  const operator = (operatorRes.data?.[0] as { name?: string } | undefined)?.name ?? null;

  // Strip the lookup ids from the returned row to keep the public type clean
  const { market_id: _m, submarket_id: _s, operator_id: _o, ...clean } = row;
  void _m; void _s; void _o;

  return {
    ...clean,
    market_name: market,
    submarket_name: submarket,
    operator_name: operator,
  };
}

/**
 * Fetch a hotel by Supabase canonical UUID.
 */
export async function getCanonicalHotelById(canonical_id: string): Promise<CanonicalHotelRow | null> {
  if (!canonical_id) return null;
  const sb = getSupabaseAdmin() as unknown as {
    from: (t: string) => {
      select: (cols: string) => {
        eq: (col: string, val: string) => {
          limit: (n: number) => Promise<{ data: unknown[] | null; error: unknown }>;
        };
      };
    };
  };
  const res = await sb
    .from("hotel_canonical")
    .select(SELECT_COLS)
    .eq("id", canonical_id)
    .limit(1);
  if (res.error || !res.data || res.data.length === 0) return null;
  return joinLookups(res.data[0] as RawHotelRow);
}

/**
 * Resolve a synthetic snapshot hotel_id (`h_<hex>`) to a Supabase
 * canonical UUID. Multi-path: snapshot field → exact name → prefix
 * name → postal+address fragment. Returns null when not linked.
 */
export async function resolveCanonicalIdFromSnapshotHotelId(snapshot_hotel_id: string): Promise<string | null> {
  if (!snapshot_hotel_id) return null;
  const snap = await loadHotelsSnapshot();
  const h = snap?.hotels.find((x) => x.hotel_id === snapshot_hotel_id);
  if (!h) return null;

  // Path 0 · direct from snapshot row
  const direct = (h as { canonical_id_supabase?: string | null }).canonical_id_supabase;
  if (direct) return direct;

  const sb = getSupabaseAdmin() as unknown as {
    from: (t: string) => {
      select: (cols: string) => {
        eq: (col: string, val: string) => unknown;
        ilike: (col: string, val: string) => unknown;
      };
    };
  };

  const runQ = async (b: unknown): Promise<string | null> => {
    const r = (await (b as Promise<{ data: unknown[] | null; error: unknown }>)) as {
      data: unknown[] | null;
      error: unknown;
    };
    if (r.error || !r.data || r.data.length === 0) return null;
    const id = (r.data[0] as { id?: string }).id;
    return id ?? null;
  };

  // Path 1 · exact name + Madrid
  if (h.name) {
    const r = await runQ(
      ((
        (sb.from("hotel_canonical").select("id") as {
          eq: (c: string, v: string) => unknown;
        }).eq("canonical_name", h.name) as { eq: (c: string, v: string) => unknown }
      ).eq("city_normalized", "Madrid") as { limit: (n: number) => unknown }).limit(1),
    );
    if (r) return r;

    // Path 2 · prefix match
    const r2 = await runQ(
      ((
        (sb.from("hotel_canonical").select("id") as {
          ilike: (c: string, v: string) => unknown;
        }).ilike("canonical_name", `${h.name}%`) as { eq: (c: string, v: string) => unknown }
      ).eq("city_normalized", "Madrid") as { limit: (n: number) => unknown }).limit(1),
    );
    if (r2) return r2;
  }

  // Path 3 · postal + address fragment
  if (h.postal_code && h.address_line) {
    const seg = h.address_line.split(",")[0].trim().slice(0, 14);
    if (seg.length >= 4) {
      const r = await runQ(
        ((
          (sb.from("hotel_canonical").select("id") as {
            eq: (c: string, v: string) => unknown;
          }).eq("postal_code", h.postal_code) as { ilike: (c: string, v: string) => unknown }
        ).ilike("address_line1", `%${seg}%`) as { limit: (n: number) => unknown }).limit(1),
      );
      if (r) return r;
    }
  }

  return null;
}

/**
 * Market KPI block sourced from the snapshot's market_timeseries.
 *
 * Returns the latest available aggregate for a (market_name [+ optional
 * submarket_name]) tuple. CoStar shape: `adr_spot`, `adr_12m`,
 * `occupancy_spot`, `occupancy_12m`, `revpar_spot`, `revpar_12m`,
 * `market_yield`, `market_sale_price_per_room`.
 */
export interface MarketKpiBundle {
  market_name: string;
  submarket_name: string | null;
  adr_spot: number | null;
  adr_12m: number | null;
  occupancy_spot: number | null;
  occupancy_12m: number | null;
  revpar_spot: number | null;
  revpar_12m: number | null;
  market_yield: number | null;
  market_sale_price_per_room: number | null;
  period: string | null;
}

export async function getMarketKpis(
  market_name: string | null,
  submarket_name: string | null,
): Promise<MarketKpiBundle | null> {
  if (!market_name) return null;
  const snap = await loadHotelsSnapshot();
  if (!snap) return null;
  const ts = (snap as unknown as { market_timeseries?: Array<Record<string, unknown>> }).market_timeseries ?? [];

  // CoStar uses 'Madrid ESP' style; canonical uses 'Madrid'. Match by prefix.
  const marketLc = market_name.toLowerCase();
  const submarketLc = submarket_name?.toLowerCase() ?? null;

  // Prefer submarket-level row when submarket is set; else market-level.
  const rows = ts.filter((r) => {
    const mn = (r.market_name as string | null) ?? "";
    return mn.toLowerCase().startsWith(marketLc);
  });
  if (rows.length === 0) return null;

  let chosen: Record<string, unknown> | null = null;
  if (submarketLc) {
    chosen = rows.find((r) => {
      const sn = (r.submarket_name as string | null) ?? "";
      return sn.toLowerCase() === submarketLc;
    }) ?? null;
  }
  if (!chosen) {
    // Market-level row · prefer one with submarket_name = null
    chosen = rows.find((r) => !r.submarket_name) ?? rows[0];
  }
  if (!chosen) return null;

  const num = (v: unknown): number | null => {
    if (v === null || v === undefined || v === "") return null;
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  };

  return {
    market_name,
    submarket_name,
    adr_spot: num(chosen.adr_spot),
    adr_12m: num(chosen.adr_12m),
    occupancy_spot: num(chosen.occupancy_spot),
    occupancy_12m: num(chosen.occupancy_12m),
    revpar_spot: num(chosen.revpar_spot),
    revpar_12m: num(chosen.revpar_12m),
    market_yield: num(chosen.market_yield),
    market_sale_price_per_room: num(chosen.market_sale_price_per_room),
    period: (chosen.period as string | null) ?? null,
  };
}
