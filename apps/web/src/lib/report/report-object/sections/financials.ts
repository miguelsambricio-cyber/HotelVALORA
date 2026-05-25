import type { CanonicalHotelRow, MarketKpiBundle } from "@/lib/report/canonical-reader";
import { getDefaultAssumptions } from "@/lib/report/financials";
import type { PLAssumptions } from "@/lib/report/financials/types";
import { PNL_ROOM_STATS, PNL_ROOM_STATS_FALLBACK } from "@/lib/admin/financials/defaults";
import type { FinancialsSlice, SectionProvenance } from "../types";

/**
 * Build the P&L assumptions for a canonical hotel.
 *
 *  Inputs (operator-defined master · admin financials):
 *    - PNL_ROOM_STATS · occupancy + ADR per market/class/submarket
 *    - PNL_ROOM_STATS_FALLBACK · safety net
 *
 *  Inputs (canonical · auxiliary):
 *    - hotel.total_rooms / total_keys
 *    - hotel.chain_scale
 *    - marketKpi · submarket-resolved ADR/occupancy where present
 *
 *  Inputs (engine baseline):
 *    - getDefaultAssumptions() · the operator-tuned defaults for ratio
 *      lines (F&B mix · departmental costs · GOP margin etc.) ·
 *      remain in place until the operator promotes per-class ratios.
 *
 *  Returns a complete `PLAssumptions` ready for `computePL`.
 *  Replaces the previous behaviour where `getDefaultAssumptions()`
 *  was called with no hotel context.
 */
export function buildFinancialsSlice(
  hotel: CanonicalHotelRow,
  marketKpi: MarketKpiBundle | null,
): FinancialsSlice {
  // Start from the operator-tuned default ratios (F&B mix · cost lines).
  const base = getDefaultAssumptions();

  // Resolve rooms · prefer canonical · fall back to engine heuristic in the
  // mapper · here we just take canonical (the caller layer already ran the
  // engine and could pass a different number · but for the PL slice we want
  // canonical truth).
  const rooms = hotel.total_keys ?? hotel.total_rooms ?? base.rooms;

  // Resolve year-1 occupancy + ADR · prefer marketKpi.submarket level ·
  // fall back to admin class table → admin market table → fallback constant.
  let occupancyYear1 = base.occupancyYear1;
  let adrYear1 = base.adrYear1;
  let provenanceSource = "engine default";

  if (marketKpi && marketKpi.adr_12m !== null && marketKpi.occupancy_12m !== null) {
    adrYear1 = Number(marketKpi.adr_12m.toFixed(1));
    occupancyYear1 = marketKpi.occupancy_12m > 1
      ? marketKpi.occupancy_12m / 100
      : marketKpi.occupancy_12m;
    provenanceSource = marketKpi.source_label ?? "CoStar submarket/market";
  } else {
    // Try the admin PNL_ROOM_STATS by chain_scale class
    const classLabel = chainScaleToClassLabel(hotel.chain_scale);
    const byClass = classLabel ? PNL_ROOM_STATS.classes[classLabel] : null;
    if (byClass) {
      occupancyYear1 = byClass.occupancy / 100;
      adrYear1 = byClass.adr;
      provenanceSource = `admin · class ${classLabel}`;
    } else {
      occupancyYear1 = PNL_ROOM_STATS_FALLBACK.occupancy / 100;
      adrYear1 = PNL_ROOM_STATS_FALLBACK.adr;
      provenanceSource = "admin · fallback (Madrid avg)";
    }
  }

  const assumptions: PLAssumptions = {
    ...base,
    rooms,
    occupancyYear1: Number(occupancyYear1.toFixed(3)),
    adrYear1: Number(adrYear1.toFixed(1)),
  };

  const provenance: SectionProvenance = {
    source: provenanceSource,
    generated_at: new Date().toISOString(),
  };

  return { assumptions, provenance };
}

function chainScaleToClassLabel(scale: string | null): string | null {
  switch (scale) {
    case "luxury":
      return "Luxury";
    case "upper_upscale":
      return "Upper Upscale";
    case "upscale":
      return "Upscale";
    case "upper_midscale":
      return "Upper Midscale";
    case "midscale":
      return "Midscale";
    case "economy":
      return "Economy";
    default:
      return null;
  }
}
