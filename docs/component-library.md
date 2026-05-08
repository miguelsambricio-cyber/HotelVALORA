# Component Library

**Status:** canonical (Phase 0 stabilization, 2026-05-08).
Reusable primitives for building report sections. Section pages should compose from this surface — never reach into `executive-summary/`, `competitive-set/`, `kpi/`, or `ui/` directly when a primitive exists.

Import from a single barrel:

```ts
import {
  ReportSection, ReportHeader,
  MetricRow, MetricTable,
  StatCard, StatGrid,
  UpgradeGate, UpgradeCard,
  ImageGallery, ImageGalleryCard,
  ReportMap, PrintPage, PdfExportButton,
} from "@/components/report/primitives";
```

---

## Layout Primitives

### `ReportSection`

Page-level wrapper. Renders the white paper card with a header bar and a body slot, and applies `print:break-before-page` when `section.printPageBreak` is true.

```tsx
<ReportSection
  section={section}                 // ReportSection metadata from sections.ts
  sectionLabel="Hotel Valuation"    // optional override (default: "Hotel Valuation")
  title="Executive Summary"         // optional override (default: section.label)
  titleSize="2xl" | "4xl"           // hero variant
  actions={<PrimeToggle />}         // optional right-aligned controls
  hideExportButton                  // suppress the built-in PDF button
>
  ...body...
</ReportSection>
```

**File:** `components/report/primitives/report-section.tsx`

### `ReportHeader`

Header bar — small label, page title, optional actions, PDF export button. Used internally by `ReportSection` and `ReportPaper`. Reach for it directly only when building a fully bespoke shell.

```tsx
<ReportHeader
  sectionLabel="Hotel Valuation"
  title="Market Overview"
  titleSize="2xl"
  actions={...}
  hideExportButton={false}
/>
```

**File:** `components/report/primitives/report-header.tsx`

### `PrintPage`

Declarative wrapper for fine-grained print-page semantics inside a section.

```tsx
<PrintPage pageBreakBefore avoidBreakInside>
  <LongTable />
</PrintPage>
```

Most page-break needs are owned by `sections.ts`. Use `PrintPage` only for inside-section control.

**File:** `components/report/primitives/print-page.tsx`

---

## Data Display

### `MetricRow`

Label-value row. The atomic unit of every report table.

```tsx
<MetricRow
  label="Cap Rate"
  value="6.25%"
  sublabel="EBITDA after replacement"
  separator="light" | "strong" | "none"
  highlight    // emerald-tinted, bold value, used for headline metrics
  muted        // italic + slate-400, used for secondary comparables
/>
```

**File:** `components/report/primitives/metric-row.tsx`

### `MetricTable`

Vertical stack of `MetricRow`s with optional caption and a density knob.

```tsx
<MetricTable caption="Valuation" density="default">
  <MetricRow ... />
  <MetricRow ... highlight />
</MetricTable>
```

`density`: `compact` | `default` | `comfortable` (controls row vertical padding).

**File:** `components/report/primitives/metric-table.tsx`

### `StatCard` / `StatGrid`

KPI card with label, big value, trend badge, period, optional benchmark. `StatGrid` renders an array.

```tsx
<StatCard
  id="adr"
  label="ADR"
  value={185}
  prefix="€"
  change={5.2}
  trend="up"
  period="LTM"
  benchmark={172}
  benchmarkLabel="Mercado"
/>

<StatGrid kpis={[...]} columns={4} />
```

**Files:** `components/report/primitives/stat-card.tsx` (re-exports `KPICard`/`KPIGrid` under canonical names).

---

## Premium Gating

### `UpgradeGate`

Inline blurred-row teaser embedded in the middle of a section. `print:hidden`.

```tsx
<UpgradeGate
  rows={["P&L Premium", "Underwriting & IRR Equity"]}
  tier="PREMIUM"
/>
```

### `UpgradeCard`

Full-width upgrade promotion card. `print:hidden`.

```tsx
<UpgradeCard rows={["..."]} tier="PRO" />
```

**Files:** `components/report/primitives/upgrade-gate.tsx` (re-exports `LockedGate`/`LockedUpgradeCard`).

See `docs/business-rules.md` for which rows are gated in which sections.

---

## Visual Primitives

### `ImageGallery` / `ImageGalleryCard`

Multi-cell image grid with hover scale and frosted-glass detail buttons. Currently the `HotelGalleryGrid` implementation; future sections (asset analysis, market overview) reuse the same primitive.

```tsx
<ImageGallery images={[...]} />
<ImageGalleryCard src="..." alt="..." className="h-full aspect-auto" />
```

**Files:** `components/report/primitives/image-gallery.tsx` (re-exports `HotelGalleryGrid`/`HotelGalleryCard`).

### `ReportMap`

Full CompSet map without the competitor panel. Used in the Executive Summary's Market section and in the CompSet gallery hero block.

```tsx
<ReportMap referenceHotelId="..." className="h-full" />
```

**File:** `components/report/primitives/report-map.tsx` (re-exports from `ui/report-map.tsx`).

---

## PDF Export

### `PdfExportButton`

Routes through `exportReport` in `lib/report/pdf-export.ts`. Phase 1 calls `window.print()`; Phase 2 will swap to a server-side renderer without changing call sites.

```tsx
<PdfExportButton report={metadata} variant="primary" />
```

`variant`: `"primary"` (Stitch blue) | `"ghost"` (subtle).

**File:** `components/report/primitives/pdf-export-button.tsx`

---

## Section Components (not primitives)

These live alongside the primitives and are domain-specific. They are imported directly, not from the barrel.

| Component | File |
|---|---|
| `AssetSection` | `components/report/executive-summary/asset-section.tsx` |
| `MarketSection` | `components/report/executive-summary/market-section.tsx` |
| `ValuationSection` | `components/report/executive-summary/valuation-section.tsx` |
| `SparklineGroup` | `components/report/executive-summary/sparkline-group.tsx` |
| `HotelPhotoCarousel` | `components/report/executive-summary/hotel-photo-carousel.tsx` |
| `ActionBar` | `components/report/executive-summary/action-bar.tsx` |
| `CompetitiveSetTable` | `components/report/competitive-set/competitive-set-table.tsx` |
| `PrimeToggle` | `components/report/competitive-set/prime-toggle.tsx` |
| `MethodologicalNote` | `components/report/ui/methodological-note.tsx` |
| `SparklineBar` / `SparklineLine` | `components/report/charts/` |

---

## Shell Components (consumed once, by `ReportShell`)

| Component | File |
|---|---|
| `ReportShell` | `components/report/shell/report-shell.tsx` |
| `ReportTopNav` | `components/report/shell/report-top-nav.tsx` |
| `ReportSidebar` | `components/report/shell/report-sidebar.tsx` (driven by `sections.ts`) |
| `ReportFooter` | `components/report/shell/report-footer.tsx` |
| `ReportPaper` | `components/report/shell/report-paper.tsx` (use `ReportSection` for new pages) |

---

## Conventions

- Section pages **import only** from `@/components/report/primitives`, `@/components/report/shell`, and direct paths to domain section components.
- Primitives must remain **purely presentational** — no API calls, no localStorage, no `useEffect` data fetching.
- New primitive? Add the file under `components/report/primitives/`, export from `index.ts`, and add a row to this catalog. Update `docs/changelog.md`.
- Removing or renaming a primitive is a breaking change — search every consumer before doing so.
