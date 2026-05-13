import { readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import type {
  HotelReferenceRecord,
  HotelsRegistryStatus,
} from "./types";

/**
 * Server-only reader for `services/costar/MASTER/snapshot.json` — the
 * authoritative bridge between the Python ingestion pipeline (v1.2) and
 * the Node admin UI.
 *
 * The Python orchestrator (`services/costar/scripts/ingest.py`) emits
 * the snapshot on every successful run. This reader is read-only and
 * tolerant — when the snapshot is missing (first install, before any
 * `ingest.py` has been run) it returns an empty registry so the admin
 * page renders a useful empty state instead of crashing.
 *
 * Do NOT import this from a Client Component — it relies on `node:fs`.
 */

export type ReconciliationKind =
  | "unrecoverable_row"
  | "suspected_duplicate"
  | "low_confidence"
  | "compset_orphan_target"
  | "compset_orphan_member"
  | "transaction_orphan";

export interface ReconciliationEntry {
  id: string;
  kind: ReconciliationKind;
  hotel_id?: string;
  candidate_hotel_id?: string;
  target_hotel_id?: string;
  transaction_id?: string;
  name?: string;
  confidence?: number;
  fuzzy_score?: number;
  field?: string;
  source_file?: string;
  detail: string;
}

export interface CompsetEntry {
  compset_id: string;
  target_hotel_id: string;
  member_hotel_ids: string[];
  warnings: string[];
}

/** Phase 2.3.d.6c · synthetic compset inference (transitional · pending
 *  the operator-confirmed membership from the 3.1 PDF). Every entry is
 *  tagged `provenance: "synthetic_inference"` so the UI can clearly
 *  distinguish synthetic from real. */
export interface SyntheticCompset {
  compset_id: string;
  target_hotel_id: string;
  target_name: string | null;
  market_name: string | null;
  submarket_name: string | null;
  member_hotel_ids: string[];
  members: Array<{
    hotel_id: string;
    name: string | null;
    chain_scale: string | null;
    rooms_count: number | null;
    submarket_name: string | null;
    similarity_score: number;
  }>;
  provenance: "synthetic_inference";
  algorithm: {
    version: string;
    weights: Record<string, number>;
    top_n: number;
    geo_normaliser_km: number;
  };
  ingestion_batch_id: string | null;
  needs_operator_confirmation: boolean;
}

export interface TransactionEntry {
  transaction_id: string;
  source: "costar" | "private" | string;
  hotel_id: string | null;
  asset_name: string;
  country: string | null;
  market_name: string | null;
  closed_at: string | null;
  price_eur: number | null;
  buyer: string | null;
  seller: string | null;
}

export interface MarketSummary {
  country: string;
  market_name: string;
  submarkets: string[];
  hotel_count: number;
}

export interface HotelMeta {
  ingestion_batch_id: string;
  source_path: string;
  confidence: number;
  needs_review: string[];
  fuzzy_matched: boolean;
}

/** Per-hotel audit entry produced by `corrections.py` when a pending
 *  correction is applied during ingestion (Phase 2.3.d.6). */
export interface CorrectionProvenance {
  correction_id: string;
  applied_at: string;
  applied_in_batch: string;
  submitted_at: string;
  submitted_by: string;
  field: string;
  original_value: string | number | null;
  corrected_value: string | number | null;
  reason: string;
  confidence_before: number | null;
}

export type HotelRecord = HotelReferenceRecord & {
  _meta?: HotelMeta;
  _corrections?: CorrectionProvenance[];
};

/** Snapshot-level corrections summary for the post-run state of the
 *  Institutional Correction Consumer. */
export interface CorrectionsSummary {
  pending_before: number;
  applied: number;
  rejected: number;
  applied_total_in_master: number;
}

/** Snapshot-level batch summary — the institutional audit object emitted
 *  by every successful `ingest.py` run (governance rule · 2026-05-14). */
export interface BatchSummary {
  batch_id: string;
  normalization_version: string;
  files: {
    processed: number;
    failed: number;
    archived: number;
    archive_failed: number;
    unknown_root: number;
    skipped_dry_run: number;
  };
  rows: {
    hotels_ingested: number;
    compsets_built: number;
    transactions_linked: number;
    reconciliation_required: number;
    duplicate_suspected: number;
  };
  corrections: CorrectionsSummary;
  per_stream: {
    hotels: { processed: number; failed: number };
    compset: { processed: number; failed: number };
    transactions: { processed: number; failed: number };
  };
}

/** Diagnostics surfaced on the admin page so the operator can verify
 *  exactly which source the Node side just tried to read.
 *
 *  Two-tier reporting:
 *    - `fs.*` — local filesystem at SNAPSHOT_PATH
 *    - `storage.*` — Supabase Storage costar-master/snapshot.json
 *
 *  Critical when the page says "No snapshot found" — tells the operator
 *  whether (a) the local file was missing, (b) Storage was missing,
 *  (c) Storage download failed (network/auth/etc.), or (d) both. */
export function getSnapshotDiagnostics(): {
  fs: { path: string; resolvedFrom: string; exists: boolean; sizeBytes: number | null };
  storage: { bucket: string; key: string; lastFetchedAtMs: number | null; cached: boolean };
} {
  let sizeBytes: number | null = null;
  let exists = false;
  try {
    if (existsSync(SNAPSHOT_PATH)) {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { statSync } = require("node:fs") as typeof import("node:fs");
      const st = statSync(SNAPSHOT_PATH);
      exists = true;
      sizeBytes = st.size;
    }
  } catch {
    // ignore — diagnostics never throw
  }
  return {
    fs: {
      path: SNAPSHOT_PATH,
      resolvedFrom: SNAPSHOT_RESOLVED_FROM,
      exists,
      sizeBytes,
    },
    storage: {
      bucket: STORAGE_BUCKET,
      key: STORAGE_KEY,
      lastFetchedAtMs: storageCache?.fetchedAtMs ?? null,
      cached: storageCache !== null,
    },
  };
}

export interface HotelsSnapshot {
  schema_version: string;
  generated_at: string;
  ingestion_batch_id: string;
  totals: {
    hotels: number;
    markets: number;
    compsets: number;
    /** Phase 2.3.d.6c · operator-confirmed compset memberships (pending 3.1 PDF). */
    compset_membership?: number;
    /** Phase 2.3.d.6c · time-series KPIs for the operator's compset (deferred). */
    compset_performance?: number;
    /** Phase 2.3.d.6c · top-4 synthetic compset per hotel · transitional. */
    synthetic_compsets?: number;
    transactions: number;
    reconciliation_queue: number;
    /** Phase 2.3.d.6f · current-snapshot market KPIs (PAIS + MERCADO geo + SUBMERCADO geo). */
    market_snapshots?: number;
    /** Phase 2.3.d.6f · MERCADO / SUBMERCADO DataTable rows (period-indexed time series). */
    market_timeseries?: number;
    /** Phase 2.3.d.6f · CoStar pipeline rows (INPUT_PROYECTOS). */
    projects?: number;
  };
  /** Optional · older v1.2 snapshots predate this block. */
  corrections?: CorrectionsSummary;
  /** Optional · v1.4+ batch governance summary. */
  batch?: BatchSummary;
  markets: MarketSummary[];
  /** Phase 2.3.d.6c · two-entity compset model (v1.5+). Older snapshots
   *  carry only `compsets` (= compset_membership). */
  compset_performance?: unknown[];
  synthetic_compsets?: SyntheticCompset[];
  hotels: HotelRecord[];
  compsets: CompsetEntry[];
  transactions: TransactionEntry[];
  reconciliation_queue: ReconciliationEntry[];
}

/**
 * Resolve the canonical snapshot path regardless of `process.cwd()`.
 *
 * `path.resolve(process.cwd(), "..", "..")` only works when the dev
 * server is started from `apps/web/`. If the operator starts it from
 * the repo root or via `pnpm --filter web dev` from somewhere else,
 * the legacy resolver lands outside the repo and the page renders
 * "No snapshot found" despite a healthy snapshot on disk.
 *
 * The robust resolver walks up from `process.cwd()` until it finds a
 * directory containing `services/costar/MASTER/` — the canonical
 * anchor. Falls back to the legacy two-up if nothing matches.
 */
function resolveSnapshotPath(): { path: string; resolvedFrom: string } {
  const target = path.join("services", "costar", "MASTER", "snapshot.json");
  // Prefer walking up from cwd
  let cur = process.cwd();
  for (let depth = 0; depth < 8; depth++) {
    const candidate = path.join(cur, target);
    if (existsSync(candidate)) {
      return { path: candidate, resolvedFrom: `walkup_depth_${depth}` };
    }
    const parent = path.dirname(cur);
    if (parent === cur) break;
    cur = parent;
  }
  // Legacy two-up fallback (cwd === apps/web)
  const legacy = path.join(process.cwd(), "..", "..", target);
  return { path: path.resolve(legacy), resolvedFrom: "legacy_two_up" };
}

const { path: SNAPSHOT_PATH, resolvedFrom: SNAPSHOT_RESOLVED_FROM } = resolveSnapshotPath();
let resolvedPathLogged = false;

let cache: { mtime: number; snapshot: HotelsSnapshot | null } | null = null;

/**
 * Load the snapshot. Returns `null` when the file is missing or
 * malformed — caller renders the "data plane not yet wired" empty state.
 *
 * Tiny in-memory cache keyed on the file mtime — keeps the page
 * responsive when several components on the same render call this in
 * parallel without re-parsing the JSON for each.
 */
const STORAGE_BUCKET = "costar-master";
const STORAGE_KEY = "snapshot.json";
const STORAGE_CACHE_TTL_MS = 60 * 1000; // 60s — short enough to feel fresh after each upload-snapshot run

type Source = "fs" | "supabase_storage" | "none";
let storageSourceLogged = false;
let storageCache: { fetchedAtMs: number; snapshot: HotelsSnapshot | null } | null = null;

/**
 * Load the snapshot. Two-tier resolution:
 *   1. Local filesystem at `SNAPSHOT_PATH` — fast path · dev workflow ·
 *      also production when the build embeds the snapshot.
 *   2. Supabase Storage `costar-master/snapshot.json` — production
 *      fallback so the operator can publish a snapshot without
 *      committing it to git.
 *
 * Returns `null` only when BOTH sources fail. The empty-state banner
 * surfaces the resolved path + source via `getSnapshotDiagnostics()`.
 */
export async function loadHotelsSnapshot(): Promise<HotelsSnapshot | null> {
  // 1) Try filesystem
  try {
    const { promises: fs } = await import("node:fs");
    const stat = await fs.stat(SNAPSHOT_PATH);
    if (cache && cache.mtime === stat.mtimeMs) {
      return cache.snapshot;
    }
    const raw = await readFile(SNAPSHOT_PATH, "utf-8");
    const parsed = JSON.parse(raw) as HotelsSnapshot;
    cache = { mtime: stat.mtimeMs, snapshot: parsed };
    logFirstLoad("fs", SNAPSHOT_PATH, stat.size, parsed);
    return parsed;
  } catch {
    /* fall through to Storage */
  }

  // 2) Try Supabase Storage (production path)
  if (
    storageCache &&
    Date.now() - storageCache.fetchedAtMs < STORAGE_CACHE_TTL_MS
  ) {
    return storageCache.snapshot;
  }
  try {
    const parsed = await downloadFromStorage();
    storageCache = { fetchedAtMs: Date.now(), snapshot: parsed };
    if (parsed) {
      logFirstLoad("supabase_storage", `${STORAGE_BUCKET}/${STORAGE_KEY}`, null, parsed);
    }
    return parsed;
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    if (!storageSourceLogged) {
      console.warn(
        `[hotels.snapshot] EMPTY · fs=${SNAPSHOT_PATH} (missing) · ` +
          `storage=${STORAGE_BUCKET}/${STORAGE_KEY} reason=${msg} cwd=${process.cwd()}`,
      );
      storageSourceLogged = true;
    }
    storageCache = { fetchedAtMs: Date.now(), snapshot: null };
    cache = { mtime: 0, snapshot: null };
    return null;
  }
}

async function downloadFromStorage(): Promise<HotelsSnapshot | null> {
  // Lazy-import to avoid pulling Supabase deps when filesystem path wins
  const { getSupabaseAdmin } = await import("@/lib/supabase/admin");
  const client = getSupabaseAdmin();
  const { data, error } = await client.storage
    .from(STORAGE_BUCKET)
    .download(STORAGE_KEY);
  if (error) {
    // PostgrestError or StorageError — surface to caller; logged once above
    throw new Error(error.message);
  }
  if (!data) return null;
  const text = await data.text();
  return JSON.parse(text) as HotelsSnapshot;
}

function logFirstLoad(
  source: Source,
  origin: string,
  sizeBytes: number | null,
  parsed: HotelsSnapshot,
): void {
  if (resolvedPathLogged && storageSourceLogged) return;
  if (source === "fs" && resolvedPathLogged) return;
  if (source === "supabase_storage" && storageSourceLogged) return;
  console.info(
    `[hotels.snapshot] loaded source=${source} origin=${origin} ` +
      `${sizeBytes !== null ? `size=${sizeBytes}B ` : ""}` +
      `hotels=${parsed.hotels?.length ?? 0} ` +
      `transactions=${parsed.transactions?.length ?? 0} ` +
      `synthetic_compsets=${parsed.synthetic_compsets?.length ?? 0} ` +
      `batch=${parsed.ingestion_batch_id}`,
  );
  if (source === "fs") resolvedPathLogged = true;
  if (source === "supabase_storage") storageSourceLogged = true;
}

export async function loadHotelsRegistryStatusFromSnapshot(): Promise<HotelsRegistryStatus> {
  const snap = await loadHotelsSnapshot();
  if (!snap) {
    return {
      dataPlane: "xlsx_master",
      normalizationVersion: "v1.2 (pending first ingest.py run)",
      rowsInMaster: null,
      marketsRepresented: [],
      reconciliationQueueSize: 0,
    };
  }
  return {
    dataPlane: "xlsx_master",
    normalizationVersion: `v1.2 · batch ${snap.ingestion_batch_id}`,
    rowsInMaster: snap.totals.hotels,
    marketsRepresented: snap.markets.map((m) => m.market_name),
    reconciliationQueueSize: snap.totals.reconciliation_queue,
  };
}

export interface HotelSearchQuery {
  q?: string;
  market?: string;
  country?: string;
  chainScale?: string;
  needsReview?: boolean;
}

export async function searchHotelsFromSnapshot(
  query: HotelSearchQuery,
): Promise<HotelRecord[]> {
  const snap = await loadHotelsSnapshot();
  if (!snap) return [];
  const q = (query.q ?? "").trim().toLowerCase();
  const market = (query.market ?? "").trim().toLowerCase();
  const country = (query.country ?? "").trim().toUpperCase();
  const chain = (query.chainScale ?? "").trim().toLowerCase();
  return snap.hotels.filter((h) => {
    if (q) {
      const hay = `${h.name} ${h.brand ?? ""} ${h.operator ?? ""} ${h.hotel_id}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    if (market && h.market_name.toLowerCase() !== market) return false;
    if (country && h.country !== country) return false;
    if (chain && (h.chain_scale ?? "").toLowerCase() !== chain) return false;
    if (query.needsReview && (h._meta?.needs_review.length ?? 0) === 0) return false;
    return true;
  });
}

export async function findHotelById(hotelId: string): Promise<HotelRecord | null> {
  const snap = await loadHotelsSnapshot();
  if (!snap) return null;
  return snap.hotels.find((h) => h.hotel_id === hotelId) ?? null;
}

export async function findCompsetsForHotel(hotelId: string): Promise<{
  asTarget: CompsetEntry[];
  asMember: CompsetEntry[];
}> {
  const snap = await loadHotelsSnapshot();
  if (!snap) return { asTarget: [], asMember: [] };
  return {
    asTarget: snap.compsets.filter((c) => c.target_hotel_id === hotelId),
    asMember: snap.compsets.filter((c) => c.member_hotel_ids.includes(hotelId)),
  };
}

export async function findTransactionsForHotel(hotelId: string): Promise<TransactionEntry[]> {
  const snap = await loadHotelsSnapshot();
  if (!snap) return [];
  return snap.transactions.filter((t) => t.hotel_id === hotelId);
}

/** Phase 2.3.d.6 · audit-trail of applied corrections for one hotel.
 *  Returns most-recent-first so the UI doesn't have to re-sort. */
export async function findCorrectionsForHotel(hotelId: string): Promise<CorrectionProvenance[]> {
  const hotel = await findHotelById(hotelId);
  const list = hotel?._corrections ?? [];
  return [...list].sort((a, b) => (a.applied_at < b.applied_at ? 1 : -1));
}

/** Phase 2.3.d.6c · the synthetic compset for one target hotel.
 *  Returns null when no synthetic compset exists (e.g. the target
 *  is the only hotel in its market, or the snapshot predates v1.5). */
export async function findSyntheticCompsetForHotel(
  hotelId: string,
): Promise<SyntheticCompset | null> {
  const snap = await loadHotelsSnapshot();
  if (!snap?.synthetic_compsets) return null;
  return snap.synthetic_compsets.find((c) => c.target_hotel_id === hotelId) ?? null;
}

// ── Phase 3 · Market context + transaction comparables ────────────────────

export interface MarketSnapshot {
  country: string;
  market_name: string | null;
  submarket_name: string | null;
  granularity: "country_listing" | "market" | "submarket" | string;
  rooms_inventory: number | null;
  rooms_under_construction: number | null;
  rooms_delivered_12m: number | null;
  occupancy_12m: number | null;
  occupancy_yoy_12m: number | null;
  adr_12m: number | null;
  adr_yoy_12m: number | null;
  revpar_12m: number | null;
  revpar_yoy_12m: number | null;
}

export interface MarketTimeseriesRow {
  market_name: string | null;
  submarket_name: string | null;
  period: string | null;
  occupancy_12m: number | null;
  adr_12m: number | null;
  revpar_12m: number | null;
  supply_12m: number | null;
  demand_12m: number | null;
}

/** Best-match market snapshot for a hotel — picks market granularity first,
 *  falls back to submarket if available. Returns the most recently
 *  ingested row for the hotel's `market_name`. */
export async function findMarketSnapshotForHotel(
  hotelId: string,
): Promise<{ market: MarketSnapshot | null; submarket: MarketSnapshot | null }> {
  const snap = await loadHotelsSnapshot();
  if (!snap) return { market: null, submarket: null };
  const hotel = snap.hotels.find((h) => h.hotel_id === hotelId);
  if (!hotel) return { market: null, submarket: null };
  const allMarketSnaps = (snap as unknown as { market_snapshots?: MarketSnapshot[] }).market_snapshots ?? [];
  const market =
    allMarketSnaps.find(
      (r) =>
        (r.granularity === "market" || r.granularity === "country_listing") &&
        r.market_name === hotel.market_name &&
        !r.submarket_name,
    ) ?? null;
  const submarket =
    allMarketSnaps.find(
      (r) =>
        r.granularity === "submarket" &&
        r.submarket_name === hotel.submarket_name,
    ) ?? null;
  return { market, submarket };
}

/** Last N periods of market time-series for a hotel's market. Madrid
 *  drop today: all timeseries rows are Madrid, so this returns the
 *  tail-N regardless of market filter. When more cities land we filter
 *  by `market_name === hotel.market_name`. */
export async function findMarketTimeseriesForHotel(
  hotelId: string,
  n = 12,
): Promise<MarketTimeseriesRow[]> {
  const snap = await loadHotelsSnapshot();
  if (!snap) return [];
  const all = (snap as unknown as { market_timeseries?: MarketTimeseriesRow[] }).market_timeseries ?? [];
  if (all.length === 0) return [];
  // Period strings look like "Ago 2025" / "Sep 2025" — order in the file is
  // typically chronological. Take the last N entries as a proxy for "latest".
  // Future-proof: when files carry explicit dates we sort by them.
  return all.slice(-n);
}

/** Transaction comparables for a hotel — pulls transactions in the same
 *  market (and submarket when possible) sorted by closed_at desc.
 *  Computes price-per-key when both price_eur and rooms_count are
 *  resolvable (rooms_count comes from the hotel record when the
 *  transaction is linked, otherwise from the transaction's own field). */
export interface TransactionComparable extends TransactionEntry {
  price_per_key_eur: number | null;
  matched_via: "same_hotel" | "same_submarket" | "same_market" | "unmatched";
}

export async function findTransactionComparables(
  hotelId: string,
  limit = 8,
): Promise<TransactionComparable[]> {
  const snap = await loadHotelsSnapshot();
  if (!snap) return [];
  const hotel = snap.hotels.find((h) => h.hotel_id === hotelId);
  if (!hotel) return [];
  const hotelsByName = new Map(snap.hotels.map((h) => [h.hotel_id, h]));

  const candidates: TransactionComparable[] = [];
  for (const t of snap.transactions) {
    const linkedHotel = t.hotel_id ? hotelsByName.get(t.hotel_id) : null;
    let matched: TransactionComparable["matched_via"];
    if (t.hotel_id === hotel.hotel_id) matched = "same_hotel";
    else if (linkedHotel?.submarket_name && linkedHotel.submarket_name === hotel.submarket_name) matched = "same_submarket";
    else if (linkedHotel?.market_name === hotel.market_name) matched = "same_market";
    else if (t.market_name && t.market_name.toLowerCase() === (hotel.market_name ?? "").toLowerCase()) matched = "same_market";
    else continue;

    // Price-per-key: use linked hotel rooms when available; otherwise the
    // transaction's own rooms_count field (often absent on private rows).
    let rooms: number | null = null;
    if (linkedHotel?.rooms_count) rooms = linkedHotel.rooms_count;
    const price = typeof t.price_eur === "number" ? t.price_eur : null;
    const ppk = price && rooms ? Math.round(price / rooms) : null;
    candidates.push({ ...t, price_per_key_eur: ppk, matched_via: matched });
  }

  // Sort: same_hotel > same_submarket > same_market, then by closed_at desc
  const matchRank: Record<TransactionComparable["matched_via"], number> = {
    same_hotel: 0,
    same_submarket: 1,
    same_market: 2,
    unmatched: 3,
  };
  candidates.sort((a, b) => {
    const r = matchRank[a.matched_via] - matchRank[b.matched_via];
    if (r !== 0) return r;
    if (a.closed_at && b.closed_at) return a.closed_at < b.closed_at ? 1 : -1;
    if (a.closed_at && !b.closed_at) return -1;
    if (!a.closed_at && b.closed_at) return 1;
    return 0;
  });
  return candidates.slice(0, limit);
}
