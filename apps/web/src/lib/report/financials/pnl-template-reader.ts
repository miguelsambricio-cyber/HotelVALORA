import "server-only";
import { createAnonServerSupabaseClient } from "@/lib/supabase/anon-server";
import type { CanonicalHotelRow } from "@/lib/report/canonical-reader";
import type { PLAssumptions } from "./types";

/**
 * X4 · reader for the CoStar USALI percentages stored in `pnl_template`.
 *
 * CRITICAL UNIT NOTE: `pnl_template` stores PERCENTAGES (e.g. 67.50), the
 * P&L engine expects FRACTIONS (0.675). This reader divides by 100. A
 * guard test asserts the resulting EBITDA stays in [0,1] so a ×100 error
 * never ships silently.
 *
 * Coverage (verified on live BD 2026-05-29): only ES Madrid has rows.
 * Each (submarket, class, segmentation_type) row carries its own
 * `data_source` which tells the provenance level — Madrid Centre is
 * `costar_submarket_aggregate`, the other 5 Madrid submarkets carry
 * `costar_national`, apartahotel/hostel are `derived_mvp_rule`. Submarkets
 * with no row (Barajas/Hortaleza, Madrid Province Regional) and non-ES
 * countries resolve to `no_data`.
 *
 * The `ffe_reserve_pct` column of the table is the obsolete Stitch
 * constant and is DELIBERATELY NOT read — FF&E is an operator_assumption
 * derived from the CAPEX ramp (`ffe-reserve.ts`), never from CoStar.
 */

export type PnlSourceLevel = "submarket" | "national" | "derived" | "no_data";

export interface ResolvedPnlRatios {
  /** Ratios in FRACTIONS (already ÷100), ready for `computePL`. */
  ratios: PLAssumptions["ratios"] | null;
  source_level: PnlSourceLevel;
  data_source: string | null;
  /** True when real CoStar/derived data resolved (NOT a hard default fallback). Drives X5. */
  costar_resolved: boolean;
  /** CoStar-stated GOP/EBITDA (fractions) for the reconciliation cross-check. */
  stated: { gop_pct: number | null; ebitda_pct: number | null } | null;
  matched: { submarket: string | null; class: string | null; segmentation_type: string } | null;
}

const NO_DATA: ResolvedPnlRatios = {
  ratios: null,
  source_level: "no_data",
  data_source: null,
  costar_resolved: false,
  stated: null,
  matched: null,
};

function classLabel(chainScale: string | null): string | null {
  switch (chainScale) {
    case "luxury": return "Luxury";
    case "upper_upscale": return "Upper Upscale";
    case "upscale": return "Upscale";
    case "upper_midscale": return "Upper Midscale";
    case "midscale": return "Midscale";
    case "economy": return "Economy";
    default: return null;
  }
}

/** Canonical segmentation_type → `pnl_template` enum (silent map · D2/D3). */
export function toTemplateSegmentation(seg: string | null): "hotel" | "apartahotel" | "hostel" {
  switch (seg) {
    case "apartmenthotel": return "apartahotel";
    case "hostel": return "hostel";
    case "hotelproject": return "hotel"; // project uses the hotel template until it has its own data
    case "hotel":
    default: return "hotel";
  }
}

function levelFromDataSource(ds: string | null): PnlSourceLevel {
  switch (ds) {
    case "costar_submarket_aggregate": return "submarket";
    case "costar_national": return "national";
    case "derived_mvp_rule": return "derived";
    default: return "no_data";
  }
}

const n = (v: unknown): number => {
  const x = Number(v);
  return Number.isFinite(x) ? x : 0;
};

