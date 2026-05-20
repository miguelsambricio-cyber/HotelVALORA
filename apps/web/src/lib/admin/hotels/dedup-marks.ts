import "server-only";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

/**
 * Dedup marks layer · non-destructive overlay.
 *
 * Lives in Supabase `public.hotel_dedup_mark` so it survives Vercel
 * deploys + snapshot rebuilds. Consumers apply it as a render-time
 * overlay on top of the snapshot.json data.
 *
 * Usage:
 *   const marks = await loadDedupMarks();
 *   const visibleAdmin = hotels.filter((h) => !marks.hiddenFromAdmin.has(h.hotel_id));
 */

export interface DedupMark {
  snapshot_hotel_id: string;
  canonical_survivor_snapshot_id: string | null;
  canonical_supabase_id: string | null;
  dedup_status: "canonical" | "duplicate_marked" | "dedup_review" | "sibling" | "clean";
  hidden_from_admin: boolean;
  hidden_from_reports: boolean;
  reason: string | null;
}

export interface DedupMarksIndex {
  /** All marks keyed by snapshot_hotel_id */
  byHotelId: Map<string, DedupMark>;
  /** Hotel ids that should be filtered from admin Search views. */
  hiddenFromAdmin: Set<string>;
  /** Hotel ids that should be filtered from report consumers. */
  hiddenFromReports: Set<string>;
  /** When this index was fetched (for diagnostics). */
  fetchedAtMs: number;
}

let cache: DedupMarksIndex | null = null;
const CACHE_TTL_MS = 60_000;

export async function loadDedupMarks(force = false): Promise<DedupMarksIndex> {
  if (!force && cache && Date.now() - cache.fetchedAtMs < CACHE_TTL_MS) {
    return cache;
  }
  const empty: DedupMarksIndex = {
    byHotelId: new Map(),
    hiddenFromAdmin: new Set(),
    hiddenFromReports: new Set(),
    fetchedAtMs: Date.now(),
  };
  try {
    const sb = getSupabaseAdmin() as unknown as {
      from: (t: string) => {
        select: (cols: string) => Promise<{ data: unknown[] | null; error: unknown }>;
      };
    };
    const res = await sb
      .from("hotel_dedup_mark")
      .select(
        "snapshot_hotel_id,canonical_survivor_snapshot_id,canonical_supabase_id,dedup_status,hidden_from_admin,hidden_from_reports,reason",
      );
    if (res.error || !res.data) {
      cache = empty;
      return empty;
    }
    const idx: DedupMarksIndex = {
      byHotelId: new Map(),
      hiddenFromAdmin: new Set(),
      hiddenFromReports: new Set(),
      fetchedAtMs: Date.now(),
    };
    for (const row of res.data as DedupMark[]) {
      idx.byHotelId.set(row.snapshot_hotel_id, row);
      if (row.hidden_from_admin) idx.hiddenFromAdmin.add(row.snapshot_hotel_id);
      if (row.hidden_from_reports) idx.hiddenFromReports.add(row.snapshot_hotel_id);
    }
    cache = idx;
    return idx;
  } catch {
    cache = empty;
    return empty;
  }
}
