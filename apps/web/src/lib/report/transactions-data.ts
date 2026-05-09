// Transactions data contract.
//
// Designed to be replaced by the future market intelligence service. Every
// list is array-driven; numeric values arrive as pre-formatted strings to
// preserve locale rendering decisions (€, thousand separators, %).

export type TransactionClass =
  | "Luxury"
  | "Upper Upscale"
  | "Upscale"
  | "Midscale"
  | "Economy";

export type TransactionsKpiScope = "market" | "class";

// ── KPI cards (top row) ──────────────────────────────────────────────────────

/**
 * Twin metric within a KPI card cell. Stitch renders the two parts with
 * whitespace alignment in a single text node; we model them as distinct
 * fields so the cell can render `flex justify-between` for clean alignment.
 */
export interface DualMetric {
  primary: { label: string; value: string };
  secondary: { label: string; value: string };
}

export interface TransactionsKpiCardData {
  /**
   * Stable id used as React key + DOM `id` (`transactions-kpi-${scope}`).
   * Typed as `string` so the same card can render projects pipeline KPIs
   * (`scope: "market" | "category"`) and any future market-overview sub-page
   * with a different scope vocabulary, without forking the component.
   * Narrow types per page if needed via `as const` literals.
   */
  scope: string;
  /** Card title (e.g. "Madrid Transactions") */
  title: string;
  /** Pill rendered top-right (e.g. "Market Transactions") */
  badge: string;
  /** Four dual-value cells in a 2 × 2 grid */
  metrics: DualMetric[];
}

// ── Comp-set table ───────────────────────────────────────────────────────────

export interface TransactionRow {
  id: string;
  /** Initial state of the inclusion checkbox (web-only UI) */
  included: boolean;
  hotelName: string;
  keys: number;
  /** Pre-formatted period (e.g. "Q3 2023") */
  date: string;
  /** Pre-formatted price strings */
  transactionPrice: string;
  pricePerKey: string;
  pricePerSqm: string;
  market: string;
  submarket: string;
  class: TransactionClass;
  /** Star / quality category (e.g. "5* GL") */
  category: string;
  buyer: string;
  seller: string;
  /** 0–10 score */
  locationScore: number;
  /** 0–10 score */
  confortScore: number;
  /** Pre-formatted CAPEX (e.g. "€45M") */
  capex: string;
  zip: string;
  /** Comma-separated facility list */
  facilities: string;
}

// ── Hotel gallery (bottom block) ─────────────────────────────────────────────

export interface TransactionHotelGalleryItem {
  id: string;
  hotelName: string;
  imageSrc: string;
  alt: string;
}

// ── Top-level page data ──────────────────────────────────────────────────────

export interface TransactionsData {
  /** Hotel-side toggle label rendered in the page header (e.g. "Prime") */
  hotelLabel: string;
  /** Top KPI cards — typically 2 (market context + class context) */
  kpiCards: TransactionsKpiCardData[];
  /** Section title above the comp-set table */
  tableTitle: string;
  /** Comp-set rows (Madrid luxury hotels, …) */
  rows: TransactionRow[];
  /** 4-up image gallery at the bottom */
  gallery: TransactionHotelGalleryItem[];
}

// ── Mock data — populated from the Stitch reference ──────────────────────────

const HOTEL_PLACEHOLDER = (seed: string, w = 600, h = 450) =>
  `https://images.unsplash.com/photo-${seed}?w=${w}&h=${h}&fit=crop&auto=format`;