interface PnlTemplateRow {
  rooms_revenue_pct: number | null;
  fb_food_pct: number | null;
  fb_beverage_pct: number | null;
  meeting_events_pct: number | null;
  spa_wellness_pct: number | null;
  parking_other_pct: number | null;
  expenses_rooms_pct: number | null;
  expenses_fb_pct: number | null;
  other_departments_pct: number | null;
  admin_general_pct: number | null;
  sales_marketing_pct: number | null;
  operations_maintenance_pct: number | null;
  utilities_pct: number | null;
  management_fees_pct: number | null;
  property_taxes_pct: number | null;
  insurance_pct: number | null;
  gop_pct: number | null;
  ebitda_pct: number | null;
  data_source: string | null;
}

const COLS =
  "rooms_revenue_pct,fb_food_pct,fb_beverage_pct,meeting_events_pct,spa_wellness_pct,parking_other_pct," +
  "expenses_rooms_pct,expenses_fb_pct,other_departments_pct,admin_general_pct,sales_marketing_pct," +
  "operations_maintenance_pct,utilities_pct,management_fees_pct,property_taxes_pct,insurance_pct," +
  "gop_pct,ebitda_pct,data_source";

/** Map a raw `pnl_template` row (percentages) → engine ratios (fractions). */
function rowToRatios(r: PnlTemplateRow, ffeBaseline: number): PLAssumptions["ratios"] {
  return {
    revFB: (n(r.fb_food_pct) + n(r.fb_beverage_pct)) / 100,
    revMeeting: n(r.meeting_events_pct) / 100,
    revSpa: n(r.spa_wellness_pct) / 100,
    revParkingOther: n(r.parking_other_pct) / 100,
    expRooms: n(r.expenses_rooms_pct) / 100,
    expFB: n(r.expenses_fb_pct) / 100,
    expOtherDept: n(r.other_departments_pct) / 100,
    expAdmin: n(r.admin_general_pct) / 100,
    expSalesMarketing: n(r.sales_marketing_pct) / 100,
    expPropertyMaint: n(r.operations_maintenance_pct) / 100,
    expUtilities: n(r.utilities_pct) / 100,
    expMgmtFee: n(r.management_fees_pct) / 100,
    expPropertyTax: n(r.property_taxes_pct) / 100,
    expInsurance: n(r.insurance_pct) / 100,
    // FF&E is operator_assumption (NOT CoStar) · computePL uses the CAPEX ramp.
    expFfeReserve: ffeBaseline,
  };
}

// Recursive PostgREST-ish query type · chainable `.eq`, thenable `.limit`.
type PnlQuery = {
  select: (cols: string) => PnlQuery;
  eq: (c: string, v: string) => PnlQuery;
  limit: (n: number) => Promise<{ data: unknown[] | null; error: unknown }>;
};

function toResolved(
  row: PnlTemplateRow,
  level: PnlSourceLevel,
  ffeBaseline: number,
  matched: { submarket: string | null; class: string | null; segmentation_type: string },
): ResolvedPnlRatios {
  return {
    ratios: rowToRatios(row, ffeBaseline),
    source_level: level,
    data_source: row.data_source,
    costar_resolved: true,
    stated: {
      gop_pct: row.gop_pct == null ? null : n(row.gop_pct) / 100,
      ebitda_pct: row.ebitda_pct == null ? null : n(row.ebitda_pct) / 100,
    },
    matched,
  };
}

/**
 * Level-2 fallback · the country's submarket-INVARIANT USALI for a
 * segmentation_type. National %s don't depend on the submarket, so any row of
 * the right `data_source` for the country IS the national template:
 *   · hotel              → costar_national  (CoStar national USALI)
 *   · apartahotel/hostel → derived_mvp_rule (national MVP profile per type)
 * Prefers a class match · falls back to any class (national %s are
 * class-invariant in the current dataset). Market-agnostic: no country named.
 */
