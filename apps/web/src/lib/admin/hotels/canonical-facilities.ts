import {
  Car,
  CalendarHeart,
  Coffee,
  Dumbbell,
  Home,
  Sparkles,
  UtensilsCrossed,
  Users,
  Waves,
  Wine,
  type LucideIcon,
} from "lucide-react";
import type { HotelProfile } from "./types";

/**
 * Canonical 10-facility registry · matches the Asset Analysis report
 * (`lib/report/asset-analysis-data.ts::FacilityItem`) and the library
 * Favorites List icon system (`components/library/amenity-icon-cell.tsx`).
 *
 * The institutional contract: every hotel ficha shows exactly these 10
 * facilities · green icon when present · slate icon when absent. This
 * is the only facility view that matters for the final report · raw
 * Booking facility strings are evidence, not display.
 *
 * Each canonical facility derives availability from three signal layers:
 *   1. Explicit structured field on HotelProfile (e.g. `profile.spa?.has_spa`)
 *   2. Boolean toggle baked into the schema (e.g. `profile.pool?.has_pool`)
 *   3. Substring probe over `profile.facilities_detailed[]` (Booking raw)
 *
 * Adding a new canonical facility:
 *   - extend CANONICAL_FACILITIES below
 *   - extend `FacilityItem.label` in asset-analysis-data.ts to match
 *   - update enrichment mappers if a new structured field is needed
 */

export interface CanonicalFacility {
  /** Stable key · used in URLs, analytics, and the underlying record */
  key:
    | "bar"
    | "restaurant"
    | "rooftop"
    | "meeting_rooms"
    | "events"
    | "gym"
    | "spa_wellness"
    | "pool"
    | "parking"
    | "other_rentals";
  /** Display label · matches the asset-analysis report */
  label: string;
  /** Lucide icon · same set used by /library/favorites-list */
  icon: LucideIcon;
}

export const CANONICAL_FACILITIES: CanonicalFacility[] = [
  { key: "bar", label: "Bar & Caffe", icon: Coffee },
  { key: "restaurant", label: "Restaurant", icon: UtensilsCrossed },
  { key: "rooftop", label: "Rooftop Bar", icon: Wine },
  { key: "meeting_rooms", label: "Meeting rooms", icon: Users },
  { key: "events", label: "Events", icon: CalendarHeart },
  { key: "gym", label: "Gym", icon: Dumbbell },
  { key: "spa_wellness", label: "SPA Wellness", icon: Sparkles },
  { key: "pool", label: "Pool", icon: Waves },
  { key: "parking", label: "Parking", icon: Car },
  { key: "other_rentals", label: "Other rentals", icon: Home },
];

/** Substring probes against `facilities_detailed[]` · case-insensitive. */
const PROBE: Record<CanonicalFacility["key"], readonly string[]> = {
  bar: ["bar", "coffee", "cafe", "lounge"],
  restaurant: ["restaurant", "dining"],
  rooftop: ["rooftop", "terrace", "sky bar"],
  meeting_rooms: ["meeting", "conference", "business cent", "business room", "boardroom"],
  events: ["event", "banquet", "wedding", "ballroom", "gala"],
  gym: ["gym", "fitness", "workout"],
  spa_wellness: ["spa", "wellness", "sauna", "hammam", "steam", "jacuzzi"],
  pool: ["pool", "swimming"],
  parking: ["parking", "garage", "valet"],
  other_rentals: ["apartment", "villa", "suite rental", "serviced apartment"],
};

/**
 * Resolve canonical facility availability for one hotel.
 *
 * Returns a `Record<key, boolean>` over the 10 canonical facilities.
 * Pure function · safe to call at render time.
 */
export function resolveCanonicalFacilities(
  profile: HotelProfile | null | undefined,
): Record<CanonicalFacility["key"], boolean> {
  const out: Record<CanonicalFacility["key"], boolean> = {
    bar: false,
    restaurant: false,
    rooftop: false,
    meeting_rooms: false,
    events: false,
    gym: false,
    spa_wellness: false,
    pool: false,
    parking: false,
    other_rentals: false,
  };
  if (!profile) return out;

  // Structured signals first (highest confidence)
  if (profile.fnb?.bars_count != null && profile.fnb.bars_count > 0) out.bar = true;
  if (profile.fnb?.restaurants_count != null && profile.fnb.restaurants_count > 0) {
    out.restaurant = true;
  }
  if (profile.rooftop?.has_rooftop) out.rooftop = true;
  if (profile.meeting_rooms && (profile.meeting_rooms.count ?? 0) > 0) out.meeting_rooms = true;
  if (profile.gym?.has_gym) out.gym = true;
  if (profile.spa?.has_spa) out.spa_wellness = true;
  if (profile.pool?.has_pool) out.pool = true;
  if (profile.parking?.has_parking) out.parking = true;

  // Raw-evidence probe · fills in toggles that the structured fields
  // missed (e.g. Booking listed "Conference center" so we infer meeting
  // even though `profile.meeting_rooms` is undefined).
  const raw = (profile.facilities_detailed ?? []).map((s) => s.toLowerCase());
  if (raw.length > 0) {
    for (const fac of CANONICAL_FACILITIES) {
      if (out[fac.key]) continue;
      const probes = PROBE[fac.key];
      if (probes.some((p) => raw.some((r) => r.includes(p)))) {
        out[fac.key] = true;
      }
    }
  }

  return out;
}

/**
 * Convenience · resolve + collect counts so the UI can show "6 / 10
 * facilities present" at a glance.
 */
export function summariseCanonicalFacilities(
  profile: HotelProfile | null | undefined,
): { resolved: Record<CanonicalFacility["key"], boolean>; present: number; total: number } {
  const resolved = resolveCanonicalFacilities(profile);
  const present = Object.values(resolved).filter(Boolean).length;
  return { resolved, present, total: CANONICAL_FACILITIES.length };
}
