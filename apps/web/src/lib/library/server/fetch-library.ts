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
  promotedOnly?: boolean;
  limit?: number;
}

export async function fetchLibraryReports(
  options: PrefetchOptions = {},
): Promise<LibraryReport[]> {
  const { promotedOnly = false, limit = 200 } = options;
  if (promotedOnly) {
    // `hotel_report_library` does not model marketplace promotions ·
    // `top_promote_reports` still ties to `valuations`. For the saved
    // library the promotedOnly toggle is currently a no-op · returns
    // the same superset.
  }
  try {
    const sb = createAnonServerSupabaseClient() as unknown as {
      from: (t: string) => {
        select: (cols: string) => {
          order: (col: string, opts: { ascending: boolean }) => {
            range: (a: number, b: number) => Promise<{ data: HotelReportLibraryRow[] | null; error: unknown }>;
          };
        };
      };
    };
    const { data, error } = await sb
      .from("hotel_report_library")
      .select("*")
      .order("last_rendered_at", { ascending: false })
      .range(0, limit - 1);
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
