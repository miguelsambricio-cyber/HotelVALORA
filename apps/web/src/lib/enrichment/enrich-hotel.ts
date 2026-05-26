import "server-only";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { BookingRapidApiClient } from "@/lib/enrichment/providers/booking-rapidapi/client";
import { loadConfig as loadBookingConfig } from "@/lib/enrichment/providers/booking-rapidapi/config";
import {
  getHotelData,
  getHotelFacilities,
  getHotelPhotos,
  getRoomList,
} from "@/lib/enrichment/providers/booking-rapidapi/endpoints";
import {
  GooglePlacesClient,
  loadConfig as loadGoogleConfig,
} from "@/lib/enrichment/providers/google-places/client";

// hotel_canonical isn't in the auto-generated Database types (migration
// 0024 + 0028/0029/0030/0034 not yet regenerated). Use a narrow cast
// shim around the supabase-js builder · same pattern as
// `library-persistence.ts`.
type AdminBuilder = {
  from: (t: string) => {
    select: (cols: string) => {
      eq: (col: string, val: string) => {
        limit: (n: number) => Promise<{ data: CanonicalRow[] | null; error: { message: string } | null }>;
      };
    };
    update: (payload: Record<string, unknown>) => {
      eq: (col: string, val: string) => Promise<{ error: { message: string } | null }>;
    };
  };
};

/**
 * Enrich one canonical hotel using live HTTP against Booking RapidAPI
 * (4 endpoints) + Google Places (1 endpoint). Writes the result into
 * `hotel_canonical` respecting the data principle:
 *
 *   Lo que la API NO devuelva se queda VACÍO (NULL).
 *   Nunca sobreescribimos un valor existente con NULL.
 *
 * Returns a per-hotel report with fields touched + sources called.
 */

/** Cap on photos persisted · prevents runaway gallery sizes. */
const MAX_GALLERY_PHOTOS = 40;
/** Stay below the marketplace burst cap (10 RPS) with retry headroom. */
const RATE_LIMIT_MS = 200; // 5 RPS sustained

export interface EnrichResult {
  canonical_id: string;
  hotel_name: string;
  ok: boolean;
  sources_called: string[];
  fields_updated: string[];
  errors: Array<{ source: string; code: string; message: string }>;
  stats: {
    restaurants_count: number | null;
    meeting_rooms_count: number | null;
    photos_persisted: number;
    google_phone: string | null;
  };
  duration_ms: number;
}

interface CanonicalRow {
  id: string;
  canonical_name: string | null;
  booking_hotel_id: string | null;
  google_place_id: string | null;
  amenities: Record<string, boolean | null> | null;
  gallery_paths: string[] | null;
  meeting_rooms_count: number | null;
  restaurants_count: number | null;
  phone: string | null;
  website_url: string | null;
  review_score: number | null;
  review_count: number | null;
}

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

function pickUniqueUrls(list: ReadonlyArray<string>, cap: number): string[] {
  const out: string[] = [];
  const seenBasenames = new Set<string>();
  for (const url of list) {
    if (!url || typeof url !== "string") continue;
    const lastPart = url.split("/").pop() ?? url;
    const basename = lastPart.split(".")[0] || lastPart;
    if (seenBasenames.has(basename)) continue;
    seenBasenames.add(basename);
    out.push(url);
    if (out.length >= cap) break;
  }
  return out;
}

/**
 * Extract photo URLs from a Booking `getHotelPhotos` payload.
 *
 * Real shape (validated 2026-05-26 against the live API):
 *   { status: true, message: "Success", data: [{ id: number, url: string }] }
 *
 * IMPORTANT · the `?k=<signature>&o=` query suffix is a REQUIRED CloudFront
 * auth signature, NOT optional. Stripping it produces HTTP 401 Unauthorized
 * (confirmed empirically 2026-05-26 against cf.bstatic.com). Keep the full
 * URL · dedup-by-basename in `pickUniqueUrls` still works correctly because
 * basename is derived from the path's last segment minus the file extension
 * (the `?k=` portion lives further right and never appears in the basename).
 */
function extractBookingPhotoUrls(payload: unknown): string[] {
  if (!payload || typeof payload !== "object") return [];
  const rawData = (payload as { data?: unknown }).data;
  if (!Array.isArray(rawData)) return [];
  const urls: string[] = [];
  for (const item of rawData) {
    if (!item || typeof item !== "object") continue;
    const o = item as Record<string, unknown>;
    if (typeof o.url === "string" && /^https?:\/\//.test(o.url)) {
      // Store the URL VERBATIM · the signature is required for CDN auth
      urls.push(o.url);
    }
  }
  return urls;
}

