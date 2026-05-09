// Financials — public surface.
//
// import { ... } from "@/lib/report/financials";

export type {
  Currency,
} from "./currency";
export { CURRENCY_CONFIG, defaultCurrencyForCountry } from "./currency";

export {
  formatCurrency,
  formatPercent,
  formatAbsolute,
  formatYearDelta,
  formatPpDelta,
  parseAssumption,
} from "./format";

export type {
  FiveYears,
  PLAssumptions,
  PLComputed,
  PLLineItemConfig,
  PLLineItemId,
  PLResultId,
  PLResultVariant,
  PLRowWeight,
  PLSectionConfig,
  PLSectionId,
  PLValueKind,
  Tier,
} from "./types";

export { getDefaultAssumptions, SCENARIO_PRESETS } from "./assumptions";
export { PL_STRUCTURE } from "./pl-structure";
export { computePL } from "./calculations";

// Re-export the underwriting scenario contract from its canonical home
// for convenience — financials consumers can import the type alongside
// the per-hotel assumptions in one go.
export type { UnderwritingScenario } from "@/lib/underwriting/scenario";
export { SCENARIO_LABELS, SCENARIO_OPTIONS } from "@/lib/underwriting/scenario";
