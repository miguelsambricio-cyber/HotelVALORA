import "server-only";
import type { CanonicalHotelRow, MarketKpiBundle } from "@/lib/report/canonical-reader";
import type { ExecutiveSummaryData } from "@/lib/report/executive-summary-data";
import { runForHotel, type UnderwritingRunResult } from "@/lib/report/underwriting-runner";

/**
 * Phase 4 · canonical → ExecutiveSummaryData mapper.
 *
 * Honest about gaps: when a field has no canonical source (e.g.
 * monthly TTM arrays don't exist in the snapshot · we have spot +
 * 12m aggregates only), we synthesise a defensible value and mark
 * `meta.reportDisplayId` with an HV-prefix so the operator can tell
 * canonical reports apart from mock at a glance.
 *
 * Fallback strategy:
 *   - Asset attributes from canonical → real
 *   - Market KPIs from snapshot timeseries → real (adr/occ/revpar)
 *   - Valuation block: capRate + perRoom from market_yield + market
 *     sale_price_per_room (real); other valuation fields stubbed
 *     until cap-rate engine wires `runForHotel(canonical_id)`
 *   - 12-month TTM chart arrays synthesised from 12m aggregate with
 *     mild monthly variance (mock-equivalent until snapshot exposes
 *     monthly granularity)
 */

function countryLabel(countryCode: string | null): string {
  switch (countryCode?.toUpperCase()) {
    case "ES":
      return "España";
    case "FR":
      return "Francia";
    case "PT":
      return "Portugal";
    case "IT":
      return "Italia";
    case "DE":
      return "Alemania";
    case "GB":
      return "Reino Unido";
    case "US":
      return "Estados Unidos";
    default:
      return countryCode ?? "—";
  }
}

function chainScaleLabel(s: string | null): string {
  switch (s) {
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
    case "lifestyle":
      return "Lifestyle";
    case "boutique":
      return "Boutique";
    case "resort":
      return "Resort";
    default:
      return s ?? "—";
  }
}

function category(starRating: number | null, chainScale: string | null): string {
  const star = starRating ? `${starRating}★` : "";
  const scale = chainScaleLabel(chainScale);
  if (star && scale) return `${star} ${scale}`;
  return star || scale || "—";
}

function hotelTypeLabel(t: string | null): string {
  switch (t) {
    case "urban":
      return "Hotel";
    case "resort":
      return "Resort";
    case "airport":
      return "Airport Hotel";
    case "extended_stay":
      return "Extended Stay";
    case "aparthotel":
      return "Aparthotel";
    case "flex_living":
      return "Flex Living";
    case "boutique":
      return "Boutique";
    default:
      return t ?? "Hotel";
  }
}

function reportDisplayId(canonical_id: string): string {
  // Stable HV-prefixed display id derived from the canonical UUID.
  // Format: HV-YYYY-NNNNN (5 digits from first 5 hex chars of the UUID).
  const year = new Date().getFullYear();
  const short = canonical_id.replace(/-/g, "").slice(0, 5).toUpperCase();
  // Convert hex chars to a stable 5-digit numeric for the display id
  const numeric = parseInt(short, 16).toString().padStart(5, "0").slice(0, 5);
  return `HV-${year}-${numeric}`;
}

function todayLabel(): string {
  const d = new Date();
  const months = [
    "Enero",
    "Febrero",
    "Marzo",
    "Abril",
    "Mayo",
    "Junio",
    "Julio",
    "Agosto",
    "Septiembre",
    "Octubre",
    "Noviembre",
    "Diciembre",
  ];
  return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
}

/**
 * Synthesize a 12-month TTM array around an annual value with mild
 * jitter. Used when the source has annual KPIs but no monthly
 * granularity. Deterministic per (value, seed) so multiple renders
 * produce identical chart curves.
 */
