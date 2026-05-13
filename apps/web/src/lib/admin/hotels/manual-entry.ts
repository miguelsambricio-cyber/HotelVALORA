"use server";

import "server-only";
import crypto from "node:crypto";
import { revalidatePath } from "next/cache";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { requireOperator } from "@/lib/security/operator-guard";
import type { HotelReferenceRecord } from "./types";

/**
 * Manual hotel entry — Phase 3 operator write-path.
 *
 * Architecture decision · the canonical Python ingest pipeline owns the
 * master XLSX + canonical snapshot. Operator-added hotels live in a
 * separate Storage prefix (`costar-master/manual_hotels/<YYYY-MM>/<id>.json`)
 * so they're:
 *   - Visible IMMEDIATELY in the admin UI (snapshot reader merges them
 *     into the live hotels list on every read)
 *   - Auditable (one file per hotel, named by deterministic ID)
 *   - Eventually consumable by Python (Phase 2.3.d.7 will sweep this
 *     prefix on each `ingest.py` run and fold them into the canonical
 *     master)
 *
 * Every manual entry carries:
 *   _meta.source         = "manual_entry"
 *   _meta.review_status  = "new"        ← surfaces a NEW badge on the row
 *   _meta.submitted_by   = operator email
 *   _meta.submitted_at   = ISO timestamp
 */

const STORAGE_BUCKET = "costar-master";
const MANUAL_HOTELS_PREFIX = "manual_hotels";

export interface ManualHotelPayload {
  name: string;
  country?: string;             // defaults to "ES"
  market_name: string;
  submarket_name?: string | null;
  chain_scale?: HotelReferenceRecord["chain_scale"];
  affiliation_type?: HotelReferenceRecord["affiliation_type"];
  rooms_count?: number | null;
  brand?: string | null;
  operator?: string | null;
  owner?: string | null;
  address_line?: string | null;
  postal_code?: string | null;
  category?: string | null;
  year_opened?: number | null;
  notes?: string | null;
}

export interface ManualHotelResult {
  ok: boolean;
  hotel_id?: string;
  storage_key?: string;
  error?: string;
}

function _hotelIdFor(country: string, market: string, name: string): string {
  const stripped = `${country.toUpperCase()}|${market.toLowerCase().trim()}|${name.toLowerCase().trim()}`;
  const hash = crypto.createHash("sha256").update(stripped, "utf-8").digest("hex");
  return `h_${hash.slice(0, 16)}`;
}

export async function addManualHotel(
  payload: ManualHotelPayload,
): Promise<ManualHotelResult> {
  const operator = await requireOperator();

  // Validate required fields
  if (!payload.name?.trim()) return { ok: false, error: "name is required" };
  if (!payload.market_name?.trim()) return { ok: false, error: "market is required" };
  const country = (payload.country || "ES").toUpperCase();
  if (country.length !== 2) return { ok: false, error: "country must be ISO-3166 alpha-2 (e.g. ES)" };

  const now = new Date();
  const hotel_id = _hotelIdFor(country, payload.market_name, payload.name);

  // Build the canonical hotel record matching `HotelReferenceRecord`
  const hotel = {
    country,
    market_name: payload.market_name.trim(),
    submarket_name: payload.submarket_name?.trim() || null,
    hotel_id,
    hotel_id_synthetic: true,
    name: payload.name.trim(),
    brand: payload.brand?.trim() || null,
    operator: payload.operator?.trim() || null,
    owner: payload.owner?.trim() || null,
    chain_scale: payload.chain_scale ?? null,
    affiliation_type: payload.affiliation_type ?? null,
    category: payload.category?.trim() || null,
    segment_type: null,
    rooms_count: payload.rooms_count ?? null,
    year_opened: payload.year_opened ?? null,
    year_last_renovated: null,
    total_floors: null,
    address_line: payload.address_line?.trim() || null,
    postal_code: payload.postal_code?.trim() || null,
    latitude: null,
    longitude: null,
    neighborhood: null,
    facilities: [],
    amenities: [],
    meeting_space_sqm: null,
    parking_spaces: null,
    score_costar: null,
    score_external: {},
    competitive_set_ids: [],
    transactions_history_ref: null,
    notes: payload.notes?.trim() || null,
    _meta: {
      ingestion_batch_id: null,
      source_path: `manual_hotels/${now.toISOString().slice(0, 7)}/${hotel_id}.json`,
      source: "manual_entry",
      review_status: "new",
      submitted_by: operator.email ?? operator.userId ?? "unknown",
      submitted_at: now.toISOString(),
      confidence: 0.6, // operator-entered · not yet reconciled against CoStar
      needs_review: ["manual_entry_pending_reconciliation"],
      fuzzy_matched: false,
    },
  };

  const ymonth = now.toISOString().slice(0, 7);
  const storage_key = `${MANUAL_HOTELS_PREFIX}/${ymonth}/${hotel_id}.json`;
  const body = Buffer.from(JSON.stringify(hotel, null, 2), "utf-8");

  try {
    const supabase = getSupabaseAdmin();
    const { error } = await supabase.storage
      .from(STORAGE_BUCKET)
      .upload(storage_key, body, {
        contentType: "application/json",
        cacheControl: "0",
        upsert: true, // operator can re-submit corrections; same hotel_id overrides
      });
    if (error) return { ok: false, error: `storage.upload: ${error.message}` };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "upload failed" };
  }

  // Invalidate the page cache so the new row shows up on next render
  revalidatePath("/user/admin/hotels");
  revalidatePath(`/user/admin/hotels/${hotel_id}`);
  return { ok: true, hotel_id, storage_key };
}
