import "server-only";
import type { CanonicalHotelRow } from "@/lib/report/canonical-reader";
import {
  runDynamicCapRate,
  DEFAULT_RATES_REGIME,
  SEEDED_HOTEL_COMPS,
  type DynamicCapRateResult,
} from "@/lib/underwriting/cap-rate-engine";
import type { AssetBasics, StarCategory, AssetState } from "@/lib/underwriting/types";
import { deriveHasCapex } from "@/lib/report/financials/ffe-reserve";
import type { ScoreContext } from "@/lib/admin/financials/score-cap-adjustment";

/**
 * Cap-rate engine `runForHotel(canonical_id)` adapter.
 *
 * Bridges Supabase `hotel_canonical` rows into the cap-rate engine's
 * `AssetBasics` shape and runs the 5-layer engine. Comparables come
 * from the engine's `SEEDED_HOTEL_COMPS` for now · Block 7+ swaps for
 * a live Supabase query against `hotel_transactions`.
 *
 * Field mapping:
 *   canonical.chain_scale + star_rating  → AssetBasics.category (StarCategory)
 *   canonical.total_keys ?? total_rooms  → AssetBasics.rooms
 *   canonical.meeting_space_sqm + keys*38→ AssetBasics.total_sqm
 *   canonical.year_renovated_last        → AssetBasics.state (heuristic)
 *   canonical.market_name                → AssetBasics.market
 *   canonical.submarket_name             → AssetBasics.submarket
 *
 * Fallback strategy when canonical fields are NULL:
 *   - rooms: chain_scale-driven heuristic (luxury 150 · upper_upscale 220 ·
 *     upscale 180 · midscale 110)
 *   - total_sqm: rooms × per-key m² (luxury 50 · upper_upscale 42 ·
 *     upscale 35 · midscale 28)
 *   - state: "renovated" when year_renovated_last within last 7 years ·
 *     "new" when year_opened within last 5 years · else "renovated" default
 *
 * Returns null when canonical lacks enough signal to run (no market or
 * no category derivable).
 */

function toStarCategory(starRating: number | null, chainScale: string | null): StarCategory | null {
  if (starRating === 5 || chainScale === "luxury" || chainScale === "upper_upscale") return "5star";
  if (starRating === 4 || chainScale === "upscale" || chainScale === "upper_midscale") return "4star";
  if (starRating === 3 || chainScale === "midscale" || chainScale === "economy") return "3star";
  // Default for unclassified luxury / lifestyle / boutique
  if (chainScale === "lifestyle" || chainScale === "boutique") return "5star";
  return null;
}

function defaultRoomsByScale(scale: string | null): number {
  switch (scale) {
    case "luxury":
      return 150;
    case "upper_upscale":
      return 220;
    case "upscale":
      return 180;
    case "upper_midscale":
      return 140;
    case "midscale":
      return 110;
    case "economy":
      return 90;
    default:
      return 150;
  }
}

function sqmPerKey(scale: string | null): number {
  switch (scale) {
    case "luxury":
      return 50;
    case "upper_upscale":
      return 42;
    case "upscale":
      return 35;
    case "midscale":
      return 28;
    default:
      return 35;
  }
}

function deriveAssetState(hotel: CanonicalHotelRow): AssetState {
  const currentYear = new Date().getFullYear();
  const renovated = hotel.year_renovated_last;
  const opened = hotel.year_opened;
  if (renovated && currentYear - renovated <= 7) return "renovated";
  if (opened && currentYear - opened <= 5) return "new";
  if (renovated || opened) return "renovated";
  return "renovated";
}

