// ── Section taxonomy ──────────────────────────────────────────────────────────
//
// One canonical registry. The id is the URL slug. The href is computed from
// the id and the configured route prefix. Numbered groups match the visible
// Stitch sidebar (Executive Summary → Asset Analysis → CompSET → Market
// Overview → Financials → Methodology). Each group can hold one or more
// concrete sections. Sub-anchors are pure visual nav helpers (#hash).

export type ReportSectionId =
  | "executive-summary"
  | "asset-analysis"
  | "competitive-set"
  | "market-overview"
  | "financials"
  | "methodology";

export type ReportSectionGroup =
  | "overview"
  | "asset"
  | "compset"
  | "market"
  | "financials"
  | "methodology";

export interface ReportSubItem {
  /**
   * Destination href. Either:
   * - A full route, e.g. `/report/asset-analysis/capex`, or
   * - A hash anchor relative to the parent section, e.g. `#capex`.
   * The sidebar resolves either form against the parent section href.
   */
  href: string;
  label: string;
}

export interface ReportSection {
  id: ReportSectionId;
  /** 1-based display order matching the Stitch sidebar */
  number: number;
  group: ReportSectionGroup;
  label: string;
  shortLabel?: string;
  description?: string;
  /** Insert CSS page-break before this section when printing */
  printPageBreak: boolean;
  /** True if this section page is wired to a real route today */
  implemented: boolean;
  /** Optional sub-anchors rendered as secondary links in the sidebar */
  subItems?: ReportSubItem[];
}

export interface ReportSectionGroupConfig {
  id: ReportSectionGroup;
  label: string;
  sections: ReportSectionId[];
}

// ── Report metadata ───────────────────────────────────────────────────────────

export type ReportStatus = "draft" | "final" | "archived";
export type ReportConfidentiality = "public" | "confidential" | "strictly-confidential";

export interface ReportMetadata {
  id: string;
  hotelId: string;
  hotelName: string;
  hotelAddress: string;
  hotelCity: string;
  hotelCountry: string;
  starRating: number;
  roomCount: number;
  category: string;
  reportDate: string;
  reportPeriod: string;
  preparedBy: string;
  preparedFor: string;
  status: ReportStatus;
  confidentiality: ReportConfidentiality;
  version: string;
}

// ── KPI / metric cards ────────────────────────────────────────────────────────

export type TrendDirection = "up" | "down" | "flat";
export type KPIVariant = "default" | "positive" | "negative" | "warning";

export interface KPIValue {
  id: string;
  label: string;
  value: number | string;
  unit?: string;
  prefix?: string;
  formattedValue?: string;
  change?: number;
  trend?: TrendDirection;
  period?: string;
  benchmark?: number | string;
  benchmarkLabel?: string;
  sublabel?: string;
  variant?: KPIVariant;
}

// ── Charts ────────────────────────────────────────────────────────────────────

export type ChartType =
  | "bar"
  | "line"
  | "area"
  | "pie"
  | "donut"
  | "waterfall"
  | "scatter"
  | "stacked-bar"
  | "combo";

export interface ChartConfig {
  id: string;
  title: string;
  subtitle?: string;
  type: ChartType;
  height?: number;
  footer?: string;
  source?: string;
}

// ── Export ────────────────────────────────────────────────────────────────────

export type ExportFormat = "pdf" | "excel" | "pptx";

export interface ExportOptions {
  format: ExportFormat;
  sections?: ReportSectionId[];
  includeCharts: boolean;
  includeAppendix: boolean;
  watermark?: string;
}

// ── Premium tier ──────────────────────────────────────────────────────────────

export type PremiumTier = "FREE" | "PRO" | "PREMIUM";
