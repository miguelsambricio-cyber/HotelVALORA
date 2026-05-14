import type { HotelProfile, HotelReferenceRecord } from "./types";

/**
 * Phase 3.e · institutional hotel profile completeness score.
 *
 * Returns a 0-100 score reflecting how much of the canonical
 * underwriting-relevant profile is populated, plus a per-field
 * breakdown so the admin UI can surface "missing fields" lists.
 *
 * Weights reflect underwriting importance:
 *   - room mix + facilities are LOAD-BEARING (large weight)
 *   - F&B, spa, meeting, pool, parking moderate
 *   - sustainability, accessibility, policies, review metrics smaller
 *   - geo_context + nearby_poi · zero today, weight zero until auto-
 *     enrichment lands
 */

/** Inputs the field-checker sees · profile is the Booking enrichment;
 *  hotel is the CoStar canonical record. Either can be null. */
interface CheckInput {
  profile: HotelProfile | null | undefined;
  hotel: HotelReferenceRecord | null | undefined;
}

interface FieldDef {
  key: string;          // human label for "missing fields" list
  weight: number;       // contribution to completeness score
  check: (ctx: CheckInput) => boolean; // true = populated
}

const FIELD_DEFS: FieldDef[] = [
  // ── CoStar institutional core (35 pts) ──
  // Always-or-mostly-populated CoStar canonical fields. Every hotel
  // with a clean CoStar record contributes here · ensures no hotel
  // reads as "empty" when it has CoStar coverage.
  { key: "Rooms count", weight: 5, check: ({ hotel: h }) => (h?.rooms_count ?? 0) > 0 },
  { key: "Chain scale", weight: 4, check: ({ hotel: h }) => !!h?.chain_scale },
  { key: "Gross building area", weight: 4, check: ({ hotel: h }) => (h?.gross_building_sqm ?? 0) > 0 },
  { key: "Operator", weight: 4, check: ({ hotel: h }) => !!h?.operator },
  { key: "Category (stars)", weight: 4, check: ({ hotel: h }) => !!h?.category },
  { key: "Segment type", weight: 3, check: ({ hotel: h }) => !!h?.segment_type },
  { key: "Brand", weight: 3, check: ({ hotel: h }) => !!h?.brand },
  { key: "Year opened", weight: 3, check: ({ hotel: h }) => (h?.year_opened ?? 0) > 0 },
  { key: "Address", weight: 3, check: ({ hotel: h }) => !!h?.address_line },
  { key: "CoStar score", weight: 2, check: ({ hotel: h }) => h?.score_costar != null },
  // ── Booking enrichment depth (100 pts) ──
  // Heavy-weight institutional fields
  { key: "Room types", weight: 15, check: ({ profile: p }) => (p?.room_types?.length ?? 0) > 0 },
  { key: "Facilities (detailed)", weight: 10, check: ({ profile: p }) => (p?.facilities_detailed?.length ?? 0) > 0 },
  { key: "Amenities", weight: 8, check: ({ profile: p }) => (p?.amenities?.length ?? 0) > 0 },
  { key: "Services", weight: 6, check: ({ profile: p }) => (p?.services?.length ?? 0) > 0 },
  { key: "Review score + count", weight: 10, check: ({ profile: p }) => p?.review_score != null && p?.review_count != null },
  // Operational categories (each "has_X" toggle + at least some detail)
  { key: "F&B (restaurants/bars)", weight: 6, check: ({ profile: p }) => p?.fnb != null && ((p.fnb.restaurants_count ?? 0) > 0 || (p.fnb.bars_count ?? 0) > 0) },
  { key: "Spa", weight: 4, check: ({ profile: p }) => p?.spa?.has_spa === true },
  { key: "Gym", weight: 4, check: ({ profile: p }) => p?.gym?.has_gym === true },
  { key: "Pool", weight: 4, check: ({ profile: p }) => p?.pool?.has_pool === true },
  // Parking · counts when Booking has it OR CoStar parking_spaces > 0
  { key: "Parking", weight: 4, check: ({ profile: p, hotel: h }) =>
    p?.parking?.has_parking === true || (h?.parking_spaces ?? 0) > 0 },
  // Meeting rooms · counts when Booking has count OR CoStar meeting_rooms_count > 0 OR meeting_space_sqm > 0
  { key: "Meeting rooms", weight: 5, check: ({ profile: p, hotel: h }) =>
    (p?.meeting_rooms != null && (p.meeting_rooms.count ?? 0) > 0) ||
    (h?.meeting_rooms_count ?? 0) > 0 ||
    (h?.meeting_space_sqm ?? 0) > 0 },
  // Compliance + commercial
  { key: "Sustainability certifications", weight: 4, check: ({ profile: p }) => (p?.sustainability?.length ?? 0) > 0 },
  { key: "Accessibility", weight: 4, check: ({ profile: p }) => (p?.accessibility?.length ?? 0) > 0 },
  // External + policies
  { key: "Booking URL", weight: 4, check: ({ profile: p }) => !!p?.booking_url },
  { key: "Check-in / Check-out times", weight: 4, check: ({ profile: p }) => !!(p?.check_in_time && p?.check_out_time) },
  { key: "Pet policy", weight: 2, check: ({ profile: p }) => !!p?.pet_policy },
  { key: "Cancellation policy", weight: 4, check: ({ profile: p }) => !!p?.cancellation_policy },
  { key: "Family features", weight: 2, check: ({ profile: p }) => (p?.family_features?.length ?? 0) > 0 },
];

