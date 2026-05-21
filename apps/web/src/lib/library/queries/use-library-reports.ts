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
export function useLibraryReports(options: UseLibraryReportsOptions = {}) {
  const { promotedOnly, search, limit = 100, offset = 0, initialData } = options;
  const favorites = useFavoriteValuationIds();

  const query = useQuery({
    queryKey: libraryKeys.reportsList({ promotedOnly, search }),
    queryFn: async (): Promise<HotelReportLibraryRow[]> => {
      // Cast around the auto-generated Database type · hotel_report_library
      // (migration 0026) is not yet in the regenerated types.
      const supabase = createBrowserSupabaseClient() as unknown as {
        from: (t: string) => {
          select: (cols: string) => {
            order: (col: string, opts: { ascending: boolean }) => {
              range: (a: number, b: number) => Promise<{ data: HotelReportLibraryRow[] | null; error: { message: string } | null }> & {
                ilike?: (col: string, q: string) => Promise<{ data: HotelReportLibraryRow[] | null; error: { message: string } | null }>;
              };
              ilike: (col: string, q: string) => {
                range: (a: number, b: number) => Promise<{ data: HotelReportLibraryRow[] | null; error: { message: string } | null }>;
              };
            };
          };
        };
      };

      const base = supabase
        .from("hotel_report_library")
        .select("*")
        .order("last_rendered_at", { ascending: false });

      const result = search && search.trim().length > 0
        ? await base.ilike("hotel_name", `%${search.trim()}%`).range(offset, offset + limit - 1)
        : await base.range(offset, offset + limit - 1);

      if (result.error) throw new Error(`Library fetch failed: ${result.error.message}`);
      return result.data ?? [];
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
