// Market Overview data contract.
//
// Designed to be replaced by the future market intelligence service. Every
// list is array-driven; no values are hardcoded inside the JSX.

export type InsightScope = "country" | "market" | "submarket" | "class";

// ── Insight cards (Country / Market / Submarket / Class) ────────────────────

export interface InsightMetric {
  /** Stable id used as React key */
  id: string;
  /** Uppercase tracked-wide label (e.g. "Nº Hoteles", "ADR (€)") */
  label: string;
  /** Display-ready value (already formatted) */
  value: string;
}

export interface SplitBarSegment {
  label: string;
  /** 0–100 — sums of two segments should reach 100 */
  pct: number;
}

export interface SplitBarData {
  /** Two-segment split rendered above the bar */
  left: SplitBarSegment;
  right: SplitBarSegment;
}

export interface MiniBarChartItem {
  /** Short label rendered under the bar (3-4 chars) */
  label: string;
  /** 0–100 — height percentage */
  pct: number;
}

export interface MiniBarChartData {
  /** Small uppercase title rendered above the bars */
  title: string;
  items: MiniBarChartItem[];
}

export interface TrendBarsData {
  /** Caption above the bars (e.g. "Total Travelers (5Y)") */
  title: string;
  /** Pill text on the right (e.g. "+12.4% Var. 5 Years") */
  badge: string;
  /** Per-year heights 0–100 (typically 5 entries) */
  series: number[];
}

export interface InvestmentChartData {
  /** Caption above the chart */
  title: string;
  /** Y-coordinates 0–40 in viewBox space — primary line */
  primary: number[];
  /** Optional secondary dashed line */
  secondary?: number[];
  /** X-axis labels */
  xLabels: string[];
}

export interface InvestmentMetric {
  id: string;
  label: string;
  value: string;
  /** Optional delta string (e.g. "-18.5%", "+5.9%") rendered next to value */
  delta?: string;
  /** "up" → emerald-600, "down" → red-600 */
  deltaTone?: "up" | "down" | "neutral";
}

export interface InsightFooter {
  /** Small uppercase label */
  label: string;
  /** Display value */
  value: string;
}

export interface MarketInsight {
  scope: InsightScope;
  /** Card title (e.g. "España", "Madrid", "Madrid Centro", "Luxury") */
  title: string;
  /** Pill label rendered top-right of the card (e.g. "Country Insight") */
  badge: string;
  /** 9 metric tiles in the 3×3 grid */
  metrics: InsightMetric[];
  /** Two-segment ratio bar (Nacional / Internacional, Leisure / Corporate, …) */
  splitBar: SplitBarData;
  /** Two side-by-side mini bar charts inside the card */
  miniCharts: [MiniBarChartData, MiniBarChartData];
  /** Bottom sparkline-style 5-bar trend block */
  trend: TrendBarsData;
  /** Two SVG line charts for the investment block */
  investmentCharts: [InvestmentChartData, InvestmentChartData];
  /** 6 metrics rendered under the investment charts */
  investmentMetrics: InvestmentMetric[];
  /** Single right-aligned footer KPI (Población / Premium Inventory / …) */
  footer: InsightFooter;
}

// ── Corporate & Sport block ──────────────────────────────────────────────────

export interface CorporateRow {
  label: string;
  value: string;
}

export interface CorporateSportsData {
  /** Card title (e.g. "MADRID") */
  title: string;
  /** Pill label */
  badge: string;
  corporate: CorporateRow[];
  sports: CorporateRow[];
}

// ── Demand generators list + map ─────────────────────────────────────────────

export type DemandGeneratorCategory = "poi" | "metro" | "train" | "airport";

export interface DemandGeneratorListItem {
  id: string;
  /** Numeric pin shown on both the list and the map (1–N) */
  pin: number;
  name: string;
  category: DemandGeneratorCategory;
  /** Human-readable distance label (e.g. "5km", "350m") */
  distance: string;
}