export function getMockTransactions(): TransactionsData {
  return {
    hotelLabel: "Prime",

    kpiCards: [
      {
        scope: "market",
        title: "Madrid Transactions",
        badge: "Market Transactions",
        metrics: [
          {
            primary:   { label: "Total Volume",  value: "€1.450M" },
            secondary: { label: "% growth",      value: "12.8%" },
          },
          {
            primary:   { label: "Price per Key", value: "€485,000" },
            secondary: { label: "growth",        value: "18.2%" },
          },
          {
            primary:   { label: "Term",          value: "12 meses" },
            secondary: { label: "transactions",  value: "5 / 24" },
          },
          {
            primary:   { label: "Price per m²",  value: "€10.400" },
            secondary: { label: "growth",        value: "22.8%" },
          },
        ],
      },
      {
        scope: "class",
        title: "Comparable & Index",
        badge: "Class Transactions",
        metrics: [
          {
            primary:   { label: "Volume per Hotel", value: "€150M" },
            secondary: { label: "index",            value: "83%" },
          },
          {
            primary:   { label: "Price per Key",    value: "€850,000" },
            secondary: { label: "index",            value: "87%" },
          },
          {
            primary:   { label: "Keys per Hotel",   value: "153" },
            secondary: { label: "",                 value: "99%" },
          },
          {
            primary:   { label: "Price per m²",     value: "€16.500" },
            secondary: { label: "index",            value: "81%" },
          },
        ],
      },
    ],

    tableTitle: "Hotel Transactions (5Y)",

    rows: [
      {
        id: "ritz",
        included: true,
        hotelName: "Hotel Ritz Madrid",
        keys: 153,
        date: "Q3 2023",
        transactionPrice: "€130,000,000",
        pricePerKey: "€849,673",
        pricePerSqm: "€14,500",
        market: "Madrid",
        submarket: "Centre",
        class: "Luxury",
        category: "5* GL",
        buyer: "Mandarin Oriental",
        seller: "Omega Capital",
        locationScore: 9.8,
        confortScore: 9.5,
        capex: "€45M",
        zip: "28014",
        facilities: "bar, restaurant, rooftop, gym",
      },
      {
        id: "villa-magna",
        included: true,
        hotelName: "Villa Magna",
        keys: 154,
        date: "Q1 2024",
        transactionPrice: "€210,000,000",
        pricePerKey: "€1,363,636",
        pricePerSqm: "€18,200",
        market: "Madrid",
        submarket: "Salamanca",
        class: "Luxury",
        category: "5* GL",
        buyer: "RLH Properties",
        seller: "Dogus Group",
        locationScore: 9.6,
        confortScore: 9.7,
        capex: "€30M",
        zip: "28046",
        facilities: "Wellness, Garden, Bar",
      },
      {
        id: "westin-palace",
        included: false,
        hotelName: "Westin Palace",
        keys: 470,
        date: "Q4 2023",
        transactionPrice: "€320,000,000",
        pricePerKey: "€680,851",
        pricePerSqm: "€12,100",
        market: "Madrid",
        submarket: "Centre",
        class: "Upscale",
        category: "5*",
        buyer: "Archer Hotel Capital",
        seller: "Host Hotels",
        locationScore: 9.9,
        confortScore: 9.2,
        capex: "€60M",
        zip: "28014",
        facilities: "Events, Gym, Classic Bar",
      },
      {
        id: "mandarin-ritz",
        included: true,
        hotelName: "Mandarin Oriental Ritz",
        keys: 153,
        date: "Q2 2023",
        transactionPrice: "€150,000,000",
        pricePerKey: "€980,392",
        pricePerSqm: "€16,400",
        market: "Madrid",
        submarket: "Retiro",
        class: "Luxury",
        category: "5* GL",
        buyer: "Institutional Inv.",
        seller: "Private Equity",
        locationScore: 9.7,
        confortScore: 9.9,
        capex: "€99M",
        zip: "28014",
        facilities: "Full Spa, Rooftop",
      },
      {
        id: "four-seasons",
        included: false,
        hotelName: "Four Seasons Madrid",
        keys: 200,
        date: "Q1 2023",
        transactionPrice: "€250,000,000",
        pricePerKey: "€1,250,000",
        pricePerSqm: "€19,500",
        market: "Madrid",
        submarket: "Canalejas",
        class: "Luxury",
        category: "5* GL",
        buyer: "Sovereign Fund",
        seller: "OHLA",
        locationScore: 10.0,
        confortScore: 9.8,
        capex: "€120M",
        zip: "28014",
        facilities: "Luxury Mall, Spa, Terrace",
      },
    ],

    gallery: [
      {
        id: "ritz",
        hotelName: "Hotel Ritz Madrid",
        imageSrc: HOTEL_PLACEHOLDER("1566073771259-6a8506099945"),
        alt: "Hotel Ritz Madrid exterior",
      },
      {
        id: "villa-magna",
        hotelName: "Villa Magna",
        imageSrc: HOTEL_PLACEHOLDER("1551918120-9739cb430c6d"),
        alt: "Villa Magna lobby",
      },
      {
        id: "mandarin-oriental",
        hotelName: "Mandarin Oriental",
        imageSrc: HOTEL_PLACEHOLDER("1582719508461-905c673771fd"),
        alt: "Mandarin Oriental suite",
      },
      {
        id: "four-seasons",
        hotelName: "Four Seasons",
        imageSrc: HOTEL_PLACEHOLDER("1564501049412-61c2a3083791"),
        alt: "Four Seasons rooftop",
      },
    ],
  };
}
