"use server";

import "server-only";
import { revalidatePath } from "next/cache";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { requireOperator } from "@/lib/security/operator-guard";
import type { HotelProfile } from "./types";
import { computeProfileCompleteness } from "./profile-completeness";

/**
 * Phase 3.e · operator-side hotel profile enrichment.
 *
 * Mirror of the manual-hotel pattern. The operator types in
 * Booking-derived fields (facilities · amenities · room mix · review
 * score · policies) and the snapshot reader merges them onto the
 * canonical CoStar record at runtime.
 *
 * Storage path:
 *   costar-master/manual_enrichment/<hotel_id>.json
 *
 * Idempotent (upsert · same hotel_id always overrides). Provenance
 * tagged source = "manual_operator" with priority 100 so future
 * automated Booking scrapes never overwrite operator corrections.
 */

const STORAGE_BUCKET = "costar-master";
const ENRICHMENT_PREFIX = "manual_enrichment";

export interface ManualEnrichmentResult {
  ok: boolean;
  hotel_id?: string;
  storage_key?: string;
  completeness_score?: number;
  error?: string;
}

export async function submitManualEnrichment(
  hotel_id: string,
  profile: HotelProfile,
): Promise<ManualEnrichmentResult> {
  const operator = await requireOperator();
  if (!hotel_id?.trim()) return { ok: false, error: "hotel_id is required" };

  // Strip empty values so the completeness score reflects intent
  const cleaned = _stripEmpty(profile);
  const completeness = computeProfileCompleteness(cleaned);

  const payload = {
    hotel_id,
    profile: cleaned,
    _enrichment_meta: {
      enrichment_sources: ["manual_operator"],
      source_priority: { manual_operator: 100 },
      enrichment_confidence: 0.9, // operator-entered · high confidence
      last_scraped_at: new Date().toISOString(),
      profile_completeness_score: completeness.score,
      submitted_by: operator.email ?? operator.userId ?? "unknown",
      submitted_at: new Date().toISOString(),
    },
  };

  const storage_key = `${ENRICHMENT_PREFIX}/${hotel_id}.json`;
  const body = Buffer.from(JSON.stringify(payload, null, 2), "utf-8");
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
  revalidatePath(`/user/admin/hotels/${hotel_id}`);
  return { ok: true, hotel_id, storage_key, completeness_score: completeness.score };
}

/**
 * Recursively strip empty strings, empty arrays, empty objects so the
 * stored payload doesn't carry "false populations" that would inflate
 * the completeness score.
 */
function _stripEmpty<T>(v: T): T {
  if (v === null || v === undefined) return v;
  if (typeof v === "string") return (v.trim() === "" ? undefined : v) as T;
  if (Array.isArray(v)) {
    const out = v.map((x) => _stripEmpty(x)).filter((x) => x !== undefined && x !== null);
    return (out.length === 0 ? undefined : out) as T;
  }
  if (typeof v === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, val] of Object.entries(v as Record<string, unknown>)) {
      const cleaned = _stripEmpty(val);
      if (cleaned !== undefined && cleaned !== null && cleaned !== "") {
        out[k] = cleaned;
      }
    }
    return (Object.keys(out).length === 0 ? undefined : out) as T;
  }
  return v;
}
