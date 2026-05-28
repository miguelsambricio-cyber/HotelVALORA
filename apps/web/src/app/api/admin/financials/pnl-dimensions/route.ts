import { NextResponse, type NextRequest } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { requireOperator, OperatorDenied } from "@/lib/security/operator-guard";

/**
 * GET /api/admin/financials/pnl-dimensions
 *
 * FASE 3 sub-paso 3 · returns the full set of distinct dimension tuples
 * present in `pnl_template` so the admin P&L panel can build its 5-level
 * cascade (País → Mercado → Submercado → Clase → Tipo) directly from BD
 * truth instead of hardcoded PNL_GEO_FILTERS in defaults.ts.
 *
 * Design decisions (operator-firmed 2026-05-28):
 *   - Query the BASE TABLE, NOT the view. Dimensions live on the table;
 *     the view hides the deprecated expenses_fb_pct column but doesn't
 *     affect dimensions.
 *   - INCLUDE pending_costar rows in the response. The operator's Option 3
 *     decision is: show pending countries in the selector but disable the
 *     downstream cascade with a "sin datos CoStar" message. Filtering at
 *     the API would lose that honesty layer.
 *   - Keys are CoStar canonical (English): "Madrid Centre", "Upper Upscale",
 *     "ES". NEVER translate here. Spanish display is sub-paso 6's job via
 *     pnl-i18n.ts. Mixing data + display contaminates the data layer.
 *   - Flat list shape. Indexed-tree would save ~5KB wire but the panel
 *     rebuilds its cascade maps in-memory anyway · simplicity wins for
 *     149 rows.
 *
 * Response shape:
 *   { ok: true,
 *     count: 149,
 *     rows: [{ country, market, submarket, class, segmentation_type, data_source }, …],
 *     meta: {
 *       total_distinct_tuples: 149,
 *       by_data_source: { costar_submarket_aggregate, costar_national, derived_mvp_rule, pending_costar },
 *       country_count: 41
 *     }
 *   }
 *
 * Determinism: ORDER BY country, market NULLS LAST, submarket NULLS LAST,
 * class NULLS LAST, segmentation_type NULLS LAST. Pending rows cluster at
 * the end of each country group.
 *
 * Cache-Control no-store (consistency with sub-paso 2) · in theory cacheable
 * across the corpus lifetime but consistency > micro-opt.
 *
 * Nothing consumes this yet · sub-paso 5 hook + sub-paso 6 panel are first
 * callers.
 */

export const dynamic = "force-dynamic";

interface DimensionRow {
  country: string;
  market: string | null;
  submarket: string | null;
  class: string | null;
  segmentation_type: "hotel" | "apartahotel" | "hostel" | null;
  data_source: "costar_submarket_aggregate" | "costar_national" | "derived_mvp_rule" | "pending_costar";
}

interface DimensionsMeta {
  total_distinct_tuples: number;
  by_data_source: Record<string, number>;
  country_count: number;
  /** Countries with at least one non-pending row (real CoStar or derived data). */
  country_count_with_data: number;
  /** Countries appearing ONLY as pending_costar (selector visible, cascade disabled). */
  country_count_pending: number;
}

function jsonNoStore(body: unknown, init?: ResponseInit): NextResponse {
  const res = NextResponse.json(body, init);
  res.headers.set("cache-control", "no-store, max-age=0");
  return res;
}

export async function GET(_req: NextRequest): Promise<NextResponse> {
  // ── 1 · Operator gate ────────────────────────────────────────────────
  try {
    await requireOperator();
  } catch (err) {
    if (err instanceof OperatorDenied) {
      return jsonNoStore({ ok: false, error: "unauthorized" }, { status: 403 });
    }
    return jsonNoStore(
      { ok: false, error: "auth_failed", details: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    );
  }

  // ── 2 · Query distinct dimensions ────────────────────────────────────
  const sb = getSupabaseAdmin();
  // Note: PostgREST does not expose SELECT DISTINCT directly · the 5-col
  // unique key in pnl_template guarantees each (country, market, submarket,
  // class, segmentation_type) tuple appears at most once in the base table
  // (NULLS NOT DISTINCT applies), so a plain SELECT yields the same set
  // as SELECT DISTINCT. The data_source column doesn't add cardinality
  // because it's functionally determined by the rest of the tuple.
  const { data, error } = await sb
    .from("pnl_template")
    .select("country,market,submarket,class,segmentation_type,data_source")
    .order("country", { ascending: true })
    .order("market", { ascending: true, nullsFirst: false })
    .order("submarket", { ascending: true, nullsFirst: false })
    .order("class", { ascending: true, nullsFirst: false })
    .order("segmentation_type", { ascending: true, nullsFirst: false });

  if (error) {
    return jsonNoStore(
      { ok: false, error: "db_query_failed", details: error.message },
      { status: 500 },
    );
  }

  const rows = (data ?? []) as DimensionRow[];

  // ── 3 · Compute meta ─────────────────────────────────────────────────
  // Two country buckets so the panel can paint "1 país con datos · 41 pending"
  // without re-walking the rows. A country is "with_data" if it has at least
  // one non-pending row; otherwise it is "pending".
  const by_data_source: Record<string, number> = {};
  const countriesWithData = new Set<string>();
  const allCountries = new Set<string>();
  for (const r of rows) {
    by_data_source[r.data_source] = (by_data_source[r.data_source] ?? 0) + 1;
    allCountries.add(r.country);
    if (r.data_source !== "pending_costar") countriesWithData.add(r.country);
  }
  const meta: DimensionsMeta = {
    total_distinct_tuples: rows.length,
    by_data_source,
    country_count: allCountries.size,
    country_count_with_data: countriesWithData.size,
    country_count_pending: allCountries.size - countriesWithData.size,
  };

  return jsonNoStore({
    ok: true,
    count: rows.length,
    rows,
    meta,
  });
}