/**
 * Collect the structured facility titles we care about: accommodationHighlights
 * (Booking's curated hero list) + facility group titles + individual
 * facility instance titles. This bounded list is what we scan for counts
 * and presence · NOT the entire payload tree (which contains noisy nested
 * attributes that caused over-counting in v1).
 */
function collectFacilityTitles(payload: unknown): {
  highlights: string[];          // accommodationHighlights[].title
  groupedFacilities: Array<{ group: string; title: string }>;
} {
  const out = { highlights: [] as string[], groupedFacilities: [] as Array<{ group: string; title: string }> };
  if (!payload || typeof payload !== "object") return out;
  const data = ((payload as { data?: unknown }).data ?? payload) as Record<string, unknown>;

  // accommodationHighlights · Booking's curated hero list with explicit
  // patterns like "4 restaurants", "2 meeting rooms"
  const highlights = data.accommodationHighlights;
  if (Array.isArray(highlights)) {
    for (const h of highlights) {
      const t = (h as { title?: unknown })?.title;
      if (typeof t === "string") out.highlights.push(t);
    }
  }

  // facilityGroups · category labels (e.g. "Business Facilities", "Food & Drink")
  const groups = data.facilityGroups;
  const groupTitleById = new Map<number, string>();
  if (Array.isArray(groups)) {
    for (const g of groups) {
      const o = g as { id?: unknown; title?: unknown };
      if (typeof o.id === "number" && typeof o.title === "string") {
        groupTitleById.set(o.id, o.title);
      }
    }
  }

  // facilities · list of feature instances with groupId → group title
  const facilities = data.facilities;
  if (Array.isArray(facilities)) {
    for (const f of facilities) {
      const o = f as { groupId?: unknown; instances?: unknown };
      const groupTitle = typeof o.groupId === "number" ? (groupTitleById.get(o.groupId) ?? "") : "";
      if (Array.isArray(o.instances)) {
        for (const inst of o.instances) {
          const t = (inst as { title?: unknown })?.title;
          if (typeof t === "string") out.groupedFacilities.push({ group: groupTitle, title: t });
        }
      }
    }
  }
  return out;
}

/**
 * Extract restaurants_count from Booking facilities payload.
 *
 * Strategy:
 *   1. PRIMARY · `accommodationHighlights[].title` matching `^(\d+)\s+restaurants?$`
 *      → returns the explicit count Booking surfaces (e.g. "4 restaurants" → 4)
 *   2. FALLBACK · presence-only signal · returns null when count unknown
 *      (data principle: lo que no sabemos NO lo inventamos)
 *
 * Replaces the v1 recursive walk that over-counted (Bless → 8 instead of 4).
 */
function extractRestaurantsCount(payload: unknown): number | null {
  const { highlights } = collectFacilityTitles(payload);
  for (const t of highlights) {
    const m = t.match(/^\s*(\d+)\s+restaurants?\s*$/i);
    if (m) return parseInt(m[1], 10);
  }
  return null;
}

/**
 * Extract meeting_rooms_count from Booking facilities payload.
 *
 * PRIMARY · `accommodationHighlights[].title` matching `^(\d+)\s+(meeting|conference)…`.
 * FALLBACK · null (presence comes from amenities.meet · count unknown).
 *
 * Booking rarely surfaces meeting room counts even for hotels that have
 * them · the bare amenity boolean is the reliable signal.
 */
function extractMeetingRoomsCount(payload: unknown): number | null {
  const { highlights } = collectFacilityTitles(payload);
  for (const t of highlights) {
    const m = t.match(/^\s*(\d+)\s+(meeting room|conference room|banquet hall|ball ?room|function room)s?\s*$/i);
    if (m) return parseInt(m[1], 10);
  }
  return null;
}

/**
 * Detect facility presence from the structured facility titles (NOT
 * recursive walk · avoids the v1 false-positives from nested attrs).
 *
 * Returns true if the pattern matches in accommodationHighlights OR
 * grouped facility titles · false when scanned but nothing matched ·
 * null when the payload had no structured facility data.
 */
function detectFacility(payload: unknown, pattern: RegExp): boolean | null {
  const { highlights, groupedFacilities } = collectFacilityTitles(payload);
  if (highlights.length === 0 && groupedFacilities.length === 0) return null;

  for (const t of highlights) if (pattern.test(t)) return true;
  for (const gf of groupedFacilities) {
    // Check both group title and the instance title · "Business Facilities ::
    // Meeting/Banquet facilities" matches /meeting/ in either.
    if (pattern.test(gf.group) || pattern.test(gf.title)) return true;
  }
  return false;
}

