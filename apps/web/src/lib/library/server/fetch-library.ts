import "server-only";
import { createAnonServerSupabaseClient } from "@/lib/supabase/anon-server";
import type { LibraryReport } from "@/types/library";
import {
  adaptReportLibraryToLibraryReport,
  type HotelReportLibraryRow,
} from "@/lib/library/adapters/report-library-to-report";

/**
 * Server-side prefetch for the library surface · reads
 * `public.hotel_report_library` (migration 0026), the persistent log
 * auto-populated on every canonical-backed `/report/*` render.
 *
 * Replaces the legacy read from `public.valuations` (marketplace seed).
 * Public-read RLS lets the anonymous role list rows · same posture as
 * an unsigned visitor.
 *
 * `treatAllAsFavorited: true` keeps the demo UX where every saved row
 * appears favourited in the initial frame · the client hydration then
 * refines via `useFavoriteValuationIds`.
 */
export interface PrefetchOptions {
  /** Default · ['showcase','community','engine_render'] · hides bulk_seed
   *  inventory rows from public surfaces. Pass null for admin (all rows). */
  originFilter?: string[] | null;
  /** Filter to is_top_promote = true · used by /library/top-* surfaces. */
  topPromotedOnly?: boolean;
  limit?: number;
}

const DEFAULT_ORIGIN_FILTER = ["showcase", "community", "engine_render"];

export async function fetchLibraryReports(
  options: PrefetchOptions = {},
): Promise<LibraryReport[]> {
  const {
    originFilter = DEFAULT_ORIGIN_FILTER,
    topPromotedOnly = false,
    limit = 200,
  } = options;
  try {
    const sb = createAnonServerSupabaseClient() as unknown as {
      from: (t: string) => Record<string, (...args: unknown[]) => unknown>;
    };
    let q = (sb.from("hotel_report_library") as { select: (c: string) => unknown })
      .select("*") as Record<string, (...args: unknown[]) => unknown>;
    if (originFilter && originFilter.length > 0) {
      q = q.in("report_origin", originFilter) as typeof q;
    }
    if (topPromotedOnly) {
      q = q.eq("is_top_promote", true) as typeof q;
    }
    const result = await ((q.order("showcase_priority", { ascending: false }) as Record<string, (...args: unknown[]) => unknown>)
      .order("last_rendered_at", { ascending: false }) as Record<string, (...args: unknown[]) => unknown>)
      .range(0, limit - 1) as Promise<{ data: HotelReportLibraryRow[] | null; error: unknown }>;
    const { data, error } = await result;
    if (error || !data) return [];
    return data.map((row) =>
      adaptReportLibraryToLibraryReport(row, {
        favoriteIds: new Set(),
        treatAllAsFavorited: true,
      }),
    );
  } catch {
    return [];
  }
}
