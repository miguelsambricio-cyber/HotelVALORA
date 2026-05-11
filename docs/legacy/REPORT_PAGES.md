# REPORT_PAGES.md — HotelVALORA

Operational reference for every report section page: route, status, file path, and the components that compose it. The canonical registry that drives the sidebar lives at `apps/web/src/lib/report/sections.ts`.

**Architecture invariants:**
- Every page mounts inside `<ReportShell>` (`components/report/shell/report-shell.tsx`).
- Every page renders a `<ReportPaper>` or `<ReportSection>` wrapper.
- Every page can include `<ActionBar>` below the paper for FAVORITOS / GUARDAR / UPGRADE.
- The sidebar is registry-driven — adding a section is a one-line edit to `sections.ts` plus a new `app/report/<id>/page.tsx`.
- See `docs/report-system.md` for the full architecture and `docs/print-pdf.md` for print rules.

---

## Page Status Matrix

| # | Section | Route | Sub-anchors | Implemented | File |
|---|---|---|---|---|---|
| 1 | Executive Summary | `/report/executive-summary` | — | ✓ | `app/report/executive-summary/page.tsx` |
| 2 | Asset Analysis — Hotel personalizado | `/report/asset-analysis` | — (parent of CAPEX, Renders) | ✓ | `app/report/asset-analysis/page.tsx` |
| 2a | Asset Analysis — CAPEX & Renders | `/report/asset-analysis/capex` | `#renders` (in-page anchor) | ✓ | `app/report/asset-analysis/capex/page.tsx` |
| 3 | Competitive Set | `/report/competitive-set` | — | ✓ | `app/report/competitive-set/page.tsx` |
| 4 | Market Overview | `/report/market-overview` | (in-page anchors) | ✓ | `app/report/market-overview/page.tsx` |
| 4a | Market Overview · Transactions | `/report/market-overview/transactions` | — | ✓ | `app/report/market-overview/transactions/page.tsx` |
| 4b | Market Overview · Projects | `/report/market-overview/projects` | — | ✓ | `app/report/market-overview/projects/page.tsx` |
| 5 | Financials | `/report/financials` | structure, P&L, IRR | ✗ | (planned) |
| 6 | Methodology | `/report/methodology` | — | ✗ | (planned) |

`implemented: false` sections appear in the sidebar but have no route file yet. They will hit a 404 until the page lands.

---

## Page 1 — Executive Summary

**Route:** `/report/executive-summary`
**Title size:** `2xl` (default)
**Header layout:** `inline` (default)
**Paper closed:** `false` (open bottom — flows into ActionBar)

```
ReportShell
└── ReportPaper [sectionLabel="Hotel Valuation", title="Executive Summary"]
    ├── AssetSection
    ├── MarketSection
    ├── ValuationSection
    └── MethodologicalNote (full-width endcap)
ActionBar
```

| Layer | Source |
|---|---|
| Page | `app/report/executive-summary/page.tsx` |
| Section components | `components/report/executive-summary/{asset,market,valuation}-section.tsx` |
| Sparkline charts | `components/report/charts/sparkline-{bar,line}.tsx` |
| Methodology endcap | `components/report/ui/methodological-note.tsx` |
| Mock data | `lib/report/executive-summary-data.ts` |

---

## Page 2 — Asset Analysis (Hotel personalizado)

**Route:** `/report/asset-analysis`
**Title size:** `4xl`
**Header layout:** `stacked` — PDF button on its own row above section label + title row
**Paper closed:** `true` — fully bordered + rounded card

```
ReportShell
└── ReportPaper [stacked, closed, actions=<HotelLabel + HotelToggle>]
    └── grid-cols-10
        ├── col-span-6 (left, 60%)
        │   ├── AssetMetricsTable      (12 metric rows)
        │   ├── grid-cols-2
        │   │   ├── FacilitiesCard     (10 items, check/dash)
        │   │   └── RoomMixCard        (5 rows, total + types)
        │   ├── grid-cols-2
        │   │   ├── GuestInsightsCard tone="positive"
        │   │   └── GuestInsightsCard tone="negative"
        │   └── MethodologyNote        (inline, column-fitted)
        └── col-span-4 (right, 40%)
            ├── PropertyImageCard      (square image + Catastro/Planos tabs)
            └── PropertyGallery        (vertical 3-image labelled gallery)
ActionBar
```

