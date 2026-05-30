import type { CanonicalHotelRow, MarketKpiBundle } from "@/lib/report/canonical-reader";
import type { UnderwritingRunResult } from "@/lib/report/underwriting-runner";
import { SCENARIO_BASE } from "@/lib/underwriting/defaults";
import { runEngine } from "@/lib/underwriting/engine";
import { currentVersionTag } from "@/lib/underwriting/versioning";
import type {
  UnderwritingInputs,
  UnderwritingBundle,
  ScenarioMeta,
} from "@/lib/underwriting/types";
import { buildFinancialsSlice } from "./financials";
import { computePL } from "@/lib/report/financials/calculations";
import { deriveHasCapex } from "@/lib/report/financials/ffe-reserve";
import {
  resolveValuationMode,
  computeValuationFromNoi,
} from "@/lib/report/financials/valuation";
import { buildEnginePlDrivers } from "@/lib/report/financials/pl-drivers-bridge";
import {
  FINANCIAL_STRUCTURE_ENGINE,
  buildFinancingTranches,
} from "@/lib/admin/financials/financial-structure-config";
import {
  acquisitionPolicyForCountry,
  acquisitionPolicyToEngineCosts,
  sizeTierForRooms,
} from "@/lib/admin/financials/acquisition-cost-policy";
import { repositionCapexForAsset } from "@/lib/admin/financials/capex-reform";
import type { Tier } from "@/lib/report/financials/types";
import type { UnderwritingSlice, SectionProvenance } from "../types";

export interface UnderwritingBuildOptions {
  /** Viewer tier · drives the exit-year mode (FREE = TTM · PRO/PREMIUM = exit year). */
  tier?: Tier;
  /** Requested exit year (PRO/PREMIUM · default 7 · range 1..10). */
  exitYear?: number | null;
}

const perKeyByChainScale: Record<string, number> = {
  luxury: 800_000,
  upper_upscale: 500_000,
  upscale: 340_000,
  upper_midscale: 250_000,
  midscale: 200_000,
  economy: 155_000,
};

/** Stabilised acquisition · no reposition CAPEX (X4b · Decision B). */
const ZERO_CAPEX: UnderwritingInputs["capex"] = {
  hard_cost: { structure_pct: 0, asset_content_pct: 0, mep_per_room: 0, exterior_pct: 0 },
  soft_cost: {
    licensing_pct: 0,
    technical_consultant_pct: 0,
    development_fee_pct: 0,
    preopening_total: 0,
    ffe_per_room: 0,
    ose_per_room: 0,
    insurance_pct: 0,
  },
  contingency_pct: 0,
};

interface BuiltInputs {
  inputs: UnderwritingInputs;
  rooms: number;
  total_sqm: number;
  entryValue: number;
  entryCapPct: number;
  costarResolved: boolean;
  provenance: SectionProvenance;
}

/**
 * X4b · derive engine `UnderwritingInputs` for a canonical hotel from the
 * hotel's REAL CoStar P&L (closes F6/F7/F3-in-underwriting):
 *
 *   - P&L drivers ← `computePL` (CoStar USALI cascade + facility-aware +
 *     FF&E CAPEX ramp), mapped to the engine 11-year shape via the bridge.
 *     Engine `ebitda_after_replacement` then equals the hotel's real NOI.
 *   - Entry value ← NOI(Year 1) / entry cap, via the SAME `computeValuationFromNoi`
 *     the Executive Summary uses (mode current_ttm) → identical value, by
 *     construction, on both surfaces.
 *   - Entry + exit cap ← runForHotel (D4): both fed as engine overrides so the
 *     exit IRR uses the dynamic exit cap (the engine's own cap module runs the
 *     same asset for both sides and would otherwise collapse exit = entry).
 *   - CAPEX ← 0 (stabilised acquisition) → total_building_cost = entry value +
 *     acquisition friction (Decision B). Reposition CAPEX is a future path.
 *   - Financing / tax / depreciation ← SCENARIO_BASE (admin financial structure).
 */
