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

/**
 * Resolve the CoStar USALI ratios for a canonical hotel. Exact lookup by
 * (country, market, submarket, class, segmentation_type); the row's own
 * `data_source` yields the provenance level. No row → no_data.
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
  if (!country || !market || !submarket || !klass) return NO_DATA;

  const sb = createAnonServerSupabaseClient() as unknown as {
    from: (t: string) => {
      select: (cols: string) => {
        eq: (c: string, v: string) => {
          eq: (c: string, v: string) => {
            eq: (c: string, v: string) => {
              eq: (c: string, v: string) => {
                eq: (c: string, v: string) => {
                  limit: (n: number) => Promise<{ data: unknown[] | null; error: unknown }>;
                };
              };
            };
          };
        };
      };
    };
  };

  const res = await sb
    .from("pnl_template")
    .select(COLS)
    .eq("country", country)
    .eq("market", market)
    .eq("submarket", submarket)
    .eq("class", klass)
    .eq("segmentation_type", seg)
    .limit(1);

  if (res.error || !res.data || res.data.length === 0) return NO_DATA;
  const row = res.data[0] as PnlTemplateRow;
  if (row.rooms_revenue_pct === null) return NO_DATA;

  const level = levelFromDataSource(row.data_source);
  if (level === "no_data") return NO_DATA;

  return {
    ratios: rowToRatios(row, ffeBaseline),
    source_level: level,
    data_source: row.data_source,
    costar_resolved: true,
    stated: { gop_pct: row.gop_pct == null ? null : n(row.gop_pct) / 100, ebitda_pct: row.ebitda_pct == null ? null : n(row.ebitda_pct) / 100 },
    matched: { submarket, class: klass, segmentation_type: seg },
  };
}

/** Human-readable label for the report's source pill. */
export function sourceLevelLabel(level: PnlSourceLevel): string {
  switch (level) {
    case "submarket": return "Dato de submercado CoStar";
    case "national": return "Fallback nacional CoStar";
    case "derived": return "Estimación por tipo de activo (modelo HotelVALORA)";
    case "no_data": return "Cobertura CoStar pendiente";
  }
}