export async function enrichHotel(canonical_id: string): Promise<EnrichResult> {
  const t0 = Date.now();
  const sources_called: string[] = [];
  const fields_updated: string[] = [];
  const errors: EnrichResult["errors"] = [];

  // 1 · Load canonical row
  const sb = getSupabaseAdmin() as unknown as AdminBuilder;
  const { data: rows, error: selErr } = await sb
    .from("hotel_canonical")
    .select(
      "id,canonical_name,booking_hotel_id,google_place_id,amenities,gallery_paths,meeting_rooms_count,restaurants_count,phone,website_url,review_score,review_count",
    )
    .eq("id", canonical_id)
    .limit(1);
  if (selErr || !rows || rows.length === 0) {
    return {
      canonical_id,
      hotel_name: "—",
      ok: false,
      sources_called,
      fields_updated,
      errors: [{ source: "supabase", code: "NOT_FOUND", message: selErr?.message ?? "canonical row missing" }],
      stats: { restaurants_count: null, meeting_rooms_count: null, photos_persisted: 0, google_phone: null },
      duration_ms: Date.now() - t0,
    };
  }
  const row = rows[0];

  // 2 · Booking enrichment (4 endpoints · 5 RPS sustained)
  const update: Record<string, unknown> = {};
  let restaurants_count_final: number | null = null;
  let meeting_rooms_count_final: number | null = null;
  let photos_persisted = 0;
  let google_phone_final: string | null = null;

  if (row.booking_hotel_id) {
    const bookingCfg = loadBookingConfig(process.env, "live");
    const bookingClient = new BookingRapidApiClient(bookingCfg);
    const dates = bookingPilotDates();
    sources_called.push("booking_rapidapi.getHotelData");

    // E2 · getHotelData (general facts)
    const dataRes = await getHotelData(bookingClient, { hotelId: row.booking_hotel_id, ...dates });
    if (!dataRes.ok) {
      errors.push({ source: "booking_rapidapi.getHotelData", code: dataRes.error.code ?? "UNKNOWN", message: dataRes.error.message ?? "" });
    } else {
      // Defensive: parse review_score + review_count if present
      const payload = dataRes.data as Record<string, unknown> | undefined;
      const inner = (payload?.data ?? payload) as Record<string, unknown> | undefined;
      const score = typeof inner?.review_score === "number" ? inner.review_score : null;
      const cnt = typeof inner?.review_nr === "number" ? inner.review_nr : (typeof inner?.review_count === "number" ? inner.review_count : null);
      if (score !== null && row.review_score === null) {
        update.review_score = score;
        fields_updated.push("review_score");
      }
      if (cnt !== null && row.review_count === null) {
        update.review_count = cnt;
        fields_updated.push("review_count");
      }
    }
    await sleep(RATE_LIMIT_MS);

    // E3 · getHotelFacilities (restaurants_count, meeting_rooms_count, amenities)
    sources_called.push("booking_rapidapi.getHotelFacilities");
    const facRes = await getHotelFacilities(bookingClient, { hotelId: row.booking_hotel_id, ...dates });
    if (!facRes.ok) {
      errors.push({ source: "booking_rapidapi.getHotelFacilities", code: facRes.error.code ?? "UNKNOWN", message: facRes.error.message ?? "" });
    } else {
      const rc = extractRestaurantsCount(facRes.data);
      if (rc !== null) {
        restaurants_count_final = rc;
        update.restaurants_count = rc;
        fields_updated.push("restaurants_count");
      }
      const mc = extractMeetingRoomsCount(facRes.data);
      if (mc !== null) {
        meeting_rooms_count_final = mc;
        update.meeting_rooms_count = mc;
        fields_updated.push("meeting_rooms_count");
      }
      // Detect amenities · only SET when we have a confident signal · never
      // overwrite an existing truthy boolean with false.
      const detectedAmenities: Record<string, boolean | null> = {
        meet: detectFacility(facRes.data, /meeting|conferenc|business cent|banquet|ball ?room/i),
        spa: detectFacility(facRes.data, /spa/i),
        gym: detectFacility(facRes.data, /gym|fitness/i),
        pool: detectFacility(facRes.data, /pool|swimming/i),
        parking: detectFacility(facRes.data, /parking/i),
        bar: detectFacility(facRes.data, /bar\b/i),
        rooftop: detectFacility(facRes.data, /rooftop|terrace/i),
      };
      const mergedAmenities: Record<string, boolean | null> = { ...(row.amenities ?? {}) };
      for (const [k, v] of Object.entries(detectedAmenities)) {
        // Never set null over an existing true · only fill nulls
        if (mergedAmenities[k] === true) continue;
        if (v === null) continue; // no data signal · keep existing
        mergedAmenities[k] = v;
      }
      if (JSON.stringify(mergedAmenities) !== JSON.stringify(row.amenities ?? {})) {
        update.amenities = mergedAmenities;
        fields_updated.push("amenities");
      }
    }
    await sleep(RATE_LIMIT_MS);

    // E4 · getHotelPhotos
    sources_called.push("booking_rapidapi.getHotelPhotos");
    const phRes = await getHotelPhotos(bookingClient, { hotelId: row.booking_hotel_id });
    if (!phRes.ok) {
      errors.push({ source: "booking_rapidapi.getHotelPhotos", code: phRes.error.code ?? "UNKNOWN", message: phRes.error.message ?? "" });
    } else {
      const urls = extractBookingPhotoUrls(phRes.data);
      const unique = pickUniqueUrls(urls, MAX_GALLERY_PHOTOS);
      if (unique.length > (row.gallery_paths?.length ?? 0)) {
        update.gallery_paths = unique;
        fields_updated.push("gallery_paths");
        photos_persisted = unique.length;
      } else {
        photos_persisted = row.gallery_paths?.length ?? 0;
      }
    }
    await sleep(RATE_LIMIT_MS);

    // E5 · getRoomList (just confirm we can fetch it · room mix is a future pass)
    sources_called.push("booking_rapidapi.getRoomList");
    const rlRes = await getRoomList(bookingClient, { hotelId: row.booking_hotel_id, ...dates });
    if (!rlRes.ok) {
      errors.push({ source: "booking_rapidapi.getRoomList", code: rlRes.error.code ?? "UNKNOWN", message: rlRes.error.message ?? "" });
    }
    await sleep(RATE_LIMIT_MS);
  }

  // 3 · Google Places enrichment
  if (row.google_place_id) {
    const googleCfg = loadGoogleConfig(process.env, "live");
    const googleClient = new GooglePlacesClient(googleCfg);
    sources_called.push("google_places.placeDetails");
    const gpRes = await googleClient.fetchPlaceDetails(row.google_place_id);
    if (!gpRes.ok) {
      errors.push({ source: "google_places.placeDetails", code: gpRes.code, message: gpRes.message });
    } else {
      const phone = gpRes.data.internationalPhoneNumber ?? gpRes.data.nationalPhoneNumber ?? null;
      if (phone && row.phone === null) {
        update.phone = phone;
        fields_updated.push("phone");
        google_phone_final = phone;
      }
      const website = gpRes.data.websiteUri ?? null;
      if (website && row.website_url === null) {
        update.website_url = website;
        fields_updated.push("website_url");
      }
      // Google rating is 0-5 · canonical stores 0-10 · rescale
      const rating = typeof gpRes.data.rating === "number" ? gpRes.data.rating * 2 : null;
      const cnt = typeof gpRes.data.userRatingCount === "number" ? gpRes.data.userRatingCount : null;
      if (rating !== null && row.review_score === null) {
        update.review_score = rating;
        if (!fields_updated.includes("review_score")) fields_updated.push("review_score");
      }
      if (cnt !== null && row.review_count === null) {
        update.review_count = cnt;
        if (!fields_updated.includes("review_count")) fields_updated.push("review_count");
      }
    }
  }

  // 4 · Persist update · last_enriched_at always touched even if no fields changed
  update.last_enriched_at = new Date().toISOString();
  const updRes = await sb.from("hotel_canonical").update(update).eq("id", canonical_id);
  if (updRes.error) {
    errors.push({ source: "supabase.update", code: "DB_ERROR", message: updRes.error.message });
  }

  return {
    canonical_id,
    hotel_name: row.canonical_name ?? "—",
    ok: errors.length === 0 || fields_updated.length > 0,
    sources_called,
    fields_updated,
    errors,
    stats: {
      restaurants_count: restaurants_count_final,
      meeting_rooms_count: meeting_rooms_count_final,
      photos_persisted,
      google_phone: google_phone_final,
    },
    duration_ms: Date.now() - t0,
  };
}

/** Booking endpoints that need pricing dates · use a fixed weekday slot
 *  90 days out · same dates per session so caching can kick in. */
function bookingPilotDates(): { arrivalDate: string; departureDate: string } {
  const ms = Date.now() + 90 * 24 * 60 * 60 * 1000;
  const arr = new Date(ms);
  const dep = new Date(ms + 24 * 60 * 60 * 1000);
  const iso = (d: Date) => d.toISOString().slice(0, 10);
  return { arrivalDate: iso(arr), departureDate: iso(dep) };
}
