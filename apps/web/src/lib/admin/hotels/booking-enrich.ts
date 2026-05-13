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
  getHotelRooms,
  mapBookingToProfile,
  matchConfidence,
  searchDestination,
  searchHotels,
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

  // ── Step 1 · resolve destination (market name → dest_id) ──
  // Fallback chain: market_name → city (if we ever store it) → country
  const destinationQuery = hotel.market_name?.trim() || hotel.country?.trim() || "";
  if (!destinationQuery) {
    return { ok: false, error: "hotel has no market_name / country to query Booking with" };
  }
  let destHits;
  try {
    destHits = await searchDestination(destinationQuery);
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? `searchDestination: ${err.message}` : "searchDestination failed",
    };
  }
  // Prefer city / district matches in the correct country
  const candidateDest = destHits.find((d) =>
    (d.dest_type === "city" || d.dest_type === "district") &&
    (!hotel.country || (d.country ?? "").toUpperCase().startsWith(hotel.country.toUpperCase())),
  ) ?? destHits[0];
  if (!candidateDest) {
    return { ok: false, error: `Booking returned no destinations for "${destinationQuery}"` };
  }

  // ── Step 2 · search hotels in that destination · narrowed by name ──
  let hits;
  try {
    hits = await searchHotels({
      dest_id: candidateDest.dest_id,
      dest_type: candidateDest.dest_type,
      query_filter: hotel.name,
    });
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? `searchHotels: ${err.message}` : "searchHotels failed",
    };
  }
  if (hits.length === 0) {
    // Try again WITHOUT the name filter — the property name may differ
    // between CoStar and Booking (e.g. "VP Plaza España Design" vs
    // "Hotel VP Plaza España")
    try {
      hits = await searchHotels({
        dest_id: candidateDest.dest_id,
        dest_type: candidateDest.dest_type,
      });
    } catch {
      // keep empty
    }
  }

  const scored = hits
    .map((h) => ({
      hit: h,
      confidence: matchConfidence(h, { name: hotel.name, market: hotel.market_name, country: hotel.country }),
    }))
    .sort((a, b) => b.confidence - a.confidence);

  if (scored.length === 0) {
    return { ok: false, error: `Booking returned no hotels in ${candidateDest.label ?? candidateDest.name}` };
  }

  const top = scored[0];
  const candidatesPreview: BookingEnrichCandidate[] = scored.slice(0, 5).map((s) => ({
    booking_hotel_id: s.hit.hotel_id,
    name: s.hit.property?.name ?? "(unknown)",
    match_confidence: s.confidence,
    review_score: s.hit.property?.reviewScore,
    review_count: s.hit.property?.reviewCount,
    latitude: s.hit.property?.latitude,
    longitude: s.hit.property?.longitude,
  }));

  if (top.confidence < AUTO_PICK_THRESHOLD) {
    return {
      ok: false,
      needs_disambiguation: true,
      candidates: candidatesPreview,
      match_confidence: top.confidence,
      error: `top match confidence ${(top.confidence * 100).toFixed(0)}% below ${AUTO_PICK_THRESHOLD * 100}% threshold · pick a candidate manually`,
    };
  }

  // ── Step 3 · fetch details + facilities + rooms for the top match ──
  const bookingHotelId = top.hit.hotel_id;
  let details, facilities, rooms;
  try {
    [details, facilities, rooms] = await Promise.all([
      getHotelDetails(bookingHotelId),
      getHotelFacilities(bookingHotelId),
      getHotelRooms(bookingHotelId),
    ]);
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? `details fetch: ${err.message}` : "details fetch failed",
    };
  }

  const { profile } = mapBookingToProfile({ details, facilities, rooms, searchHit: top.hit });

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
    booking_name: top.hit.property?.name,
    completeness_score: completeness.score,
    candidates: candidatesPreview,
  };
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
