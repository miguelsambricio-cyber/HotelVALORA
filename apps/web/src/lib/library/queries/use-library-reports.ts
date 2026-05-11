"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";
import type { LibraryReport } from "@/types/library";
import {
  adaptValuationToLibraryReport,
  type ValuationWithJoins,
} from "@/lib/library/adapters/valuation-to-report";
import { libraryKeys, type LibraryReportsFilter } from "./keys";
import { useFavoriteValuationIds } from "./use-favorite-valuation-ids";

// ─── Hook ───────────────────────────────────────────────────────────────────

export interface UseLibraryReportsOptions extends LibraryReportsFilter {
  /** Defaults to 100 rows. Wrapped in the queryKey for pagination later. */
  limit?: number;
  /** Future pagination — currently only used at the queryKey level. */
  offset?: number;
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
  const { promotedOnly, search, limit = 100, offset = 0 } = options;
  const favorites = useFavoriteValuationIds();

  const query = useQuery({
    queryKey: libraryKeys.reportsList({ promotedOnly, search }),
    queryFn: async (): Promise<ValuationWithJoins[]> => {
      const supabase = createBrowserSupabaseClient();
      let q = supabase
        .from("valuations")
        .select("*, top_promote_reports!left(*)")
        .in("visibility", ["public", "top-promote"])
        .order("updated_at", { ascending: false })
        .range(offset, offset + limit - 1);

      if (search && search.trim().length > 0) {
        q = q.ilike("hotel_name", `%${search.trim()}%`);
      }

      const { data, error } = await q;
      if (error) throw new Error(`Library fetch failed: ${error.message}`);

      const rows = (data ?? []) as unknown as ValuationWithJoins[];

      if (promotedOnly) {
        return rows.filter((r) => {
          const promo = Array.isArray(r.top_promote_reports)
            ? r.top_promote_reports[0]
            : r.top_promote_reports;
          if (!promo) return false;
          return new Date(promo.promoted_until).getTime() > Date.now();
        });
      }

      return rows;
    },
    // Library data is institutional and changes slowly — five-minute
    // staleness is fine and lets the map ↔ list pages share cache.
    staleTime: 5 * 60 * 1000,
  });

  // Combine raw rows with the user's favorite_ids set. Memoised so map +
  // list don't re-derive on every render.
  const reports = useMemo<LibraryReport[]>(() => {
    if (!query.data) return [];
    const favoriteIds = new Set(favorites.ids);
    return query.data.map((row) =>
      adaptValuationToLibraryReport(row, {
        favoriteIds,
        treatAllAsFavorited: favorites.isAnonymous,
      }),
    );
  }, [query.data, favorites.ids, favorites.isAnonymous]);

  return {
    reports,
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
  };
}
