import type { CanonicalHotelRow, MarketKpiBundle } from "@/lib/report/canonical-reader";
import { applyFacilityAwareRule, getDefaultAssumptions } from "@/lib/report/financials";
import type { FacilityProfile, PLAssumptions } from "@/lib/report/financials/types";
import { resolvePnlTemplate, sourceLevelLabel } from "@/lib/report/financials/pnl-template-reader";
import { deriveHasCapex } from "@/lib/report/financials/ffe-reserve";
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
export async function buildFinancialsSlice(
  hotel: CanonicalHotelRow,
  marketKpi: MarketKpiBundle | null,
): Promise<FinancialsSlice> {
  // Start from the operator-tuned default ratios (used only as the hard
  // fallback when CoStar coverage is absent).
  const base = getDefaultAssumptions();

  // X4 · resolve the real CoStar USALI ratios (÷100) from pnl_template.
  const tpl = await resolvePnlTemplate(hotel);
  const costarResolved = tpl.costar_resolved && tpl.ratios != null;
  const ratios = costarResolved && tpl.ratios ? tpl.ratios : base.ratios;

  // D1/D2 · CAPEX signal drives the FF&E reserve ramp inside computePL.
  const hasCapex = deriveHasCapex(hotel);

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

  const baseWithHotelKpis: PLAssumptions = {
    ...base,
    ratios,
    hasCapex,
    rooms,
    occupancyYear1: Number(occupancyYear1.toFixed(3)),
    adrYear1: Number(adrYear1.toFixed(1)),
  };

  // Build FacilityProfile from canonical · drives the facility-aware rule
  // (drop absent revenue lines + F&B uplift per extra restaurant).
  const facilityProfile = buildFacilityProfile(hotel);

  // Apply facility-aware rule · pure transformation of the ratios. Provenance
  // appends a brief note when adjustments triggered, so the operator can
  // see at a glance whether the hotel diverged from the base template.
  const assumptions = applyFacilityAwareRule(baseWithHotelKpis, facilityProfile);
  const adjustments = summariseFacilityAdjustments(baseWithHotelKpis, assumptions, facilityProfile);

  // P&L ratio provenance (X4): the CoStar template level drives the source
  // pill; the occ/ADR source is appended for traceability.
  const ratioSource = costarResolved
    ? sourceLevelLabel(tpl.source_level)
    : "plantilla por defecto (sin cobertura CoStar)";
  const facilityNote = adjustments.length > 0 ? ` · facility-aware: ${adjustments.join(", ")}` : "";
  const provenance: SectionProvenance = {
    source: `${ratioSource} · KPIs: ${provenanceSource}${facilityNote}`,
    generated_at: new Date().toISOString(),
  };

  return {
    assumptions,
    provenance,
    source_level: tpl.source_level,
    costar_resolved: costarResolved,
  };
}

/**
 * Compose a `FacilityProfile` from a canonical hotel row · drives
 * `applyFacilityAwareRule`. Conservative null handling: an absent amenity
 * key is treated as `false` (data principle: lo que no sabemos NO lo
 * inventamos).
 */
function buildFacilityProfile(hotel: CanonicalHotelRow): FacilityProfile {
  const am = hotel.amenities ?? {};
  const hasBar = am.bar === true;
  const hasRooftop = am.rooftop === true;
  const restaurantsCount = hotel.restaurants_count ?? null;

  return {
    hasFB:
      (restaurantsCount !== null && restaurantsCount > 0) ||
      hasBar ||
      hasRooftop,
    restaurantsCount,
    hasMICE: am.meet === true,
    hasSpa: am.spa === true,
    hasParking: am.parking === true,
    hotelType: normaliseHotelType(hotel.hotel_type),
  };
}

function normaliseHotelType(raw: string | null): "urban" | "mixed" | "resort" {
  if (raw === "mixed") return "mixed";
  if (raw === "resort") return "resort";
  return "urban";
}

/**
 * Human-readable summary of which facility-aware adjustments fired ·
 * surfaces in `SectionProvenance.source` for operator visibility.
 */
function summariseFacilityAdjustments(
  before: PLAssumptions,
  after: PLAssumptions,
  profile: FacilityProfile,
): string[] {
  const notes: string[] = [];
  if (before.ratios.revFB !== after.ratios.revFB) {
    if (after.ratios.revFB === 0) notes.push("F&B dropped (no outlets)");
    else if (after.ratios.revFB > before.ratios.revFB)
      notes.push(`F&B uplift +${((after.ratios.revFB - before.ratios.revFB) * 100).toFixed(1)}pp (${profile.restaurantsCount} restaurants)`);
  }
  if (before.ratios.revMeeting !== after.ratios.revMeeting && after.ratios.revMeeting === 0) {
    notes.push("Meeting/MICE dropped");
  }
  if (before.ratios.revSpa !== after.ratios.revSpa && after.ratios.revSpa === 0) {
    notes.push("Spa dropped");
  }
  if (before.ratios.revParkingOther !== after.ratios.revParkingOther && after.ratios.revParkingOther === 0) {
    notes.push("Parking/other dropped");
  }
  return notes;
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