function ttmFromAggregate(value: number, seedKey: string, jitterPct = 0.15): number[] {
  let h = 0;
  for (let i = 0; i < seedKey.length; i++) h = (h * 31 + seedKey.charCodeAt(i)) | 0;
  const rand = () => {
    h = (h * 1103515245 + 12345) & 0x7fffffff;
    return h / 0x7fffffff;
  };
  return Array.from({ length: 12 }, () => {
    const jitter = (rand() * 2 - 1) * jitterPct;
    return Number((value * (1 + jitter)).toFixed(2));
  });
}

export function mapCanonicalToExecutiveSummary(
  hotel: CanonicalHotelRow,
  marketKpi: MarketKpiBundle | null,
): ExecutiveSummaryData {
  // Canonical-first · falls back to engine heuristic rooms when canonical
  // has neither total_keys nor total_rooms (~50 % of branded Madrid corpus
  // today). Without this fallback every value derived from `keys` (estimated
  // value · range · €/sqm · buildable area) collapses to 0 · creating a
  // visual "0,0M€" disaster while cap-rate + scenario + GOP still render.
  const canonicalKeys = hotel.total_keys ?? hotel.total_rooms;
  // Brand fallback: when brand is null but family is set, use family
  const brand = hotel.brand ?? hotel.brand_family ?? "Independent";

  // Valuation: cap-rate engine output (real · 5-layer model) + market-derived per-key.
  // Engine recommendation supersedes the raw market_yield · it adjusts for
  // category · size · renovation · operator · macro · liquidity · scenario.
  // Run engine FIRST so we have engine heuristic rooms available downstream.
  let engineRun: UnderwritingRunResult | null = null;
  try {
    engineRun = runForHotel(hotel);
  } catch {
    engineRun = null;
  }
  // Final keys count · canonical when available · else engine heuristic
  const keys = canonicalKeys ?? engineRun?.assetBasics.rooms ?? 0;
  // Provenance signal · downstream provenance/methodology can read this
  const keysFromHeuristic = canonicalKeys === null && engineRun !== null;

  // Asset attributes from canonical (real · engine fallback for keys)
  const asset = {
    name: hotel.canonical_name ?? "—",
    address: hotel.address_line1 ?? "—",
    country: countryLabel(hotel.country_code),
    market: hotel.market_name ?? hotel.city_normalized ?? "—",
    submarket: hotel.submarket_name ?? hotel.neighborhood ?? "—",
    type: hotelTypeLabel(hotel.hotel_type),
    category: category(hotel.star_rating, hotel.chain_scale),
    keys,
    buildableArea: keys > 0 ? `${(keys * 38).toLocaleString("es-ES")} m²` : "—",
    brand,
  };

  // Market KPIs from resolveBestAvailableMarketKpis (real submarket where available)
  const adrSpot = marketKpi?.adr_spot ?? marketKpi?.adr_12m ?? 0;
  const occSpot = marketKpi?.occupancy_spot ?? marketKpi?.occupancy_12m ?? 0;
  const revparSpot = marketKpi?.revpar_spot ?? marketKpi?.revpar_12m ?? 0;
  const marketMetrics = {
    adr: Number(adrSpot.toFixed(1)),
    occupancy: Number((occSpot > 1 ? occSpot : occSpot * 100).toFixed(1)),
    revpar: Number(revparSpot.toFixed(0)),
  };

  const capRate = engineRun?.capRate.used_pct ?? marketKpi?.market_yield ?? 6.5;
  // €/key by chain_scale · Madrid 2024 institutional medians (CBRE/JLL/Cushman
  // transaction benchmarks 2023-2024). Replaces the flat 285k baseline that
  // produced the institutionally-inverted "luxury < upscale" valuation result
  // (luxury hotels are smaller in keys but command much higher €/key).
  const perKeyByScale = (s: string | null): number => {
    if (s === "luxury") return 800_000;        // Mandarin/Four Seasons/Rosewood band
    if (s === "upper_upscale") return 500_000; // Hyatt/Marriott Auditorium/NH Collection
    if (s === "upscale") return 340_000;       // AC by Marriott/Hilton Garden Inn/Catalonia
    if (s === "upper_midscale") return 250_000;
    if (s === "midscale") return 200_000;
    if (s === "economy") return 155_000;
    return 285_000;                            // unknown · prudent Madrid average
  };
  // Market override · when CoStar publishes a per-room transaction figure for
  // the submarket, that supersedes the chain_scale table (more current data).
  // Today CoStar never populates this column · so we always use the tier.
  const perRoom = marketKpi?.market_sale_price_per_room ?? perKeyByScale(hotel.chain_scale);
  const sqmPerKey = engineRun?.assetBasics.total_sqm && engineRun.assetBasics.rooms
    ? engineRun.assetBasics.total_sqm / engineRun.assetBasics.rooms
    : 38;
  const totalSqm = engineRun?.assetBasics.total_sqm ?? keys * 38;
  const estimatedValue = keys > 0 ? Math.round(perRoom * keys) : 0;
  // GOP margin · institutional benchmark by chain_scale (Madrid 2024 medians).
  // Replaces the hardcoded mock value with a defensible per-scale default.
  const gopByScale = (s: string | null): number => {
    if (s === "luxury") return 35;
    if (s === "upper_upscale") return 38;
    if (s === "upscale") return 40;
    if (s === "upper_midscale") return 41;
    if (s === "midscale") return 42;
    if (s === "economy") return 44;
    return 39;
  };
  const gopMargin = gopByScale(hotel.chain_scale);
  // EBITDA-after-replacement · roughly capRate × value (engine output as anchor).
  const ebitdaAfterReplacement = estimatedValue > 0
    ? Math.round((estimatedValue * capRate) / 100)
    : 0;
  // Engine confidence band drives the valuation range (institutional p25/p75 spread)
  const bandLow = engineRun?.capRate.band.low_pct ?? capRate * 0.95;
  const bandHigh = engineRun?.capRate.band.high_pct ?? capRate * 1.05;
  // Higher cap rate => lower price · invert for value range
  const valuationRangeLow = estimatedValue > 0
    ? Math.round(estimatedValue * (capRate / bandHigh))
    : 0;
  const valuationRangeHigh = estimatedValue > 0
    ? Math.round(estimatedValue * (capRate / bandLow))
    : 0;
  const perSqmHotel = totalSqm > 0 ? Math.round(estimatedValue / totalSqm) : 0;

  const valuation = {
    gopMargin,
    ebitdaAfterReplacement,
    capRate: Number(capRate.toFixed(2)),
    exitYear: "TTM",
    scenario: engineRun
      ? `Engine · base · ${marketKpi?.source_label ?? "no market source"}${keysFromHeuristic ? " · keys heurístico" : ""}`
      : (marketKpi?.source_label ?? "Mercado"),
    valuationRangeLow,
    valuationRangeHigh,
    estimatedValue,
    perRoom: Math.round(perRoom),
    perSqmHotel,
    // Residential / office comparison ratios kept as institutional Madrid
    // averages · these aren't hotel-specific outputs.
    perSqmResidential: 3_176,
    perSqmOffice: 2_941,
  };
  void sqmPerKey; // surfaced via totalSqm

  // 12-month TTM charts synthesised from 12m aggregates (mock-quality
  // until snapshot exposes monthly granularity).
  const occ12m = marketKpi?.occupancy_12m ?? marketKpi?.occupancy_spot ?? 0;
  const adr12m = marketKpi?.adr_12m ?? marketKpi?.adr_spot ?? 0;
  const revpar12m = marketKpi?.revpar_12m ?? marketKpi?.revpar_spot ?? 0;
  // Normalise occupancy to 0-1 ratio for the chart series
  const occRatio = occ12m > 1 ? occ12m / 100 : occ12m;
  const charts = {
    occupancyTTM: ttmFromAggregate(occRatio, `${hotel.id}-occ`, 0.10),
    adrTTM: ttmFromAggregate(adr12m, `${hotel.id}-adr`, 0.06),
    revparTTM: ttmFromAggregate(revpar12m, `${hotel.id}-revpar`, 0.12),
  };

  return {
    asset,
    marketMetrics,
    valuation,
    charts,
    meta: {
      reportDisplayId: reportDisplayId(hotel.id),
      reportDate: todayLabel(),
    },
  };
}