async function buildUnderwritingInputs(
  hotel: CanonicalHotelRow,
  marketKpi: MarketKpiBundle | null,
  engineRun: UnderwritingRunResult | null,
  opts: UnderwritingBuildOptions,
): Promise<BuiltInputs> {
  const baseInputs = SCENARIO_BASE.inputs as UnderwritingInputs;

  // ─── Asset block ──
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

  // ─── P&L · real CoStar P&L for this hotel ──
  const fin = await buildFinancialsSlice(hotel, marketKpi);
  const hasCapex = deriveHasCapex(hotel);
  const pl = computePL(fin.assumptions, { hasCapex });
  const costarResolved = !!fin.costar_resolved;
  const plDrivers = buildEnginePlDrivers(pl, fin.assumptions, baseInputs.periods.length);

  // ─── Caps (D4) · entry + dynamic exit from runForHotel ──
  const entryCapPct = engineRun?.capRate.used_pct
    ?? baseInputs.acquisition.cap_rate.manual_override_pct
    ?? 6.25;
  const exitCapPct = engineRun?.capRateExit.used_pct ?? entryCapPct;

  // ─── Entry value · NOI(Y1)/entry cap · SAME helper as Executive Summary ──
  // (mode current_ttm = current market value). Falls back to €/key only when
  // X5 isn't satisfied (no CoStar ratios or no cap rate).
  const noiValue = computeValuationFromNoi({
    pl,
    assumptions: fin.assumptions,
    capRatePct: entryCapPct,
    costarRatiosResolved: costarResolved,
    mode: { kind: "current_ttm" },
  });
  const perKey = perKeyByChainScale[hotel.chain_scale ?? ""] ?? 285_000;
  const entryValue = noiValue ?? Math.round(rooms * perKey);

  // ─── Acquisition friction (TRAMO 2) · from the country's admin matrix ──
  // CF[0] = entry value + friction (Decision B). Country-agnostic: resolve the
  // policy by country code (only ES today). Falls back to SCENARIO_BASE costs
  // when no policy for the country (the engine is ES-gated anyway).
  const acqPolicy = acquisitionPolicyForCountry(hotel.country_code);
  const acquisitionCosts = acqPolicy
    ? acquisitionPolicyToEngineCosts(acqPolicy, category, sizeTierForRooms(rooms), {
        asking_price_eur: entryValue,
        rooms,
        total_sqm,
      })
    : baseInputs.acquisition.costs;

  // ─── Exit year · hold period from Financial Structure (admin) governs the
  //     default; a tier exitYear override supersedes (Free=TTM≈1). ──
  const requestedExit = opts.exitYear ?? FINANCIAL_STRUCTURE_ENGINE.hold_years;
  const mode = resolveValuationMode(opts.tier ?? "premium", requestedExit);
  const exitYear = mode.kind === "current_ttm" ? 1 : mode.year;

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
      asking_price: entryValue,
      hotel_value: entryValue,
      // Friction from the country's admin acquisition-cost matrix (TRAMO 2).
      costs: acquisitionCosts,
      // Entry cap from runForHotel (D4) · pin as override so the engine's
      // value/IRR use the same cap the Executive Summary used.
      cap_rate: { manual_override_pct: Number(entryCapPct.toFixed(2)), use_dynamic: false },
    },
    // CAPEX (TRAMO 4): new-build model stays zero; reposition CAPEX from the
    // admin renovation matrix is added ONLY when state="needs_work" (reposition).
    // Stabilised (new/renovated) → 0 → exact no-regression.
    capex: {
      ...ZERO_CAPEX,
      reposition_capex_total_eur: repositionCapexForAsset({
        state,
        category,
        rooms,
        total_sqm,
        asking_price_eur: entryValue,
      }),
    },
    // Real CoStar P&L (F6).
    pl_drivers: plDrivers,
    exit: {
      ...baseInputs.exit,
      year: exitYear,
      // Dynamic exit cap from runForHotel (D4) · pinned so the exit IRR uses
      // the state-projected exit yield instead of collapsing to entry.
      cap_rate: { manual_override_pct: Number(exitCapPct.toFixed(2)), use_dynamic: false },
    },
    // Financing read from the Financial Structure admin config (TRAMO 1):
    // LTV 65% · Euribor + 250 bps · interest-only bullet 5y · LTC 60%.
    // Replaces the hardcoded SCENARIO_BASE tranches (125 bps / 10y bullet).
    financing: {
      tranches: buildFinancingTranches(FINANCIAL_STRUCTURE_ENGINE),
      euribor_12m_pct: baseInputs.financing.euribor_12m_pct,
    },
    // tax / depreciation kept from SCENARIO_BASE.
  };

  const fallbackUsed: string[] = [];
  if (!hotel.total_keys && !hotel.total_rooms) fallbackUsed.push("rooms_heuristic");
  if (!engineRun) fallbackUsed.push("engine_did_not_run · base cap rate");
  if (!costarResolved) fallbackUsed.push("no_costar_usali · €/key entry value");
  if (!marketKpi) fallbackUsed.push("no_market_kpi_resolved");

  const provenance: SectionProvenance = {
    source: `canonical · chain_scale=${hotel.chain_scale ?? "unknown"} · category=${category} · state=${state} · entry=${costarResolved ? "NOI/cap" : "€/key"}`,
    fallback_used: fallbackUsed,
    generated_at: new Date().toISOString(),
  };

  return { inputs, rooms, total_sqm, entryValue, entryCapPct, costarResolved, provenance };
}

