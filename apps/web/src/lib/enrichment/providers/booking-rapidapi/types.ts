/**
 * RapidAPI Booking — typed response shapes (v1).
 *
 * Models the common-denominator shape exposed by the booking-com15
 * publisher family. Every field is optional — Booking responses are
 * notoriously inconsistent in field presence. The parser layer
 * (see ./parse.ts) is responsible for defensive handling.
 *
 * Adjust at integration time (Phase B) once the subscribed publisher's
 * spec is locked.
 */

// ───────────────────────────────────────────────────────────────────────────
// E0 — locations/auto-complete
// ───────────────────────────────────────────────────────────────────────────

export interface RapidApiLocation {
  dest_id?: string | number;
  dest_type?: "city" | "region" | "country" | "district" | "airport" | string;
  name?: string;
  label?: string;
  country?: string;
  cc1?: string;
  region?: string;
  latitude?: number;
  longitude?: number;
  nr_hotels?: number;
}

export interface RapidApiLocationsResponse {
  results?: RapidApiLocation[];
  status?: "success" | "error" | string;
  message?: string;
}

// ───────────────────────────────────────────────────────────────────────────
// E1 — hotels/search (paginated)
// ───────────────────────────────────────────────────────────────────────────

export interface RapidApiSearchHit {
  hotel_id?: number | string;
  hotel_name?: string;
  hotel_name_trans?: string;
  class?: number;
  review_score?: number;
  review_nr?: number;
  latitude?: number;
  longitude?: number;
  city?: string;
  city_name_en?: string;
  district?: string;
  url?: string;
  main_photo_url?: string;
  accommodation_type?: number | string;
  accommodation_type_name?: string;
  chain_id?: number | string;
  chain_name?: string;
  is_closed?: boolean | 0 | 1;
}

export interface RapidApiSearchResponse {
  results?: RapidApiSearchHit[];
  result_count?: number;
  pagination?: {
    page_size?: number;
    offset?: number;
    next_page_offset?: number | null;
    total_results?: number;
  };
  status?: string;
}

// ───────────────────────────────────────────────────────────────────────────
// Envelope (booking-com15 wraps every response in this shape)
// ───────────────────────────────────────────────────────────────────────────

export interface BookingEnvelope<T> {
  status?: boolean | string;
  message?: string;
  timestamp?: number;
  data?: T;
}

// ───────────────────────────────────────────────────────────────────────────
// E2 rawData (camelCase nested block — embedded E1.property snapshot)
//
// Discovered 2026-05-19: E2 returns these critical fields nested under
// `data.rawData` rather than at the top level. Star rating, review score,
// photos, and other E1-hit fields ONLY live here.
// ───────────────────────────────────────────────────────────────────────────

export interface RapidApiE2RawData {
  // Star equivalents (1–5, 0 if unrated)
  propertyClass?: number;
  accuratePropertyClass?: number;  // verified — preferred when non-zero
  qualityClass?: number;            // Booking's internal estimate

  // Reviews
  reviewScore?: number;             // 0–10 native
  reviewCount?: number;
  reviewScoreWord?: string;

  // Photos
  mainPhotoId?: number;
  photoUrls?: string[];             // 3 sizes typically: square60 / square500 / square1024

  // Identity / location duplication
  id?: number | string;
  name?: string;
  latitude?: number;
  longitude?: number;
  countryCode?: string;
  position?: number;
  rankingPosition?: number;
  ufi?: number | string;
}

// ───────────────────────────────────────────────────────────────────────────
// E2 — hotels/data (single hotel detail)
// ───────────────────────────────────────────────────────────────────────────

export interface RapidApiHotelData {
  hotel_id?: number | string;

  // Identity
  hotel_name?: string;              // booking-com15 actual key
  name?: string;                    // legacy / synthetic-fixture compat
  hotel_name_trans?: string;
  name_trans?: Record<string, string>;
  legal_name?: string;

  // Embedded rawData (booking-com15 — star/review/photos live here)
  rawData?: RapidApiE2RawData;

  // Location
  address?: string;
  address_trans?: string;
  address_extra?: string;
  city?: string;
  city_trans?: string;
  city_name_en?: string;
  city_in_trans?: string;
  district?: string;
  districts?: unknown[];
  zip?: string;
  cc1?: string;
  countrycode?: string;             // booking-com15 also exposes this
  country?: string;
  country_trans?: string;
  region?: string;
  latitude?: number;
  longitude?: number;
  timezone?: string;
  ufi?: number | string;            // city_id alias

  // Extra review dimensions (booking-com15)
  breakfast_review_score?: { rating?: number | string; score_word?: string };
  wifi_review_score?: { rating?: number | string; score_word?: string };
  aggregated_data?: {
    has_kitchen?: number;
    has_seating?: number;
    has_nonrefundable?: number;
    has_refundable?: number;
    common_kitchen_fac?: Array<{ name?: string; id?: number }>;
  };
  family_facilities?: string[];
  is_family_friendly?: 0 | 1 | boolean;

  // Classification
  class?: number;            // star rating
  property_class?: number;   // some publishers use this
  accommodation_type_id?: number;
  accommodation_type_name?: string;
  accommodation_type?: string | number;

  // Capacity (often absent)
  room_count?: number;
  nr_rooms?: number;

  // Brand / operator
  chain_id?: number | string;
  chain_name?: string;
  brand?: string;

  // Reviews
  review_score?: number;
  review_nr?: number;
  review_score_word?: string;

  // Contact
  url?: string;             // Booking listing URL
  website?: string;
  phone?: string;
  email?: string;

  // Media
  main_photo_url?: string;
  hotel_photo?: string;

  // Facilities (E2 sometimes returns a summary subset; E3 returns granular)
  facilities?: string[];
  facilities_block?: {
    facilities?: Array<{
      name?: string;
      icon?: string;
      id?: number;
    }>;
  };
  hotel_facilities_filtered?: string[];
  hotel_facilities?: string[];

  // Lifecycle
  is_closed?: boolean | 0 | 1;

  // Misc
  description?: string;
  short_description?: string;
  spoken_languages?: string[];
}

export type RapidApiHotelDataResponse = RapidApiHotelData;

// ───────────────────────────────────────────────────────────────────────────
// E3 — hotels/facilities (granular)
// ───────────────────────────────────────────────────────────────────────────

export interface RapidApiFacilityGroup {
  id?: number;
  name?: string;
  facilities?: Array<{
    id?: number;
    name?: string;
    available?: boolean | 0 | 1;
  }>;
}

export interface RapidApiFacilitiesResponse {
  facility_blocks?: RapidApiFacilityGroup[];
  facilities?: RapidApiFacilityGroup[];
  hotel_id?: number | string;
}

// ───────────────────────────────────────────────────────────────────────────
// Common
// ───────────────────────────────────────────────────────────────────────────

export interface RapidApiError {
  message?: string;
  status?: number;
  code?: string;
}

/**
 * Discriminated union returned by every endpoint wrapper.
 * The dry-run mode produces these shapes from fixtures; live mode
 * produces them from real HTTP calls.
 */
export type RapidApiResult<T> =
  | { ok: true; data: T; meta: { source: string; fetchedAt: string; mode: ClientMode } }
  | { ok: false; error: RapidApiError; meta: { source: string; fetchedAt: string; mode: ClientMode } };

export type ClientMode = "live" | "dry-run" | "recorded-fixture";
