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

export { getDefaultAssumptions } from "./assumptions";
export { PL_STRUCTURE } from "./pl-structure";
export { computePL } from "./calculations";