/**
 * Build the read-only underwriting slice · runs the engine so the summary
 * IRR/MOIC are the hotel's REAL figures (F7 · not the static SCENARIO_BASE).
 */
export async function buildUnderwritingSlice(
  hotel: CanonicalHotelRow,
  marketKpi: MarketKpiBundle | null,
  engineRun: UnderwritingRunResult | null,
  opts: UnderwritingBuildOptions = {},
): Promise<UnderwritingSlice> {
  const built = await buildUnderwritingInputs(hotel, marketKpi, engineRun, opts);
  const computed = runEngine(built.inputs);
  const summary = {
    rooms: built.rooms,
    total_sqm: built.total_sqm,
    asking_price_eur: built.entryValue,
    cap_rate_pct: Number(built.entryCapPct.toFixed(2)),
    project_irr_pct: computed.exit?.project_irr_pct ?? null,
    equity_irr_pct: computed.exit?.equity_irr_pct ?? null,
    moic: computed.exit?.moic ?? null,
  };
  return { inputs: built.inputs, summary, provenance: built.provenance };
}

/**
 * Build a complete UnderwritingBundle (inputs + computed + meta + version)
 * from a canonical hotel · ready for `<UnderwritingShell bundle={…} />`.
 * Used by `/report/[reportId]/financials/underwriting/page.tsx`.
 */
export async function buildUnderwritingBundleFromCanonical(
  hotel: CanonicalHotelRow,
  marketKpi: MarketKpiBundle | null,
  engineRun: UnderwritingRunResult | null,
  opts: UnderwritingBuildOptions = {},
): Promise<UnderwritingBundle> {
  const built = await buildUnderwritingInputs(hotel, marketKpi, engineRun, opts);
  const meta: ScenarioMeta = {
    ...((SCENARIO_BASE.meta as ScenarioMeta) ?? {}),
    label: `Underwriting · ${hotel.canonical_name ?? "Hotel"}`,
    description: `Canonical-driven scenario for ${hotel.canonical_name ?? "this hotel"} · ${hotel.market_name ?? "—"} / ${hotel.submarket_name ?? "—"}`,
  };
  const computed = runEngine(built.inputs);
  return {
    ...currentVersionTag(),
    meta,
    inputs: built.inputs,
    computed,
  };
}
