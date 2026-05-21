"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";
import type { LibraryReport } from "@/types/library";
import {
  adaptReportLibraryToLibraryReport,
  type HotelReportLibraryRow,
} from "@/lib/library/adapters/report-library-to-report";
import { libraryKeys, type LibraryReportsFilter } from "./keys";
import { useFavoriteValuationIds } from "./use-favorite-valuation-ids";

// ─── Hook ───────────────────────────────────────────────────────────────────

export interface UseLibraryReportsOptions extends LibraryReportsFilter {
  /** Defaults to 100 rows. Wrapped in the queryKey for pagination later. */
  limit?: number;
  /** Future pagination — currently only used at the queryKey level. */
  offset?: number;
  /** Server-prefetched LibraryReport[] used as the initial cache.
   *  When provided, the SSR'd page shows hotel rows immediately and the
   *  background refetch refines without a loading-state flash. */
  initialData?: LibraryReport[];
  /** Origin filter · default ['showcase','community','engine_render'] excludes
   *  the bulk_seed inventory rows from public surfaces. Admin can pass
   *  null to show ALL rows (including bulk_seed / manual_seed). */
  originFilter?: string[] | null;
  /** Limit to top-promoted rows only · used by /library/top-list + top-map. */
  topPromotedOnly?: boolean;
}

/**
 * Reads `public.valuations` filtered to `visibility IN ('public',
 * 'top-promote')` and left-joins `top_promote_reports`. The public-read
 * RLS policy on `valuations` lets anonymous visitors see the rows. RLS
 * on `favorite_reports` is queried separately by
 * `useFavoriteValuationIds` so the lists cache independently.
 *
 * Returns `LibraryReport[]` ready for the existing `HotelMap` /
 * `FavoritesTable` components — no UI changes required.
 */
// Default · public surfaces show curated content + real user activity ·
// HIDE bulk_seed/manual_seed by default. Admin views pass `originFilter: null`.
const DEFAULT_ORIGIN_FILTER = ["showcase", "community", "engine_render"];

export function useLibraryReports(options: UseLibraryReportsOptions = {}) {
  const {
    promotedOnly,
    search,
    limit = 200,
    offset = 0,
    initialData,
    originFilter = DEFAULT_ORIGIN_FILTER,
    topPromotedOnly = false,
  } = options;
  const favorites = useFavoriteValuationIds();

  const query = useQuery({
    queryKey: libraryKeys.reportsList({ promotedOnly, search }),
    queryFn: async (): Promise<HotelReportLibraryRow[]> => {
      // Cast around the auto-generated Database type · hotel_report_library
      // (migration 0026) is not yet in the regenerated types.
      // Cast around the auto-generated Database type (table not in types yet)
      // and use a permissive shape that supports our chained filters.
      const supabase = createBrowserSupabaseClient() as unknown as {
        from: (t: string) => Record<string, (...args: unknown[]) => unknown>;
      };

      let q = (supabase.from("hotel_report_library") as { select: (c: string) => unknown })
        .select("*") as Record<string, (...args: unknown[]) => unknown>;

      if (originFilter && originFilter.length > 0) {
        q = q.in("report_origin", originFilter) as typeof q;
      }
      if (topPromotedOnly) {
        q = q.eq("is_top_promote", true) as typeof q;
      }
      if (search && search.trim().length > 0) {
        q = q.ilike("hotel_name", `%${search.trim()}%`) as typeof q;
      }

      const result = await ((q.order("showcase_priority", { ascending: false }) as Record<string, (...args: unknown[]) => unknown>)
        .order("last_rendered_at", { ascending: false }) as Record<string, (...args: unknown[]) => unknown>)
        .range(offset, offset + limit - 1) as Promise<{
          data: HotelReportLibraryRow[] | null;
          error: { message: string } | null;
        }>;

      const resolved = await result;
      if (resolved.error) throw new Error(`Library fetch failed: ${resolved.error.message}`);
      return resolved.data ?? [];
    },
    // Library data is institutional and changes slowly — five-minute
    // staleness is fine and lets the map ↔ list pages share cache.
    staleTime: 5 * 60 * 1000,
  });

  // Fallback chain: query.data (live fetch) → initialData (SSR seed) → [].
  const reports = useMemo<LibraryReport[]>(() => {
    if (!query.data) return initialData ?? [];
    const favoriteIds = new Set(favorites.ids);
    let mapped = query.data.map((row) =>
      adaptReportLibraryToLibraryReport(row, {
        favoriteIds,
        treatAllAsFavorited: favorites.isAnonymous,
      }),
    );
    if (promotedOnly) {
      // hotel_report_library does not yet model promotions · return
      // all rows when filter is set (no-op until promotions land).
      mapped = mapped;
    }
    return mapped;
  }, [query.data, favorites.ids, favorites.isAnonymous, initialData, promotedOnly]);

  return {
    reports,
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
  };
}
