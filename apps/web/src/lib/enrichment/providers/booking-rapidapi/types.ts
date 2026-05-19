/**
 * RapidAPI Booking — typed response shapes (v2 — live-validated).
 *
 * Models the actual booking-com15 publisher shape after the live smoke
 * tests on 2026-05-19 (Madrid hotel_id 12269658 independent + hotel_id
 * 90659 NH Collection branded). Every booking-com15 response is wrapped
 * in a `BookingEnvelope` and the canonical record requires **combining
 * E1 + E2** because critical fields are split across the two endpoints.
 *
 * Defensive: every field is optional. Real payloads vary by property
 * type (Hotels vs Hostels), branded vs independent, and date window.
 */

// ───────────────────────────────────────────────────────────────────────────
// Envelope (universal across endpoints)
// ───────────────────────────────────────────────────────────────────────────

export interface BookingEnvelope<T> {
  status?: boolean;
  message?: string;
  timestamp?: number;
  data?: T;
}

export type ClientMode = "live" | "dry-run" | "recorded-fixture";

export interface RapidApiError {
  message?: string;
  status?: number;
  code?: string;
}

export type RapidApiResult<T> =
  | { ok: true; data: T; meta: { source: string; fetchedAt: string; mode: ClientMode } }
  | { ok: false; error: RapidApiError; meta: { source: string; fetchedAt: string; mode: ClientMode } };

// ───────────────────────────────────────────────────────────────────────────
// E0 — locations/auto-complete (envelope.data is an array)
// ───────────────────────────────────────────────────────────────────────────

export type DestinationType = "city" | "region" | "district" | "airport" | "landmark" | "hotel" | string;

export interface BookingDestination {
  dest_id?: string | number;
  dest_type?: DestinationType;
  search_type?: DestinationType;
  name?: string;
  label?: string;
  country?: string;
  cc1?: string;
  region?: string;
  city_name?: string;
  city_ufi?: number;
  hotels?: number;
  nr_hotels?: number;
  latitude?: number;
  longitude?: number;
  image_url?: string;
  lc?: string;
  type?: string;
  roundtrip?: string;
}

export type BookingLocationsResponse = BookingEnvelope<BookingDestination[]>;

// ───────────────────────────────────────────────────────────────────────────
// E1 — hotels/search (envelope.data.hotels[].property is camelCase)
// ───────────────────────────────────────────────────────────────────────────

export interface BookingPriceBreakdown {
  grossPrice?: { value?: number; currency?: string };
  strikethroughPrice?: { value?: number; currency?: string };
  excludedPrice?: { value?: number; currency?: string };
  benefitBadges?: Array<{ identifier?: string; explanation?: string; text?: string; variant?: string }>;
  taxExceptions?: unknown[];
}

export interface BookingSearchHitProperty {
  id?: number;                      // hotel_id (canonical anchor)
  name?: string;                    // canonical display name
  countryCode?: string;             // ISO-3166-1 alpha-2
  latitude?: number;
  longitude?: number;
  // Star fields — three variants that can disagree. Tiebreaker:
  // accuratePropertyClass > propertyClass > qualityClass.
  propertyClass?: number;
  accuratePropertyClass?: number;
  qualityClass?: number;
  reviewScore?: number;             // 0–10 native
  reviewCount?: number;
  reviewScoreWord?: string;
  photoUrls?: string[];             // square500 / square1024 / square2000 — pre-rendered
  mainPhotoId?: number;
  ufi?: number;                     // city ufi
  position?: number;
  rankingPosition?: number;
  wishlistName?: string;
  blockIds?: string[];
  currency?: string;
  optOutFromGalleryChanges?: number;
  checkinDate?: string;
  checkoutDate?: string;
  checkin?: { fromTime?: string; untilTime?: string };
  checkout?: { fromTime?: string; untilTime?: string };
  priceBreakdown?: BookingPriceBreakdown;
  isFirstPage?: boolean;
}

export interface BookingSearchHit {
  hotel_id?: number;
  accessibilityLabel?: string;
  property?: BookingSearchHitProperty;
}

export interface BookingSearchData {
  hotels?: BookingSearchHit[];
  meta?: unknown;
  appear?: unknown;
}

export type BookingSearchResponse = BookingEnvelope<BookingSearchData>;

// ───────────────────────────────────────────────────────────────────────────
// E2 — hotels/details (envelope.data is rich snake_case detail)
// ───────────────────────────────────────────────────────────────────────────

export interface BookingFacilityIcon {
  name?: string;
  icon?: string;
  id?: number;
  available?: boolean | 0 | 1;
}

export interface BookingHotelDetailsData {
  // Identity (canonical hotel_id repeated)
  hotel_id?: number;
  ufi?: number;
  hotel_name?: string;
  hotel_name_trans?: string;

  // URLs
  url?: string;                     // Booking listing URL (NOT the operator website)

  // Address / geo
  address?: string;
  address_trans?: string;
  city?: string;
  city_trans?: string;
  city_name_en?: string;
  city_in_trans?: string;
  district?: string;
  districts?: number[];
  zip?: string;
  cc1?: string;
  countrycode?: string;
  country_trans?: string;
  region?: string;
  latitude?: number;
  longitude?: number;
  timezone?: string;
  distance_to_cc?: number;
  default_language?: string;
  currency_code?: string;

