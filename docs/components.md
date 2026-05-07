# Components

Reusable component catalog. File paths relative to `apps/web/src/`.

---

## Report Shell

| Component | File | Props | Notes |
|---|---|---|---|
| `ReportShell` | `components/report/shell/report-shell.tsx` | `children` | Full report layout — top nav + sidebar + main + footer |
| `ReportTopNav` | `components/report/shell/report-top-nav.tsx` | — | Fixed top bar; logo → `/`; `print:hidden` |
| `ReportSidebar` | `components/report/shell/report-sidebar.tsx` | — | Sticky sidebar; uses `report-nav.ts` registry; `print:hidden` |
| `ReportFooter` | `components/report/shell/report-footer.tsx` | — | Dark footer; `print:hidden` |
| `ReportPaper` | `components/report/shell/report-paper.tsx` | `sectionLabel`, `title`, `titleSize?`, `headerRight?`, `children` | White card; `titleSize="4xl"` for Competitive Set; `headerRight` for page-specific header controls |

---

## Executive Summary Sections

| Component | File | Props |
|---|---|---|
| `AssetSection` | `components/report/executive-summary/asset-section.tsx` | `asset: AssetData`, `meta: ExecutiveSummaryMeta` |
| `MarketSection` | `components/report/executive-summary/market-section.tsx` | `data: MarketMetricsData` |
| `ValuationSection` | `components/report/executive-summary/valuation-section.tsx` | `valuation: ValuationData`, `charts: ChartSeriesData` |
| `SparklineGroup` | `components/report/executive-summary/sparkline-group.tsx` | `charts: ChartSeriesData` |
| `HotelPhotoCarousel` | `components/report/executive-summary/hotel-photo-carousel.tsx` | `name: string`, `photos?: string[]` |
| `ActionBar` | `components/report/executive-summary/action-bar.tsx` | `currentPage: number`, `totalPages: number` |
| `SubSectionHeading` | `components/report/executive-summary/sub-section-heading.tsx` | `title: string` |

---

## Competitive Set

| Component | File | Props | Notes |
|---|---|---|---|
| `CompetitiveSetTable` | `components/report/competitive-set/competitive-set-table.tsx` | `properties: CompetitorProperty[]` | 7-column table: name, stars, keys, submarket, facilities, location score, distance |
| `HotelGalleryGrid` | `components/report/competitive-set/hotel-gallery-grid.tsx` | `images: GalleryImage[]` | Top block: 2×2 images + ReportMap (same height). Bottom: 4-per-row grid |
| `HotelGalleryCard` | `components/report/competitive-set/hotel-gallery-card.tsx` | `src`, `alt`, `className?` | `aspect-[4/3]` default; pass `h-full aspect-auto` for top-block cells |
| `PrimeToggle` | `components/report/competitive-set/prime-toggle.tsx` | `defaultEnabled?` | Client toggle switch; `print:hidden` |

---

## Report UI Primitives

| Component | File | Props | Notes |
|---|---|---|---|
| `LockedGate` | `components/report/ui/locked-gate.tsx` | `rows: string[]`, `tier: "PRO"\|"PREMIUM"` | Blurred rows + upgrade CTA; `print:hidden` |
| `LockedUpgradeCard` | `components/report/ui/locked-upgrade-card.tsx` | `tier`, `features` | Full upgrade card; `print:hidden` |
| `MethodologicalNote` | `components/report/ui/methodological-note.tsx` | — | Disclaimer block at bottom of report |
| `ReportMap` | `components/report/ui/report-map.tsx` | `className?` | Full CompSet map for report; no competitor panel |

---

## Charts

| Component | File | Props | Notes |
|---|---|---|---|
| `SparklineBar` | `components/report/charts/sparkline-bar.tsx` | `data: number[]` | Pure SVG bar chart |
| `SparklineLine` | `components/report/charts/sparkline-line.tsx` | `data: number[]`, `strokeColor?`, `showArea?`, `gradientId?` | Pure SVG line/area chart |

---

## CompSet / Map

| Component | File | Props | Notes |
|---|---|---|---|
| `CompsetMap` | `components/compset/compset-map.tsx` | `referenceHotelId?` | Full map with panel — used on `/compset` page |
| `CompsetMapGL` | `components/maps/compset-map-gl.tsx` | `viewState`, `onViewStateChange`, `referenceHotel`, `competitors`, `suggested`, `layers` | Mapbox GL; dynamic import, ssr:false |
| `CompetitorPanel` | `components/compset/competitor-panel.tsx` | `referenceHotel`, `competitors`, `suggested`, `isLoading`, `panelOpen`, `onToggle`, `onAdd`, `onRemove` | Slide-out panel; "Confirmar CompSet →" → `/report/executive-summary` |
| `MapControls` | `components/compset/map-controls.tsx` | `onZoomIn`, `onZoomOut`, `className?` | +/- zoom buttons |
| `MapLegend` | `components/compset/map-legend.tsx` | `layers`, `onToggleLayer`, `className?` | Layer toggle checkboxes |

---

## Landing

| Component | File | Notes |
|---|---|---|
| `LandingHeader` | `components/landing/landing-header.tsx` | Used on `/` and `/compset` |
| `LandingFooter` | `components/landing/landing-footer.tsx` | Used on `/` and `/compset` |
| `HeroSection` | `components/landing/hero-section.tsx` | Main hero on landing page |
| `PricingSection` | `components/landing/pricing-section.tsx` | Pricing tiers on landing page |

---

## Hooks

| Hook | File | Returns |
|---|---|---|
| `useCompset(referenceHotelId?)` | `lib/hooks/use-compset.ts` | `referenceHotel`, `competitors`, `suggested`, `layers`, `isLoading`, `error`, `panelOpen`, `setPanelOpen`, `addCompetitor`, `removeCompetitor`, `toggleLayer` |
| `useMapViewport()` | `hooks/maps/use-map-viewport.ts` | `viewState`, `setViewState`, `zoomIn`, `zoomOut` |

---

## Shared UI Primitives

Location: `components/ui/` — Radix-based (Button, Card, Badge, Dialog, etc.)

---

## Naming Conventions

- Section components: `<Domain>Section` (e.g., `AssetSection`, `MarketSection`)
- Table helpers: `<Domain>Table` (e.g., `ValuationTable`, `MarketMetricsTable`)
- Shell components: `Report*` (e.g., `ReportShell`, `ReportPaper`)
- Client components: must have `"use client"` as first line
- Dynamic map imports: always `dynamic(() => import(...), { ssr: false })`
