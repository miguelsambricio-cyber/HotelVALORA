import "server-only";
import { createAnonServerSupabaseClient } from "@/lib/supabase/anon-server";
import type { LibraryReport } from "@/types/library";
import {
  adaptValuationToLibraryReport,
  type ValuationWithJoins,
} from "@/lib/library/adapters/valuation-to-report";

/**
 * Server-side prefetch for the library surface. Runs at request / build
 * time so the SSR'd HTML carries the actual hotel rows — the page renders
 * with data even if the client-side React Query never gets a chance to
 * fire (slow network, ad-blocker on supabase.co, stale browser cache, etc.).
 *
 * Mirrors the shape useLibraryReports() returns client-side, so the
 * downstream component code is unchanged. The fetch runs as the
 * anonymous role — the same posture an unsigned visitor would see —
 * which matches the public-read RLS policy on `valuations`.
 *
 * `treatAllAsFavorited: true` is the legacy demo behaviour for the
 * server-rendered initial frame; once the client hydrates and the
 * authenticated session lands, the favourites query refines the set.
 */
export interface PrefetchOptions {
  promotedOnly?: boolean;
  limit?: number;
}

export async function fetchLibraryReports(
  options: PrefetchOptions = {},
): Promise<LibraryReport[]> {
  const { promotedOnly = false, limit = 100 } = options;
  try {
    const supabase = createAnonServerSupabaseClient();
    let q = supabase
      .from("valuations")
      .select("*, top_promote_reports!left(*)")
      .in("visibility", ["public", "top-promote"])
      .order("updated_at", { ascending: false })
      .range(0, limit - 1);
    const { data, error } = await q;
    if (error || !data) return [];
    let rows = data as unknown as ValuationWithJoins[];
    if (promotedOnly) {
      rows = rows.filter((r) => {
        const promo = Array.isArray(r.top_promote_reports)
          ? r.top_promote_reports[0]
          : r.top_promote_reports;
        if (!promo) return false;
        return new Date(promo.promoted_until).getTime() > Date.now();
      });
    }
    return rows.map((row) =>
      adaptValuationToLibraryReport(row, {
        favoriteIds: new Set(),
        treatAllAsFavorited: true,
      }),
    );
  } catch {
    // SSR must never block the page. On any failure (env missing, network
    // hiccup, schema drift) return an empty seed and let the client query
    // populate the table — same UX as today.
    return [];
  }
}