function buildAssetBasics(hotel: CanonicalHotelRow): AssetBasics | null {
  const category = toStarCategory(hotel.star_rating, hotel.chain_scale);
  const market = hotel.market_name ?? hotel.city_normalized;
  const submarket = hotel.submarket_name ?? hotel.neighborhood;
  if (!category || !market || !submarket) return null;

  const rooms = hotel.total_keys ?? hotel.total_rooms ?? defaultRoomsByScale(hotel.chain_scale);
  const perKey = sqmPerKey(hotel.chain_scale);
  const total_sqm = rooms * perKey;
  // Intervention sqm · for the cap-rate engine size adjustment, treat as
  // total when the hotel is fully renovated · proportional when not.
  const intervention_sqm = total_sqm;

  return {
    asset_id: hotel.id,
    hotel_name: hotel.canonical_name ?? undefined,
    rooms,
    total_sqm,
    intervention_sqm,
    market,
    submarket,
    category,
    state: deriveAssetState(hotel),
    // Country selects the per-market segment priors (3b · engine is ES-gated today).
    country: hotel.country_code ?? undefined,
    // Segment (chain_scale · 6 levels) drives the cap-rate base prior (3b).
    segment: hotel.chain_scale ?? undefined,
  };
}

export interface UnderwritingRunResult {
  capRate: DynamicCapRateResult;
  /**
   * D4 · exit cap rate, re-derived from the asset's PROJECTED state at exit
   * (NOT a fixed spread). hasCapex asset → exits "renovated" (≈ entry);
   * no-CAPEX asset → ages to "needs_work" → wider exit cap.
   */
  capRateExit: DynamicCapRateResult;
  assetBasics: AssetBasics;
  /** Whether any of the asset fields were filled from heuristic defaults. */
  used_heuristics: boolean;
  /** List of canonical fields that fell to heuristic defaults · audit. */
  heuristic_fields: string[];
}

/**
 * Country guard · the dynamic cap-rate engine policy
 * (`lib/admin/financials/dynamic-cap-rate-policy.ts`) is anchored on
 * `base_market_yield_pct: 6.50` — operator-set Madrid 2024 institutional
 * cap-rate band centre. Running the engine for a non-ES hotel would
 * produce a Paris/Tokyo cap-rate that is mathematically a Madrid number
 * with ±pp adjustments, NOT a real reading of the local market. Honest
 * absence beats fabricated valuation: the engine is gated until the
 * policy supports per-country baselines.
 *
 * Tech debt: see docs/changelog.md country-guard entry. Future
 * `market_baseline (country_code, year, base_yield_pct, …)` table
 * will lift this gate.
 */
const ENGINE_SUPPORTED_COUNTRIES: ReadonlySet<string> = new Set(["ES"]);

/**
 * Run the cap-rate engine for a canonical hotel. Returns null when:
 *   - The canonical row lacks enough signal (no category or no market), OR
 *   - The hotel is outside the engine's country coverage (non-ES today).
 */
export function runForHotel(
  hotel: CanonicalHotelRow,
  scoreContext?: ScoreContext,
): UnderwritingRunResult | null {
  const countryCode = (hotel.country_code ?? "").toUpperCase();
  if (!ENGINE_SUPPORTED_COUNTRIES.has(countryCode)) return null;

  const asset = buildAssetBasics(hotel);
  if (!asset) return null;

  const heuristic_fields: string[] = [];
  if (hotel.total_keys === null && hotel.total_rooms === null) heuristic_fields.push("rooms");
  // total_sqm is always derived (no canonical field) · marked as heuristic
  heuristic_fields.push("total_sqm");
  if (!hotel.year_opened && !hotel.year_renovated_last) heuristic_fields.push("state");

  const result = runDynamicCapRate({
    asset,
    scenario_id: "base",
    override: { enabled: false },
    rates_regime: DEFAULT_RATES_REGIME,
    comparables: SEEDED_HOTEL_COMPS,
    side: "entry",
    score_context: scoreContext,
  });

  // D4 · exit cap from the asset's projected state at exit (shares the
  // CAPEX signal with the FF&E ramp · deriveHasCapex). No fixed spread.
  const hasCapex = deriveHasCapex(hotel);
  const assetAtExit: AssetBasics = { ...asset, state: hasCapex ? "renovated" : "needs_work" };
  const resultExit = runDynamicCapRate({
    asset: assetAtExit,
    scenario_id: "base",
    override: { enabled: false },
    rates_regime: DEFAULT_RATES_REGIME,
    comparables: SEEDED_HOTEL_COMPS,
    side: "exit",
    score_context: scoreContext,
  });

  return {
    capRate: result,
    capRateExit: resultExit,
    assetBasics: asset,
    used_heuristics: heuristic_fields.length > 0,
    heuristic_fields,
  };
}
