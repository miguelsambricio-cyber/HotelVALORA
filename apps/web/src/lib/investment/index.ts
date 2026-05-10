// Investment — public surface.

export type {
  // Domain
  AssetType,
  AssetClass,
  OwnershipInterest,
  BrandManagement,
  YearBuildBand,
  TernaryYesNo,
  // CAPEX
  CapexUnit,
  CapexMode,
  CapexLineItem,
  CapexGroup,
  CapexValueEntry,
  CapexValueMap,
  // Facilities
  FacilityId,
  // Renders
  RenderRow,
  // Coverage
  CoverageNode,
  // Market
  ForecastMode,
  ForecastGrowth,
  MarketAssumptions,
  UnderwritingScenario,
  // Criteria + match
  InvestmentCriteria,
  InvestmentTab,
  MatchTier,
  MatchCategory,
  CategoryMatch,
  MatchResult,
} from "./types";

export { CAPEX_TREE, CAPEX_UNIT_LABELS, getAllCapexLineIds } from "./capex";
export { FACILITIES, type Facility } from "./facilities";
export { COVERAGE_TREE } from "./coverage";
export { MARKET_SCENARIOS, type MarketScenarioProfile } from "./market-scenarios";

export {
  evaluateHotel,
  tierFromScore,
  MATCH_TIER_LABELS,
  MATCH_CATEGORY_LABELS,
  type HotelMatchInput,
} from "./match-engine";

export { useInvestmentStore, useInvestment } from "./store";
