"use server";

import "server-only";
import { revalidatePath } from "next/cache";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { requireOperator } from "@/lib/security/operator-guard";
import { findHotelById } from "./snapshot-reader";
import { computeProfileCompleteness } from "./profile-completeness";
import {
  getHotelDetails,
  getHotelFacilities,
  getHotelPolicies,
  getHotelRooms,
  mapBookingToProfile,
  matchConfidence,
  searchDestination,
} from "./booking-fetcher";
import type { HotelProfile } from "./types";

/**
 * Phase 3.f.real-booking · operator-triggered Booking enrichment.
 *
 * Resolves the canonical hotel against RapidAPI booking-com15, fetches
 * full details + facilities + rooms, maps to HotelProfile, and upserts
 * to `costar-master/manual_enrichment/<hotel_id>.json`.
 *
 * Provenance:
 *   - enrichment_sources = ["rapidapi_booking"]
 *   - source_priority    = { rapidapi_booking: 80 }
 *   - operator manual at 100 still wins (this loader does NOT overwrite
 *     a record where the existing source is "manual_operator")
 *
 * Returns a structured result so the UI can show match confidence and
 * candidate hotels when the auto-match isn't strong enough.
 */

const STORAGE_BUCKET = "costar-master";
const ENRICHMENT_PREFIX = "manual_enrichment";

export interface BookingEnrichCandidate {
  booking_hotel_id: number;
  name: string;
  match_confidence: number;
  review_score?: number;
  review_count?: number;
  latitude?: number;
  longitude?: number;
}

export interface BookingEnrichResult {
  ok: boolean;
  hotel_id?: string;
  match_confidence?: number;
  booking_hotel_id?: number;
  booking_name?: string;
  completeness_score?: number;
  candidates?: BookingEnrichCandidate[];
  error?: string;
  needs_disambiguation?: boolean;
}

const AUTO_PICK_THRESHOLD = 0.8;

