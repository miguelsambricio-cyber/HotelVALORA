import "server-only";
import type { HotelProfile } from "./types";

/**
 * Phase 3.f.real-booking · RapidAPI booking-com15 client.
 *
 * Server-side only · never imported by any client component. Reads
 * credentials from BOOKING_RAPIDAPI_HOST + BOOKING_RAPIDAPI_KEY env
 * vars. Returns mapped `HotelProfile` shapes (the same interface the
 * manual enrichment modal writes) so the downstream merge code stays
 * source-agnostic.
 *
 * Provenance: every record returned by this fetcher will be tagged
 *   enrichment_sources = ["rapidapi_booking"]
 *   source_priority    = { rapidapi_booking: 80 }
 * The operator's manual edits at priority 100 always win on conflict.
 */

const ENDPOINT_HOST_DEFAULT = "booking-com15.p.rapidapi.com";

function _env(): { host: string; key: string } {
  const host = process.env.BOOKING_RAPIDAPI_HOST?.trim() || ENDPOINT_HOST_DEFAULT;
  const key = process.env.BOOKING_RAPIDAPI_KEY?.trim();
  if (!key) {
    throw new Error(
      "BOOKING_RAPIDAPI_KEY not set · cannot call RapidAPI booking-com15",
    );
  }
  return { host, key };
}

interface RapidResponse<T> {
  status: boolean;
  message?: string;
  timestamp?: number;
  data: T;
}

interface DestinationHit {
  dest_id: string;
  dest_type: string;
  name: string;
  label: string;
  city_name?: string;
  country?: string;
  region?: string;
  hotels?: number;
  latitude?: number;
  longitude?: number;
}

interface HotelSearchHit {
  hotel_id: number;
  property: {
    id: number;
    name: string;
    wishlistName?: string;
    latitude?: number;
    longitude?: number;
    countryCode?: string;
    reviewScore?: number;
    reviewCount?: number;
    accuratePropertyClass?: number;
    propertyClass?: number;
    qualityClass?: number;
    mainPhotoId?: number;
    photoUrls?: string[];
  };
  accessibilityLabel?: string;
}

interface HotelDetailsRaw {
  hotel_id: number;
  url?: string;
  name?: string;
  hotel_name?: string;
  hotel_name_trans?: string;
  review_score?: number;
  review_nr?: number;
  review_score_word?: string;
  class?: number;
  address?: string;
  city?: string;
  city_trans?: string;
  country_trans?: string;
  zip?: string;
  district?: string;
  latitude?: number;
  longitude?: number;
  arrival_time?: string;
  checkin?: { from?: string; until?: string };
  checkout?: { from?: string; until?: string };
  checkin_from?: string;
  checkin_until?: string;
  checkout_from?: string;
  checkout_until?: string;
  is_no_kids_allowed?: 0 | 1;
  is_smoking_allowed?: 0 | 1;
  is_smoking_policy?: string;
  pets?: string;
  spoken_languages?: string[];
  facilities_block?: {
    facilities?: Array<{ name?: string; id?: number; icon?: string }>;
    name?: string;
  };
  property_highlight_strip?: Array<{ name?: string; icon_list?: Array<{ icon?: string }> }>;
  // Booking returns booleans / "has_*" style under various keys depending
  // on endpoint version. We probe several.
  has_swimming_pool?: 0 | 1;
  has_parking?: 0 | 1;
  has_free_parking?: 0 | 1;
  has_wifi?: 0 | 1;
  has_restaurant?: 0 | 1;
  has_breakfast?: 0 | 1;
  has_fitness_center?: 0 | 1;
  has_spa?: 0 | 1;
  has_kitchen_facilities?: 0 | 1;
  rooms_count?: number;
  number_of_rooms?: number;
}

interface FacilityCategory {
  id?: number;
  facilities?: Array<{ name?: string }>;
  type?: string;
  facilitytype_name?: string;
}

interface FacilitiesRaw {
  facilities_block?: { facilities?: FacilityCategory[] };
  hotel_facilities_filtered?: FacilityCategory[];
  facilities?: FacilityCategory[];
}

interface RoomsRaw {
  rooms?: Record<string, {
    name?: string;
    description?: string;
    max_occupancy?: string | number;
    bed_configurations?: Array<{ bed_types?: Array<{ name_with_count?: string }> }>;
    facilities?: Array<{ name?: string }>;
    photos?: Array<{ url_max?: string }>;
  }>;
  block?: Array<{
    name?: string;
    room_id?: number;
    max_occupancy?: string | number;
    room_surface_in_m2?: number;
    nr_adults?: number;
  }>;
}

