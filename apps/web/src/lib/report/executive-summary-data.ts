// ── Types ─────────────────────────────────────────────────────────────────────

export interface AssetData {
  name: string;
  address: string;
  country: string;
  market: string;
  submarket: string;
  type: string;
  category: string;
  keys: number;
  buildableArea: string;
  brand: string;
}

export interface MarketMetricsData {
  adr: number;
  occupancy: number; // 0–100
  revpar: number;
}

export interface ValuationData {
  gopMargin: number;
  ebitdaAfterReplacement: number;
  capRate: number;
  exitYear: string;
  scenario: string;
  valuationRangeLow: number;
  valuationRangeHigh: number;
  estimatedValue: number;
  perRoom: number;
  perSqmHotel: number;
  perSqmResidential: number;
  perSqmOffice: number;
}

export interface ChartSeriesData {
  /** Monthly occupancy ratios 0–1, 12 values (TTM) */
  occupancyTTM: number[];
  /** Monthly ADR in €, 12 values (TTM) */
  adrTTM: number[];
  /** Monthly RevPAR in €, 12 values (TTM) */
  revparTTM: number[];
}

export interface ExecutiveSummaryMeta {
  reportDisplayId: string;
  reportDate: string;
}

export interface ExecutiveSummaryData {
  asset: AssetData;
  marketMetrics: MarketMetricsData;
  valuation: ValuationData;
  charts: ChartSeriesData;
  meta: ExecutiveSummaryMeta;
}

// ── Mock data ─────────────────────────────────────────────────────────────────

export function getMockExecutiveSummary(reportId: string): ExecutiveSummaryData {
  return {
    asset: {
      name: "Hotel Gran Central Madrid",
      address: "Calle Alcalá, 45",
      country: "España",
      market: "Madrid",
      submarket: "Madrid Centro",
      type: "Hotel",
      category: "4★ Upscale",
      keys: 150,
      buildableArea: "8.500 m²",
      brand: "Eurostars",
    },
    marketMetrics: {
      adr: 142.4,
      occupancy: 76.1,
      revpar: 110,
    },
    valuation: {
      gopMargin: 39,
      ebitdaAfterReplacement: 2_300_000,
      capRate: 6.5,
      exitYear: "TTM",
      scenario: "Mercado",
      valuationRangeLow: 28_900_000,
      valuationRangeHigh: 33_200_000,
      estimatedValue: 31_000_000,
      perRoom: 206_000,
      perSqmHotel: 3_780,
      perSqmResidential: 3_176,
      perSqmOffice: 2_941,
    },
    charts: {
      occupancyTTM: [0.69, 0.77, 0.73, 0.74, 0.86, 0.83, 0.68, 0.60, 0.86, 0.86, 0.83, 0.67],
      adrTTM: [118, 120, 113, 121, 125, 128, 115, 104, 128, 134, 124, 122],
      revparTTM: [81, 92, 82, 90, 100, 102, 78, 62, 110, 116, 103, 83],
    },
    meta: {
      reportDisplayId: reportId === "demo-report-001" ? "HV-2026-00184" : reportId.toUpperCase(),
      reportDate: "26 Febrero 2026",
    },
  };
}

// ── Display formatters (European locale) ─────────────────────────────────────

export function fmtOccupancy(v: number): string {
  return `${v.toFixed(1).replace(".", ",")}%`;
}

export function fmtADR(v: number): string {
  return `${v.toFixed(1).replace(".", ",")} €`;
}

export function fmtRevPAR(v: number): string {
  return `${v.toFixed(0)} €`;
}

export function fmtMillionsEUR(v: number): string {
  const m = v / 1_000_000;
  return `${m.toFixed(1).replace(".", ",")}M€`;
}

export function fmtThousandsEUR(v: number): string {
  return `${Math.round(v / 1_000)}k€`;
}

export function fmtEURPerSqm(v: number): string {
  return `${new Intl.NumberFormat("es-ES").format(v)} €`;
}

export function fmtPercent(v: number, decimals = 0): string {
  return `${v.toFixed(decimals).replace(".", ",")}%`;
}
