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

interface ReportSnapshot {
  /** Cap-rate engine output from `runForHotel(hotel)` · may be null when
   *  the engine could not run (no category or no market). */
  engineRun: UnderwritingRunResult | null;
  /** Final valuation block snapshot the mapper produced. */
  valuation: {
    estimated_value_eur: number;
    valuation_range_low_eur: number;
    valuation_range_high_eur: number;
    cap_rate_pct: number;
    per_key_eur: number;
    per_sqm_eur: number;
    gop_margin_pct: number;
  };
  /** Optional KPI provenance / scenario string e.g. "Engine · base · CoStar submarket · Retiro · keys heurístico". */
  scenario_label?: string | null;
  /** Whether the keys count came from the engine's chain_scale heuristic. */
  keys_from_heuristic: boolean;
  /** Public report URL · stable per canonical_id · used by Library row click. */
  report_url: string;
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
    const confidence = snapshot.engineRun?.capRate.confidence.score_0_100 ?? null;

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
      const upd = await sb
        .from("hotel_report_library")
        .update({
          ...payload,
          render_count: (existing.render_count ?? 0) + 1,
        })
        .eq("id", existing.id);
      console.log(`[hotel_report_library] UPDATE existing · ${hotel.id} · err=${JSON.stringify(upd?.error ?? null)}`);
    } else {
      const ins = await sb
        .from("hotel_report_library")
        .insert({ ...payload, render_count: 1 });
      console.log(`[hotel_report_library] INSERT new · ${hotel.id} · err=${JSON.stringify(ins?.error ?? null)}`);
    }
  } catch (err) {
    // Library write must NOT block report rendering · log + swallow
    console.error("[hotel_report_library] upsert failed:", err instanceof Error ? err.message : String(err));
  }
}
