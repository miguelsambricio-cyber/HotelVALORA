/**
 * Hotel-type and segment derivation registry (v1).
 *
 * Owns:
 *  1. `accommodation_type_name` (Booking) → canonical `hotel_type` enum.
 *  2. Segment derivation from (star_rating, chain_scale, hotel_type).
 *
 * Both consumed by the enrichment pipeline when persisting `hotel_canonical`.
 *
 * The `HotelSegment` type re-exported here mirrors the existing
 * `hotel_segment` Postgres enum (defined in migration 0006). The migration
 * `0024_hotel_enrichment_schema.sql` reuses that enum for both
 * `segment` AND `chain_scale` columns to avoid enum proliferation.
 */

export type HotelSegment =
  | "luxury"
  | "upper_upscale"
  | "upscale"
  | "upper_midscale"
  | "midscale"
  | "economy"
  | "lifestyle"
  | "resort"
  | "boutique"
  | "mixed_use"
  | "serviced_apartments"
  | "unknown";

export type HotelType =
  | "urban"
  | "resort"
  | "airport"
  | "extended_stay"
  | "flex_living"
  | "aparthotel"
  | "boutique";

// ───────────────────────────────────────────────────────────────────────────
// Booking accommodation_type_name → hotel_type
// ───────────────────────────────────────────────────────────────────────────

interface TypeMapping {
  /** Lowercased, normalized booking string. */
  source: string;
  hotelType: HotelType;
  confidence: number;
  /** If true, do NOT ingest in Phase 1 (out of institutional scope). */
  exclude: boolean;
}

const TYPE_MAPPINGS: readonly TypeMapping[] = Object.freeze([
  { source: "hotel", hotelType: "urban", confidence: 0.7, exclude: false },
  { source: "resort", hotelType: "resort", confidence: 0.9, exclude: false },
  { source: "spa hotel", hotelType: "urban", confidence: 0.7, exclude: false },
  { source: "boutique hotel", hotelType: "boutique", confidence: 0.9, exclude: false },
  { source: "design hotel", hotelType: "boutique", confidence: 0.85, exclude: false },
  { source: "aparthotel", hotelType: "aparthotel", confidence: 0.95, exclude: false },
  { source: "apart hotel", hotelType: "aparthotel", confidence: 0.95, exclude: false },
  { source: "apart-hotel", hotelType: "aparthotel", confidence: 0.95, exclude: false },
  { source: "apartment hotel", hotelType: "aparthotel", confidence: 0.9, exclude: false },
  { source: "extended stay hotel", hotelType: "extended_stay", confidence: 0.95, exclude: false },
  { source: "serviced apartment", hotelType: "flex_living", confidence: 0.9, exclude: false },
  { source: "serviced apartments", hotelType: "flex_living", confidence: 0.9, exclude: false },
  { source: "airport hotel", hotelType: "airport", confidence: 0.95, exclude: false },
  // Excluded asset classes for Phase 1 institutional scope
  { source: "apartment", hotelType: "flex_living", confidence: 0.4, exclude: true },
  { source: "hostel", hotelType: "urban", confidence: 0.4, exclude: true },
  { source: "bed and breakfast", hotelType: "urban", confidence: 0.4, exclude: true },
  { source: "guest house", hotelType: "urban", confidence: 0.4, exclude: true },
  { source: "villa", hotelType: "flex_living", confidence: 0.4, exclude: true },
  { source: "holiday park", hotelType: "resort", confidence: 0.4, exclude: true },
  { source: "campground", hotelType: "resort", confidence: 0.4, exclude: true },
  { source: "vacation rental", hotelType: "flex_living", confidence: 0.4, exclude: true },
]);

function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

const TYPE_INDEX: Map<string, TypeMapping> = (() => {
  const m = new Map<string, TypeMapping>();
  for (const t of TYPE_MAPPINGS) {
    m.set(normalize(t.source), t);
  }
  return m;
})();