| Layer | Source |
|---|---|
| Page | `app/report/asset-analysis/page.tsx` |
| Header toggle | `app/report/asset-analysis/hotel-toggle.tsx` (page-local, client) |
| Section components | `components/report/asset-analysis/` (barrel `index.ts`) |
| Mock data | `lib/report/asset-analysis-data.ts` |

The seven asset-analysis components are **family-reusable** — when CAPEX and Renders pages land, they can compose from the same primitives without duplication.

### Stitch reference (replicated layout)

| Stitch element | Implementation |
|---|---|
| `bg-white shadow-2xl border-x border-t border-b border-blue-100 rounded-xl graph-paper` | `<ReportPaper closed>` |
| Header with PDF button on row 1, label + title row 2-3 | `<ReportHeader layout="stacked">` |
| `grid-cols-10` with 6/4 split | `grid grid-cols-1 md:grid-cols-10` + `col-span-6` / `col-span-4` |
| Material Symbols `check` / `horizontal_rule` | Lucide `Check` / `Minus` |
| Material Symbols `thumb_up` / `thumb_down` | Lucide `ThumbsUp` / `ThumbsDown` (filled) |
| Material Symbols `arrow_forward` | Lucide `ArrowRight` |
| Image swap on arrow click | `useState` + `altSrc` toggle inside `PropertyGallery` |
| `text-primary` (`#00331e`) | `text-forest-900` (`#062C1C`) — repo canonical |
| `text-[#0E4B31]` | `text-forest-700` (same hex) |
| `font-display` / `font-headline` aliases | Already in `tailwind.config.ts` |

---

## Page 2a — Asset Analysis · CAPEX & Renders

**Route:** `/report/asset-analysis/capex`
**Title size:** `4xl`
**Header layout:** `stacked`
**Paper closed:** `true`

```
ReportShell
└── ReportPaper [stacked, closed, actions=<HotelLabel + HotelToggle>]
    ├── ToggleSelector (CAPEX BÁSICO / PERSONALIZADO)         [print:hidden]
    ├── grid-cols-[minmax(0,1fr)_220px]   gap 20 px, items-start
    │   ├── (left, 1fr)   space-y-4
    │   │   ├── CapexTable
    │   │   │   ├── CapexTotalRow            (TOTAL CAPEX summary band)
    │   │   │   └── CapexCategory × N        (Hard Cost, Soft Cost, Project Costs)
    │   │   │       └── CostInputRow × N
    │   │   └── CapexScheduleCard            (5th card in the left stack)
    │   │       ├── title "CAPEX Schedule"
    │   │       └── CapexScheduleRow          (6-cell grid 2 cols × 3 rows, gap-x-12, gap-y-4, items-center)
    │   │           ┌─ ROW 1 ─ LEFT  "Duración del CAPEX" + emerald "18 meses" pill
    │   │           │  ROW 1 ─ RIGHT ToggleSelector size="lg"  (Abierto / Cerrado)
    │   │           ├─ ROW 2 ─ LEFT  RangeTrack months 0-36   (paired Y position)
    │   │           │  ROW 2 ─ RIGHT RangeTrack percent 0-100 (paired Y position)
    │   │           └─ ROW 3 ─ LEFT  "0 MESES / 36 MESES" tick labels
    │   │              ROW 3 ─ RIGHT "0% / 100%" tick labels
    │   │           Toggle ↔ % wiring: Cerrado → 0 %, Abierto → 100 %.
    │   │           No visible "operational %" label — accessibility via aria-label only.
    │   └── (right, 220 px) PropertyGallerySidebar
    │       ├── 8 vertical tiles  92 px × 100 %, rounded-[8px], gap 10 px
    │       │                     dark gradient + bottom-left white caption
    │       └── "View All Photos" CTA      [pinned to bottom of card]
    └── 32 px gap → §renders   (print:hidden — interactive authoring control)
        └── RenderConfigurator
            ├── RenderPreviewCard          (hero image + caption overlay)
            ├── RenderTagGroup × 4         (Area, Tipo de imagen, Vista, Imágen por página)
            └── footer row                 (include-in-report checkbox + AI CTA)
```

