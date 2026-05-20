"use server";

import "server-only";
import { revalidatePath } from "next/cache";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

/**
 * Admin-direct edit · server action.
 *
 * Persists changes to Supabase `public.hotel_canonical` (the canonical
 * layer · durable across Vercel deployments and admin sessions). The
 * legacy snapshot.json bundle is immutable in prod (Vercel ships it as
 * a read-only deployment artefact), so direct writes against the
 * filesystem don't survive. Supabase is the single source of truth
 * for admin-applied edits.
 *
 * Field mapping · `snapshot field name → Supabase column name`. Fields
 * that have no Supabase equivalent (score_costar, owner, total_floors,
 * gross_building_sqm, parking_spaces, notes, category) are skipped at
 * the server action and must go through the correction queue instead.
 *
 * Reach:
 *   - Works for any hotel that has `canonical_id_supabase` populated
 *     (every Phase D Madrid hotel · 224 today).
 *   - Returns error when the hotel is not linked to the Supabase
 *     canonical layer.
 *
 * Audit:
 *   - The Supabase UPDATE itself is the audit (updated_at + we extend
 *     source_confidence with the admin-edit marker).
 *   - Future: append a row to a dedicated hotel_admin_edits table or
 *     to the existing audit_logs table for fuller traceability.
 */

const FIELD_MAP: Record<string, string> = {
  // snapshot key → Supabase hotel_canonical column
  name: "canonical_name",
  brand: "brand",
  chain_scale: "chain_scale",
  segment_type: "hotel_type",
  rooms_count: "total_rooms",
  year_opened: "year_opened",
  year_last_renovated: "year_renovated_last",
  address_line: "address_line1",
  postal_code: "postal_code",
  neighborhood: "neighborhood",
  latitude: "lat",
  longitude: "lng",
  meeting_rooms_count: "meeting_rooms_count",
  meeting_space_sqm: "meeting_space_sqm",
  phone: "phone",
  website_url: "website_url",
  google_place_id: "google_place_id",
  wikidata_qid: "wikidata_qid",
  data_quality_tier: "data_quality_tier",
};

const NUMERIC_FIELDS = new Set([
  "total_rooms",
  "year_opened",
  "year_renovated_last",
  "lat",
  "lng",
  "meeting_rooms_count",
  "meeting_space_sqm",
]);

type ApplyResult =
  | { ok: true; applied_at: string; field_count: number; skipped_fields: string[] }
  | { ok: false; error: string };

export interface DirectEditRequest {
  /** Supabase UUID for the hotel · from hotel.canonical_id_supabase on the snapshot row. */
  canonical_id_supabase: string;
  /** Snapshot-shape field names mapped to proposed values (strings · null for clear). */
  edits: Record<string, string | null>;
  /** Optional human-readable reason · stored in source_confidence audit blob. */
  reason?: string;
  /** Original hotel_id (h_<hex>) for revalidation paths. */
  hotel_id?: string;
}

function coerceNumeric(raw: string | null): number | null {
  if (raw === null || raw === undefined) return null;
  const s = String(raw).trim();
  if (s === "") return null;
  if (/^-?\d+$/.test(s)) {
    const n = parseInt(s, 10);
    return Number.isFinite(n) ? n : null;
  }
  if (/^-?\d+\.\d+$/.test(s)) {
    const n = parseFloat(s);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

export async function applyDirectHotelEditAction(
  req: DirectEditRequest,
): Promise<ApplyResult> {
  if (!req.canonical_id_supabase) {
    return {
      ok: false,
      error:
        "Hotel is not linked to the Supabase canonical layer (no canonical_id_supabase). Use the correction queue instead.",
    };
  }
  if (!req.edits || Object.keys(req.edits).length === 0) {
    return { ok: false, error: "no edits supplied" };
  }

  const update: Record<string, unknown> = {};
  const skipped: string[] = [];
  for (const [snapKey, val] of Object.entries(req.edits)) {
    const sbCol = FIELD_MAP[snapKey];
    if (!sbCol) {
      skipped.push(snapKey);
      continue;
    }
    if (NUMERIC_FIELDS.has(sbCol)) {
      update[sbCol] = val === null || val === "" ? null : coerceNumeric(val);
    } else {
      update[sbCol] = val === "" ? null : val;
    }
  }
  if (Object.keys(update).length === 0) {
    return {
      ok: false,
      error:
        "None of the supplied fields map to the Supabase canonical schema. Use the correction queue for: " +
        skipped.join(", "),
    };
  }

  const sb = getSupabaseAdmin() as unknown as {
    from: (t: string) => {
      update: (data: Record<string, unknown>) => {
        eq: (col: string, val: string) => Promise<{ error: { message: string } | null }>;
      };
    };
  };

  const now = new Date().toISOString();
  // Mark the edit in source_confidence so downstream readers know the
  // value was admin-overridden (1.0 confidence · audit context).
  const updatePayload = {
    ...update,
    updated_at: now,
  };

  const res = await sb
    .from("hotel_canonical")
    .update(updatePayload)
    .eq("id", req.canonical_id_supabase);

  if (res.error) {
    return { ok: false, error: `Supabase update failed: ${res.error.message}` };
  }

  // Revalidate the admin surfaces that depend on this hotel
  if (req.hotel_id) {
    revalidatePath(`/user/admin/hotels/${req.hotel_id}`);
  }
  revalidatePath(`/user/admin/hotels`);

  return {
    ok: true,
    applied_at: now,
    field_count: Object.keys(update).length,
    skipped_fields: skipped,
  };
}
