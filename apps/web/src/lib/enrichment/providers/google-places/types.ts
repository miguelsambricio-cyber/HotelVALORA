/**
 * Google Places — typed response shapes (v1).
 *
 * Models the Place Details API (v1 / new HTTP API). Field set narrowed
 * to what the canonical pipeline consumes — we do NOT fetch full place
 * profiles to keep cost down ($0.017 per Place Details call).
 *
 * Endpoints used:
 *   POST /v1/places:searchText   — fuzzy lookup by hotel name + city
 *   GET  /v1/places/{place_id}   — full detail
 */

export interface GooglePlace {
  id?: string;                 // place_id
  displayName?: { text?: string; languageCode?: string };
  formattedAddress?: string;
  shortFormattedAddress?: string;
  location?: { latitude?: number; longitude?: number };
  addressComponents?: Array<{
    longText?: string;
    shortText?: string;
    types?: string[];          // ["postal_code"], ["administrative_area_level_1"], etc.
  }>;
  internationalPhoneNumber?: string;
  nationalPhoneNumber?: string;
  websiteUri?: string;
  googleMapsUri?: string;
  rating?: number;             // 1.0–5.0 — we rescale to 0–10 at map step
  userRatingCount?: number;
  types?: string[];            // ["hotel", "lodging", ...]
  businessStatus?: "OPERATIONAL" | "CLOSED_TEMPORARILY" | "CLOSED_PERMANENTLY" | string;
}

export interface GooglePlacesSearchResponse {
  places?: GooglePlace[];
}

export type GooglePlacesDetailResponse = GooglePlace;
