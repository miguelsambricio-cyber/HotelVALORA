// Coverage flags · informational signals that surface to the user when
// the underlying CoStar template is not the exact match for the asset.
//
// Lookup table is generated from services/costar/MASTER/COSTAR_MASTER_FINANCIALS.xlsx
// via services/costar/scripts/build_financials_master.py. The JSON snapshot
// is imported at build time · zero cost at runtime per request.
//
// Today (2026-05-28) only ONE row is flagged costar_real:
// (country=ES, market=Madrid, submarket=Madrid Centre, class=Upper Upscale,
// segmentation_type=hotel). All other Spain (submarket × class × seg_type)
// combinations carry hardcoded_default · 41 international countries carry
// pending_costar.
//
// See `VALUATION_METHODOLOGY.md` annex "Alcance actual de cobertura
// CoStar" (2026-05-28) for the methodology decision.

import type { CanonicalHotelRow } from "@/lib/report/canonical-reader";
import financialsMaster from "./costar-financials-master.generated.json";

type DataSource = "costar_real" | "hardcoded_default" | "pending_costar";

interface FinancialsMasterRow {
  country: string;
  market: string | null;
  submarket: string | null;
  class: string | null;
  segmentation_type: string | null;
  data_source: DataSource;
}

interface FinancialsMasterFile {
  generated_at: string;
  generator_version: string;
  row_count: number;
  rows: FinancialsMasterRow[];
}

const MASTER = financialsMaster as FinancialsMasterFile;

/**
 * BD stores chain_scale as a snake_case enum ("upper_upscale"). The CoStar
 * master uses the Title-Case label ("Upper Upscale"). Keep the mapping
 * narrow and explicit · returns null for unknown values so the matcher
 * falls back to "provisional".
 */
function chainScaleToClassLabel(scale: string | null): string | null {
  switch (scale) {
    case "luxury": return "Luxury";
    case "upper_upscale": return "Upper Upscale";
    case "upscale": return "Upscale";
    case "upper_midscale": return "Upper Midscale";
    case "midscale": return "Midscale";
    case "economy": return "Economy";
    default: return null;
  }
}

/**
 * Returns true when the P&L for this hotel is computed with a template
 * that does NOT carry a real CoStar segmented row. The banner
 * "plantilla provisional · cobertura CoStar pendiente" renders only when
 * this returns true.
 *
 * Resolution logic:
 *   1. Build the lookup key from the hotel's (country, market, submarket,
 *      class_label, segmentation_type). `segmentation_type` defaults to
 *      "hotel" until the canonical schema carries the column.
 *   2. Look up the matching row in the financials master.
 *   3. Return false (NOT provisional) only when the row exists AND
 *      data_source === "costar_real".
 *
 * Conservative behaviour:
 *   - Missing country / market / submarket / unknown chain_scale → provisional.
 *   - No matching row in the master → provisional.
 *   - Row matches but data_source is "hardcoded_default" or
 *     "pending_costar" → provisional.
 */
export function isProvisionalTemplate(hotel: CanonicalHotelRow): boolean {
  const country = hotel.country_code;
  const market = hotel.market_name;
  const submarket = hotel.submarket_name;
  const classLabel = chainScaleToClassLabel(hotel.chain_scale);
  // Canonical schema does not yet carry `segmentation_type` · default to
  // "hotel" for all current rows. When the column lands, swap to
  // `hotel.segmentation_type ?? "hotel"`.
  const segmentationType: string = "hotel";

  if (!country || !market || !submarket || !classLabel) return true;

  const row = MASTER.rows.find((r) =>
    r.country === country &&
    r.market === market &&
    r.submarket === submarket &&
    r.class === classLabel &&
    r.segmentation_type === segmentationType,
  );

  if (!row) return true;
  return row.data_source !== "costar_real";
}
