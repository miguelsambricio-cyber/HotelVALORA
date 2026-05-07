// ── Section taxonomy ──────────────────────────────────────────────────────────

export type ReportSectionId =
  | "executive-summary"
  | "property-overview"
  | "market-position"
  | "revenue-metrics"
  | "operational-performance"
  | "dcf-valuation"
  | "sensitivity-analysis"
  | "comparable-transactions"
  | "market-trends"
  | "supply-pipeline"
  | "revenue-streams"
  | "cost-structure"
  | "capex-plan"
  | "financing-structure"
  | "investment-summary";

export type ReportSectionGroup =
  | "overview"
  | "performance"
  | "valuation"
  | "market"
  | "financials"
  | "summary";

export interface ReportSection {
  id: ReportSectionId;
  label: string;
  shortLabel: string;
  description: string;
  group: ReportSectionGroup;
  /** Display order (1-based) */
  number: number;
  /** Insert CSS page-break before this section when printing */
  printPageBreak: boolean;
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
  /** e.g. "Luxury", "Upper Upscale", "Upscale" */
  category: string;
  /** ISO datetime */
  reportDate: string;
  /** e.g. "FY2024", "H1 2025" */
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
  /** Symbol appended after value: "€", "%", "pts", "x" */
  unit?: string;
  /** Symbol prepended before value: "$", "€" */
  prefix?: string;
  /** Override auto-formatted display string */
  formattedValue?: string;
  /** % change vs prior comparable period (5.2 = +5.2%) */
  change?: number;
  trend?: TrendDirection;
  /** e.g. "FY2024", "LTM" */
  period?: string;
  /** Market / sector benchmark for comparison */
  benchmark?: number | string;
  /** Label for benchmark row */
  benchmarkLabel?: string;
  /** Secondary context line below value */
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
  /** Pixel height of the chart area (default 280) */
  height?: number;
  footer?: string;
  source?: string;
}

// ── Context ───────────────────────────────────────────────────────────────────

export interface ReportContextValue {
  report: ReportMetadata | null;
  isLoading: boolean;
  isPrintMode: boolean;
  togglePrintMode: () => void;
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
