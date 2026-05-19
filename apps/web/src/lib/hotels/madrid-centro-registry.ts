/**
 * Madrid Centro hotel registry · curated v1
 *
 * Foundation data layer for the end-to-end institutional flow. Each
 * entry is a deployable identity that the bundle resolver can hydrate
 * into a full UnderwritingBundle by overlaying the canonical
 * SCENARIO_BASE shape. Zero touch on the underwriting baseline ·
 * registry lives alongside it as a parallel selection surface.
 *
 * Assumptions (documented · 2026-05-19):
 *   · Three curated 4★-5★ hotels in Madrid Centro / Salamanca /
 *     Chamberí — chosen to cover institutional-grade upscale through
 *     luxury so the report flow exercises the cap-rate scenarios
 *     (~6,45% Centro 4★ · ~5,80% Salamanca 5★ · ~6,15% Chamberí 5★).
 *   · Identifiers are slugs · stable URL-safe handles.
 *   · Operational data (keys, sqm, intervention area) is realistic
 *     institutional baseline · not transactional / not branded.
 *   · ADR / GOP / costs default to SCENARIO_BASE values unless an
 *     entry below overrides them — the resolver lays per-hotel deltas
 *     over the canonical inputs at engine-run time.
 *   · No real hotel name is used · all entries are anonymised
 *     "Reference" identities consistent with the seeded-comps disclosure.
 *
 * Replace this file with a Supabase query against the Intelligence
 * Layer (`hotel_inventory`) when Block 7 ships · the API stays the
 * same (`getMadridCentroHotels()` returns the same shape).
 */

import type { StarCategory, AssetState } from "../underwriting/types";

/** Stable URL-safe slug · used as the canonical hotelId in routes / search params. */
export type HotelId =
  | "centro-reference-4s-240"
  | "salamanca-reference-5s-180"
  | "chamberi-boutique-5s-98";

/** Public-facing curated profile for a hotel · drives selection UIs. */
export interface HotelProfile {
  /** Stable URL-safe identifier. */
  id: HotelId;
  /** Anonymised display name · "(Reference)" suffix conveys institutional disclosure. */
  display_name: string;
  /** ISO city / submarket label · matches the underwriting `inputs.asset.submarket`. */
  submarket: string;
  /** Star category · feeds into cap-rate engine adjustments. */
  category: StarCategory;
  /** Property state · feeds into cap-rate engine renovation factor. */
  state: AssetState;
  /** Room count · operational scale anchor. */
  rooms: number;
  /** Total GBA m² · drives CAPEX-per-m² overlay. */
  total_sqm: number;
  /** Intervention area m² (active CAPEX scope). */
  intervention_sqm: number;
  /** One-line institutional pitch · IC-memo-grade copy. */
  positioning: string;
  /** Order in the chooser UI · ascending. */
  display_order: number;
}

/**
 * Per-hotel input deltas that the resolver overlays on SCENARIO_BASE.
 *
 * Only fields needed to differentiate a hotel from the base scenario
 * are listed. Anything not overridden inherits the canonical baseline
 * so the engine math stays deterministic and version-stable across
 * hotels.
 */
export interface HotelInputDelta {
  asset: {
    hotel_name: string;
    rooms: number;
    total_sqm: number;
    intervention_sqm: number;
    market: string;
    submarket: string;
    category: StarCategory;
    state: AssetState;
  };
  acquisition?: {
    asking_price?: number;
    hotel_value?: number;
  };
  /**
   * Optional GOP scale factor · multiplies the SCENARIO_BASE gop /
   * costs series by `scale_gop_factor` so a smaller / larger hotel
   * lands on a coherent absolute-EUR baseline without re-stating
   * every period.
   */
  scale_gop_factor?: number;
}

export interface HotelRegistryEntry {
  profile: HotelProfile;
  delta: HotelInputDelta;
}

/** Canonical Madrid Centro registry · 3 hotels v1. */
export const MADRID_CENTRO_REGISTRY: HotelRegistryEntry[] = [
  {
    profile: {
      id: "centro-reference-4s-240",
      display_name: "Centro Reference (4★ · 240 keys)",
      submarket: "Madrid Centro",
      category: "4star",
      state: "renovated",
      rooms: 240,
      total_sqm: 15_450,
      intervention_sqm: 11_588,
      positioning:
        "Institutional-grade 4★ asset in the Gran Vía / Sol corridor · post-renovation positioning · stabilised RevPAR ladder.",
      display_order: 1,
    },
    delta: {
      asset: {
        hotel_name: "Centro Reference (4★)",
        rooms: 240,
        total_sqm: 15_450,
        intervention_sqm: 11_588,
        market: "Madrid",
        submarket: "Madrid Centro",
        category: "4star",
        state: "renovated",
      },
      // SCENARIO_BASE is already shaped against this profile · no delta needed.
    },
  },
  {
    profile: {
      id: "salamanca-reference-5s-180",
      display_name: "Salamanca Reference (5★ · 180 keys)",
      submarket: "Salamanca",
      category: "5star",
      state: "renovated",
      rooms: 180,
      total_sqm: 14_200,
      intervention_sqm: 10_650,
      positioning:
        "Luxury 5★ positioning in Salamanca · post-renovation · institutional pricing power · tighter cap rate band.",
      display_order: 2,
    },
    delta: {
      asset: {
        hotel_name: "Salamanca Reference (5★)",
        rooms: 180,
        total_sqm: 14_200,
        intervention_sqm: 10_650,
        market: "Madrid",
        submarket: "Salamanca",
        category: "5star",
        state: "renovated",
      },
      acquisition: {
        // Salamanca 5★ commands premium pricing · scaled vs Centro base.
        asking_price: 95_000_000,
        hotel_value: 96_250_000,
      },
      // 180 keys vs 240 base · scale absolute-EUR GOP / costs proportionally.
      scale_gop_factor: 180 / 240,
    },
  },
  {
    profile: {
      id: "chamberi-boutique-5s-98",
      display_name: "Chamberí Boutique (5★ · 98 keys)",
      submarket: "Chamberí",
      category: "5star",
      state: "renovated",
      rooms: 98,
      total_sqm: 7_800,
      intervention_sqm: 5_850,
      positioning:
        "Boutique 5★ format in Chamberí · high-ADR · low-key-count · institutional yield play with operational density.",
      display_order: 3,
    },
    delta: {
      asset: {
        hotel_name: "Chamberí Boutique (5★)",
        rooms: 98,
        total_sqm: 7_800,
        intervention_sqm: 5_850,
        market: "Madrid",
        submarket: "Chamberí",
        category: "5star",
        state: "renovated",
      },
      acquisition: {
        asking_price: 58_000_000,
        hotel_value: 58_700_000,
      },
      scale_gop_factor: 98 / 240,
    },
  },
];

/** Public · returns the ordered list of curated Madrid Centro hotels. */
export function getMadridCentroHotels(): HotelProfile[] {
  return MADRID_CENTRO_REGISTRY.map((e) => e.profile).sort(
    (a, b) => a.display_order - b.display_order,
  );
}

/** Public · looks up the registry entry (profile + delta) by id. */
export function getHotelRegistryEntry(id: HotelId): HotelRegistryEntry | null {
  return MADRID_CENTRO_REGISTRY.find((e) => e.profile.id === id) ?? null;
}

/** Public · default hotel id for the institutional showcase landing. */
export const DEFAULT_MADRID_CENTRO_HOTEL_ID: HotelId = "centro-reference-4s-240";
