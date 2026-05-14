import "server-only";

/**
 * Google Places API v1 client wrapper.
 *
 * Server-side only · never imported by client components. Reads
 * `GOOGLE_PLACES_API_KEY` from env. Returns typed responses for the
 * SearchText and Details endpoints.
 *
 * Primary use case (2026-05-14): geocoding 364 hotels for which CoStar
 * doesn't ship lat/lng. We resolve each via SearchText with the hotel's
 * name + address + market and pull location + addressComponents +
 * formattedAddress + place_id.
 *
 * Provenance: every result is tagged
 *   enrichment_sources = ["google_places"]
 *   source_priority    = { google_places: 70 }
 * Manual operator (100) and rapidapi_booking (80) always win on conflict.
 */

const PLACES_HOST = "https://places.googleapis.com";

function _key(): string {
  const k = process.env.GOOGLE_PLACES_API_KEY?.trim();
  if (!k) {
    throw new Error(
      "GOOGLE_PLACES_API_KEY not set · cannot call Google Places API",
    );
  }
  return k;
}

export interface PlaceAddressComponent {
  longText?: string;
  shortText?: string;
  types?: string[];
  languageCode?: string;
}

export interface Place {
  /** Resource name · "places/ChIJ..." (the part after "places/" is the place_id) */
  id?: string;
  /** Format-stable accessor for the place_id portion of `id` */
  placeId?: string;
  displayName?: { text?: string; languageCode?: string };
  formattedAddress?: string;
  location?: { latitude: number; longitude: number };
  addressComponents?: PlaceAddressComponent[];
  types?: string[];
  businessStatus?: "OPERATIONAL" | "CLOSED_TEMPORARILY" | "CLOSED_PERMANENTLY" | string;
  rating?: number;
  userRatingCount?: number;
  websiteUri?: string;
  internationalPhoneNumber?: string;
}

interface SearchTextResponse {
  places?: Place[];
}

/**
 * Default field mask · the columns we read across all batches. Keep
 * this list tight: Google charges per SKU tier, and asking for
 * `places.photos` jumps a hotel into the Atmosphere SKU.
 */
const DEFAULT_FIELD_MASK = [
  "places.id",
  "places.displayName",
  "places.formattedAddress",
  "places.location",
  "places.addressComponents",
  "places.types",
  "places.businessStatus",
  "places.rating",
  "places.userRatingCount",
  "places.websiteUri",
].join(",");

/**
 * SearchText endpoint · best for "we have a name and a rough location,
 * find the place". Returns top matches ordered by relevance.
 */
export async function searchText(opts: {
  textQuery: string;
  /** ISO-3166-1 alpha-2 region bias (e.g. "ES" for Spain). Sharpens
   *  the search but does NOT exclude other regions. */
  regionCode?: string;
  /** Maximum result count · 1–20. Default 5. */
  maxResultCount?: number;
  /** Override the default field mask (advanced). */
  fieldMask?: string;
}): Promise<Place[]> {
  const key = _key();
  const body: Record<string, unknown> = {
    textQuery: opts.textQuery,
    maxResultCount: opts.maxResultCount ?? 5,
  };
  if (opts.regionCode) body.regionCode = opts.regionCode;

  const res = await fetch(`${PLACES_HOST}/v1/places:searchText`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": key,
      "X-Goog-FieldMask": opts.fieldMask ?? DEFAULT_FIELD_MASK,
    },
    body: JSON.stringify(body),
    cache: "no-store",
  });
  if (!res.ok) {
    const errBody = await res.text().catch(() => "");
    throw new Error(`searchText ${res.status} ${res.statusText} · ${errBody.slice(0, 200)}`);
  }
  const json = (await res.json()) as SearchTextResponse;
  const places = json.places ?? [];
  // Normalise `id` → `placeId` for downstream convenience (`id` is
  // technically "places/ChIJ..."; the API also lets you use it
  // directly for /v1/places/{id} so we keep both).
  return places.map((p) => ({
    ...p,
    placeId: p.id?.startsWith("places/") ? p.id.slice("places/".length) : p.id,
  }));
}

/**
 * Place Details endpoint · use when you already know the place_id.
 * Cheaper than SearchText because it doesn't include the search SKU.
 */
export async function getPlaceDetails(
  place_id: string,
  fieldMask: string = "id,displayName,formattedAddress,location,addressComponents,types,businessStatus,rating,userRatingCount,websiteUri",
): Promise<Place | null> {
  const key = _key();
  // The path accepts either "places/{id}" or just "{id}" depending on
  // SDK version; the REST v1 wants the bare id with `places/` prefix.
  const path = place_id.startsWith("places/") ? place_id : `places/${place_id}`;
  const res = await fetch(`${PLACES_HOST}/v1/${path}`, {
    method: "GET",
    headers: {
      "X-Goog-Api-Key": key,
      "X-Goog-FieldMask": fieldMask,
    },
    cache: "no-store",
  });
  if (res.status === 404) return null;
  if (!res.ok) {
    const errBody = await res.text().catch(() => "");
    throw new Error(`getPlaceDetails ${res.status} ${res.statusText} · ${errBody.slice(0, 200)}`);
  }
  const p = (await res.json()) as Place;
  return {
    ...p,
    placeId: p.id?.startsWith("places/") ? p.id.slice("places/".length) : p.id,
  };
}

/**
 * Pull a structured address from a place's `addressComponents[]`.
 * Returns whatever fields we can pin down · everything is nullable.
 */
export function extractStructuredAddress(place: Place | null | undefined): {
  street_number?: string;
  street?: string;
  postal_code?: string;
  city?: string;
  province?: string;
  country_code?: string; // ISO-3166-1 alpha-2
  neighborhood?: string;
} {
  const out: ReturnType<typeof extractStructuredAddress> = {};
  if (!place?.addressComponents) return out;
  for (const c of place.addressComponents) {
    const types = c.types ?? [];
    const v = c.shortText ?? c.longText;
    if (!v) continue;
    if (types.includes("street_number")) out.street_number = v;
    if (types.includes("route")) out.street = v;
    if (types.includes("postal_code")) out.postal_code = v;
    if (types.includes("locality") || types.includes("postal_town")) out.city = v;
    if (types.includes("administrative_area_level_2")) out.province = v;
    if (types.includes("country")) out.country_code = c.shortText ?? v;
    if (types.includes("neighborhood") || types.includes("sublocality")) {
      out.neighborhood = c.longText ?? v;
    }
  }
  return out;
}

/**
 * Match scoring · how confident are we that `place` is the same
 * institutional asset as the canonical hotel record? Returns 0..1.
 *
 * Strategy: normalise names · check substring containment · then
 * token-set Jaccard. Mirrors the matchConfidence used by booking-fetcher
 * but operates on Google's `displayName.text` instead of Booking's
 * `property.name`.
 */
export function placeMatchConfidence(
  place: Place,
  canonical: { name: string; country?: string | null },
): number {
  const norm = (s: string) =>
    s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "")
      .replace(/[^a-z0-9 ]/g, " ")
      .replace(/\b(hotel|hotels|by|the|de|del|la|el|los|las)\b/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  const c = norm(place.displayName?.text ?? "");
  const t = norm(canonical.name);
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