async function queryCountryUsali(
  sb: { from: (t: string) => PnlQuery },
  country: string,
  klass: string | null,
  seg: string,
): Promise<PnlTemplateRow | null> {
  const source = seg === "hotel" ? "costar_national" : "derived_mvp_rule";
  // National %s are class-invariant, so an unknown class (chain_scale='unknown',
  // ~half the corpus today) still resolves the national template.
  for (const withClass of [true, false]) {
    let q: PnlQuery = sb
      .from("pnl_template")
      .select(COLS)
      .eq("country", country)
      .eq("data_source", source)
      .eq("segmentation_type", seg);
    if (withClass && klass) q = q.eq("class", klass);
    const r = await q.limit(1);
    if (!r.error && r.data && r.data.length > 0) {
      const row = r.data[0] as PnlTemplateRow;
      if (row.rooms_revenue_pct !== null) return row;
    }
  }
  return null;
}

/**
 * Resolve the USALI ratios for a canonical hotel via a 3-level coverage
 * cascade (market-agnostic · resolves País→Mercado→Submercado from the data,
 * never names a market — see VALUATION_METHODOLOGY.md):
 *
 *   1. SUBMARKET own USALI → exact (country, market, submarket, class, seg)
 *      row tagged `costar_submarket_aggregate` → "dato de submercado".
 *   2. NATIONAL applied     → no own submarket USALI, but the country has a
 *      national template → apply it over the submarket's real ADR/occ/RevPAR
 *      (the market-data layer supplies those · the caller) → "USALI nacional
 *      aplicado" (approximate report).
 *   3. no_data              → no national USALI for the country either.
 *
 * Change vs. the original X4 reader (2026-05-30): the original returned
 * no_data when no exact submarket row existed. Now a missing submarket row
 * with a national template available resolves to level 2, not no_data —
 * only the true absence of a national template falls to level 3. Existing
 * per-submarket `costar_national` rows still resolve via step 1 (same level)
 * and are now OPTIONAL: step 2 derives the same national template (e.g. for
 * Barajas/Hortaleza, which has market data but no pnl_template row).
 */
export async function resolvePnlTemplate(
  hotel: CanonicalHotelRow,
  ffeBaseline = 0.04,
): Promise<ResolvedPnlRatios> {
  const country = hotel.country_code;
  const market = hotel.market_name;
  const submarket = hotel.submarket_name;
  const klass = classLabel(hotel.chain_scale);
  const seg = toTemplateSegmentation(hotel.segmentation_type ?? "hotel");
  // Class is NOT required: it's needed only for the submarket-specific level 1.
  // Level 2 (national) is class-invariant, so unknown-class hotels still resolve.
  if (!country || !market || !submarket) return NO_DATA;

  const sb = createAnonServerSupabaseClient() as unknown as { from: (t: string) => PnlQuery };
  const matched = { submarket, class: klass, segmentation_type: seg };

  // ── Level 1 (+ any existing per-submarket national row) · exact submarket ──
  // Requires a known class (the submarket row is keyed by class). Unknown
  // class skips straight to the national fallback.
  if (klass) {
    const exact = await sb
      .from("pnl_template")
      .select(COLS)
      .eq("country", country)
      .eq("market", market)
      .eq("submarket", submarket)
      .eq("class", klass)
      .eq("segmentation_type", seg)
      .limit(1);
    if (!exact.error && exact.data && exact.data.length > 0) {
      const row = exact.data[0] as PnlTemplateRow;
      if (row.rooms_revenue_pct !== null) {
        const level = levelFromDataSource(row.data_source);
        if (level !== "no_data") return toResolved(row, level, ffeBaseline, matched);
      }
    }
  }

  // ── Level 2 · national USALI fallback (no own submarket row) ──
  const nat = await queryCountryUsali(sb, country, klass, seg);
  if (nat) return toResolved(nat, levelFromDataSource(nat.data_source), ffeBaseline, matched);

  // ── Level 3 · no national USALI for this country → no_data ──
  return NO_DATA;
}

/** Human-readable label for the report's source pill. */
export function sourceLevelLabel(level: PnlSourceLevel): string {
  switch (level) {
    case "submarket": return "Dato de submercado CoStar";
    case "national": return "USALI nacional aplicado";
    case "derived": return "Estimación por tipo de activo (modelo HotelVALORA)";
    case "no_data": return "Cobertura CoStar pendiente";
  }
}
