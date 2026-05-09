// Projects data contract.
//
// Designed to be replaced by the future market intelligence service. Mirrors
// Transactions structure (`DualMetric` cells, comp-set table, image gallery)
// with project-specific extensions (status badge, construction type).

import type {
  DualMetric,
  TransactionClass,
  TransactionHotelGalleryItem,
} from "./transactions-data";

export type ProjectStatus = "Complete" | "Under Construction";
export type ConstructionType = "Conversion" | "New Development";

export type ProjectsKpiScope = "market" | "category";

// ── KPI cards (top row) ──────────────────────────────────────────────────────

/**
 * Shape compatible with `TransactionsKpiCardData` so the same
 * `TransactionsKpiCard` component can render Projects without extension.
 */
export interface ProjectsKpiCardData {
  scope: ProjectsKpiScope;
  /** Card title (e.g. "Madrid Projects" / "Category & Index") */
  title: string;
  /** Pill rendered top-right */
  badge: string;
  /** Four dual-value cells in a 2 × 2 grid */
  metrics: DualMetric[];
}

// ── Comp-set table ───────────────────────────────────────────────────────────

export interface ProjectRow {
  id: string;
  included: boolean;
  hotelName: string;
  keys: number;
  /** Pill — emerald for Complete, blue for Under Construction */
  status: ProjectStatus;
  /** Pre-formatted period (e.g. "Q3 2023") */
  date: string;
  /** Total development spend, pre-formatted (e.g. "€130,000,000") */
  development: string;
  pricePerKey: string;
  pricePerSqm: string;
  market: string;
  submarket: string;
  class: TransactionClass;
  category: string;
  owner: string;
  developer: string;
  locationScore: number;
  confortScore: number;
  /** "Conversion" | "New Development" — drives the construction-type column */
  constructionType: ConstructionType;
  zip: string;
  facilities: string;
}

// ── Hotel gallery (bottom block) ─────────────────────────────────────────────

/** Same shape as `TransactionHotelGalleryItem` so the existing card renders it. */
export type ProjectsHotelGalleryItem = TransactionHotelGalleryItem;

// ── Top-level page data ──────────────────────────────────────────────────────

export interface ProjectsData {
  hotelLabel: string;
  kpiCards: ProjectsKpiCardData[];
  tableTitle: string;
  rows: ProjectRow[];
  gallery: ProjectsHotelGalleryItem[];
}

// ── Mock data — populated from the Stitch reference ──────────────────────────

const STITCH_GALLERY_RITZ =
  "https://lh3.googleusercontent.com/aida-public/AB6AXuDttaiVsIKYq97_ttihvMOxGmRHITZJRkPO3_31ud7YfqoEDlfCgSESx8gvPPkcL6s3i7Nvv19DgUveSG6gXs2coI_yi8CFht5Fe8xJE1WtViK9CMI-R8YBbqh-5zUdC6t6lSkY6GGk9-7_nLJMkYo7dx-txJNzHBIDyJO88iWAsDNfjes-QvTRt-GKJVigtKwHsEIopz8HcivwjMyLHJ8igC1Rh_e9EPcDcjPJaDlq_p0BH5IV_cRnFtbu_qVp0j7mH4MVdHnkkVEy";

const STITCH_GALLERY_VILLA =
  "https://lh3.googleusercontent.com/aida-public/AB6AXuC0D63D-1pGnKhSNATXc6C-PtILBOnOuKUhMrBxX73z8LgbJ1f4rx3PPeDGqFlMeQJzgVN1iVeR19e-tgFdho3RW7fWXteaSP2bXpiFq0s8NRp8m1DMxx8xMHRkUVNt-yUFx0NSPOBIGjSPyM2_HZfdPbcq_aS-bjl3mxRduVPlxdrnjPd4i7CawcI7Xbt5BEK6D-yh6iqj3X6erqoLaAaJVDj7-o5_OZWpydlvUb5vHmafKWRneVtK7Si1OXKFDR5lQyR-YleQSv1V";

const STITCH_GALLERY_MANDARIN =
  "https://lh3.googleusercontent.com/aida-public/AB6AXuBgCdSKcSwJb-6CoraVuiOH8VpCUc6Krt8wJjsXGKxFQAvl6xG_ZbNGxCtfDJWnQu2jX_J3afRMczc0-mTaUi69Fy_J9Y-bxlCHauFVp-cNnFatbhzRy_EwSIuVudALqqahqWa2BhebqOm09AkEqUrudm9OUcLLIjEstHrQqQvyAhxHE0bVma9l-kKVwnYTDMWr44Pzepgi_2AFtrAEvpCGl0B5jeaaZsN2JJH3OnknqbjJZ2ZWPz34arS_EBh0ybCU338H0sF4sPt9";

const STITCH_GALLERY_FOUR_SEASONS =
  "https://lh3.googleusercontent.com/aida-public/AB6AXuD7mk4W-c9WuK0zRuQi-qDOu2-qK_qe9MUHkUmI-svHZdw4tiVbjUljQ4xkPKJctCsOA8hFUlClD_N2tsxEaS4AvRbFofaNk2jV4HaBHyo4YPVGRXCtZGILPQ21KCGOwzu4je7y4CCx9hMaMy4LmDId7TvZmytQ2ngVha_JRryPAcGEid70V9MwX4hziOFqZmlwJfmZjDzQw-qe0TEJQGYcC-LhgJRfwkZz2qEvfSqpnpICSaHuujT1nAzrzWfR1OfTfCb9rvnMlq6Q";

