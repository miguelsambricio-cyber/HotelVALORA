import type { CanonicalHotelRow, MarketKpiBundle } from "@/lib/report/canonical-reader";
import type { UnderwritingRunResult } from "@/lib/report/underwriting-runner";
import { SCENARIO_BASE } from "@/lib/underwriting/defaults";
import type { UnderwritingInputs } from "@/lib/underwriting/types";
import type { UnderwritingSlice, SectionProvenance } from "../types";

/**
 * Derive `UnderwritingInputs` for a canonical hotel.
 *
 *  Strategy (per operator directive 2026-05-25 rule 1):
 *    - Asset block ← canonical (rooms · chain_scale → category · year → state)
 *    - Acquisition block ← engine cap-rate output + admin acquisition policy
 *      (Spanish notary/registry/AJD/ITP percentages are master values in
 *      `lib/admin/financials/acquisition-cost-policy.ts`)
 *    - CAPEX block ← admin CAPEX matrix (SCENARIO_BASE.inputs.capex retained
 *      as a fallback shape · per-room values come from admin CAPEX matrix
 *      via the capex slice when Phase B wires the bridge)
 *    - P&L drivers block ← rooms × ADR × occupancy × GOP-margin per period
 *      (Year 1 from canonical/marketKpi · subsequent years from operator-defined
 *      scenario growth · MVP keeps the SCENARIO_BASE growth curve)
 *    - Financing block ← admin financial structure defaults (LTV/LTC/rate)
 *    - Exit block ← engine exit cap rate (already canonical-aware)
 *    - Tax block ← Spanish defaults (CIT 25% · EBITDA limit 30% · floor 1M€)
 *
 *  MVP scope (Phase A · this file): wire the asset + acquisition blocks
 *  to canonical · keep the remaining blocks structurally identical to
 *  SCENARIO_BASE but parameterised so Phase B can refine drivers per
 *  hotel without breaking the engine contract.
 */
export function buildUnderwritingSlice(
  hotel: CanonicalHotelRow,
  marketKpi: MarketKpiBundle | null,
  engineRun: UnderwritingRunResult | null,
): UnderwritingSlice {
  const baseInputs = SCENARIO_BASE.inputs as UnderwritingInputs;
  const baseComputed = SCENARIO_BASE.computed;

  // ─── Asset block · canonical-driven ──
  const rooms = hotel.total_keys ?? hotel.total_rooms ?? engineRun?.assetBasics.rooms ?? 150;
  const totalSqmFromEngine = engineRun?.assetBasics.total_sqm;
  const sqmPerKey = totalSqmFromEngine && engineRun?.assetBasics.rooms
    ? totalSqmFromEngine / engineRun.assetBasics.rooms
    : 38;
  const total_sqm = totalSqmFromEngine ?? rooms * sqmPerKey;
  const intervention_sqm = total_sqm;

  const category: "3star" | "4star" | "5star" =
    hotel.star_rating === 5 || hotel.chain_scale === "luxury" || hotel.chain_scale === "upper_upscale"
      ? "5star"
      : hotel.star_rating === 4 || hotel.chain_scale === "upscale" || hotel.chain_scale === "upper_midscale"
      ? "4star"
      : "3star";

  const currentYear = new Date().getFullYear();
  const state: "new" | "renovated" | "needs_work" =
    hotel.year_renovated_last && currentYear - hotel.year_renovated_last <= 7
      ? "renovated"
      : hotel.year_opened && currentYear - hotel.year_opened <= 5
      ? "new"
      : "renovated";

  // ─── Acquisition block · engine-driven ──
  // Use engine valuation when available · else fall back to SCENARIO_BASE
  // pricing. Cap-rate engine output drives both asking_price + hotel_value
  // + cap_rate.
  const valuation = engineRun?.capRate
    ? rooms * (engineRun.assetBasics.rooms > 0 ? (baseInputs.acquisition.hotel_value / baseInputs.asset.rooms) : 285_000)
    : baseInputs.acquisition.hotel_value;
  // Better: derive from chain_scale tier · same as Executive Summary mapper.
  const perKeyByChainScale: Record<string, number> = {
    luxury: 800_000,
    upper_upscale: 500_000,
    upscale: 340_000,
    upper_midscale: 250_000,
    midscale: 200_000,
    economy: 155_000,
  };
  const perKey = perKeyByChainScale[hotel.chain_scale ?? ""] ?? 285_000;
  const hotelValue = Math.round(rooms * perKey);
  const askingPrice = Math.round(hotelValue * (baseInputs.acquisition.asking_price / baseInputs.acquisition.hotel_value));
  const capRatePct = engineRun?.capRate.used_pct ?? baseInputs.acquisition.cap_rate.manual_override_pct ?? 6.25;

  const inputs: UnderwritingInputs = {
    ...baseInputs,
    asset: {
      ...baseInputs.asset,
      hotel_name: hotel.canonical_name ?? baseInputs.asset.hotel_name,
      rooms,
      total_sqm,
      intervention_sqm,
      market: hotel.market_name ?? baseInputs.asset.market,
      submarket: hotel.submarket_name ?? baseInputs.asset.submarket,
      category,
      state,
    },
    acquisition: {
      ...baseInputs.acquisition,
      asking_price: askingPrice,
      hotel_value: hotelValue,
      cap_rate: {
        ...baseInputs.acquisition.cap_rate,
        manual_override_pct: Number(capRatePct.toFixed(2)),
      },
    },
    // capex/pl_drivers/financing/exit/tax · kept as SCENARIO_BASE for Phase A
    // foundation. Phase B will derive these from canonical + admin master.
  };

  // Engine-derived summary (read-only convenience for non-engine consumers)
  const summary = {
    rooms,
    total_sqm,
    asking_price_eur: askingPrice,
    cap_rate_pct: Number(capRatePct.toFixed(2)),
    // IRR/MOIC come from the underwriting engine output · using the
    // current SCENARIO_BASE.computed values until Phase B re-runs the
    // engine with the new inputs.
    project_irr_pct: baseComputed.exit?.project_irr_pct ?? null,
    equity_irr_pct: baseComputed.exit?.equity_irr_pct ?? null,
    moic: baseComputed.exit?.moic ?? null,
  };

  const fallbackUsed: string[] = [];
  if (!hotel.total_keys && !hotel.total_rooms) fallbackUsed.push("rooms_heuristic");
  if (!engineRun) fallbackUsed.push("engine_did_not_run · using base cap rate");
  if (!marketKpi) fallbackUsed.push("no_market_kpi_resolved");

  const provenance: SectionProvenance = {
    source: `canonical · chain_scale=${hotel.chain_scale ?? "unknown"} · category=${category} · state=${state}`,
    fallback_used: fallbackUsed,
    generated_at: new Date().toISOString(),
  };

  return { inputs, summary, provenance };
}
