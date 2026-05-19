/**
 * Source tier registry (v1).
 *
 * Maps source identifiers to their intrinsic authority weights. Used by
 * the confidence calculator as the `tier_weight` term in:
 *
 *   confidence = clamp(0, 1, tier_weight × freshness × validation
 *                            + agreement_bonus)
 *
 * Tier values are institutional (architecture doc §2.1) and must remain
 * stable across publishers — switching from booking-com15 to a different
 * Booking publisher does NOT change the tier weight of `booking_rapidapi`.
 *
 * Authority is **per-field** in the architecture (§2.2). This registry
 * provides the **global default**; the calculator accepts per-field
 * overrides for cases where a source is uncharacteristically strong or
 * weak at a particular field.
 */

export type SourceKey =
  | "operator_pms"
  | "booking_rapidapi"
  | "hotel_website"
  | "google_places"
  | "tripadvisor"
  | "expedia"
  | "agoda"
  | "wikidata"
  | "osm"
  | "scraping"
  | "manual_override";

export interface SourceTierEntry {
  key: SourceKey;
  displayName: string;
  tierLabel: "S" | "A" | "B" | "C" | "D" | "E" | "F" | "Z" | "OVERRIDE";
  /** Intrinsic authority weight, [0, 1]. */
  weight: number;
  /**
   * How long this source's value remains fresh before decay begins to
   * matter. In days. Beyond this, freshness decay starts pulling the
   * effective weight down toward 0.5 at one year.
   */
  freshDays: number;
}

export const SOURCE_TIERS: Readonly<Record<SourceKey, SourceTierEntry>> = Object.freeze({
  operator_pms: {
    key: "operator_pms",
    displayName: "Operator / PMS feed",
    tierLabel: "S",
    weight: 1.0,
    freshDays: 14,
  },
  booking_rapidapi: {
    key: "booking_rapidapi",
    displayName: "Booking.com via RapidAPI",
    tierLabel: "A",
    weight: 0.85,
    freshDays: 30,
  },
  hotel_website: {
    key: "hotel_website",
    displayName: "Official hotel website",
    tierLabel: "B",
    weight: 0.8,
    freshDays: 90,
  },
  google_places: {
    key: "google_places",
    displayName: "Google Places API",
    tierLabel: "C",
    weight: 0.7,
    freshDays: 30,
  },
  tripadvisor: {
    key: "tripadvisor",
    displayName: "Tripadvisor",
    tierLabel: "D",
    weight: 0.65,
    freshDays: 30,
  },
  expedia: {
    key: "expedia",
    displayName: "Expedia",
    tierLabel: "E",
    weight: 0.6,
    freshDays: 30,
  },
  agoda: {
    key: "agoda",
    displayName: "Agoda",
    tierLabel: "E",
    weight: 0.6,
    freshDays: 30,
  },
  wikidata: {
    key: "wikidata",
    displayName: "Wikidata",
    tierLabel: "F",
    weight: 0.5,
    freshDays: 180,
  },
  osm: {
    key: "osm",
    displayName: "OpenStreetMap",
    tierLabel: "F",
    weight: 0.5,
    freshDays: 180,
  },
  scraping: {
    key: "scraping",
    displayName: "Targeted scraping (last resort)",
    tierLabel: "Z",
    weight: 0.35,
    freshDays: 60,
  },
  manual_override: {
    key: "manual_override",
    displayName: "Curator manual override",
    tierLabel: "OVERRIDE",
    weight: 1.0,
    freshDays: 365 * 5,
  },
});

export function getTier(key: SourceKey): SourceTierEntry {
  const entry = SOURCE_TIERS[key];
  if (!entry) {
    throw new Error(`[confidence] Unknown source key: ${key}`);
  }
  return entry;
}

/**
 * Per-field authority override. Returns the override weight if the
 * source is unusually strong / weak at this field, otherwise null
 * (meaning: use the global tier weight).
 *
 * Aligned with architecture doc §2.2 field-by-field authority map.
 */
export function fieldAuthorityOverride(source: SourceKey, fieldName: string): number | null {
  // Google Places is unusually strong at geo and contact data
  if (source === "google_places") {
    if (fieldName === "lat" || fieldName === "lng" || fieldName === "google_place_id") return 0.9;
    if (fieldName === "phone" || fieldName === "postal_code") return 0.85;
  }
  // Hotel website is unusually strong at year_opened and legal_name
  if (source === "hotel_website") {
    if (fieldName === "year_opened" || fieldName === "legal_name") return 0.9;
    if (fieldName === "meeting_space_sqm") return 0.85;
  }
  // Booking is unusually weak at year_opened (rarely present) but strong at booking_url
  if (source === "booking_rapidapi") {
    if (fieldName === "year_opened") return 0.5;
    if (fieldName === "booking_url" || fieldName === "booking_hotel_id") return 1.0;
  }
  // Tripadvisor is strong at amenities corroboration (used only as a +bonus though)
  if (source === "tripadvisor") {
    if (fieldName.startsWith("amenities.")) return 0.75;
  }
  return null;
}
