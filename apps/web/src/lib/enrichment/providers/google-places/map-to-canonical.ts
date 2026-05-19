/**
 * Google Places → canonical field fragments (v1).
 *
 * Extracts the canonical fields Google is authoritative for and
 * returns them as a `Partial<CanonicalHotelDraft>` plus per-field
 * provenance entries. The orchestrator (or the writer) merges these
 * into the canonical row via the confidence-aware conflict resolver.
 */

import type { GooglePlace } from "./types";

export interface GooglePlacesFragment {
  /** Subset of canonical columns Google can populate. */
  fields: {
    lat: number | null;
    lng: number | null;
    address_line1: string | null;
    postal_code: string | null;
    neighborhood: string | null;
    phone: string | null;
    website_url: string | null;
    google_place_id: string | null;
    review_score: number | null;
    review_count: number | null;
  };
  provenance: Array<{
    field: string;
    value: unknown;
    confidence: number;
    rationale: string;
  }>;
  warnings: string[];
}

function findComponent(
  components: GooglePlace["addressComponents"],
  type: string,
): string | null {
  if (!components) return null;
  for (const c of components) {
    if (c.types?.includes(type)) return c.longText ?? c.shortText ?? null;
  }
  return null;
}

const TIER_C_BASE = 0.7;          // Google Places base tier
const TIER_C_GEO_BOOST = 0.9;     // Per-field override: Google is excellent at geo
const TIER_C_CONTACT_BOOST = 0.85; // Per-field override: Google solid at contact data
const SELF_AUTHORITATIVE = 1.0;

export function mapGooglePlaceToFragment(place: GooglePlace): GooglePlacesFragment {
  const warnings: string[] = [];
  const provenance: GooglePlacesFragment["provenance"] = [];

  const lat = place.location?.latitude ?? null;
  const lng = place.location?.longitude ?? null;
  if (lat !== null && (lat < -90 || lat > 90)) {
    warnings.push(`google_lat_out_of_range:${lat}`);
  }
  if (lng !== null && (lng < -180 || lng > 180)) {
    warnings.push(`google_lng_out_of_range:${lng}`);
  }

  const postal = findComponent(place.addressComponents, "postal_code");
  const route = findComponent(place.addressComponents, "route");
  const streetNumber = findComponent(place.addressComponents, "street_number");
  const neighborhood =
    findComponent(place.addressComponents, "sublocality_level_1") ??
    findComponent(place.addressComponents, "sublocality") ??
    findComponent(place.addressComponents, "neighborhood");

  const addressLine1 = place.shortFormattedAddress
    ?? (route && streetNumber ? `${route}, ${streetNumber}` : null);

  const phone = place.internationalPhoneNumber ?? place.nationalPhoneNumber ?? null;
  const website = place.websiteUri ?? null;
  const placeId = place.id ?? null;

  // Rescale Google's 0–5 rating to canonical 0–10
  const reviewScore = place.rating != null ? Math.round(place.rating * 2 * 100) / 100 : null;
  const reviewCount = place.userRatingCount ?? null;

  function push(field: string, value: unknown, confidence: number, rationale: string): void {
    if (value === null || value === undefined) return;
    provenance.push({ field, value, confidence, rationale });
  }

  push("lat", lat, TIER_C_GEO_BOOST, "google_places_location.latitude");
  push("lng", lng, TIER_C_GEO_BOOST, "google_places_location.longitude");
  push("address_line1", addressLine1, TIER_C_BASE, "google_places_address_components");
  push("postal_code", postal, TIER_C_CONTACT_BOOST, "google_places_postal_code_component");
  push("neighborhood", neighborhood, TIER_C_BASE, "google_places_sublocality_component");
  push("phone", phone, TIER_C_CONTACT_BOOST, "google_places_phone");
  push("website_url", website, TIER_C_BASE, "google_places_websiteUri");
  push("google_place_id", placeId, SELF_AUTHORITATIVE, "self_authoritative");
  push("review_score", reviewScore, TIER_C_BASE * 0.9, "google_places_rating_rescaled_0_to_10");
  push("review_count", reviewCount, TIER_C_BASE, "google_places_userRatingCount");

  return {
    fields: {
      lat,
      lng,
      address_line1: addressLine1,
      postal_code: postal,
      neighborhood,
      phone,
      website_url: website,
      google_place_id: placeId,
      review_score: reviewScore,
      review_count: reviewCount,
    },
    provenance,
    warnings,
  };
}