export interface DemandGeneratorMapPin {
  /** Pin number to render on top of the map */
  pin: number;
  category: DemandGeneratorCategory;
  /** Position relative to the map container (0–100 each) */
  top: string;
  left: string;
}

export interface DemandGeneratorsData {
  poiTitle: string;
  transportTitle: string;
  items: DemandGeneratorListItem[];
  mapImageSrc: string;
  pins: DemandGeneratorMapPin[];
}

// ── Demand generators gallery (4-col image grid) ─────────────────────────────

export interface DemandGeneratorTile {
  id: string;
  alt: string;
  /** Image src (omitted for placeholder tiles) */
  src?: string;
  /** Material symbol name when no image is available — falls back to icon tile */
  iconLabel?: string;
}

// ── Top-level page data ──────────────────────────────────────────────────────

export interface MarketOverviewData {
  /** Hotel-side toggle label rendered in the page header (e.g. "Prime") */
  hotelLabel: string;
  insights: MarketInsight[];
  corporateSports: CorporateSportsData;
  demandGenerators: DemandGeneratorsData;
  gallery: DemandGeneratorTile[];
}

// ── Mock data — populated from the Country/Market and Submarket/Class Stitch ─

const MAP_IMAGE =
  "https://lh3.googleusercontent.com/aida-public/AB6AXuAjbwL8cW_KGe7pre45-5Jb1dqa86IcNoapLs3n4JKUBbccn6211k958NmVUspNbUs_AdQ1hHYOqG3-oZMVhHnGS9Mvv8qn-FsqEs11QQvsEUo3nBEkuDu7aQS8V4-1a4F7PB6_HnGz9nd3yofI0XTsJutcLMQSC0uKKS6SomcYk2OQWZJK5XgYCev9qopIaEBH6p5lxOU03dpSWN1iDrWkK27_ys1YMVUW8sAGhBFwS22rCb6Z7rABhd3Ple8DNWlqKFcRzo3FeuUW";

