/**
 * Hotel-aware overlays · Phase E
 *
 * Lightweight per-hotel context layer over the canonical mock data
 * sources for sections 01-04 of the Madrid Centro full report. Takes
 * the existing mock data shape (unchanged) and an HotelId, returns a
 * shallow-cloned + overlaid object so the section components receive
 * hotel-contextualised identity (name · submarket · category · keys ·
 * gross building area) while the deeper illustrative fields stay as
 * the canonical reference dataset.
 *
 * This is intentionally a thin contextualisation layer · NOT a per-
 * hotel intelligence pipeline. When the live intelligence layer
 * lands (Phase F / Block 7), these overlays become a one-liner over
 * a Supabase query and the contract for section components stays
 * identical.
 *
 * Freeze-safe by design:
 *   · Does not modify any `lib/report/*-data.ts` file.
 *   · Does not modify any section component.
 *   · Does not touch the underwriting baseline.
 *   · Pure data transformation · zero React.
 */

import type {
  ExecutiveSummaryData,
  AssetData as ExecAssetData,
} from "../report/executive-summary-data";
import type { AssetAnalysisData } from "../report/asset-analysis-data";
import type { CompetitiveSetData, CompetitorProperty } from "../report/competitive-set-data";
import type { MarketOverviewData } from "../report/market-overview-data";
import { buildMadridStaticMapUrl } from "../maps/static-map";
import {
  getHotelRegistryEntry,
  type HotelId,
  type HotelProfile,
} from "./madrid-centro-registry";
import { getCompetitorsFor } from "./madrid-centro-compsets";
import { computeCompsetKpi } from "./compset-kpi";

// ─── Format helpers ─────────────────────────────────────────────────────

/** "4star" / "5star" → "4★ Upscale" / "5★ Luxury" display copy. */
function formatStarCategory(category: HotelProfile["category"]): string {
  switch (category) {
    case "5star":
      return "5★ Luxury";
    case "4star":
      return "4★ Upscale";
    case "3star":
      return "3★ Midscale";
    default:
      return category;
  }
}

/** "renovated" / "needs_work" / "new" → display copy. */
function formatState(state: HotelProfile["state"]): string {
  switch (state) {
    case "renovated":
      return "Renovated";
    case "needs_work":
      return "Needs Work";
    case "new":
      return "New";
    default:
      return state;
  }
}

/** Integer m² → "15.450 m²" (Spanish locale). */
function formatSqm(sqm: number): string {
  return `${new Intl.NumberFormat("es-ES").format(sqm)} m²`;
}

// ─── Section overlays ───────────────────────────────────────────────────

/** Overlays the asset block of an ExecutiveSummaryData with hotel context. */
export function overlayExecutiveSummary(
  base: ExecutiveSummaryData,
  hotelId: HotelId,
): ExecutiveSummaryData {
  const entry = getHotelRegistryEntry(hotelId);
  if (!entry) return base;
  const p = entry.profile;

  const asset: ExecAssetData = {
    ...base.asset,
    name: p.display_name,
    market: "Madrid",
    submarket: p.submarket,
    category: formatStarCategory(p.category),
    keys: p.rooms,
    buildableArea: formatSqm(p.total_sqm),
  };

  return { ...base, asset };
}

/** Overlays asset-analysis metrics + hotelLabel + roomMix totals. */
export function overlayAssetAnalysis(
  base: AssetAnalysisData,
  hotelId: HotelId,
): AssetAnalysisData {
  const entry = getHotelRegistryEntry(hotelId);
  if (!entry) return base;
  const p = entry.profile;

  // Overlay the identity-bearing metric rows when they exist; leave
  // anything we do not control (Distance / Scores / Floors) intact.
  const metrics = base.metrics.map((row) => {
    switch (row.label) {
      case "Market":
        return { ...row, value: "Madrid" };
      case "Submarket":
        return { ...row, value: p.submarket };
      case "Category":
        return {
          ...row,
          value: p.category === "5star" ? "5 stars" : p.category === "4star" ? "4 stars" : "3 stars",
        };
      case "Class":
        return {
          ...row,
          value: p.category === "5star" ? "Luxury" : p.category === "4star" ? "Upscale" : "Midscale",
        };
      case "Gross Building":
        return { ...row, value: new Intl.NumberFormat("es-ES").format(p.total_sqm) };
      default:
        return row;
    }
  });

  // Scale the room-mix rows proportionally to the hotel's actual keys,
  // preserving the mix ratios from the canonical dataset.
  const baseTotal = base.roomMix.find((r) => r.isTotal)?.units ?? 0;
  const roomMix = base.roomMix.map((r) => {
    if (r.isTotal) {
      return { ...r, units: p.rooms };
    }
    if (baseTotal > 0) {
      const ratio = r.units / baseTotal;
      return { ...r, units: Math.max(1, Math.round(p.rooms * ratio)) };
    }
    return r;
  });

  return {
    ...base,
    hotelLabel: p.display_name,
    metrics,
    roomMix,
  };
}

