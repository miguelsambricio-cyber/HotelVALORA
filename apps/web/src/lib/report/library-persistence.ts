import "server-only";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import type { CanonicalHotelRow } from "@/lib/report/canonical-reader";
import type { UnderwritingRunResult } from "@/lib/report/underwriting-runner";

/**
 * Persists / refreshes a row in `hotel_report_library` every time a
 * canonical-backed report renders. Called fire-and-forget by report
 * server components · errors logged but never propagated (the report
 * UI must keep rendering even if the library write fails).
 *
 * Library page (`/library/favorites-list` + `/library/favorites-map`)
 * is the institutional repository · this is its source-of-truth feed.
 *
 * Uses service-role · RLS allows public SELECT but no anon writes.
 */

export type ReportOrigin =
  | "engine_render"   // user opened /report/* in a browser (default)
  | "showcase"        // operator-curated official demo
  | "community"       // authenticated user shared a public report
  | "bulk_seed"       // automated population
  | "manual_seed"     // single SQL INSERT for testing
  | "imported"        // ingested from external source
  | "migrated";       // moved from valuations or other legacy table

interface ReportSnapshot {
  /** Cap-rate engine output from `runForHotel(hotel)` · may be null when
   *  the engine could not run (no category or no market). */
  engineRun: UnderwritingRunResult | null;
  /**
   * Final valuation block snapshot the mapper produced. Fields are
   * nullable because the country guard (non-ES hotel without market
   * coverage) collapses the valuation block to nulls · `finite()` below
   * also coerces NaN/Infinity to null defensively.
   */
  valuation: {
    estimated_value_eur: number | null;
    valuation_range_low_eur: number | null;
    valuation_range_high_eur: number | null;
    cap_rate_pct: number | null;
    per_key_eur: number | null;
    per_sqm_eur: number | null;
    gop_margin_pct: number | null;
  };
  /** Optional KPI provenance / scenario string e.g. "Engine · base · CoStar submarket · Retiro · keys heurístico". */
  scenario_label?: string | null;
  /** Whether the keys count came from the engine's chain_scale heuristic. */
  keys_from_heuristic: boolean;
  /** Public report URL · stable per canonical_id · used by Library row click. */
  report_url: string;
  /** Origin classifier · default 'engine_render' for human-driven render path. */
  origin?: ReportOrigin;
}

export async function upsertHotelReportLibrary(
  hotel: CanonicalHotelRow,
  snapshot: ReportSnapshot,
): Promise<void> {
  console.log(`[hotel_report_library] upsert start · canonical_id=${hotel.id} · ${hotel.canonical_name}`);
  try {
    // Cast around the auto-generated Database type which doesn't yet
    // include `hotel_report_library` (migration 0026 · regenerate types
    // for proper typing on next maintenance pass).
    const sb = getSupabaseAdmin() as unknown as {
      from: (table: string) => {
        select: (cols: string) => {
          eq: (col: string, val: unknown) => {
            maybeSingle: () => Promise<{ data: { id: string; render_count: number } | null }>;
          };
        };
        update: (payload: Record<string, unknown>) => {
          eq: (col: string, val: unknown) => Promise<{ error: unknown }>;
        };
        insert: (payload: Record<string, unknown>) => Promise<{ error: unknown }>;
      };
    };

    // Coerce numeric guards to null when the engine couldn't produce a value
    const finite = (n: number | null | undefined): number | null => {
      if (n === null || n === undefined) return null;
      if (!Number.isFinite(n) || Number.isNaN(n)) return null;
      return n;
    };

    const reportStatus: string = snapshot.engineRun ? "generated" : "partial";
    const confidenceRaw = snapshot.engineRun?.capRate.confidence.score_0_100 ?? null;
    // Column is integer · engine emits float (e.g. 66.7) · round.
    const confidence = confidenceRaw === null ? null : Math.round(confidenceRaw);
    const origin: ReportOrigin = snapshot.origin ?? "engine_render";

    const payload = {
      canonical_id: hotel.id,
      hotel_name: hotel.canonical_name ?? "—",
      city: hotel.city_normalized,
      market: hotel.market_name,
      submarket: hotel.submarket_name,
      chain_scale: hotel.chain_scale,
      star_rating: hotel.star_rating,
      total_rooms: hotel.total_keys ?? hotel.total_rooms,
      brand_family: hotel.brand_family,
      lat: hotel.lat,
      lng: hotel.lng,
      estimated_value_eur: finite(snapshot.valuation.estimated_value_eur),
      valuation_range_low_eur: finite(snapshot.valuation.valuation_range_low_eur),
      valuation_range_high_eur: finite(snapshot.valuation.valuation_range_high_eur),
      cap_rate_pct: finite(snapshot.valuation.cap_rate_pct),
      confidence_score: confidence,
      per_key_eur: finite(snapshot.valuation.per_key_eur),
      per_sqm_eur: finite(snapshot.valuation.per_sqm_eur),
      gop_margin_pct: finite(snapshot.valuation.gop_margin_pct),
      report_url: snapshot.report_url,
      report_status: reportStatus,
      scenario_label: snapshot.scenario_label ?? null,
      keys_from_heuristic: snapshot.keys_from_heuristic,
      last_rendered_at: new Date().toISOString(),
      // Origin classifier · default 'engine_render' for user-driven renders.
      // last_operator_render_at tracks ONLY real engine renders · seeded
      // / showcase renders update last_rendered_at but not this.
      report_origin: origin,
      last_operator_render_at: origin === "engine_render" ? new Date().toISOString() : null,
    };

    // Try UPSERT (conflict on canonical_id) · postgres supabase-js
    // doesn't expose RETURNING render_count directly, so we use two-step:
    // 1) SELECT existing render_count
    // 2) INSERT or UPDATE with render_count + 1
    const { data: existing } = await sb
      .from("hotel_report_library")
      .select("id, render_count")
      .eq("canonical_id", hotel.id)
      .maybeSingle();

    if (existing) {
      // On UPDATE · `report_origin` is NEVER touched (once a row is
      // classified as 'showcase', subsequent renders by visitors must
      // not silently demote it to 'engine_render'). The operator manages
      // origin via admin / SQL only.
      // `last_operator_render_at` is touched ONLY when the new render is
      // an actual engine_render · so seeded re-runs don't pollute the
      // 'last analysed by a human' signal.
      const updPayload: Record<string, unknown> = { ...payload };
      delete updPayload.report_origin;
      if (origin !== "engine_render") {
        delete updPayload.last_operator_render_at;
      }
      const upd = await sb
        .from("hotel_report_library")
        .update({
          ...updPayload,
          render_count: (existing.render_count ?? 0) + 1,
        })
        .eq("id", existing.id);
      console.log(`[hotel_report_library] UPDATE existing · ${hotel.id} · origin=${origin} · err=${JSON.stringify(upd?.error ?? null)}`);
    } else {
      const ins = await sb
        .from("hotel_report_library")
        .insert({ ...payload, render_count: 1 });
      console.log(`[hotel_report_library] INSERT new · ${hotel.id} · origin=${origin} · err=${JSON.stringify(ins?.error ?? null)}`);
    }
  } catch (err) {
    // Library write must NOT block report rendering · log + swallow
    console.error("[hotel_report_library] upsert failed:", err instanceof Error ? err.message : String(err));
  }
}
