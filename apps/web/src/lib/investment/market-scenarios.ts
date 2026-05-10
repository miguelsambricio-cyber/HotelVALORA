// Market scenario KPI tables — internal data, NOT rendered in the
// segmented selector. Powers downstream P&L / DCF / IRR re-projection.
//
// IMPORTANT
// ─────────
// These tables are intentionally distinct from the P&L's own scenario
// presets (`lib/report/financials/assumptions`). The P&L tables describe
// hotel-asset-level assumptions for the analyst's working scenario; THIS
// table describes market-level assumptions captured at the criteria-engine
// level (i.e. what the user believes about Madrid Salamanca over 5 years).
//
// v2: hydrate from CoStar / STR market exports keyed by country + market
// + submarket + asset class. Until then: hand-curated mock per the
// /settings/investment/market spec.
//
// Scenario semantics (mapped to canonical UnderwritingScenario ids):
//   downside  → "Conservador"  → DOWN
//   base      → "Mercado"       → BASE
//   upside    → "Optimista"     → UP
//
// Note: UPSIDE shares the BASE occupancy curve (only ADR is more
// aggressive in the optimistic case).

import type { UnderwritingScenario } from "@/lib/underwriting/scenario";

export interface MarketScenarioProfile {
  /** Year-2..Year-5 occupancy deltas, in percentage POINTS (additive) */
  occGrowthPp: [number, number, number, number];
  /** Year-2..Year-5 ADR growth, in PERCENT (multiplicative) */
  adrGrowthPct: [number, number, number, number];
}

export const MARKET_SCENARIOS: Record<UnderwritingScenario, MarketScenarioProfile> = {
  downside: {
    occGrowthPp: [2, 1, 0, 0],
    adrGrowthPct: [1.5, 1.0, 1.0, 1.5],
  },
  base: {
    occGrowthPp: [3, 2, 1, 0],
    adrGrowthPct: [3.6, 2.9, 1.5, 2.4],
  },
  upside: {
    // OCC intentionally identical to BASE — only ADR is upgraded
    occGrowthPp: [3, 2, 1, 0],
    adrGrowthPct: [5.0, 4.0, 3.5, 5.0],
  },
};
