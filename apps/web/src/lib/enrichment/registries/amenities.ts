/**
 * Multilingual amenity normalization registry (v1).
 *
 * Maps raw amenity strings (ES + EN, with common variants) to the canonical
 * 14-key amenity bitmap used by:
 *  - `hotel_canonical.amenities` jsonb column (see migration 0024)
 *  - `apps/web/src/components/library/amenity-icon-cell.tsx` (icon rendering)
 *  - report surfaces (Asset Analysis, CompSet)
 *
 * The 14 canonical keys are the institutional contract — never extend
 * without:
 *   1. updating this file,
 *   2. updating the `amenity-icon-cell` icon set,
 *   3. updating the migration default.
 */

export type CanonicalAmenityKey =
  | "bar"
  | "restaurant"
  | "rooftop"
  | "spa"
  | "gym"
  | "pool"
  | "parking"
  | "meet"
  | "business_center"
  | "kids_club"
  | "beach_access"
  | "golf"
  | "casino"
  | "marina";

export const CANONICAL_AMENITY_KEYS: readonly CanonicalAmenityKey[] = Object.freeze([
  "bar",
  "restaurant",
  "rooftop",
  "spa",
  "gym",
  "pool",
  "parking",
  "meet",
  "business_center",
  "kids_club",
  "beach_access",
  "golf",
  "casino",
  "marina",
]);

/**
 * Bitmap shape for canonical row storage. Tri-state — explicit `true` / `false`
 * for known coverage, `null` for "not determined yet" (counts as gap for
 * coverage scoring).
 */
export type AmenityBitmap = Record<CanonicalAmenityKey, boolean | null>;

export function emptyAmenityBitmap(): AmenityBitmap {
  return {
    bar: null,
    restaurant: null,
    rooftop: null,
    spa: null,
    gym: null,
    pool: null,
    parking: null,
    meet: null,
    business_center: null,
    kids_club: null,
    beach_access: null,
    golf: null,
    casino: null,
    marina: null,
  };
}

interface AmenityMapping {
  key: CanonicalAmenityKey;
  /** Raw strings (lowercased, accent-stripped) that map to this key. */
  aliases: string[];
  /**
   * Floor confidence when a raw string in `aliases` is found. The pipeline
   * may upgrade this if the source tier or corroboration warrants.
   */
  baseConfidence: number;
}

const MAPPINGS: readonly AmenityMapping[] = Object.freeze([
  // ───── bar ────────────────────────────────────────────────────────────────
  {
    key: "bar",
    baseConfidence: 0.85,
    aliases: [
      "bar",
      "lobby bar",
      "cocktail bar",
      "wine bar",
      "snack bar",
      "bar de copas",
      "bar de hotel",
      "bar lounge",
      "lounge bar",
    ],
  },
  // ───── restaurant ─────────────────────────────────────────────────────────
  {
    key: "restaurant",
    baseConfidence: 0.85,
    aliases: [
      "restaurant",
      "restaurante",
      "restaurants on site",
      "in house restaurant",
      "fine dining",
      "all day dining",
      "buffet restaurant",
      "comedor",
      "restaurante propio",
      "restaurante a la carta",
    ],
  },
  // ───── rooftop ────────────────────────────────────────────────────────────
  {
    key: "rooftop",
    baseConfidence: 0.75,
    aliases: [
      "rooftop",
      "rooftop bar",
      "rooftop terrace",
      "rooftop pool",
      "sky bar",
      "skybar",
      "azotea",
      "terraza panoramica",
      "panoramic terrace",
      "roof top",
    ],
  },
  // ───── spa ────────────────────────────────────────────────────────────────
  {
    key: "spa",
    baseConfidence: 0.85,
    aliases: [
      "spa",
      "spa and wellness center",
      "wellness center",
      "wellness centre",
      "centro de bienestar",
      "centro spa",
      "thalasso",
      "thermal spa",
      "spa & wellness",
      "spa services",
      "spa facilities",
    ],
  },
  // ───── gym ────────────────────────────────────────────────────────────────
  {
    key: "gym",
    baseConfidence: 0.9,
    aliases: [
      "gym",
      "fitness centre",
      "fitness center",
      "fitness facilities",
      "fitness room",
      "gimnasio",
      "sala de fitness",
      "sala fitness",
      "centro de fitness",
      "workout area",
    ],
  },
  // ───── pool ───────────────────────────────────────────────────────────────
  {
    key: "pool",
    baseConfidence: 0.9,
    aliases: [
      "pool",
      "swimming pool",
      "indoor pool",
      "outdoor pool",
      "heated pool",
      "infinity pool",
      "rooftop pool",
      "piscina",
      "piscina cubierta",
      "piscina exterior",
      "piscina climatizada",
      "piscina infinity",
    ],
  },
  // ───── parking ────────────────────────────────────────────────────────────
  {
    key: "parking",
    baseConfidence: 0.85,
    aliases: [
      "parking",
      "private parking",
      "free parking",
      "paid parking",
      "valet parking",
      "garage",
      "underground parking",
      "aparcamiento",
      "parking privado",
      "parking gratis",
      "parking de pago",
      "garaje",
    ],
  },
  // ───── meet ───────────────────────────────────────────────────────────────
  {
    key: "meet",
    baseConfidence: 0.85,
    aliases: [
      "meeting room",
      "meeting rooms",
      "meeting facilities",
      "meeting and banquet facilities",
      "meeting banquet facilities",
      "banquet facilities",
      "conference room",
      "conference rooms",
      "conference facilities",
      "salas de reuniones",
      "sala de reuniones",
      "salas de conferencias",
      "salones",
      "salones de banquetes",
    ],
  },
  // ───── business_center ────────────────────────────────────────────────────
  {
    key: "business_center",
    baseConfidence: 0.85,
    aliases: [
      "business centre",
      "business center",
      "centro de negocios",
      "executive lounge",
      "executive floor",
    ],
  },
  // ───── kids_club ──────────────────────────────────────────────────────────
  {
    key: "kids_club",
    baseConfidence: 0.8,
    aliases: [
      "kids club",
      "kids' club",
      "miniclub",
      "mini club",
      "kids' outdoor play equipment",
      "kids outdoor play equipment",
      "children's playground",
      "kids pool",
      "club infantil",
      "actividades para ninos",
    ],
  },
  // ───── beach_access ───────────────────────────────────────────────────────
  {
    key: "beach_access",
    baseConfidence: 0.8,
    aliases: [
      "beachfront",
      "private beach",
      "private beach area",
      "beach access",
      "playa privada",
      "acceso a la playa",
      "beach service",
    ],
  },
  // ───── golf ───────────────────────────────────────────────────────────────
  {
    key: "golf",
    baseConfidence: 0.75,
    aliases: [
      "golf course",
      "golf course on site",
      "golf course (within 3 km)",
      "golf",
      "campo de golf",
      "putting green",
    ],
  },
  // ───── casino ─────────────────────────────────────────────────────────────
  {
    key: "casino",
    baseConfidence: 0.9,
    aliases: ["casino", "gaming"],
  },
  // ───── marina ─────────────────────────────────────────────────────────────
  {
    key: "marina",
    baseConfidence: 0.85,
    aliases: ["marina", "puerto deportivo", "yacht berth"],
  },
]);