async function _rapid<T>(path: string, params: Record<string, string>): Promise<T> {
  const { host, key } = _env();
  const u = new URL(`https://${host}${path}`);
  for (const [k, v] of Object.entries(params)) u.searchParams.set(k, v);
  const res = await fetch(u.toString(), {
    method: "GET",
    headers: {
      "x-rapidapi-host": host,
      "x-rapidapi-key": key,
      "Content-Type": "application/json",
    },
    // Cache-busting · enrichment is operator-triggered, not user-facing
    cache: "no-store",
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`RapidAPI ${path} → ${res.status} ${res.statusText} · ${body.slice(0, 200)}`);
  }
  const json = (await res.json()) as RapidResponse<T>;
  if (json.status === false) {
    throw new Error(`RapidAPI ${path} returned status=false · ${json.message ?? "unknown error"}`);
  }
  return json.data;
}

/** Step 1 · resolve a destination name (city / market) → dest_id. */
export async function searchDestination(query: string): Promise<DestinationHit[]> {
  const data = await _rapid<DestinationHit[]>("/api/v1/hotels/searchDestination", {
    query,
  });
  return Array.isArray(data) ? data : [];
}

/**
 * Step 2 · search hotels in a destination + filter by name.
 *
 * We pass cheap fixed dates 30 days out / 31 days out because Booking
 * requires arrival/departure even for catalogue search. Quota cost
 * is the same regardless of dates.
 */
export async function searchHotels(opts: {
  dest_id: string;
  dest_type?: string; // "city" | "district" | "country"
  query_filter?: string; // hotel name to narrow results
}): Promise<HotelSearchHit[]> {
  const today = new Date();
  const arrival = new Date(today.getTime() + 30 * 24 * 3600_000).toISOString().slice(0, 10);
  const departure = new Date(today.getTime() + 31 * 24 * 3600_000).toISOString().slice(0, 10);
  const params: Record<string, string> = {
    dest_id: opts.dest_id,
    search_type: (opts.dest_type ?? "CITY").toUpperCase(),
    arrival_date: arrival,
    departure_date: departure,
    adults: "1",
    children_age: "",
    room_qty: "1",
    page_number: "1",
    units: "metric",
    temperature_unit: "c",
    languagecode: "en-us",
    currency_code: "EUR",
  };
  const data = await _rapid<{ hotels?: HotelSearchHit[] }>(
    "/api/v1/hotels/searchHotels",
    params,
  );
  const hits = data?.hotels ?? [];
  if (!opts.query_filter) return hits;
  const q = opts.query_filter.toLowerCase();
  return hits.filter((h) => (h.property?.name ?? "").toLowerCase().includes(q));
}

/** Step 3 · pull full hotel details by Booking's hotel_id. */
export async function getHotelDetails(booking_hotel_id: number): Promise<HotelDetailsRaw> {
  const today = new Date();
  const arrival = new Date(today.getTime() + 30 * 24 * 3600_000).toISOString().slice(0, 10);
  const departure = new Date(today.getTime() + 31 * 24 * 3600_000).toISOString().slice(0, 10);
  return await _rapid<HotelDetailsRaw>("/api/v1/hotels/getHotelDetails", {
    hotel_id: String(booking_hotel_id),
    arrival_date: arrival,
    departure_date: departure,
    adults: "1",
    children_age: "",
    room_qty: "1",
    units: "metric",
    temperature_unit: "c",
    languagecode: "en-us",
    currency_code: "EUR",
  });
}

/** Step 4 (optional) · full facilities list (categorized). */
export async function getHotelFacilities(booking_hotel_id: number): Promise<FacilitiesRaw> {
  return await _rapid<FacilitiesRaw>("/api/v1/hotels/getHotelFacilities", {
    hotel_id: String(booking_hotel_id),
    languagecode: "en-us",
  }).catch(() => ({} as FacilitiesRaw));
}

/** Step 5 (optional) · room list. */
export async function getHotelRooms(booking_hotel_id: number): Promise<RoomsRaw> {
  const today = new Date();
  const arrival = new Date(today.getTime() + 30 * 24 * 3600_000).toISOString().slice(0, 10);
  const departure = new Date(today.getTime() + 31 * 24 * 3600_000).toISOString().slice(0, 10);
  return await _rapid<RoomsRaw>("/api/v1/hotels/getRoomList", {
    hotel_id: String(booking_hotel_id),
    arrival_date: arrival,
    departure_date: departure,
    adults: "1",
    children_age: "",
    room_qty: "1",
    units: "metric",
    temperature_unit: "c",
    languagecode: "en-us",
    currency_code: "EUR",
  }).catch(() => ({} as RoomsRaw));
}