/**
 * Builds a per-hotel CompetitiveSetData: subject row from the hotel
 * profile + 5 anonymised competitors from the per-hotel CompSet
 * registry (Phase F · `madrid-centro-compsets.ts`).
 *
 * The canonical gallery (illustrative photos) is preserved · the
 * properties array is fully reconstructed so each hotel renders its
 * own institutional CompSet rather than sharing the global mock.
 */
export function overlayCompetitiveSet(
  base: CompetitiveSetData,
  hotelId: HotelId,
): CompetitiveSetData {
  const entry = getHotelRegistryEntry(hotelId);
  if (!entry) return base;
  const p = entry.profile;

  const stars = p.category === "5star" ? 5 : p.category === "4star" ? 4 : 3;

  // Locate the canonical subject row · preserve its facility shape as
  // the default for the new subject (the hotel's actual amenity set
  // will be wired by the live intelligence layer · Phase 6+).
  const baseSubject = base.properties.find((prop) => prop.isSubject);
  const baseFacilities = baseSubject?.facilities ?? {
    bar: true,
    restaurant: true,
    rooftop: false,
    meeting: true,
    gym: true,
    spa: false,
  };

  const subject: CompetitorProperty = {
    id: "subject",
    isSubject: true,
    name: p.display_name,
    stars,
    keys: p.rooms,
    submarket: p.submarket,
    facilities: baseFacilities,
    locationScore: baseSubject?.locationScore ?? 8.6,
    distance: null,
  };

  const rawCompetitors = getCompetitorsFor(hotelId);

  // Phase H · attach per-competitor differential KPIs vs subject so
  // the CompetitiveSetTable can render Δ-badges + composite Match
  // score. Subject itself carries no vsSubject (self-comparison N/A).
  const competitors: CompetitorProperty[] = rawCompetitors.map((c) => ({
    ...c,
    vsSubject: computeCompsetKpi(subject, c) ?? undefined,
  }));

  return {
    ...base,
    properties: [subject, ...competitors],
  };
}

/** Overlays the top-level hotelLabel + Submarket scope card title +
 *  per-hotel Mapbox Static map URL. */
export function overlayMarketOverview(
  base: MarketOverviewData,
  hotelId: HotelId,
): MarketOverviewData {
  const entry = getHotelRegistryEntry(hotelId);
  if (!entry) return base;
  const p = entry.profile;

  // Update the submarket insight card's title to reflect the chosen
  // submarket · Madrid / España / Class cards stay generic (Madrid
  // macro context is the same across all three hotels in v1).
  const insights = base.insights.map((insight) =>
    insight.scope === "submarket"
      ? { ...insight, title: p.submarket }
      : insight,
  );

  // Per-hotel real Mapbox Static map URL (Centro / Salamanca / Chamberí
  // each renders its own neighbourhood). Falls back to the canonical
  // base URL when the token is missing · SharedMapCard handles a final
  // empty fallback with an institutional placeholder.
  const submarketMapUrl =
    buildMadridStaticMapUrl({ submarket: p.submarket }) ??
    base.demandGenerators.mapImageSrc;

  return {
    ...base,
    hotelLabel: p.display_name,
    insights,
    demandGenerators: {
      ...base.demandGenerators,
      mapImageSrc: submarketMapUrl,
    },
  };
}

// Suppress "unused state" warning for the format-state helper (kept
// exported in case downstream overlays need it later).
export { formatState };
