import "server-only";
import type { CanonicalHotelRow, MarketKpiBundle } from "@/lib/report/canonical-reader";
import {
  getMockMarketOverview,
  type MarketOverviewData,
} from "@/lib/report/market-overview-data";

/**
 * Phase 4 · canonical → MarketOverviewData mapper · MINIMAL.
 *
 * The mock content carries 4 scopes of curated narrative (country ·
 * market · submarket · class). Rewriting every narrative against
 * canonical fields is a much heavier workstream that doesn't fit
 * the milestone window. For now we:
 *
 *   - Override `hotelLabel` with the canonical hotel's name (so the
 *     header toggles reflect the operator's selection)
 *   - Replace ADR/occupancy/RevPAR numeric metrics in any insight
 *     that has them, with values from `getMarketKpis(market, sub)`
 *   - Keep all narrative + map imagery from mock
 *
 * Future iteration · per-submarket curated insights pulled from the
 * CoStar warehouse + AI summaries on top of `market_news`.
 */

export function mapCanonicalToMarketOverview(
  hotel: CanonicalHotelRow,
  marketKpi: MarketKpiBundle | null,
): MarketOverviewData {
  const base = getMockMarketOverview();
  const hotelLabel = hotel.canonical_name ?? base.hotelLabel;

  // Override numeric KPI fields in the insights when the mock metric
  // labels match our snapshot timeseries fields. Defensive: leaves
  // any unrecognised label / narrative metric untouched.
  const updateMetric = (label: string, value: number | null, suffix: string): { label: string; value: string } | null => {
    if (value === null || !Number.isFinite(value)) return null;
    return { label, value: `${value.toFixed(1).replace(".", ",")}${suffix}` };
  };

  const overrides: Record<string, string> = {};
  if (marketKpi) {
    const adr = marketKpi.adr_spot ?? marketKpi.adr_12m;
    const occ = marketKpi.occupancy_spot ?? marketKpi.occupancy_12m;
    const revpar = marketKpi.revpar_spot ?? marketKpi.revpar_12m;
    if (adr !== null) overrides["ADR"] = `${Math.round(adr)} €`;
    if (occ !== null) {
      const occPct = occ > 1 ? occ : occ * 100;
      overrides["Ocupación"] = `${occPct.toFixed(1).replace(".", ",")}%`;
      overrides["Occupancy"] = `${occPct.toFixed(1).replace(".", ",")}%`;
    }
    if (revpar !== null) overrides["RevPAR"] = `${Math.round(revpar)} €`;
    if (marketKpi.market_yield !== null) {
      overrides["Yield"] = `${marketKpi.market_yield.toFixed(2).replace(".", ",")}%`;
    }
  }
  // Helper to keep TS narrow on `value`
  void updateMetric;

  const insights = base.insights.map((ins) => {
    if (!ins.metrics) return ins;
    return {
      ...ins,
      metrics: ins.metrics.map((m) => {
        const override = overrides[m.label];
        return override ? { ...m, value: override } : m;
      }),
    };
  });

  return {
    ...base,
    hotelLabel,
    insights,
  };
}