// ───────────────────────────────────────────────────────────────────────────
// Lookup
// ───────────────────────────────────────────────────────────────────────────

function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

// Build reverse index: normalized alias → mapping.
const ALIAS_INDEX: Map<string, AmenityMapping> = (() => {
  const m = new Map<string, AmenityMapping>();
  for (const mapping of MAPPINGS) {
    for (const a of mapping.aliases) {
      m.set(normalize(a), mapping);
    }
  }
  return m;
})();

export interface AmenityResolution {
  key: CanonicalAmenityKey;
  baseConfidence: number;
  matchedAlias: string;
}

/**
 * Resolve a single raw amenity string to a canonical key.
 * Returns `null` if unmapped — caller logs as `unmapped_amenity` for review.
 */
export function resolveAmenity(raw: string | null | undefined): AmenityResolution | null {
  if (!raw) return null;
  const key = normalize(raw);
  if (!key) return null;
  // Exact normalized hit
  const direct = ALIAS_INDEX.get(key);
  if (direct) return { key: direct.key, baseConfidence: direct.baseConfidence, matchedAlias: key };
  // Prefix / contained match (e.g., "Hotel has rooftop pool and bar")
  for (const [alias, mapping] of ALIAS_INDEX) {
    if (alias.length >= 4 && key.includes(alias)) {
      return { key: mapping.key, baseConfidence: mapping.baseConfidence, matchedAlias: alias };
    }
  }
  return null;
}

/**
 * Resolve a list of raw amenity strings into a canonical bitmap.
 * Strings that match positively flip the canonical key to `true`.
 * Strings that fail to resolve are returned in `unmapped` so the pipeline
 * can route them to the review queue without losing information.
 *
 * Bitmap entries left at `null` mean "not determined" — they count as gaps
 * for the institutional 80% target.
 *
 * This function does NOT set `false` — explicit negatives require an
 * affirmative "not present" signal from the source, which Booking does not
 * provide directly. Fallback sources may flip keys to `false` when their
 * canonical schema enumerates negatives explicitly.
 */
export function resolveAmenityList(rawList: readonly string[]): {
  bitmap: AmenityBitmap;
  resolutions: AmenityResolution[];
  unmapped: string[];
} {
  const bitmap = emptyAmenityBitmap();
  const resolutions: AmenityResolution[] = [];
  const unmapped: string[] = [];
  for (const raw of rawList) {
    const r = resolveAmenity(raw);
    if (r) {
      bitmap[r.key] = true;
      resolutions.push(r);
    } else {
      unmapped.push(raw);
    }
  }
  return { bitmap, resolutions, unmapped };
}

/**
 * Count how many of the 14 canonical keys are explicitly determined
 * (true OR false). Drives institutional coverage scoring.
 */
export function countDeterminedKeys(bitmap: AmenityBitmap): number {
  let n = 0;
  for (const k of CANONICAL_AMENITY_KEYS) {
    if (bitmap[k] !== null) n++;
  }
  return n;
}

export const AMENITY_REGISTRY_VERSION = "1.0.0";
export const CANONICAL_AMENITY_KEY_COUNT = CANONICAL_AMENITY_KEYS.length;