export function getMockProjects(): ProjectsData {
  return {
    hotelLabel: "Prime",

    kpiCards: [
      {
        scope: "market",
        title: "Madrid Projects",
        badge: "Market Transactions",
        metrics: [
          {
            primary:   { label: "Pipeline",      value: "3.200 keys" },
            secondary: { label: "% growth",      value: "12.8%" },
          },
          {
            primary:   { label: "Price per Key", value: "€485,000" },
            secondary: { label: "growth",        value: "18.2%" },
          },
          {
            primary:   { label: "Term",          value: "5 years" },
            secondary: { label: "Projects",      value: "5 / 124" },
          },
          {
            primary:   { label: "Price per m²",  value: "€10.400" },
            secondary: { label: "growth",        value: "22.8%" },
          },
        ],
      },
      {
        scope: "category",
        title: "Category & Index",
        badge: "Class Transactions",
        metrics: [
          {
            primary:   { label: "Pipeline",      value: "850 keys" },
            secondary: { label: "construction",  value: "2 / 6" },
          },
          {
            primary:   { label: "Price per Key", value: "€850,000" },
            secondary: { label: "index",         value: "87%" },
          },
          {
            primary:   { label: "Market Share",  value: "35%" },
            secondary: { label: "completed",     value: "1 / 65" },
          },
          {
            primary:   { label: "Price per m²",  value: "€16.500" },
            secondary: { label: "index",         value: "81%" },
          },
        ],
      },
    ],

    tableTitle: "Hotel Projects (5Y)",

    rows: [
      {
        id: "ritz",
        included: true,
        hotelName: "Hotel Ritz Madrid",
        keys: 153,
        status: "Complete",
        date: "Q3 2023",
        development: "€130,000,000",
        pricePerKey: "€849,673",
        pricePerSqm: "€14,500",
        market: "Madrid",
        submarket: "Centre",
        class: "Luxury",
        category: "5* GL",
        owner: "Mandarin Oriental",
        developer: "Omega Capital",
        locationScore: 9.8,
        confortScore: 9.5,
        constructionType: "Conversion",
        zip: "28014",
        facilities: "bar, restaurant, rooftop, gym",
      },
      {
        id: "villa-magna",
        included: true,
        hotelName: "Villa Magna",
        keys: 154,
        status: "Under Construction",
        date: "Q1 2024",
        development: "€210,000,000",
        pricePerKey: "€1,363,636",
        pricePerSqm: "€18,200",
        market: "Madrid",
        submarket: "Salamanca",
        class: "Luxury",
        category: "5* GL",
        owner: "RLH Properties",
        developer: "Dogus Group",
        locationScore: 9.6,
        confortScore: 9.7,
        constructionType: "New Development",
        zip: "28046",
        facilities: "Wellness, Garden, Bar",
      },
      {
        id: "westin-palace",
        included: false,
        hotelName: "Westin Palace",
        keys: 470,
        status: "Complete",
        date: "Q4 2023",
        development: "€320,000,000",
        pricePerKey: "€680,851",
        pricePerSqm: "€12,100",
        market: "Madrid",
        submarket: "Centre",
        class: "Luxury",
        category: "5*",
        owner: "Archer Hotel Capital",
        developer: "Host Hotels",
        locationScore: 9.9,
        confortScore: 9.2,
        constructionType: "Conversion",
        zip: "28014",
        facilities: "Events, Gym, Classic Bar",
      },
      {
        id: "mandarin-ritz",
        included: true,
        hotelName: "Mandarin Oriental Ritz",
        keys: 153,
        status: "Under Construction",
        date: "Q2 2023",
        development: "€150,000,000",
        pricePerKey: "€980,392",
        pricePerSqm: "€16,400",
        market: "Madrid",
        submarket: "Retiro",
        class: "Luxury",
        category: "5* GL",
        owner: "Institutional Inv.",
        developer: "Private Equity",
        locationScore: 9.7,
        confortScore: 9.9,
        constructionType: "Conversion",
        zip: "28014",
        facilities: "Full Spa, Rooftop",
      },
      {
        id: "four-seasons",
        included: false,
        hotelName: "Four Seasons Madrid",
        keys: 200,
        status: "Complete",
        date: "Q1 2023",
        development: "€250,000,000",
        pricePerKey: "€1,250,000",
        pricePerSqm: "€19,500",
        market: "Madrid",
        submarket: "Canalejas",
        class: "Luxury",
        category: "5* GL",
        owner: "Sovereign Fund",
        developer: "OHLA",
        locationScore: 10.0,
        confortScore: 9.8,
        constructionType: "New Development",
        zip: "28014",
        facilities: "Luxury Mall, Spa, Terrace",
      },
    ],

    gallery: [
      {
        id: "ritz",
        hotelName: "Hotel Ritz Madrid",
        imageSrc: STITCH_GALLERY_RITZ,
        alt: "Hotel Ritz Madrid",
      },
      {
        id: "villa-magna",
        hotelName: "Villa Magna",
        imageSrc: STITCH_GALLERY_VILLA,
        alt: "Villa Magna",
      },
      {
        id: "mandarin-oriental",
        hotelName: "Mandarin Oriental",
        imageSrc: STITCH_GALLERY_MANDARIN,
        alt: "Mandarin Oriental",
      },
      {
        id: "four-seasons",
        hotelName: "Four Seasons",
        imageSrc: STITCH_GALLERY_FOUR_SEASONS,
        alt: "Four Seasons",
      },
    ],
  };
}