export function getMockMarketOverview(): MarketOverviewData {
  return {
    hotelLabel: "Prime",
    insights: [
      // ── 1. COUNTRY ─────────────────────────────────────────────────────────
      {
        scope: "country",
        title: "España",
        badge: "Country Insight",
        metrics: [
          { id: "hotels", label: "Nº Hoteles", value: "14,235" },
          { id: "keys", label: "Nº Keys", value: "1,245k" },
          { id: "projects", label: "Projects (5Y)", value: "650" },
          { id: "occ", label: "OCC (%)", value: "72.4%" },
          { id: "adr", label: "ADR (€)", value: "135.2" },
          { id: "revpar", label: "RevPAR (€)", value: "97.8" },
          { id: "airports", label: "Nº Aeropuertos", value: "46" },
          { id: "travelers", label: "Nº Viajeros", value: "85.1M" },
          { id: "ranking", label: "Ranking", value: "#2 Global" },
        ],
        splitBar: {
          left: { label: "Nacional", pct: 35 },
          right: { label: "Internacional", pct: 65 },
        },
        miniCharts: [
          {
            title: "Arrival by Country (Intl)",
            items: [
              { label: "UK", pct: 80 },
              { label: "FR", pct: 60 },
              { label: "DE", pct: 50 },
              { label: "OTH", pct: 40 },
            ],
          },
          {
            title: "Arrival by Region (Nac)",
            items: [
              { label: "MAD", pct: 90 },
              { label: "CAT", pct: 70 },
              { label: "AND", pct: 45 },
              { label: "OTH", pct: 30 },
            ],
          },
        ],
        trend: {
          title: "Total Travelers (5Y)",
          badge: "+12.4% Var. 5 Years",
          series: [40, 30, 60, 85, 100],
        },
        investmentCharts: [
          {
            title: "Inversión Hotelera País: Volumen de ventas (5Y)",
            primary: [35, 30, 25, 32, 15, 20],
            xLabels: ["2020", "2021", "2022", "2023", "2024", "2025"],
          },
          {
            title: "Inversión Hotelera PAIS: Volumen y Precio/Hab (5Y)",
            primary: [38, 28, 30, 18, 10],
            secondary: [35, 32, 25, 22, 15],
            xLabels: ["2021", "2022", "2023", "2024", "2025"],
          },
        ],
        investmentMetrics: [
          { id: "investment", label: "Investment Spain 25'", value: "3.300M", delta: "-18.5%", deltaTone: "down" },
          { id: "transactions", label: "Transactions Spain", value: "151" },
          { id: "year", label: "Year", value: "12 meses" },
          { id: "tx-class", label: "Transactions Class", value: "55" },
          { id: "completed", label: "Projects Completed", value: "650" },
          { id: "construction", label: "Under Construction", value: "130" },
        ],
        footer: { label: "Población", value: "47.4M" },
      },

      // ── 2. MARKET ──────────────────────────────────────────────────────────
      {
        scope: "market",
        title: "Madrid",
        badge: "Market Insight",
        metrics: [
          { id: "hotels", label: "Nº Hoteles", value: "842" },
          { id: "keys", label: "Nº Keys", value: "92k" },
          { id: "projects", label: "Projects (5Y)", value: "165" },
          { id: "occ", label: "OCC (%)", value: "76.8%" },
          { id: "adr", label: "ADR (€)", value: "148.5" },
          { id: "revpar", label: "RevPAR (€)", value: "114.0" },
          { id: "airports", label: "Nº Aeropuertos", value: "1" },
          { id: "travelers", label: "Nº Viajeros", value: "12.3M" },
          { id: "ranking", label: "Ranking", value: "#4 Europe" },
        ],
        splitBar: {
          left: { label: "Nacional", pct: 45 },
          right: { label: "Internacional", pct: 55 },
        },
        miniCharts: [
          {
            title: "Arrival by Country (Intl)",
            items: [
              { label: "UK", pct: 70 },
              { label: "FR", pct: 50 },
              { label: "DE", pct: 65 },
              { label: "OTH", pct: 45 },
            ],
          },
          {
            title: "Arrival by Region (Nac)",
            items: [
              { label: "MAD", pct: 40 },
              { label: "CAT", pct: 80 },
              { label: "AND", pct: 60 },
              { label: "OTH", pct: 50 },
            ],
          },
        ],
        trend: {
          title: "Total Travelers (5Y)",
          badge: "+15.2% Var. 5 Years",
          series: [30, 45, 55, 90, 100],
        },
        investmentCharts: [
          {
            title: "Inversión Hotelera Market: Volumen de ventas (5Y)",
            primary: [32, 35, 20, 25, 10, 5],
            xLabels: ["2020", "2021", "2022", "2023", "2024", "2025"],
          },
          {
            title: "Inversión Hotelera Market: Volumen y Precio/Hab (5Y)",
            primary: [35, 25, 15, 12, 5],
            secondary: [30, 28, 22, 18, 12],
            xLabels: ["2021", "2022", "2023", "2024", "2025"],
          },
        ],
        investmentMetrics: [
          { id: "investment", label: "Investment Madrid 25'", value: "1.850M", delta: "+5.9%", deltaTone: "up" },
          { id: "transactions", label: "Transactions Madrid", value: "92" },
          { id: "year", label: "Year", value: "12 meses" },
          { id: "tx-class", label: "Transactions Class", value: "55" },
          { id: "completed", label: "Projects Completed", value: "165" },
          { id: "construction", label: "Under Construction", value: "32" },
        ],
        footer: { label: "Población", value: "6.7M" },
      },

      // ── 3. SUBMARKET ───────────────────────────────────────────────────────
      {
        scope: "submarket",
        title: "Madrid Centro",
        badge: "Submarket Insight",
        metrics: [
          { id: "hotels", label: "Nº Hoteles", value: "156" },
          { id: "keys", label: "Nº Keys", value: "12K" },
          { id: "projects", label: "Projects (5Y)", value: "42" },
          { id: "occ", label: "OCC (%)", value: "82.1%" },
          { id: "adr", label: "ADR (€)", value: "185.0" },
          { id: "revpar", label: "RevPAR (€)", value: "151.8" },
          { id: "walk", label: "Walk Score", value: "98/100" },
          { id: "stay", label: "Estancia Media", value: "3.3" },
          { id: "trevpar", label: "Total RevPAR (€)", value: "221.8" },
        ],
        splitBar: {
          left: { label: "Leisure", pct: 75 },
          right: { label: "Corporate", pct: 25 },
        },
        miniCharts: [
          {
            title: "Demographic (Age)",
            items: [
              { label: "18-35", pct: 80 },
              { label: "36-50", pct: 60 },
              { label: "+50", pct: 50 },
              { label: "OTH", pct: 40 },
            ],
          },
          {
            title: "Transport Density",
            items: [
              { label: "SUB", pct: 90 },
              { label: "BUS", pct: 70 },
              { label: "CAR", pct: 45 },
              { label: "WALK", pct: 30 },
            ],
          },
        ],
        trend: {
          title: "RevPAR Growth (5Y)",
          badge: "+18.5% Var. 5 Years",
          series: [40, 30, 60, 85, 100],
        },
        investmentCharts: [
          {
            title: "Inversión Hotelera País: Volumen de ventas (5Y)",
            primary: [35, 30, 25, 32, 15, 20],
            xLabels: ["2020", "2021", "2022", "2023", "2024", "2025"],
          },
          {
            title: "Inversión Hotelera Market: Volumen y Precio/Hab (5Y)",
            primary: [38, 28, 30, 18, 10],
            secondary: [35, 32, 25, 22, 15],
            xLabels: ["2021", "2022", "2023", "2024", "2025"],
          },
        ],
        investmentMetrics: [
          { id: "investment", label: "Investment Spain 25'", value: "3.300M", delta: "-18.5%", deltaTone: "down" },
          { id: "transactions", label: "Transactions Spain", value: "151" },
          { id: "year", label: "Year", value: "12 meses" },
          { id: "tx-class", label: "Transactions Class", value: "55" },
          { id: "completed", label: "Projects Completed", value: "42" },
          { id: "construction", label: "Under Construction", value: "16" },
        ],
        footer: { label: "Población", value: "1.4M" },
      },

      // ── 4. CLASS ───────────────────────────────────────────────────────────
      {
        scope: "class",
        title: "Luxury",
        badge: "Class Insight",
        metrics: [
          { id: "hotels", label: "Nº Hoteles", value: "842" },
          { id: "keys", label: "Nº Keys", value: "4.8K" },
          { id: "projects", label: "Projects (5Y)", value: "12" },
          { id: "occ", label: "OCC (%)", value: "68.8%" },
          { id: "adr", label: "ADR (€)", value: "645.0" },
          { id: "revpar", label: "RevPAR (€)", value: "441.8" },
          { id: "staff", label: "Staff Ratio", value: "38%" },
          { id: "gop", label: "GOP Margin", value: "38.2%" },
          { id: "trevpar", label: "Total RevPAR (€)", value: "553.8" },
        ],
        splitBar: {
          left: { label: "Direct", pct: 60 },
          right: { label: "OTA / GDS", pct: 40 },
        },
        miniCharts: [
          {
            title: "Room Nights (5Y)",
            items: [
              { label: "UK", pct: 70 },
              { label: "FR", pct: 50 },
              { label: "DE", pct: 65 },
              { label: "OTH", pct: 45 },
            ],
          },
          {
            title: "Origin",
            items: [
              { label: "USA", pct: 40 },
              { label: "CHN", pct: 80 },
              { label: "MEX", pct: 60 },
              { label: "FRA", pct: 50 },
            ],
          },
        ],
        trend: {
          title: "RN / New Supply (5Y)",
          badge: "+22.4% Var. 5 Years",
          series: [30, 45, 55, 90, 100],
        },
        investmentCharts: [
          {
            title: "Inversión Hotelera País: Volumen de ventas (5Y)",
            primary: [32, 35, 20, 25, 10, 5],
            xLabels: ["2020", "2021", "2022", "2023", "2024", "2025"],
          },
          {
            title: "Inversión Hotelera Market: Volumen y Precio/Hab (5Y)",
            primary: [35, 25, 15, 12, 5],
            secondary: [30, 28, 22, 18, 12],
            xLabels: ["2021", "2022", "2023", "2024", "2025"],
          },
        ],
        investmentMetrics: [
          { id: "investment", label: "Investment Madrid 25'", value: "1.850M", delta: "+5.9%", deltaTone: "up" },
          { id: "transactions", label: "Transactions Madrid", value: "55" },
          { id: "year", label: "Year", value: "12 meses" },
          { id: "tx-class", label: "Transactions Class", value: "19" },
          { id: "completed", label: "Projects Completed", value: "12" },
          { id: "construction", label: "Under Construction", value: "4" },
        ],
        footer: { label: "Premium Inventory", value: "18.5%" },
      },
    ],

    corporateSports: {
      title: "MADRID",
      badge: "Corporate & Sport Events Insight",
      corporate: [
        { label: "Numero de dias de sol", value: "280" },
        { label: "Centro de convenciones", value: "IFEMA Madrid" },
        { label: "Distancia", value: "4.5 km" },
        { label: "Superficie bruta", value: "200,000 m²" },
        { label: "Numero de eventos corporativos al año", value: "+500" },
      ],
      sports: [
        { label: "Estadio deportivo más cercano", value: "Santiago Bernabéu" },
        { label: "Distancia", value: "1.2 km" },
        { label: "Capacidad", value: "81,044" },
        { label: "Nº de eventos al año", value: "95" },
      ],
    },

    demandGenerators: {
      poiTitle: "Demand Generator",
      transportTitle: "Transport",
      items: [
        { id: "sorolla", pin: 1, name: "Sorolla Museum", category: "poi", distance: "5km" },
        { id: "alcala", pin: 2, name: "Puerta Alcalá", category: "poi", distance: "6km" },
        { id: "thyssen", pin: 3, name: "Museo Thyssen", category: "poi", distance: "7km" },
        { id: "debod", pin: 4, name: "Templo Debod", category: "poi", distance: "7km" },
        { id: "sol", pin: 5, name: "Puerta del Sol", category: "poi", distance: "7km" },
        { id: "begona", pin: 6, name: "Begoña (Metro)", category: "metro", distance: "350m" },
        { id: "castilla", pin: 7, name: "Plaza Castilla (Metro)", category: "metro", distance: "550m" },
        { id: "chamartin", pin: 8, name: "Tren Chamartín", category: "train", distance: "1km" },
      ],
      mapImageSrc: MAP_IMAGE,
      pins: [
        { pin: 1, category: "poi", top: "28%", left: "25%" },
        { pin: 2, category: "poi", top: "22%", left: "88%" },
        { pin: 3, category: "poi", top: "45%", left: "10%" },
        { pin: 4, category: "poi", top: "55%", left: "-10%" },
        { pin: 5, category: "poi", top: "72%", left: "78%" },
        { pin: 6, category: "metro", top: "32%", left: "95%" },
        { pin: 7, category: "metro", top: "85%", left: "25%" },
        { pin: 8, category: "train", top: "10%", left: "45%" },
      ],
    },

    gallery: [
      {
        id: "sorolla",
        alt: "Sorolla Museum",
        src: "https://lh3.googleusercontent.com/aida-public/AB6AXuDOnm_TTT81fE3Q6VDdamsZux_mXdfEkSTtwvWv4ji02MNMGWP5XoJTWpa892kf1E8GZJb8BH3nxoG6QmZoIIc7_hdJNL8a3GNYfuPd8A4a93tABR32vUGotW4tzhQ-M5eECu-4CA1VAiV9C0NJmJOktk5ZypmjgiYYUK1p6XLgkq3smU6pjlW8VeOpOVx8QMqdxoDxwPP8y-YCT1rUgXsY-PVf7ttVvW1uyKEA5XSYkmq-ghokaLTUoM8dD2-g1OIpa8YOBvUyk0ZP",
      },
      {
        id: "retiro",
        alt: "Retiro Park",
        src: "https://lh3.googleusercontent.com/aida-public/AB6AXuDoIw9wwiXbEoNmfA46LwUNK83aJ7_pbVJNRSnmM87BCYMY0-JRjACKGbW7LyADaf7sM5aDl5ydyiJhiqoOuQWsKhnbV2ZzMGpOF9H2HFmcj9wFNcQQNVypsOZvep3PJu8yGCDsTpSqHinFwOIO0Lt5DtmAYh9AFZxNSXKatdXzJPXeXj988XKUxkXifY01t1eyHeBBmEdHFcZ0x-H624wiePwdvyib05dbHv6QPEurekH5rL7cch2MyftPfklDMUUsZCrQnOjJ2ybY",
      },
      {
        id: "business",
        alt: "Business District",
        src: "https://lh3.googleusercontent.com/aida-public/AB6AXuAvCw_DDJooHlCXnbZT_0_6jWz3GqI3siiRI_OUgEJ-7RlReXPDbS8IjumceF7gCda9rW9h9rBz1Jh72us5vuLQ2_mn3GObg-UkeAYgx0mo5nxOLX37vgUClWN40qZvL9UPrpoxvPCNh41ImhZcqVtEt9dsTzs2fKBkQOWLtykOJN03FffqHwX9XytzJZraDg-NEMAxh_NueZlIkman1EAZX7FIEvwdIwCkz6aRXDZ0udogTP9eO1lpwoc4VMPaz-OxyPmwYJSnnZQs",
      },
      { id: "transport", alt: "Transport", iconLabel: "Transport" },
      {
        id: "monument",
        alt: "Monument",
        src: "https://lh3.googleusercontent.com/aida-public/AB6AXuABPcxcVimmJZSIv6VlNB6hRriLf_qVvvpy5mmpTV8FA0_qlY-tlFwMqhZGKQee3BSKnB5gc8wtWhrST9RZmID-8Urgjupxa0tglM4psEqNUbp_OoIsWKZWuN3Uy826WttKQH9p6U_Vwcof0WgsO5bheqEqJHB9qs6SCyCOF9y6Q2P1IjdzUu4QH9RWn53b7xfeu2q-YM2ceV_cTUHd-mB3-cKvOYfW_Vd_IHvSO7ZfdiWF0c8NjAZVa9EM-Ae7gqgr-li0A7jsZOOZ",
      },
      {
        id: "shopping",
        alt: "Shopping Area",
        src: "https://lh3.googleusercontent.com/aida-public/AB6AXuB3Pc-9JUEhMVo3sIKWke5Xokv1_xNyCwThsN4RfVb32FdbVmGzsIBcTK6psxvKdhMUYGjovQjRwj2j-bgM7j37XnxL9BOlNvXdkFVQzxoRMyv66QMPF4PfSojFORO-mHJKlot5KcAICbSNTsiFfsyhRhrgGbJZuv8hpTRAjmezuYFJBHshbTqR1MbtH0YmpiSKyt1HbU4v1UorZFjlUtl_PF37NBtzvBnaI7-suT7h-cSQxjdML-PcbcpmipCivvjXx1B8UJnXgvQg",
      },
      { id: "ifema", alt: "IFEMA Convention Center", iconLabel: "IFEMA Convention Center" },
      { id: "stadium", alt: "Bernabéu Stadium", iconLabel: "Bernabéu Stadium" },
    ],
  };
}
