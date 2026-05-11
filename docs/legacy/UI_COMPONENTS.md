# UI_COMPONENTS.md — HotelVALORA

Catalog of report-domain components grouped by import surface. The canonical primitives are the preferred building blocks for new section pages; section families add domain-specific composites on top.

**Import order of preference (top → bottom):**

1. `@/components/report/primitives` — generic, cross-section primitives.
2. `@/components/report/<section-family>` — components shared across one section family (e.g. asset-analysis, executive-summary, competitive-set).
3. `@/components/report/shell` — page chrome (only consumed by section pages, never inside sections).

If a primitive does not exist for what you need, **build it under `primitives/`** and add it to this catalog before composing the section.

---

## Canonical Primitives — `components/report/primitives/`

Single import surface: `import { ... } from "@/components/report/primitives"`.

### Layout

| Component | Props (highlights) | Purpose |
|---|---|---|
| `ReportSection` | `section`, `sectionLabel`, `title?`, `titleSize?`, `actions?`, `headerLayout?`, `closed?`, `hideExportButton?` | Page-level wrapper — paper card + header + section-metadata-driven page-break |
| `ReportHeader` | `sectionLabel`, `title`, `titleSize?`, `actions?`, `layout?: "inline"\|"stacked"`, `hideExportButton?` | Header bar — `layout="stacked"` puts the PDF button on its own row above |
| `PrintPage` | `pageBreakBefore?`, `pageBreakAfter?`, `avoidBreakInside?` | Declarative wrapper for inside-section page-break control |

### Data display

| Component | Props (highlights) | Purpose |
|---|---|---|
| `MetricRow` | `label`, `value`, `sublabel?`, `subvalue?`, `muted?`, `highlight?`, `separator?: "none"\|"light"\|"strong"` | Atomic label/value row |
| `MetricTable` | `caption?`, `density?: "compact"\|"default"\|"comfortable"` | Stack of `MetricRow`s |
| `StatCard` / `StatGrid` | `label`, `value`, `change?`, `trend?`, `period?`, `benchmark?`, `variant?`, `columns?` | KPI card + responsive grid |

### Visual

| Component | Props | Purpose |
|---|---|---|
| `ImageGallery` / `ImageGalleryCard` | `images?`, `src`, `alt`, `className?` | 4-column image grid (re-exports `HotelGalleryGrid` / `HotelGalleryCard`) |
| `ReportMap` | `referenceHotelId?`, `className?` | Full CompSet map without competitor panel |

### Premium gating

| Component | Props | Purpose |
|---|---|---|
| `UpgradeGate` | `rows`, `tier?: "PRO"\|"PREMIUM"` | Inline blurred-row teaser inside a section (`print:hidden`) |
| `UpgradeCard` | `rows`, `tier?` | Full-width upgrade promotion card (`print:hidden`) |

### PDF export

| Component | Props | Purpose |
|---|---|---|
| `PdfExportButton` | `report?`, `variant?: "primary"\|"ghost"` | Routes through `lib/report/pdf-export.ts` → swap to server-side without changing call sites |

---

## Asset Analysis Family — `components/report/asset-analysis/`

Section-family components for Asset Analysis pages (Hotel personalizado, CAPEX, Renders). All consumable through one barrel.

```ts
import {
  AssetMetricsTable, FacilitiesCard, RoomMixCard,
  GuestInsightsCard, PropertyImageCard, PropertyGallery,
  MethodologyNote,
} from "@/components/report/asset-analysis";
```

| Component | Props | Purpose |
|---|---|---|
| `AssetMetricsTable` | `rows: AssetMetricsRow[]` | Left-column metrics — fixed-height label/value pairs with light separators |
| `FacilitiesCard` | `items: FacilityItem[]`, `title?` | 2-column checklist card (Lucide `Check` for available, `Minus` for not) |
| `RoomMixCard` | `rows: RoomMixRow[]`, `title?` | Type/Units/Size table with a bold totals row separated by a thin spacer |
| `GuestInsightsCard` | `tone: "positive"\|"negative"`, `title`, `body` | Slate-50 card with `ThumbsUp`/`ThumbsDown` icon |
| `PropertyImageCard` | `src`, `alt?`, `tabs?: { label, href? }[]` | Square hero image with caption tabs underneath (first tab active) |
| `PropertyGallery` | `images: GalleryImage[]`, `label?` | Vertical labelled gallery with arrow-button image-swap (`altSrc`) |
| `MethodologyNote` | `children?`, `hideTopBorder?` | Compact inline methodology note for inside-column placement |

**Data types:** `AssetMetricsRow`, `FacilityItem`, `RoomMixRow`, `GalleryImage`, `PropertyMedia`, `GuestInsights`, `AssetAnalysisData` — all in `lib/report/asset-analysis-data.ts`.

---

## Market Overview Family — `components/report/market-overview/`

Country / Market / Submarket / Class insight cards plus the shared modules below them. All consumable through one barrel:

