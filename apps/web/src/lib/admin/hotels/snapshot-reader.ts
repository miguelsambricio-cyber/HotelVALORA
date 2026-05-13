import { readFile } from "node:fs/promises";
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

export interface HotelsSnapshot {
  schema_version: string;
  generated_at: string;
  ingestion_batch_id: string;
  totals: {
    hotels: number;
    markets: number;
    compsets: number;
    transactions: number;
    reconciliation_queue: number;
  };
  /** Optional · older v1.2 snapshots predate this block. */
  corrections?: CorrectionsSummary;
  markets: MarketSummary[];
  hotels: HotelRecord[];
  compsets: CompsetEntry[];
  transactions: TransactionEntry[];
  reconciliation_queue: ReconciliationEntry[];
}

const REPO_ROOT_FROM_WEB = path.resolve(process.cwd(), "..", "..");
const SNAPSHOT_PATH = path.join(
  REPO_ROOT_FROM_WEB,
  "services",
  "costar",
  "MASTER",
  "snapshot.json",
);

let cache: { mtime: number; snapshot: HotelsSnapshot | null } | null = null;

/**
 * Load the snapshot. Returns `null` when the file is missing or
 * malformed — caller renders the "data plane not yet wired" empty state.
 *
 * Tiny in-memory cache keyed on the file mtime — keeps the page
 * responsive when several components on the same render call this in
 * parallel without re-parsing the JSON for each.
 */
export async function loadHotelsSnapshot(): Promise<HotelsSnapshot | null> {
  try {
    const { promises: fs } = await import("node:fs");
    const stat = await fs.stat(SNAPSHOT_PATH);
    if (cache && cache.mtime === stat.mtimeMs) {
      return cache.snapshot;
    }
    const raw = await readFile(SNAPSHOT_PATH, "utf-8");
    const parsed = JSON.parse(raw) as HotelsSnapshot;
    cache = { mtime: stat.mtimeMs, snapshot: parsed };
    return parsed;
  } catch (err: unknown) {
    // ENOENT or parse error — both render the same empty state
    cache = { mtime: 0, snapshot: null };
    return null;
  }
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
