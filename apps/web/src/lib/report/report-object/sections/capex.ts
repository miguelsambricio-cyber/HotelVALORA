import type { CanonicalHotelRow } from "@/lib/report/canonical-reader";
import {
  CAPEX_DEFAULTS,
  ROOM_TIERS,
  type RoomTierId,
  type StarCategoryId,
} from "@/lib/admin/financials/defaults";
import type { CapexSlice, SectionProvenance } from "../types";

/** Resolve the hotel's CAPEX cell coordinates: room tier × star category.
 *
 *  Room tier · admin uses 0-80 (small) · 80-180 (medium) · 180+ (large).
 *  Falls back to "medium" when canonical lacks `total_rooms` (engine
 *  heuristic might still be available · this resolver intentionally
 *  ignores it · CAPEX should come from real data when possible).
 *
 *  Star category · admin uses 3star/4star/5star. We map:
 *    star_rating ∈ {5} OR chain_scale ∈ {luxury,upper_upscale} → 5star
 *    star_rating ∈ {4} OR chain_scale ∈ {upscale,upper_midscale}→ 4star
 *    else (3star and below)                                     → 3star
 */
export function resolveCapexCoords(hotel: CanonicalHotelRow): {
  room_tier: RoomTierId;
  star_category: StarCategoryId;
  rooms_used: number;
  rooms_from_canonical: boolean;
} {
  const canonicalRooms = hotel.total_keys ?? hotel.total_rooms;
  const rooms = canonicalRooms ?? 150;   // baseline · used only when canonical is null
  const rooms_from_canonical = canonicalRooms !== null;

  const matchedTier =
    ROOM_TIERS.find((t) => rooms >= t.range[0] && rooms < t.range[1])?.id ??
    ("medium" as RoomTierId);

  let star_category: StarCategoryId;
  if (hotel.star_rating === 5 || hotel.chain_scale === "luxury" || hotel.chain_scale === "upper_upscale") {
    star_category = "5star";
  } else if (hotel.star_rating === 4 || hotel.chain_scale === "upscale" || hotel.chain_scale === "upper_midscale") {
    star_category = "4star";
  } else {
    star_category = "3star";
  }

  return { room_tier: matchedTier, star_category, rooms_used: rooms, rooms_from_canonical };
}

/**
 * Build the CAPEX snapshot for a canonical hotel.
 *
 *  Source of truth: `apps/web/src/lib/admin/financials/defaults.ts`
 *  CAPEX_DEFAULTS matrix. Per operator directive (2026-05-25 rule 1)
 *  the admin financials defaults are the master · canonical hotel only
 *  provides AUXILIARY inputs (rooms · chain_scale · star_rating).
 *
 *  Returned slice is read-only · the section UI may overlay edit
 *  affordances for the Premium tier.
 */
export function buildCapexSlice(hotel: CanonicalHotelRow): CapexSlice {
  const coords = resolveCapexCoords(hotel);
  const rooms = coords.rooms_used;

  const lines = CAPEX_DEFAULTS.map((line) => {
    const per_room_eur = line.defaults[coords.room_tier][coords.star_category];
    return {
      id: line.id,
      group: line.group,
      label: line.label,
      description: line.description,
      per_room_eur,
      total_eur: per_room_eur * rooms,
    };
  });

  const totals = lines.reduce(
    (acc, l) => {
      acc[`${l.group}_eur` as "hard_eur" | "soft_eur" | "project_eur"] += l.total_eur;
      acc.total_eur += l.total_eur;
      return acc;
    },
    { hard_eur: 0, soft_eur: 0, project_eur: 0, total_eur: 0 },
  );

  const fallbackUsed: string[] = [];
  if (!coords.rooms_from_canonical) fallbackUsed.push("rooms_heuristic_default_150");

  const provenance: SectionProvenance = {
    source: `admin defaults · ${coords.room_tier} × ${coords.star_category}`,
    fallback_used: fallbackUsed,
    generated_at: new Date().toISOString(),
  };

  return {
    lines,
    totals: { ...totals, per_room_eur: rooms > 0 ? Math.round(totals.total_eur / rooms) : 0 },
    room_tier: coords.room_tier,
    star_category: coords.star_category,
    provenance,
  };
}