export async function runBookingEnrichment(
  hotel_id: string,
): Promise<BookingEnrichResult> {
  const operator = await requireOperator();
  if (!hotel_id?.trim()) return { ok: false, error: "hotel_id is required" };

  const hotel = await findHotelById(hotel_id);
  if (!hotel) return { ok: false, error: `hotel ${hotel_id} not found in snapshot` };

  // Refuse to overwrite a manual_operator profile. The operator's edits
  // are load-bearing institutional truth · Booking auto-fetch must not
  // clobber them. Operator can delete the manual_enrichment record
  // first if they really want Booking to take over.
  const existingSource = hotel._enrichment_meta?.enrichment_sources?.[0];
  if (existingSource === "manual_operator") {
    return {
      ok: false,
      error:
        "this hotel already has a manual_operator enrichment · refusing to overwrite. " +
        "Delete the existing enrichment first if you want Booking to take over.",
    };
  }

  // ── Step 1 · resolve hotel by NAME directly via searchDestination ──
  // The v2 strategy uses Booking's destination index as a hotel
  // catalogue · `dest_type === "hotel"` hits give us the right
  // booking_hotel_id without an extra searchHotels call. Empirically
  // much higher match rate (8/10 → 100% match) than going through
  // city → searchHotels which surfaces apartments and same-token
  // properties first.
  let destHits;
  try {
    destHits = await searchDestination(hotel.name);
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? `searchDestination: ${err.message}` : "searchDestination failed",
    };
  }
  const hotelHits = destHits.filter((d) => d.dest_type === "hotel");
  if (hotelHits.length === 0) {
    return { ok: false, error: `Booking found no hotel-type matches for "${hotel.name}"` };
  }

  // Score by name match + filter by country
  const wantCountry = (hotel.country ?? "").toUpperCase().slice(0, 2);
  const scored = hotelHits.map((h) => {
    const candCountry =
      (h.country ?? "").toLowerCase() === "spain" || (h.country ?? "").toLowerCase() === "españa"
        ? "ES"
        : (h.country ?? "").toUpperCase().slice(0, 2);
    const countryMatch = !wantCountry || candCountry === wantCountry;
    // Adapt the search hit's "dest" shape to the search hit shape
    // that matchConfidence expects
    const adapted = { hotel_id: 0, property: { id: 0, name: h.name, latitude: h.latitude, longitude: h.longitude } };
    return { dest: h, hit: adapted, confidence: matchConfidence(adapted, { name: hotel.name, market: hotel.market_name, country: hotel.country }), countryMatch };
  }).sort((a, b) => {
    if (a.countryMatch !== b.countryMatch) return a.countryMatch ? -1 : 1;
    return b.confidence - a.confidence;
  });

  const top = scored[0];
  const candidatesPreview: BookingEnrichCandidate[] = scored.slice(0, 5).map((s) => ({
    booking_hotel_id: parseInt(s.dest.dest_id, 10),
    name: s.dest.name,
    match_confidence: s.confidence,
    latitude: s.dest.latitude,
    longitude: s.dest.longitude,
  }));

  if (!top.countryMatch || top.confidence < AUTO_PICK_THRESHOLD) {
    return {
      ok: false,
      needs_disambiguation: true,
      candidates: candidatesPreview,
      match_confidence: top.confidence,
      error: !top.countryMatch
        ? `no Booking hotel found in ${hotel.country ?? "target country"} · top candidate is in ${top.dest.country}`
        : `top match confidence ${(top.confidence * 100).toFixed(0)}% below ${AUTO_PICK_THRESHOLD * 100}% threshold · pick a candidate manually`,
    };
  }

  // ── Step 2 · fetch details + facilities + rooms + policies in parallel ──
  const bookingHotelId = parseInt(top.dest.dest_id, 10);
  let details, facilities, rooms, policies;
  try {
    [details, facilities, rooms, policies] = await Promise.all([
      getHotelDetails(bookingHotelId),
      getHotelFacilities(bookingHotelId),
      getHotelRooms(bookingHotelId),
      getHotelPolicies(bookingHotelId),
    ]);
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? `details fetch: ${err.message}` : "details fetch failed",
    };
  }

  const { profile } = mapBookingToProfile({ details, facilities, rooms, policies });

  // ── Step 4 · upsert to Storage with rapidapi_booking provenance ──
  const cleaned = _stripEmpty(profile) as HotelProfile;
  const completeness = computeProfileCompleteness(cleaned);

  const payload = {
    hotel_id,
    profile: cleaned,
    _enrichment_meta: {
      enrichment_sources: ["rapidapi_booking"],
      source_priority: { rapidapi_booking: 80 },
      enrichment_confidence: top.confidence,
      booking_hotel_id: bookingHotelId,
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
  return {
    ok: true,
    hotel_id,
    match_confidence: top.confidence,
    booking_hotel_id: bookingHotelId,
    booking_name: top.dest.name,
    completeness_score: completeness.score,
    candidates: candidatesPreview,
  };
}

// ── Bulk · Phase 3.f.next 1 ────────────────────────────────────────────────

export interface BulkBookingResult {
  ok: boolean;
  total: number;
  succeeded: number;
  failed: number;
  needs_disambiguation: number;
  skipped_manual_operator: number;
  rate_limited_stop: boolean;
  per_hotel: Array<{
    hotel_id: string;
    status: "ok" | "error" | "needs_disambiguation" | "skipped";
    booking_name?: string;
    match_confidence?: number;
    completeness_score?: number;
    error?: string;
  }>;
  // milliseconds elapsed end-to-end · operator can see throughput
  elapsed_ms: number;
}

/**
 * Phase 3.f.next 1 · bulk Booking enrichment.
 *
 * Loops `runBookingEnrichment` over a list of hotel_ids with a small
 * concurrency window (3) and inter-call delay (250ms). Caps at 25 per
 * call to fit Vercel Fluid Compute's 300s default timeout and to stay
 * polite to RapidAPI quotas.
 *
 * Aggregates results so the operator sees one summary at the end · the
 * per-hotel list captures which specific hotels need disambiguation or
 * failed so the operator can address them individually.
 *
 * Stops early if 5 consecutive rate-limit errors land — operator gets
 * `rate_limited_stop: true` and can resume later (idempotent: re-running
 * with the same hotel_ids will just re-attempt the failed ones).
 */
const BULK_MAX_PER_CALL = 25;
const BULK_CONCURRENCY = 3;
const BULK_INTER_CALL_MS = 250;
const RATE_LIMIT_PATIENCE = 5;

export async function runBookingEnrichmentBatch(
  hotel_ids: string[],
): Promise<BulkBookingResult> {
  const start = Date.now();
  await requireOperator();

  const ids = hotel_ids.slice(0, BULK_MAX_PER_CALL);
  const out: BulkBookingResult = {
    ok: true,
    total: ids.length,
    succeeded: 0,
    failed: 0,
    needs_disambiguation: 0,
    skipped_manual_operator: 0,
    rate_limited_stop: false,
    per_hotel: [],
    elapsed_ms: 0,
  };

  let consecutiveRateLimits = 0;
  // Sequential is simpler · concurrency window of 3 implemented via a
  // sliding pool. We don't use Promise.all directly because we want
  // throttle BETWEEN calls and early-stop on consecutive 429s.
  const queue = [...ids];
  const inflight: Array<Promise<void>> = [];

  const runOne = async (hotel_id: string) => {
    try {
      const r = await runBookingEnrichment(hotel_id);
      if (r.ok) {
        consecutiveRateLimits = 0;
        out.succeeded += 1;
        out.per_hotel.push({
          hotel_id,
          status: "ok",
          booking_name: r.booking_name,
          match_confidence: r.match_confidence,
          completeness_score: r.completeness_score,
        });
      } else if (r.needs_disambiguation) {
        consecutiveRateLimits = 0;
        out.needs_disambiguation += 1;
        out.per_hotel.push({
          hotel_id,
          status: "needs_disambiguation",
          match_confidence: r.match_confidence,
          error: r.error,
        });
      } else if (r.error?.toLowerCase().includes("refusing to overwrite")) {
        consecutiveRateLimits = 0;
        out.skipped_manual_operator += 1;
        out.per_hotel.push({
          hotel_id,
          status: "skipped",
          error: "manual_operator enrichment exists",
        });
      } else {
        out.failed += 1;
        out.per_hotel.push({ hotel_id, status: "error", error: r.error });
        // Heuristic: rate-limit / quota errors usually mention 429 or
        // "rate" or "quota" in the message
        const e = (r.error ?? "").toLowerCase();
        if (e.includes("429") || e.includes("rate") || e.includes("quota") || e.includes("too many")) {
          consecutiveRateLimits += 1;
        } else {
          consecutiveRateLimits = 0;
        }
      }
    } catch (err) {
      out.failed += 1;
      const msg = err instanceof Error ? err.message : "unknown error";
      out.per_hotel.push({ hotel_id, status: "error", error: msg });
      const m = msg.toLowerCase();
      if (m.includes("429") || m.includes("rate") || m.includes("quota") || m.includes("too many")) {
        consecutiveRateLimits += 1;
      } else {
        consecutiveRateLimits = 0;
      }
    }
  };

  while (queue.length > 0 || inflight.length > 0) {
    if (consecutiveRateLimits >= RATE_LIMIT_PATIENCE) {
      out.rate_limited_stop = true;
      break;
    }
    while (inflight.length < BULK_CONCURRENCY && queue.length > 0) {
      const id = queue.shift()!;
      const p = runOne(id).finally(() => {
        const i = inflight.indexOf(p);
        if (i >= 0) inflight.splice(i, 1);
      });
      inflight.push(p);
      await new Promise((res) => setTimeout(res, BULK_INTER_CALL_MS));
    }
    if (inflight.length > 0) {
      await Promise.race(inflight);
    }
  }
  // Drain remaining
  await Promise.all(inflight);

  out.elapsed_ms = Date.now() - start;
  // ok=false if every single one failed · helps the UI render a hard error
  out.ok = out.succeeded + out.needs_disambiguation + out.skipped_manual_operator > 0;
  return out;
}

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