/**
 * Match-confidence scoring for a Booking candidate vs the operator's
 * canonical hotel record. Returns 0..1 · the caller uses this to
 * decide whether to auto-pick or to surface a candidate list.
 *
 * Algorithm (v2 · 2026-05-14):
 *   - normalize both names (strip diacritics + filler words like
 *     "Hotel", "by", "de", "the")
 *   - prefer contiguous-ordered substring (handles "AC Hotel Avenida
 *     America" inside "AC Hotel Avenida America by Marriott")
 *   - fall back to Jaccard token overlap so noisy candidates score low
 *     (a hotel that contains all target tokens scattered among many
 *     extra tokens — like an apartment listing — scores below threshold)
 */
function _normName(s: string): string {
  return (s || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "") // strip diacritics
    .replace(/[^a-z0-9 ]/g, " ")
    .replace(/\b(hotel|hotels|resort|resorts|by|the|de|del|la|el|los|las)\b/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function matchConfidence(
  candidate: HotelSearchHit,
  canonical: { name: string; market?: string | null; country?: string | null },
): number {
  const c = _normName(candidate.property?.name ?? "");
  const t = _normName(canonical.name);
  if (!c || !t) return 0;
  if (c === t) return 1;
  if (c.includes(t)) return 0.95;
  if (t.includes(c)) return 0.9;
  const ct = new Set(c.split(/\s+/).filter(Boolean));
  const tt = new Set(t.split(/\s+/).filter(Boolean));
  if (tt.size === 0) return 0;
  const inter = [...tt].filter((x) => ct.has(x)).length;
  const union = new Set([...ct, ...tt]).size;
  return Math.max(0, Math.min(0.85, (inter / union) * 0.9));
}

// ── Mapper · Booking raw → HotelProfile ────────────────────────────────────

const FACILITY_TO_TOGGLE: Record<string, keyof FacilityProbeOutput> = {
  // Lowercased substring match · loose. Booking uses different exact
  // strings per locale · we normalise + substring-test.
  "swimming pool": "has_pool",
  "pool": "has_pool",
  "fitness": "has_gym",
  "gym": "has_gym",
  "spa": "has_spa",
  "wellness": "has_spa",
  "parking": "has_parking",
  "restaurant": "has_restaurant",
  "bar": "has_bar",
  "meeting": "has_meeting",
  "conference": "has_meeting",
  "rooftop": "has_rooftop",
};

interface FacilityProbeOutput {
  has_pool: boolean;
  has_gym: boolean;
  has_spa: boolean;
  has_parking: boolean;
  has_restaurant: boolean;
  has_bar: boolean;
  has_meeting: boolean;
  has_rooftop: boolean;
}

function _probeFacilities(names: string[]): FacilityProbeOutput {
  const out: FacilityProbeOutput = {
    has_pool: false,
    has_gym: false,
    has_spa: false,
    has_parking: false,
    has_restaurant: false,
    has_bar: false,
    has_meeting: false,
    has_rooftop: false,
  };
  for (const n of names) {
    const ln = n.toLowerCase();
    for (const [needle, key] of Object.entries(FACILITY_TO_TOGGLE)) {
      if (ln.includes(needle)) out[key] = true;
    }
  }
  return out;
}

/**
 * Pure mapper · Booking raw responses → HotelProfile.
 *
 * Tolerant by design — every Booking field is optional and shapes
 * change between API versions. We populate what we can and leave
 * the rest empty so the completeness score reflects reality.
 */
export function mapBookingToProfile(opts: {
  details: HotelDetailsRaw;
  facilities?: FacilitiesRaw;
  rooms?: RoomsRaw;
  searchHit?: HotelSearchHit;
}): { profile: HotelProfile; booking_url: string | null; latitude: number | null; longitude: number | null } {
  const d = opts.details ?? ({} as HotelDetailsRaw);
  const sh = opts.searchHit?.property;
  const facilityNames: string[] = [];

  // Booking returns facility groups in several shapes — collect from
  // every known location.
  const collectBlock = (b?: { facilities?: Array<{ name?: string }> }) => {
    for (const f of b?.facilities ?? []) {
      if (f.name) facilityNames.push(f.name);
    }
  };
  collectBlock(d.facilities_block);
  for (const cat of opts.facilities?.facilities_block?.facilities ?? []) {
    collectBlock({ facilities: cat.facilities });
  }
  for (const cat of opts.facilities?.hotel_facilities_filtered ?? []) {
    collectBlock({ facilities: cat.facilities });
  }
  for (const cat of opts.facilities?.facilities ?? []) {
    collectBlock({ facilities: cat.facilities });
  }
  // Property highlight strip (top-line "Free wifi · Restaurant · …")
  for (const hl of d.property_highlight_strip ?? []) {
    if (hl.name) facilityNames.push(hl.name);
  }

  const facilities_detailed = Array.from(new Set(facilityNames.filter(Boolean)));
  const probe = _probeFacilities(facilities_detailed);

  // Boolean field overrides if Booking surfaced them explicitly
  if (d.has_swimming_pool === 1) probe.has_pool = true;
  if (d.has_fitness_center === 1) probe.has_gym = true;
  if (d.has_spa === 1) probe.has_spa = true;
  if (d.has_parking === 1 || d.has_free_parking === 1) probe.has_parking = true;
  if (d.has_restaurant === 1) probe.has_restaurant = true;

  // Room types — prefer `block[]` shape (richer) over `rooms{}` map
  type RT = NonNullable<HotelProfile["room_types"]>[number];
  const room_types: RT[] = [];
  if (Array.isArray(opts.rooms?.block)) {
    for (const b of opts.rooms!.block!) {
      if (!b?.name) continue;
      room_types.push({
        name: b.name,
        count: undefined,
        sqm: typeof b.room_surface_in_m2 === "number" ? b.room_surface_in_m2 : undefined,
        max_occupancy:
          typeof b.max_occupancy === "number"
            ? b.max_occupancy
            : typeof b.max_occupancy === "string"
              ? parseInt(b.max_occupancy, 10) || undefined
              : b.nr_adults,
      });
    }
  } else if (opts.rooms?.rooms) {
    for (const [, r] of Object.entries(opts.rooms.rooms)) {
      if (!r?.name) continue;
      room_types.push({
        name: r.name,
        max_occupancy:
          typeof r.max_occupancy === "number"
            ? r.max_occupancy
            : typeof r.max_occupancy === "string"
              ? parseInt(r.max_occupancy, 10) || undefined
              : undefined,
      });
    }
  }

  // Check-in / check-out times — Booking has them in multiple places
  const check_in_time =
    d.checkin?.from ?? d.checkin_from ?? (d.arrival_time?.trim() || undefined);
  const check_out_time = d.checkout?.until ?? d.checkout_from ?? undefined;

  // Booking returns review fields in EITHER the search hit OR the details
  // response · seldom both. Prefer search hit when present (more reliable).
  const review_score =
    typeof sh?.reviewScore === "number"
      ? sh.reviewScore
      : typeof d.review_score === "number"
        ? d.review_score
        : undefined;
  const review_count =
    typeof sh?.reviewCount === "number"
      ? sh.reviewCount
      : typeof d.review_nr === "number"
        ? d.review_nr
        : undefined;

  const profile: HotelProfile = {
    facilities_detailed,
    amenities: facilities_detailed.length > 0 ? facilities_detailed.slice(0, 30) : undefined,
    services: undefined,
    room_types: room_types.length > 0 ? room_types : undefined,
    fnb: probe.has_restaurant || probe.has_bar
      ? {
          restaurants_count: probe.has_restaurant ? 1 : 0,
          bars_count: probe.has_bar ? 1 : 0,
          breakfast_included: d.has_breakfast === 1 || undefined,
        }
      : undefined,
    spa: probe.has_spa ? { has_spa: true } : undefined,
    gym: probe.has_gym ? { has_gym: true } : undefined,
    pool: probe.has_pool ? { has_pool: true } : undefined,
    parking: probe.has_parking ? { has_parking: true } : undefined,
    meeting_rooms: probe.has_meeting ? { count: 1 } : undefined,
    rooftop: probe.has_rooftop ? { has_rooftop: true } : undefined,
    review_score,
    review_count,
    review_source: review_score !== undefined ? "booking" : undefined,
    booking_url: d.url ?? undefined,
    check_in_time,
    check_out_time,
    pet_policy: d.pets ?? undefined,
    smoking_policy:
      d.is_smoking_allowed === 0
        ? "No smoking allowed"
        : d.is_smoking_policy ?? undefined,
  };

  return {
    profile,
    booking_url: d.url ?? null,
    latitude:
      typeof d.latitude === "number"
        ? d.latitude
        : typeof sh?.latitude === "number"
          ? sh.latitude
          : null,
    longitude:
      typeof d.longitude === "number"
        ? d.longitude
        : typeof sh?.longitude === "number"
          ? sh.longitude
          : null,
  };
}