```ts
import {
  HorizontalInsightScroller,
  MarketInsightCard,
  MetricGrid, SplitBar, MiniBarChart, TrendBars,
  InvestmentChart, InsightBadge,
  CorporateSportsCard, SharedMapCard,
  DemandGeneratorsBlock,
  DemandGeneratorCard, DemandGeneratorsGallery,
} from "@/components/report/market-overview";
```

| Component | Props | Purpose |
|---|---|---|
| `HorizontalInsightScroller` | `children`, `visibleCount?` (2), `gapClass?` | Web: snap-x flex scroller showing N cards at a time. Print: collapses to `print:grid-cols-2` 2 × 2. Same children render in both modes. |
| `MarketInsightCard` | `insight: MarketInsight` | Self-contained insight card: header → metric grid → split bar → mini charts → trend → investment charts → tech metrics → footer KPI. |
| `MetricGrid` | `metrics: InsightMetric[]`, `columns?` (3), `bordered?` (true) | Uppercase-label + bold-value grid used inside Market Insight cards. |
| `SplitBar` | `data: SplitBarData` | Two-segment ratio bar (e.g. Nacional / Internacional) with percentage labels above. |
| `MiniBarChart` | `data: MiniBarChartData`, `palette?: "emerald"\|"slate"` | Compact 4-bar chart inside a slate-50 framed card. |
| `TrendBars` | `data: TrendBarsData` | 5-bar step-shaded trend block with title + emerald variation pill. |
| `InvestmentChart` | `data: InvestmentChartData` | Pure SVG line / area chart — primary solid emerald-700 + optional dashed slate-400 secondary. |
| `InsightBadge` | `children`, `className?` | Small uppercase emerald pill rendered top-right of every card. |
| `CorporateSportsCard` | `data: CorporateSportsData` | Single full-width card with corporate (left) and sport / music (right) venue rows. |
| `SharedMapCard` | `imageSrc`, `pins: DemandGeneratorMapPin[]` | Stylised teal-bg map with numbered category-coloured pins. |
| `DemandGeneratorsBlock` | `data: DemandGeneratorsData` | 2-col layout: numbered POI / Transport list + `SharedMapCard`. |
| `DemandGeneratorCard` | `tile: DemandGeneratorTile` | Single 4:3 image card with hover-scale arrow button; falls back to a Lucide-icon placeholder when no image. |
| `DemandGeneratorsGallery` | `tiles: DemandGeneratorTile[]`, `title?` | Section block: heading + 4-col grid of `DemandGeneratorCard`. |

**Data types:** `MarketInsight`, `InsightMetric`, `SplitBarData`, `SplitBarSegment`, `MiniBarChartData`, `MiniBarChartItem`, `TrendBarsData`, `InvestmentChartData`, `InvestmentMetric`, `InsightFooter`, `CorporateSportsData`, `CorporateRow`, `DemandGeneratorsData`, `DemandGeneratorListItem`, `DemandGeneratorMapPin`, `DemandGeneratorCategory`, `DemandGeneratorTile`, `MarketOverviewData`. All in `lib/report/market-overview-data.ts`.

---

## Asset Analysis · CAPEX & Renders Family — `components/report/asset-analysis/capex/`

CAPEX breakdown, scheduling, and AI render configuration. All consumable through one barrel:

```ts
import {
  CapexTable, CapexCategory, CapexTotalRow, CostInputRow,
  CapexTimeline, ToggleSelector,
  PropertyGallerySidebar,
  RenderConfigurator, RenderTagGroup, RenderPreviewCard,
} from "@/components/report/asset-analysis/capex";
```

