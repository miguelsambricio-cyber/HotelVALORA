"use server";

import "server-only";
import crypto from "node:crypto";
import { revalidatePath } from "next/cache";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { requireOperator } from "@/lib/security/operator-guard";

/**
 * Phase 3.c · operator write-path for transactions + projects.
 *
 * Mirror of the manual-hotel pattern (manual-entry.ts) for the
 * "deal" entities surfaced in `/user/admin/hotels`. Each kind lives
 * in its own Storage prefix so the Python pipeline can absorb them
 * separately on next ingest run:
 *
 *   costar-master/
 *     manual_transactions/<YYYY-MM>/<tx_id>.json
 *     manual_projects/<YYYY-MM>/<proj_id>.json
 *
 * Every entry tagged with provenance:
 *   source         = "manual_entry"
 *   review_status  = "new"
 *   submitted_by   = operator email
 *   submitted_at   = ISO timestamp
 */

const STORAGE_BUCKET = "costar-master";

export interface ManualTransactionPayload {
  asset_name: string;
  country?: string;          // default ES
  market_name?: string | null;
  submarket_name?: string | null;
  closed_at?: string | null;  // YYYY-MM or YYYY-MM-DD
  price_eur?: number | null;
  rooms_count?: number | null;
  buyer?: string | null;
  seller?: string | null;
  hotel_id?: string | null;   // pre-resolved when operator clicks from a hotel
  notes?: string | null;
}

export interface ManualProjectPayload {
  project_name: string;
  country?: string;          // default ES
  market_name?: string | null;
  city?: string | null;
  street?: string | null;
  postal_code?: string | null;
  state_province?: string | null;
  phase?: string | null;     // Planning / Construction / Pre-Opening / Operating
  status?: string | null;
  opening_date?: string | null;
  construction_type?: string | null;
  stars?: number | null;
  rooms_count?: number | null;
  office_company?: string | null;
  notes?: string | null;
}

export interface ManualDealResult {
  ok: boolean;
  id?: string;
  storage_key?: string;
  error?: string;
}

function _shortId(prefix: string, ...parts: (string | number | null | undefined)[]): string {
  const payload = parts.map((p) => (p === null || p === undefined ? "" : String(p))).join("|");
  const hash = crypto.createHash("sha256").update(payload, "utf-8").digest("hex");
  return `${prefix}_${hash.slice(0, 16)}`;
}

// ── Transactions ────────────────────────────────────────────────────────────

export async function addManualTransaction(
  payload: ManualTransactionPayload,
): Promise<ManualDealResult> {
  const operator = await requireOperator();
  if (!payload.asset_name?.trim()) return { ok: false, error: "asset_name is required" };
  const country = (payload.country || "ES").toUpperCase();
  if (country.length !== 2) return { ok: false, error: "country must be ISO-2" };

  const now = new Date();
  const closed_at = payload.closed_at?.trim() || null;
  const price_eur = typeof payload.price_eur === "number" && payload.price_eur > 0 ? payload.price_eur : null;
  const tx_id = _shortId(
    "tx",
    "private",
    payload.asset_name.trim().toLowerCase(),
    closed_at ?? "",
    price_eur !== null ? Math.round(price_eur).toString() : "",
  );

  const row = {
    transaction_id: tx_id,
    source: "private",
    hotel_id: payload.hotel_id?.trim() || null,
    asset_name: payload.asset_name.trim(),
    country,
    market_name: payload.market_name?.trim() || null,
    submarket_name: payload.submarket_name?.trim() || null,
    closed_at,
    price_eur,
    rooms_count: payload.rooms_count ?? null,
    buyer: payload.buyer?.trim() || null,
    seller: payload.seller?.trim() || null,
    notes: payload.notes?.trim() || null,
    _meta: {
      ingestion_batch_id: null,
      source_path: `manual_transactions/${now.toISOString().slice(0, 7)}/${tx_id}.json`,
      source: "manual_entry",
      review_status: "new",
      submitted_by: operator.email ?? operator.userId ?? "unknown",
      submitted_at: now.toISOString(),
    },
  };

  return _uploadDeal("manual_transactions", tx_id, row);
}

// ── Projects (hotel pipeline) ───────────────────────────────────────────────

export async function addManualProject(
  payload: ManualProjectPayload,
): Promise<ManualDealResult> {
  const operator = await requireOperator();
  if (!payload.project_name?.trim()) return { ok: false, error: "project_name is required" };
  const country = (payload.country || "ES").toUpperCase();
  if (country.length !== 2) return { ok: false, error: "country must be ISO-2" };

  const now = new Date();
  const proj_id = _shortId(
    "proj",
    country,
    payload.project_name.trim().toLowerCase(),
    payload.city ?? "",
  );

  const row = {
    project_id: proj_id,
    project_name: payload.project_name.trim(),
    country,
    market_name: payload.market_name?.trim() || null,
    submarket_name: null,
    city: payload.city?.trim() || null,
    state_province: payload.state_province?.trim() || null,
    street: payload.street?.trim() || null,
    postal_code: payload.postal_code?.trim() || null,
    phase: payload.phase?.trim() || null,
    status: payload.status?.trim() || null,
    opening_date: payload.opening_date?.trim() || null,
    construction_type: payload.construction_type?.trim() || null,
    stars: payload.stars ?? null,
    rooms_count: payload.rooms_count ?? null,
    office_company: payload.office_company?.trim() || null,
    notes: payload.notes?.trim() || null,
    _meta: {
      ingestion_batch_id: null,
      source_path: `manual_projects/${now.toISOString().slice(0, 7)}/${proj_id}.json`,
      source: "manual_entry",
      review_status: "new",
      submitted_by: operator.email ?? operator.userId ?? "unknown",
      submitted_at: now.toISOString(),
    },
  };

  return _uploadDeal("manual_projects", proj_id, row);
}

// ── Shared upload helper ────────────────────────────────────────────────────

async function _uploadDeal(
  prefix: "manual_transactions" | "manual_projects",
  id: string,
  row: unknown,
): Promise<ManualDealResult> {
  const ymonth = new Date().toISOString().slice(0, 7);
  const storage_key = `${prefix}/${ymonth}/${id}.json`;
  const body = Buffer.from(JSON.stringify(row, null, 2), "utf-8");
  try {
    const supabase = getSupabaseAdmin();
    const { error } = await supabase.storage
      .from(STORAGE_BUCKET)
      .upload(storage_key, body, {
        contentType: "application/json",
        cacheControl: "0",
        upsert: true,
      });
    if (error) return { ok: false, error: `storage.upload: ${error.message}` };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "upload failed" };
  }
  revalidatePath("/user/admin/hotels");
  return { ok: true, id, storage_key };
}
