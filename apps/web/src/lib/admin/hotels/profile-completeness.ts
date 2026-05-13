import type { HotelProfile } from "./types";

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

interface FieldDef {
  key: string;          // human label for "missing fields" list
  weight: number;       // contribution to completeness score
  check: (p: HotelProfile) => boolean; // true = populated
}

const FIELD_DEFS: FieldDef[] = [
  // Heavy-weight institutional fields
  { key: "Room types", weight: 15, check: (p) => (p.room_types?.length ?? 0) > 0 },
  { key: "Facilities (detailed)", weight: 10, check: (p) => (p.facilities_detailed?.length ?? 0) > 0 },
  { key: "Amenities", weight: 8, check: (p) => (p.amenities?.length ?? 0) > 0 },
  { key: "Services", weight: 6, check: (p) => (p.services?.length ?? 0) > 0 },
  { key: "Review score + count", weight: 10, check: (p) => p.review_score != null && p.review_count != null },
  // Operational categories (each "has_X" toggle + at least some detail)
  { key: "F&B (restaurants/bars)", weight: 6, check: (p) => p.fnb != null && ((p.fnb.restaurants_count ?? 0) > 0 || (p.fnb.bars_count ?? 0) > 0) },
  { key: "Spa", weight: 4, check: (p) => p.spa?.has_spa === true },
  { key: "Gym", weight: 4, check: (p) => p.gym?.has_gym === true },
  { key: "Pool", weight: 4, check: (p) => p.pool?.has_pool === true },
  { key: "Parking", weight: 4, check: (p) => p.parking?.has_parking === true },
  { key: "Meeting rooms", weight: 5, check: (p) => p.meeting_rooms != null && (p.meeting_rooms.count ?? 0) > 0 },
  // Compliance + commercial
  { key: "Sustainability certifications", weight: 4, check: (p) => (p.sustainability?.length ?? 0) > 0 },
  { key: "Accessibility", weight: 4, check: (p) => (p.accessibility?.length ?? 0) > 0 },
  // External + policies
  { key: "Booking URL", weight: 4, check: (p) => !!p.booking_url },
  { key: "Check-in / Check-out times", weight: 4, check: (p) => !!(p.check_in_time && p.check_out_time) },
  { key: "Pet policy", weight: 2, check: (p) => !!p.pet_policy },
  { key: "Cancellation policy", weight: 4, check: (p) => !!p.cancellation_policy },
  { key: "Family features", weight: 2, check: (p) => (p.family_features?.length ?? 0) > 0 },
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

export function computeProfileCompleteness(
  profile: HotelProfile | null | undefined,
): ProfileCompletenessResult {
  if (!profile) {
    return {
      score: 0,
      populated_weight: 0,
      total_weight: TOTAL_WEIGHT,
      missing_fields: FIELD_DEFS.map((f) => f.key),
      populated_fields: [],
    };
  }
  let populated = 0;
  const missing: Array<{ key: string; weight: number }> = [];
  const filled: string[] = [];
  for (const f of FIELD_DEFS) {
    if (f.check(profile)) {
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
