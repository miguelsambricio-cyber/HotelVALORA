import {
  loadHotelsRegistryStatusFromSnapshot,
  searchHotelsFromSnapshot,
  type HotelRecord,
  type HotelSearchQuery,
} from "./snapshot-reader";
import type { HotelsRegistryStatus, HotelReferenceRecord } from "./types";

/**
 * Hotel registry · server-side aggregator.
 *
 * The data plane today is `services/costar/MASTER/snapshot.json`, emitted
 * by `services/costar/scripts/ingest.py` v1.2. This module is the
 * stable contract between the admin UI and the Python pipeline — page
 * code talks to `loadHotelsRegistryStatus()` / `searchHotelsReference()`
 * and never reaches into the snapshot directly.
 *
 * When Phase 5 mirrors the snapshot into Supabase, only the
 * implementation here changes — callers are untouched.
 */

export async function loadHotelsRegistryStatus(): Promise<HotelsRegistryStatus> {
  return loadHotelsRegistryStatusFromSnapshot();
}

export async function searchHotelsReference(
  query: HotelSearchQuery,
): Promise<HotelReferenceRecord[] | null> {
  const hits = await searchHotelsFromSnapshot(query);
  // Caller doesn't need the `_meta` / fuzzy-match helpers — strip them.
  return hits.map(stripMeta);
}

function stripMeta(h: HotelRecord): HotelReferenceRecord {
  const copy = { ...h } as HotelRecord;
  delete copy._meta;
  return copy;
}