### Layout contract (institutional A4-ready)

| Region | Rule |
|---|---|
| Top grid | `display: grid; grid-template-columns: minmax(0, 1fr) 250px; gap: 20px; align-items: start;` — fallback to single column on `< lg`. Roughly a 68 / 32 split between CAPEX content and gallery on lg+. |
| Property Gallery column | 250 px wide. Card padding **14 px** (inline `style={{ padding: "14px" }}`). Vertical stack with 10 px gap between tiles. |
| Tile | Width 100 % of card content area, height **fixed 92 px** (inline `style={{ height: "92px" }}`), `object-cover`, `rounded-[10px]`, `shrink-0`, soft `group-hover:scale-105`, dark bottom gradient + white 14 px / 600 caption pinned bottom-left. All 8 tiles share identical dimensions. |
| "View All Photos" CTA | `mt-auto` — pinned to the card's bottom edge regardless of tile count. |
| TOTAL CAPEX row | `px-5 py-3` (≈ 64 px tall), inputs `h-8`, gap-3 between label and controls. |
| CAPEX category header | `md:h-11 px-5` (44 px row, 20 px horizontal padding); chevron + label on the left, input + select on the right. |
| CAPEX line item row | `h-11 pl-8` inside a `px-5` accordion body — 44 px row with 32 px additional indent for hierarchy. |
| Schedule placement | `CapexScheduleCard` lives **inside** the left CAPEX stack (5th card after Project Costs), sharing the same `bg-white border border-slate-200 rounded-xl shadow-sm` chrome as the category cards. Card body padding: **32 px** (`p-8`); title `text-sm font-bold text-slate-800` with `mb-6`. |
| Schedule row | Symmetric 6-cell grid: `grid-cols-2 gap-x-12 gap-y-4 items-center`. Each row of the LEFT column is locked to the same Y as its RIGHT counterpart. |
| Row 1 | LEFT: `flex justify-between` → label + 18 meses pill. RIGHT: `ToggleSelector size="lg"` (Abierto / Cerrado, `h-[38px] w-[100px]`). |
| Row 2 | Two `RangeTrack` instances, identical width & vertical centering. LEFT range: `[minMonths, maxMonths]`; RIGHT range: `[0, 100]`. |
| Row 3 | LEFT: "{minMonths} MESES" / "{maxMonths} MESES" ticks. RIGHT: "0%" / "100%" ticks. Both use `text-[10px] font-bold text-slate-400 uppercase tracking-wider`. |
| Toggle ↔ % | "Cerrado" snaps the % slider to 0; "Abierto" snaps it back to 100. Manual slider drag is independent — does not flip the toggle. |
| Operational % storage | Local React state today; designed to feed the future financial engine's revenue / GOP / EBITDA scaling during CAPEX. |
| Operational toggle button | `height: 38px; width: 100px;` (canonical lg size of `ToggleSelector`) — both buttons strictly equal width. |
| Vertical rhythm | 32 px (`mt-8`) above each `<section>` divider; 24 px (`pt-6`) between border and the section heading; 24 px (`mb-6`) below the heading. |

| Layer | Source |
|---|---|
| Page | `app/report/asset-analysis/capex/page.tsx` |
| Header toggle (reused) | `app/report/asset-analysis/hotel-toggle.tsx` |
| CAPEX & Renders components | `components/report/asset-analysis/capex/` (barrel `index.ts`) |
| Mock data | `lib/report/capex-renders-data.ts` |

This page does **not** use `ActionBar` — its final CTA is the "Generar Variación IA" button inside `RenderConfigurator`. The interactive AI configurator block is `print:hidden` because the rendered preview is what should appear in the PDF; the authoring controls do not.

### Sidebar wiring

Asset Analysis sub-anchors moved from page-local hashes to absolute hrefs:

