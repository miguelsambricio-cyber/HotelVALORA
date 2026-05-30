/**
 * Reposition CAPEX bridge · admin matrix → engine IRR (X4b · TRAMO 4).
 *
 * The engine's `inputs.capex` is a NEW-BUILD development-cost model (% of
 * asking + €/room). The admin matrix (`CAPEX_DEFAULTS`) is a RENOVATION cost
 * stack in €/room (per line · per tier×category · operator can switch a line
 * to €/m²). They are different models — so we do NOT decompose the matrix into
 * the new-build fields. Instead, for a REPOSITION deal we sum the matrix to a
 * total reform € and inject it as `capex.reposition_capex_total_eur`, which the
 * investment module adds to `total_building_cost` → CF[0] of the IRR.
 *
 * Trigger (Mike): asset.state === "needs_work" → reposition (reads the matrix);
 * new / renovated → stabilised → 0 (no-regression · IRR identical to today).
 * One asset-state concept governs BOTH the cap rate (renovation axis) and CAPEX.
 *
 * Unit per line (Mike): per_key × rooms · per_m2 × m² · total as-is · percent
 * (rarely used by defaults) × asking. The new-build model stays untouched.
 *
 * The engine reads the matrix DEFAULTS (per_key · CAPEX_DEFAULTS) until the
 * admin CAPEX card's localStorage overrides are persisted server-side (same
 * pattern as the other panels). The bridge ACCEPTS a CapexMatrixState so it is
 * correct the moment that persistence lands.
 */

import { CAPEX_DEFAULTS, ROOM_TIERS, type RoomTierId, type StarCategoryId } from "./defaults";

export type CapexUnit = "total" | "per_key" | "per_m2" | "percent";

export interface CapexMatrixState {
  /** lineId → unit. */
  units: Record<string, CapexUnit>;
  /** "lineId::tier::cat" → value (in the line's unit). */
  values: Record<string, number>;
}

const cellKey = (lineId: string, tier: RoomTierId, cat: StarCategoryId): string => `${lineId}::${tier}::${cat}`;

/** Rooms → CAPEX room tier (small 0-79 · medium 80-179 · large 180+ · ROOM_TIERS). */
export function roomTierForRooms(rooms: number): RoomTierId {
  return rooms >= 180 ? "large" : rooms >= 80 ? "medium" : "small";
}

/** The default matrix state (all per_key · CAPEX_DEFAULTS values) — engine source until panel persistence. */
export function defaultCapexMatrixState(): CapexMatrixState {
  const units: Record<string, CapexUnit> = {};
  const values: Record<string, number> = {};
  for (const line of CAPEX_DEFAULTS) {
    units[line.id] = "per_key";
    for (const tier of ROOM_TIERS) {
      for (const cat of ["3star", "4star", "5star"] as StarCategoryId[]) {
        values[cellKey(line.id, tier.id, cat)] = line.defaults[tier.id][cat];
      }
    }
  }
  return { units, values };
}

/**
 * Total reform CAPEX (€) for a (tier, category) asset, summing every matrix
 * line in its own unit. per_key × rooms · per_m2 × m² · total as-is ·
 * percent × asking_price.
 */
export function capexReformTotalEur(args: {
  tier: RoomTierId;
  category: StarCategoryId;
  rooms: number;
  total_sqm: number;
  asking_price_eur?: number;
  state?: CapexMatrixState;
}): number {
  const st = args.state ?? defaultCapexMatrixState();
  let total = 0;
  for (const line of CAPEX_DEFAULTS) {
    const v = st.values[cellKey(line.id, args.tier, args.category)] ?? line.defaults[args.tier][args.category];
    const unit = st.units[line.id] ?? "per_key";
    switch (unit) {
      case "per_key": total += v * args.rooms; break;
      case "per_m2": total += v * args.total_sqm; break;
      case "total": total += v; break;
      case "percent": total += (args.asking_price_eur ?? 0) * (v / 100); break;
    }
  }
  return Math.round(total);
}

/**
 * Reposition CAPEX for an asset. Stabilised (new / renovated) → 0 (exact
 * no-regression). needs_work → the matrix total. The single result feeds
 * `inputs.capex.reposition_capex_total_eur`.
 */
export function repositionCapexForAsset(args: {
  state: "new" | "renovated" | "needs_work";
  category: StarCategoryId;
  rooms: number;
  total_sqm: number;
  asking_price_eur?: number;
  matrix?: CapexMatrixState;
}): number {
  if (args.state !== "needs_work") return 0;
  return capexReformTotalEur({
    tier: roomTierForRooms(args.rooms),
    category: args.category,
    rooms: args.rooms,
    total_sqm: args.total_sqm,
    asking_price_eur: args.asking_price_eur,
    state: args.matrix,
  });
}
