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
 * Market KPI bundle returned by `resolveBestAvailableMarketKpis`.
 *
 * Carries a `source` field naming which level of the fallback ladder
 * answered the query · used by the Executive Summary mapper to populate
 * the methodology note + the valuation `scenario` label so investors
 * always see KPI provenance.
 */
export type MarketKpiSource =
  | "compset"
  | "submarket"
  | "market"
  | "country"
  | "baseline";

export interface MarketKpiBundle {
  source: MarketKpiSource;
  source_label: string;
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

/**
 * Institutional baseline · Madrid 2024.
 *
 * Operator-approved fallback used when no compset / submarket / market /
 * country row covers the requested key. Numbers anchored on:
 *   - ADR / Occupancy / RevPAR · CoStar Madrid market 12m aggregate
 *     (2024 Q4 close · STR-equivalent)
 *   - market_yield · institutional Madrid hotel cap-rate band centre
 *     (Cushman&Wakefield + Colliers + Savills Hospitality 2024)
 *   - market_sale_price_per_room · Madrid luxury+upper-upscale transaction
 *     median 2023-2024 (CBRE + JLL deals)
 *
 * CoStar does NOT provide yield + per-room in this snapshot · these two
 * fields will always reach the baseline unless the operator overrides.
 */
export const MADRID_2024_INSTITUTIONAL_BASELINE = {
  adr_12m: 218.0,
  occupancy_12m: 0.74,
  revpar_12m: 161.32,
  market_yield: 6.5,
  market_sale_price_per_room: 285_000,
} as const;

const num = (v: unknown): number | null => {
  if (v === null || v === undefined || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

function toBundle(
  source: MarketKpiSource,
  source_label: string,
  market_name: string,
  submarket_name: string | null,
  row: Record<string, unknown> | null,
  baselineFill = true,
): MarketKpiBundle {
  const baseline = MADRID_2024_INSTITUTIONAL_BASELINE;
  const bundle: MarketKpiBundle = {
    source,
    source_label,
    market_name,
    submarket_name,
    adr_spot: row ? num(row.adr_spot) : null,
    adr_12m: row ? num(row.adr_12m) : null,
    occupancy_spot: row ? num(row.occupancy_spot) : null,
    occupancy_12m: row ? num(row.occupancy_12m) : null,
    revpar_spot: row ? num(row.revpar_spot) : null,
    revpar_12m: row ? num(row.revpar_12m) : null,
    market_yield: row ? num(row.market_yield) : null,
    market_sale_price_per_room: row ? num(row.market_sale_price_per_room) : null,
    period: row ? ((row.period as string | null) ?? null) : null,
  };
  // Yield + per-room are NEVER populated in CoStar Madrid snapshot.
  // Fill from the institutional baseline so the valuation block has a
  // defensible anchor regardless of which level resolved ADR/Occ/RevPAR.
  if (baselineFill && bundle.market_yield === null) {
    bundle.market_yield = baseline.market_yield;
  }
  if (baselineFill && bundle.market_sale_price_per_room === null) {
    bundle.market_sale_price_per_room = baseline.market_sale_price_per_room;
  }
  return bundle;
}

/**
 * Resolve the best-available KPI bundle for a canonical hotel · 6-level
 * fallback ladder aligned with the operator's underwriting architecture:
 *
 *   1. **compset**     → snap.compset_performance keyed by hotel's compset
 *      (empty in the current snapshot · Phase 2 compset ingestion populates
 *      this layer). Future first-choice because compsets are the most
 *      operationally-realistic proxy.
 *   2. **submarket**   → snap.market_snapshots where granularity='submarket'
 *      AND submarket_name matches. Today's primary source for ADR/Occ/RevPAR.
 *   3. **market**      → snap.market_snapshots where granularity='market'
 *      AND market_name startsWith hotel market (e.g. 'Madrid ESP').
 *   4. **country**     → snap.market_snapshots where granularity='country_listing'
 *      AND market_name = ISO country (e.g. 'Spain').
 *   5. **baseline**    → MADRID_2024_INSTITUTIONAL_BASELINE (CoStar 12m +
 *      Cushman/Colliers/Savills yield + CBRE/JLL per-room median).
 *
 * The bundle's `source` field exposes which level answered · investors and
 * operators ALWAYS see KPI provenance via the methodology note in the
 * Executive Summary.
 *
 * yield + per-room are ALWAYS filled from baseline because CoStar Madrid
 * snapshot never provides them. The baseline is operator-approved as a
 * temporary institutional anchor until live transaction comps from
 * Block 7+ feed the engine directly.
 */
export async function resolveBestAvailableMarketKpis(
  market_name: string | null,
  submarket_name: string | null,
  // hotel context for future compset/class resolution levels
  _ctx?: { country_code?: string | null; chain_scale?: string | null },
): Promise<MarketKpiBundle> {
  const fallbackLabel = "Madrid institutional baseline · 2024";
  if (!market_name) {
    return toBundle("baseline", fallbackLabel, "Madrid", null, null);
  }
  const snap = await loadHotelsSnapshot();
  if (!snap) {
    return toBundle("baseline", fallbackLabel, market_name, submarket_name, null);
  }
  const ms = (snap as unknown as { market_snapshots?: Array<Record<string, unknown>> }).market_snapshots ?? [];

  const marketLc = market_name.toLowerCase();
  const submarketLc = submarket_name?.toLowerCase() ?? null;

  // Layer 1 · compset (future · empty today)
  // Slot intentionally left empty · will read from snap.compset_performance
  // once Phase 2 compset ingestion populates it.

  // Layer 2 · submarket
  if (submarketLc) {
    const subRow = ms.find((r) => {
      if (r.granularity !== "submarket") return false;
      const sn = (r.submarket_name as string | null) ?? "";
      return sn.toLowerCase() === submarketLc;
    });
    if (subRow && num(subRow.adr_12m) !== null) {
      return toBundle(
        "submarket",
        `CoStar submarket · ${subRow.submarket_name as string}`,
        market_name,
        submarket_name,
        subRow,
      );
    }
  }

  // Layer 3 · market
  const marketRow = ms.find((r) => {
    if (r.granularity !== "market") return false;
    const mn = (r.market_name as string | null) ?? "";
    return mn.toLowerCase().startsWith(marketLc);
  });
  if (marketRow && num(marketRow.adr_12m) !== null) {
    return toBundle(
      "market",
      `CoStar market · ${marketRow.market_name as string}`,
      market_name,
      submarket_name,
      marketRow,
    );
  }

  // Layer 4 · country (country_code → Spain · etc.)
  const countryMap: Record<string, string> = {
    ES: "Spain",
    FR: "France",
    IT: "Italy",
    PT: "Portugal",
    DE: "Germany",
    GB: "United Kingdom",
  };
  const countryName = countryMap[_ctx?.country_code ?? ""] ?? "Spain";
  const countryRow = ms.find((r) => {
    if (r.granularity !== "country_listing") return false;
    const mn = (r.market_name as string | null) ?? "";
    return mn.toLowerCase() === countryName.toLowerCase();
  });
  if (countryRow && num(countryRow.adr_12m) !== null) {
    return toBundle(
      "country",
      `CoStar country · ${countryName}`,
      market_name,
      submarket_name,
      countryRow,
    );
  }

  // Layer 5 · institutional baseline (final · always defined)
  return toBundle("baseline", fallbackLabel, market_name, submarket_name, null);
}

/**
 * @deprecated · use `resolveBestAvailableMarketKpis` which exposes a
 * source provenance field and walks the full 6-level fallback ladder.
 * Kept for backwards-compat during the Phase 4 migration · removable
 * once all canonical mappers move to the resolver.
 */
export async function getMarketKpis(
  market_name: string | null,
  submarket_name: string | null,
): Promise<MarketKpiBundle | null> {
  const b = await resolveBestAvailableMarketKpis(market_name, submarket_name);
  return b.source === "baseline" && !market_name ? null : b;
}