| Sub-item | Destination |
|---|---|
| Hotel personalizado | `/report/asset-analysis` |
| CAPEX | `/report/asset-analysis/capex` |
| Renders | `/report/asset-analysis/capex#renders` |

The sidebar resolves any sub-item that starts with `/` as a full route, anything that starts with `#` as a parent-relative anchor — that contract lives in `components/report/shell/report-sidebar.tsx`.

### Future-proofing

- CAPEX categories are array-driven in `capex-renders-data.ts` — adding a new line item or a new category means appending to the data file, never editing the page.
- Render tag groups are array-driven the same way — Area / Style / View / ImagesPerPage are not hardcoded inside the JSX.
- `CapexUnit` is a discriminated union (`"total" | "perRoom"`) — extend with new units as needed.
- `OperationalMode` (`"open" | "closed"`) is a discriminated union — extend with new modes.
- `formatCapexAmount` is a single Intl-based helper — locale switch happens in one place.
- All inputs/sliders/toggles are local state today; the future financial-engine integration replaces local state with engine-bound state in one component each.

---

## Page 4 — Market Overview

**Route:** `/report/market-overview`
**Title size:** `4xl`
**Header layout:** `stacked`
**Paper closed:** `true`

```
ReportShell
└── ReportPaper [stacked, closed, actions=<HotelLabel + HotelToggle>]
    ├── HorizontalInsightScroller
    │   │  Web: flex / overflow-x-auto / snap-x snap-mandatory / scrollbar-hide
    │   │  Print: print:grid print:grid-cols-2 (static 2 × 2)
    │   ├── MarketInsightCard scope="country"   (España)
    │   ├── MarketInsightCard scope="market"    (Madrid)
    │   ├── MarketInsightCard scope="submarket" (Madrid Centro)
    │   └── MarketInsightCard scope="class"     (Luxury)
    │
    │   Each MarketInsightCard composes:
    │     ▸ Header: title (text-2xl extrabold forest-900) + InsightBadge
    │     ▸ MetricGrid 3 × 3 (uppercase label + bold value)
    │     ▸ SplitBar (Nacional / Internacional, Direct / OTA, …)
    │     ▸ MiniBarChart × 2 (Arrival, Demographic, Origin, Transport)
    │     ▸ TrendBars (Total Travelers / RevPAR Growth — 5-year stepped bars)
    │     ▸ InvestmentChart × 2 (SVG line charts, primary + dashed secondary)
    │     ▸ Investment metrics 3 × 2 (Investment, Transactions, Year, Class, Completed, UC)
    │     ▸ Footer KPI (Población / Premium Inventory)
    │
    ├── CorporateSportsCard  (single full-width — corporate + sport venues)
    ├── DemandGeneratorsBlock
    │   │  Web + print 2-col: list left, SharedMapCard right
    │   ├── Numbered list (POI + Transport sub-headings)
    │   └── SharedMapCard (data-driven pins, category-coloured)
    └── DemandGeneratorsGallery
        │  4-col image grid (`grid-cols-2 lg:grid-cols-4 print:grid-cols-4`)
        └── DemandGeneratorCard × N (image OR icon-fallback tile)
ActionBar
```

| Layer | Source |
|---|---|
| Page | `app/report/market-overview/page.tsx` |
| Components (13) | `components/report/market-overview/` (barrel `index.ts`) |
| Mock data | `lib/report/market-overview-data.ts` |
| Scroll utility | `.scrollbar-hide` (added to `globals.css`) |

### Web ↔ Print contract

The same `<MarketInsightCard>` instances render in all three modes — no duplication. Mode switching is media-query driven; React only owns the page index for the desktop carousel.

