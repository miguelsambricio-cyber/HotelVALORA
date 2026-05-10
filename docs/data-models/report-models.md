# Data Models · Report

## Canonical shape

The `LibraryReport` type in `apps/web/src/types/library.ts` is the single source of truth for everything that surfaces on `/library/*` and (eventually) `/report/*`. Compressed view:

```ts
export interface LibraryReport {
  id: string;
  hotelName: string;
  city: string;
  country: string;
  coordinates: { lat: number; lng: number };
  mockPosition: { topPct: number; leftPct: number };  // drop after Mapbox swap

  category: ReportCategory;          // saved | community | top-promote
  visibility: ReportVisibility;      // private | team | public | top-promote
  visibilityTier: VisibilityTier;    // promoted | institutional | community | verified

  estValueEur: number;               // legacy — favorites-map floating card
  capRate: number;                   // legacy — favorites-map floating card

  rooms: number;
  starRating: number;
  classification: string;            // "5* Gran Lujo", "5* Lifestyle", …
  owner: string;
  tierBadge?: "PREMIUM" | "INSTITUTIONAL" | "PRO";
  promotion: ReportPromotion;
  tags?: string[];
  status: ReportStatus;              // draft | published | archived
  updatedAt?: string;                // ISO 8601

  // rich list-view fields
  amenities: ReportAmenities;        // 8 booleans
  location: ReportLocation;          // address / zip / subMarket / locationScore
  listing: ReportListing;            // role / objective / openYear / classLabel
  financials: ReportFinancials;      // nullable blocks for tier-locked cells
  reportType: ReportTypeBadge;       // Premium | PRO | Public | Private
  indicators: ReportIndicators;      // topPromote | userModified | private
  hasContact: boolean;
  contactInfo: ReportContactInfo | null;
  favorited: boolean;
  hasPdf: boolean;
  referenceCode: string;             // HV-YYYY-NNN — surfaced on top-list
}
```

## Sub-shapes

### `ReportPromotion`

```ts
{
  promoted: boolean;
  promotedUntil?: string;        // ISO 8601
  boostScore?: number;           // 0–100
  featuredRegion?: string;       // ISO 3166 region id
  impressions?: number;
  clicks?: number;
}
```

### `ReportAmenities` (8 keys)

`bar`, `restaurant`, `rooftop`, `meetingRooms`, `gym`, `spa`, `pool`, `parking` — all booleans.

### `ReportFinancials` (tier-gating shape)

```ts
{
  capex: number | null;             // null = locked
  totalInvest: ReportPriceBlock | null;
  capRate: number;                  // always visible
  marketValueTtm: ReportPriceBlock; // always visible
  exitYear: number | null;
  exitPrice: ReportPriceBlock | null;
  yield: number | null;
  irrProject: number | null;
  irrEquity: number | null;
}
```

`ReportPriceBlock = { total: number; perRoom: number; perM2: number }`.

Lock pattern by `reportType`:

| reportType | What's locked |
|---|---|
| Premium | Nothing |
| PRO | `capex`, `irrEquity` |
| Public / Private | Everything except `capRate` + `marketValueTtm` |

### `ReportContactInfo`

```ts
{
  accountManager: string;          // "Sara Smith"
  accountManagerId: string;        // "3014"
  email: string;
  phone: string;
}
```

`contactInfo: null` means no contact card surfaces in the table (Mail icon stays slate-300).

### Forward-compat (`TopReport` family)

```ts
export type VisibilityTier = "promoted" | "institutional" | "community" | "verified";
export type MapMarkerType = ReportCategory | VisibilityTier;
export type AssetType = "luxury" | "upscale" | "midscale" | "boutique" | "resort";
export type AccessTier = "public" | "institutional";
export type InvestmentBand = "S" | "M" | "L" | "XL";

export interface ReportRanking {
  rankingScore: number;            // 0–100
  visibilityScore: number;         // 0–100
  impressions: number;
  clicks: number;
  sponsorPriority: number;
  promotedUntil?: string;
}

export interface TopReport { /* see types/library.ts */ }
export type PromotedReport = TopReport & { promoted: true; visibilityTier: "promoted" };
```

These types are NOT used in render today — they exist so the future Top Promote marketplace ranking engine drops in cleanly.

## Mock dataset

`apps/web/src/lib/library/mock-reports.ts` carries **6 hotels** with full rich fields:

1. The Ritz-Carlton Madrid — Premium · topPromote · contactInfo populated (Carlos Velasco)
2. Mandarin Oriental Ritz — Premium · topPromote · contactInfo populated (Sara Smith)
3. Four Seasons Madrid — Premium · userModified · no contact
4. The Madrid EDITION — Public · no contact
5. Hard Rock Hotel Marbella — PRO · userModified · no contact
6. W Barcelona — Private · no contact

## Cross-references

| Topic | Doc |
|---|---|
| Library data layer | `docs/data-models/library-models.md` |
| Tier lock rules | `docs/business-rules/tier-system.md` |
| Top Promote rules | `docs/business-rules/promoted-reports.md` |
| Visibility rules | `docs/business-rules/report-visibility.md` |