// Total weight (sanity check) — must sum to 100 for the % math to work cleanly
const TOTAL_WEIGHT = FIELD_DEFS.reduce((s, f) => s + f.weight, 0);

export interface ProfileCompletenessResult {
  score: number;            // 0-100
  populated_weight: number;
  total_weight: number;
  missing_fields: string[]; // sorted by weight desc — operator addresses biggest gaps first
  populated_fields: string[];
}

/**
 * Compute the institutional profile completeness score.
 *
 * Accepts EITHER a bare `HotelProfile` (Booking-only · legacy callers
 * like server actions that only have the profile slot) OR a full
 * `HotelReferenceRecord` (preferred · lets the score use CoStar
 * canonical fields as fallback for Parking + Meeting rooms).
 */
export function computeProfileCompleteness(
  input: HotelProfile | HotelReferenceRecord | null | undefined,
): ProfileCompletenessResult {
  // Discriminate: a HotelReferenceRecord carries a stable `hotel_id`.
  const isHotel = !!input && typeof input === "object" && "hotel_id" in input;
  const hotel = isHotel ? (input as HotelReferenceRecord) : null;
  const profile = isHotel
    ? (input as HotelReferenceRecord).profile ?? null
    : (input as HotelProfile | null | undefined) ?? null;

  if (!profile && !hotel) {
    return {
      score: 0,
      populated_weight: 0,
      total_weight: TOTAL_WEIGHT,
      missing_fields: FIELD_DEFS.map((f) => f.key),
      populated_fields: [],
    };
  }
  const ctx: CheckInput = { profile, hotel };
  let populated = 0;
  const missing: Array<{ key: string; weight: number }> = [];
  const filled: string[] = [];
  for (const f of FIELD_DEFS) {
    if (f.check(ctx)) {
      populated += f.weight;
      filled.push(f.key);
    } else {
      missing.push({ key: f.key, weight: f.weight });
    }
  }
  missing.sort((a, b) => b.weight - a.weight);
  return {
    score: Math.round((populated / TOTAL_WEIGHT) * 100),
    populated_weight: populated,
    total_weight: TOTAL_WEIGHT,
    missing_fields: missing.map((m) => m.key),
    populated_fields: filled,
  };
}