| Mode | Mechanism |
|---|---|
| Mobile / tablet (`< lg`) | `.market-carousel-viewport { overflow-x: auto; scroll-snap-type: x mandatory }` — free horizontal swipe. |
| Desktop (`lg+`) | `.market-carousel-viewport { overflow: hidden }` + track `transform: translateX(calc(var(--page) * (-100% - 24px)))`. Floating arrow buttons (`absolute -left-5 / -right-5`, white circle + slate border + shadow) increment / decrement `--page` to slide exactly 2 cards per click. Disabled state at the edges. |
| Print | `.market-carousel-track { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; transform: none }` — static 2 × 2 grid. Arrows `print:hidden`. |
| Print orientation | A4 **portrait** (canonical, default). The 2 × 2 insight grid stays on a single A4 page via `break-inside: avoid` on `.market-carousel-track` plus aggressive `print:` compaction on every nested element. |
| Print compaction | Card padding `p-6 → print:p-2`; section gaps `gap-6 → print:gap-1.5`; chart heights `h-16 → print:h-7`, `h-12 → print:h-6`, `h-24 → print:h-9`; text sizes scale down to `print:text-[6px]–[9px]`; badges `print:px-1 print:py-0.5`. |

### Print structure (A4)

```
┌─────────────────┬─────────────────┐
│  Country        │  Market         │
│  (España)       │  (Madrid)       │
├─────────────────┼─────────────────┤
│  Submarket      │  Class          │
│  (Madrid Centro)│  (Luxury)       │
└─────────────────┴─────────────────┘
            ↓
   CorporateSportsCard (full-width)
            ↓
   DemandGeneratorsBlock (2-col)
            ↓
   DemandGeneratorsGallery (4-col)
```

Card cells carry `print:break-inside-avoid` so the print engine never splits a card across pages. Investment SVG charts are pure SVG (no chart-lib dep) for print fidelity.

### Future-proofing

- All four insights live in `MarketOverviewData.insights[]` — adding a new scope is a one-line registry edit.
- Every metric / chart series / pin / gallery tile is array-driven; no labels are hardcoded inside JSX.
- `MarketInsight.scope` is a discriminated union (`"country" | "market" | "submarket" | "class"`); add to the union to introduce new layers.
- `DemandGeneratorCategory` (`poi` / `metro` / `train` / `airport`) drives both list pin styling AND map pin styling — extend together.

---

## Page 3 — Competitive Set

**Route:** `/report/competitive-set`
**Title size:** `4xl`
**Header layout:** `inline` (default)
**Paper closed:** `false`

```
ReportShell
└── ReportPaper [actions=<PrimeToggle />]
    ├── CompetitiveSetTable    (7-col table, subject row + 4 competitors)
    └── HotelGalleryGrid       (top: 2x2 images + ReportMap; bottom: 4-per-row grid)
ActionBar
```

| Layer | Source |
|---|---|
| Page | `app/report/competitive-set/page.tsx` |
| Comparison table | `components/report/competitive-set/competitive-set-table.tsx` |
| Image gallery | `components/report/competitive-set/hotel-gallery-grid.tsx` |
| Header toggle | `components/report/competitive-set/prime-toggle.tsx` |
| Mock data | `lib/report/competitive-set-data.ts` |

---

## Adding a New Page

1. **Flip the registry.** Open `apps/web/src/lib/report/sections.ts` and set `implemented: true` on the section entry.
2. **Create the page.** Add `apps/web/src/app/report/<section-id>/page.tsx`. Compose with primitives from `@/components/report/primitives` and family components from `@/components/report/<section-id>/`.
3. **Add the data file.** Drop `apps/web/src/lib/report/<section-id>-data.ts` with mock data.
4. **No** edits to the sidebar, the shell, the print system, or the PDF pipeline. If a new page requires touching any of those, the architecture is leaking — go back to the primitives.
5. **Update three docs**: `REPORT_PAGES.md` (this file — add a row + a layout block), `UI_COMPONENTS.md` (add new components), `docs/changelog.md`.

### Print compatibility checklist

Every new page must pass:
- `<main>` carries `report-print-canvas` (provided by `ReportShell`) — A4 scaling works.
- All multi-column grids carry both `md:` AND `print:` variants (Chrome's print viewport is < 768px).
- All non-essential UI carries `print:hidden` (top nav, sidebar, footer, action bar, upgrade gates, toggles).
- Section page-break behaviour declared on the section entry in `sections.ts`, not in JSX.
- Tested in Chromium (canonical) and Firefox (uses `@-moz-document` fallback).

See `docs/print-pdf.md` for the full print contract.
