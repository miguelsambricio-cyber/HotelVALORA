import { NextResponse, type NextRequest } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { requireOperator, OperatorDenied } from "@/lib/security/operator-guard";
import type { EffectiveTemplateRow } from "@/lib/admin/financials/pnl-line-mapping";

/**
 * GET /api/admin/financials/pnl-template
 *
 * FASE 3 sub-paso 2 · read-only access to `pnl_template_effective` for
 * the admin P&L panel. Returns the effective row (Excel base merged with
 * operator overrides per pnl_template_override) for an exact dimension
 * tuple, plus `overridden_lines` so the UI can paint operator-edited
 * cells distinctly.
 *
 * Query params (all string-trimmed · empty → null):
 *   country            REQUIRED · ISO alpha-2 (ES, FR, ...)
 *   market             optional · IS NULL when absent
 *   submarket          optional · IS NULL when absent
 *   class              optional · IS NULL when absent
 *   segmentation_type  optional · IS NULL when absent
 *
 * The NULL-matching pattern naturally handles two cases:
 *   - Full tuple (country + market + submarket + class + segmentation):
 *     returns the costar_submarket_aggregate / costar_national /
 *     derived_mvp_rule row for that combination.
 *   - Country-only:
 *     returns the pending_costar row (where market/submarket/class are
 *     NULL in BD because no CoStar data is loaded yet).
 *
 * Response shapes:
 *   200 → { ok: true, template: EffectiveTemplateRow }
 *   400 → { ok: false, error: "bad_request", message: "..." }
 *   403 → { ok: false, error: "unauthorized" }
 *   404 → { ok: false, error: "not_found", tuple: { ... } }
 *   500 → { ok: false, error: "db_query_failed" | "auth_failed", details? }
 *
 * `cache-control: no-store` because overrides mutate on every save and the
 * panel must always see the latest state.
 *
 * Nothing imports this route yet — sub-paso 5 (useDraftedOverridesSupabase)
 * is the first consumer.
 */

export const dynamic = "force-dynamic";

interface DimensionTuple {
  country: string;
  market: string | null;
  submarket: string | null;
  class: string | null;
  segmentation_type: "hotel" | "apartahotel" | "hostel" | null;
}

function jsonNoStore(body: unknown, init?: ResponseInit): NextResponse {
  const res = NextResponse.json(body, init);
  res.headers.set("cache-control", "no-store, max-age=0");
  return res;
}

export async function GET(req: NextRequest): Promise<NextResponse> {
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

  // ── 2 · Parse + validate params ──────────────────────────────────────
  const url = new URL(req.url);
  const country = url.searchParams.get("country")?.trim() ?? "";
  if (!country) {
    return jsonNoStore(
      { ok: false, error: "bad_request", message: "country query param is required" },
      { status: 400 },
    );
  }
  const market = url.searchParams.get("market")?.trim() || null;
  const submarket = url.searchParams.get("submarket")?.trim() || null;
  const klass = url.searchParams.get("class")?.trim() || null;
  const segmentationRaw = url.searchParams.get("segmentation_type")?.trim() || null;

  type SegmentationType = "hotel" | "apartahotel" | "hostel";
  const SEGMENTATION_VALID: ReadonlySet<SegmentationType> = new Set(["hotel", "apartahotel", "hostel"]);
  if (segmentationRaw !== null && !SEGMENTATION_VALID.has(segmentationRaw as SegmentationType)) {
    return jsonNoStore(
      {
        ok: false,
        error: "bad_request",
        message: `segmentation_type must be one of: hotel · apartahotel · hostel (got "${segmentationRaw}")`,
      },
      { status: 400 },
    );
  }
  const segmentation = segmentationRaw as SegmentationType | null;

  const tuple: DimensionTuple = { country, market, submarket, class: klass, segmentation_type: segmentation };

  // ── 3 · Query pnl_template_effective ─────────────────────────────────
  const sb = getSupabaseAdmin();
  // Build the query · chained .eq() / .is() per dimension. The 5-field
  // unique key in pnl_template (NULLS NOT DISTINCT) guarantees ≤ 1 row.
  let q = sb.from("pnl_template_effective").select("*").eq("country", country);
  q = market === null ? q.is("market", null) : q.eq("market", market);
  q = submarket === null ? q.is("submarket", null) : q.eq("submarket", submarket);
  q = klass === null ? q.is("class", null) : q.eq("class", klass);
  q = segmentation === null
    ? q.is("segmentation_type", null)
    : q.eq("segmentation_type", segmentation);

  const { data, error } = await q.limit(1);
  if (error) {
    return jsonNoStore(
      { ok: false, error: "db_query_failed", details: error.message },
      { status: 500 },
    );
  }
  if (!data || data.length === 0) {
    return jsonNoStore({ ok: false, error: "not_found", tuple }, { status: 404 });
  }

  // ── 4 · Return effective row ─────────────────────────────────────────
  // The view shape matches EffectiveTemplateRow exactly (declared in
  // pnl-line-mapping.ts · sub-paso 1) so the cast is safe.
  const row = data[0] as unknown as EffectiveTemplateRow;
  return jsonNoStore({ ok: true, template: row });
}