  // Classification
  accommodation_type_name?: string;   // "Hotels", "Hostels", "Apartments", etc.

  // Lifecycle
  is_closed?: 0 | 1 | boolean;
  is_family_friendly?: 0 | 1 | boolean;
  soldout?: 0 | 1;
  available_rooms?: number;
  max_rooms_in_reservation?: number;

  // Operations
  hotel_include_breakfast?: 0 | 1;
  is_crimea?: 0 | 1;
  is_hotel_ctrip?: 0 | 1;
  is_price_transparent?: 0 | 1;
  is_genius_deal?: 0 | 1;
  is_cash_accepted_check_enabled?: 0 | 1;
  qualifies_for_no_cc_reservation?: 0 | 1;
  opted_out_from_gallery_changes?: 0 | 1;
  rare_find_state?: string;

  // Pricing windows (not Phase 1)
  arrival_date?: string;
  departure_date?: string;
  price_transparency_mode?: string;

  // Granular facility map — primary amenity source
  facilities_block?: { facilities?: BookingFacilityIcon[] };

  // Granular per-room aggregates
  aggregated_data?: {
    has_kitchen?: 0 | 1;
    has_seating?: 0 | 1;
    has_refundable?: 0 | 1;
    has_nonrefundable?: 0 | 1;
    common_kitchen_fac?: BookingFacilityIcon[];
  };

  // Review dimensions (branded properties get richer breakdowns)
  review_nr?: number;                                  // count only — no aggregate review_score in E2
  wifi_review_score?: { rating?: number };
  breakfast_review_score?: {
    rating?: number;
    review_score?: number;
    review_count?: number;
    review_number?: number;
    review_score_word?: string;
    review_snippet?: string;
  };

  // Family / language
  family_facilities?: string[];
  languages_spoken?: { languagecode?: string[] };
  spoken_languages?: string[];

  // Bonus institutional fields
  average_room_size_for_ufi_m2?: string;
  top_ufi_benefits?: unknown[];
  property_highlight_strip?: unknown[];
  hotel_text?: Record<string, unknown>;
  hotel_important_information_with_codes?: unknown[];
  preferences?: unknown[];
  free_facilities_cancel_breakfast?: unknown;
  tax_exceptions?: unknown[];
  block?: unknown[];                  // available rooms / blocks (out of Phase 1)
  rooms?: unknown;                    // room metadata (out of Phase 1)
  room_recommendation?: unknown[];
  min_room_distribution?: unknown[];
  last_reservation?: unknown;
  composite_price_breakdown?: unknown;
  product_price_breakdown?: unknown;
  rawData?: unknown;
}

export type BookingHotelDetailsResponse = BookingEnvelope<BookingHotelDetailsData>;

// ───────────────────────────────────────────────────────────────────────────
// E3 — hotels/facilities (granular)
// ───────────────────────────────────────────────────────────────────────────

export interface BookingFacilityGroup {
  id?: number;
  name?: string;
  facilities?: BookingFacilityIcon[];
}

export interface BookingFacilitiesData {
  facility_blocks?: BookingFacilityGroup[];
  facilities?: BookingFacilityGroup[];
  hotel_id?: number;
}

export type BookingFacilitiesResponse = BookingEnvelope<BookingFacilitiesData>;

// ───────────────────────────────────────────────────────────────────────────
// Dual-source input (E1 hit + E2 detail merged for canonical building)
// ───────────────────────────────────────────────────────────────────────────

export interface BookingDualSource {
  /** E1 search hit `data.hotels[i]` — provides star / review / photos / brand-name. */
  e1Hit?: BookingSearchHit | null;
  /** E2 hotel detail `data` — provides address / facilities / district / lifecycle. */
  e2Detail?: BookingHotelDetailsData | null;
  /** Optional E3 facilities envelope for granular amenities. */
  e3Facilities?: BookingFacilitiesData | null;
}

// ───────────────────────────────────────────────────────────────────────────
// Legacy aliases (preserved so existing imports keep compiling — DO NOT USE
// in new code). New code uses BookingHotelDetailsData + BookingSearchHitProperty.
// ───────────────────────────────────────────────────────────────────────────

/** @deprecated Use `BookingHotelDetailsData` (post-envelope unwrap). */
export type RapidApiHotelData = BookingHotelDetailsData;
/** @deprecated Use `BookingHotelDetailsResponse`. */
export type RapidApiHotelDataResponse = BookingHotelDetailsResponse;
/** @deprecated Use `BookingDestination`. */
export type RapidApiLocation = BookingDestination;
/** @deprecated Use `BookingLocationsResponse`. */
export type RapidApiLocationsResponse = BookingLocationsResponse;
/** @deprecated Use `BookingSearchHit`. */
export type RapidApiSearchHit = BookingSearchHit;
/** @deprecated Use `BookingSearchResponse`. */
export type RapidApiSearchResponse = BookingSearchResponse;
/** @deprecated Use `BookingFacilitiesData`. */
export type RapidApiFacilitiesResponse = BookingFacilitiesData;
/** @deprecated Use `BookingFacilityGroup`. */
export type RapidApiFacilityGroup = BookingFacilityGroup;
