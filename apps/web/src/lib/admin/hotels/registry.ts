import type { HotelsRegistryStatus, HotelReferenceRecord } from "./types";

/**
 * Hotel registry · server-side aggregator.
 *
 * **Data-plane status today:** the canonical hotel-by-market inventory
 * lives in `services/costar/HOTELES POR MERCADO/` as XLSX masters. The
 * `/user/admin/hotels` surface is a scaffolded read-only window onto
 * that data plane while the Phase-5 Supabase mirror is being designed.
 *
 * **What this module returns today:** the registry *status* — where the
 * data lives, what version of normalisation is in force, what markets
 * are represented, and how big the reconciliation queue is. No actual
 * hotel rows yet — those land when one of:
 *   1. `build_masters.py` v1.2 ships the new master, then a Python
 *      sidecar exposes a JSON snapshot the Node side can read, OR
 *   2. Phase 5 mirrors the master into Supabase and this module switches
 *      to a Postgres query.
 *
 * Keep the function signatures stable; only the implementation swaps
 * when the data plane moves.
 */
export async function loadHotelsRegistryStatus(): Promise<HotelsRegistryStatus> {
  return {
    dataPlane: "xlsx_master",
    normalizationVersion: "v1.1 (pending v1.2 with HOTELES POR MERCADO master)",
    rowsInMaster: null,
    marketsRepresented: ["Madrid"],
    reconciliationQueueSize: 0,
  };
}

/**
 * Stub for the future hotel search. When the data plane is live this
 * will accept a query (name / brand / market / chain_scale / etc.) and
 * return matching `HotelReferenceRecord[]`. Today it always returns
 * `null` so callers can render the "data plane not yet wired" empty
 * state without crashing.
 */
export async function searchHotelsReference(_query: {
  q?: string;
  market?: string;
  chainScale?: string;
}): Promise<HotelReferenceRecord[] | null> {
  return null;
}