| Component | Props | Purpose |
|---|---|---|
| `CapexTable` | `breakdown: CapexBreakdown` | Composes `CapexTotalRow` + every `CapexCategory` in registry order |
| `CapexCategory` | `category: CapexCategoryData` | Collapsible block with editable category total + per-line `CostInputRow`s |
| `CapexTotalRow` | `total`, `unit?`, `unitOptions?` | Headline TOTAL CAPEX summary band (forest-tinted) |
| `CostInputRow` | `label`, `amount`, `unit?`, `indent?`, `readOnly?` | Single label/value/unit row inside a category |
| `ToggleSelector<T>` | `options`, `defaultSelectedId?`, `selectedId?`, `onChange?`, `size?: "md"\|"lg"` | Generic segmented control — used for CAPEX BÁSICO/PERSONALIZADO and Abierto/Cerrado |
| `RangeTrack` | `value`, `min`, `max`, `onChange`, `ariaLabel?`, `fillColor?`, `thumbBorder?` | Bare horizontal range slider — slate track + coloured fill + thumb + invisible `<input type="range">` overlay. Used twice in `CapexScheduleRow` (months + percent) so both sliders land on the exact same grid row. |
| `CapexTimeline` | `defaultMonths?`, `value?`, `onChange?`, `minMonths`, `maxMonths`, `label?`, `unitLabel?`, `showLabel?`, `showBadge?`, `floatingBadge?`, `sliderMaxWidth?` | Higher-level slider that wraps `RangeTrack` with optional label + badge variants. Available for future single-slider use cases; not consumed by `CapexScheduleRow` (which uses `RangeTrack` + `CapexDurationBadge` directly to lock row alignment). |
| `CapexDurationBadge` | `months`, `unitLabel?` | Emerald pill rendered in `CapexScheduleRow` row 1 next to the "Duración del CAPEX" label. |
| `CapexScheduleRow` | `schedule: CapexSchedule` | Symmetric 6-cell grid (2 cols × 3 rows, `gap-x-12 gap-y-4 items-center`). Owns months / mode / pct state. Toggle ↔ % wiring: "Cerrado" → 0 %, "Abierto" → 100 %. |
| `CapexScheduleCard` | `schedule`, `id?`, `title?` | Card wrapper — places `CapexScheduleRow` inside the same chrome as `CapexCategory` (white surface, slate-200 border, rounded-xl, shadow-sm) with **32 px** body padding. Used as the 5th card in the left CAPEX column. |
| `PropertyGallerySidebar` | `data: PropertyGalleryData`, `title?`, `footerLabel?` | Right-rail gallery with "N items" badge + "View All Photos" CTA |
| `RenderConfigurator` | `state: RenderConfigState`, `onGenerate?` | AI render block — hero preview + tag groups + final CTA. `print:hidden` |
| `RenderTagGroup` | `group: RenderTagGroupData`, `onChange?` | One labelled row of pill buttons with single-select state |
| `RenderPreviewCard` | `preview: RenderPreview` | Hero render image with bottom gradient + caption overlay |

**Data types:** `CapexBreakdown`, `CapexCategoryData`, `CapexLineItem`, `CapexUnit`, `CapexMode`, `CapexSchedule`, `OperationalMode`, `PropertyGalleryItem`, `PropertyGalleryData`, `RenderTagOption`, `RenderTagGroupData`, `RenderPreview`, `RenderConfigState`, `CapexRendersData` — all in `lib/report/capex-renders-data.ts`. `formatCapexAmount` is the canonical formatter.

---

## Executive Summary Family — `components/report/executive-summary/`

| Component | Imported by |
|---|---|
| `AssetSection` | `app/report/executive-summary/page.tsx` |
| `MarketSection` | `app/report/executive-summary/page.tsx` |
| `ValuationSection` | `app/report/executive-summary/page.tsx` |
| `SparklineGroup` | `ValuationSection` |
| `HotelPhotoCarousel` | `AssetSection` |
| `ActionBar` | every section page (FAVORITOS / GUARDAR / UPGRADE footer) |
| `SubSectionHeading` | per-section uppercase divider |

`MethodologicalNote` (full-width endcap variant) lives at `components/report/ui/methodological-note.tsx` and is used by Executive Summary. The narrower inline variant `MethodologyNote` (in `asset-analysis/`) is for inside-column placement.

---

## Competitive Set Family — `components/report/competitive-set/`

| Component | Purpose |
|---|---|
| `CompetitiveSetTable` | 7-column comparison table (subject + competitors) |
| `HotelGalleryGrid` | Top hero block (2×2 images + map) + bottom 4-per-row grid |
| `HotelGalleryCard` | Single image card with hover scale + frosted detail button |
| `PrimeToggle` | "Prime" label + emerald toggle switch |

---

## Charts — `components/report/charts/`

| Component | Type |
|---|---|
| `SparklineBar` | Pure SVG bar chart |
| `SparklineLine` | Pure SVG line / area chart (`showArea`, `gradientId`) |
| `ChartContainer` | Generic chart frame (header + body + footer) |
| `ChartPlaceholder` | Skeleton/empty state |

---

## KPI — `components/report/kpi/`

| Component | Surfaced as |
|---|---|
| `KPICard` | `StatCard` (primitives barrel) |
| `KPIGrid` | `StatGrid` (primitives barrel) |

Section pages should import via the canonical `StatCard` / `StatGrid` names — the underlying file names are an implementation detail.

---

## Shell — `components/report/shell/`

Consumed only by section pages. Never imported inside section components.

| Component | Purpose |
|---|---|
| `ReportShell` | Outer chrome — top nav + sidebar + main canvas + footer |
| `ReportTopNav` | Fixed top bar with logo + nav links (`print:hidden`) |
| `ReportSidebar` | Sticky left sidebar driven by `sections.ts` (`print:hidden`) |
| `ReportFooter` | Dark slate-950 footer (`print:hidden`) |
| `ReportPaper` | Paper card surface — composes `ReportHeader` from primitives |

---

## Conventions

- Every `"use client"` component has the directive on line 1.
- Every component file exports its `Props` interface alongside the component (e.g. `export type { FacilitiesCardProps }`).
- Re-export through the family barrel (`<family>/index.ts`) so call sites don't depend on internal file paths.
- New family component? Drop a row into the section-family table above.
- New primitive? Drop a row into the appropriate Primitives table above and update the barrel.

If a component is duplicated, deleted, or renamed, update this file in the same commit. Drift here costs more than the file rename itself.