export interface HotelTypeResolution {
  hotelType: HotelType;
  confidence: number;
  exclude: boolean;
  matchedSource: string;
}

/**
 * Resolve a Booking `accommodation_type_name` (or similar source string)
 * into a canonical `hotel_type`.
 *
 * Returns `null` if no match — caller defaults to `hotel_type='urban'` at
 * confidence 0.5 and flags for review.
 */
export function resolveHotelType(raw: string | null | undefined): HotelTypeResolution | null {
  if (!raw) return null;
  const key = normalize(raw);
  if (!key) return null;
  const direct = TYPE_INDEX.get(key);
  if (direct) {
    return {
      hotelType: direct.hotelType,
      confidence: direct.confidence,
      exclude: direct.exclude,
      matchedSource: direct.source,
    };
  }
  // Substring fallback
  for (const [k, mapping] of TYPE_INDEX) {
    if (k.length >= 5 && key.includes(k)) {
      return {
        hotelType: mapping.hotelType,
        confidence: mapping.confidence * 0.9, // Slight penalty for inexact match
        exclude: mapping.exclude,
        matchedSource: mapping.source,
      };
    }
  }
  return null;
}

// ───────────────────────────────────────────────────────────────────────────
// Segment derivation
// ───────────────────────────────────────────────────────────────────────────

export interface SegmentInputs {
  starRating?: number | null;
  chainScale?: HotelSegment | null;
  hotelType?: HotelType | null;
  /** Hint when source confidently flags a lifestyle/boutique brand. */
  brandIsLifestyle?: boolean;
}

export interface SegmentResolution {
  segment: HotelSegment;
  confidence: number;
  rationale: string;
}

/**
 * Derive canonical `segment` from available signals.
 *
 * Priority order (highest first):
 *   1. `chainScale` known          → segment = chainScale (deterministic, 0.85 conf)
 *   2. `brandIsLifestyle = true`   → "lifestyle"          (0.80)
 *   3. `hotelType = resort`        → "resort"             (0.80)
 *   4. `hotelType = boutique`      → "boutique"           (0.80)
 *   5. `hotelType = aparthotel`    → "serviced_apartments"(0.80)
 *   6. `starRating` known          → star heuristic       (0.70)
 *   7. fallback                    → "unknown"            (0.50)
 */
export function deriveSegment(inputs: SegmentInputs): SegmentResolution {
  if (inputs.chainScale && inputs.chainScale !== "unknown") {
    return {
      segment: inputs.chainScale,
      confidence: 0.85,
      rationale: "chain_scale_from_brand_registry",
    };
  }
  if (inputs.brandIsLifestyle) {
    return { segment: "lifestyle", confidence: 0.8, rationale: "brand_is_lifestyle" };
  }
  if (inputs.hotelType === "resort") {
    return { segment: "resort", confidence: 0.8, rationale: "hotel_type_resort" };
  }
  if (inputs.hotelType === "boutique") {
    return { segment: "boutique", confidence: 0.8, rationale: "hotel_type_boutique" };
  }
  if (inputs.hotelType === "aparthotel" || inputs.hotelType === "flex_living") {
    return { segment: "serviced_apartments", confidence: 0.8, rationale: "hotel_type_aparthotel" };
  }
  if (typeof inputs.starRating === "number") {
    const r = inputs.starRating;
    if (r >= 5) return { segment: "upper_upscale", confidence: 0.7, rationale: "star_5" };
    if (r >= 4) return { segment: "upscale", confidence: 0.7, rationale: "star_4" };
    if (r >= 3) return { segment: "upper_midscale", confidence: 0.7, rationale: "star_3" };
    if (r >= 2) return { segment: "midscale", confidence: 0.7, rationale: "star_2" };
    if (r >= 1) return { segment: "economy", confidence: 0.7, rationale: "star_1" };
  }
  return { segment: "unknown", confidence: 0.5, rationale: "no_signal" };
}

export const HOTEL_TYPES_REGISTRY_VERSION = "1.0.0";
