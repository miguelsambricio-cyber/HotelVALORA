# Report System

The report module is a standalone section of the app (no dashboard chrome). It renders institutional-quality hotel valuation reports, supports PDF export via browser print, and gates sections behind premium tiers.

---

## Shell Hierarchy

```
ReportShell                          components/report/shell/report-shell.tsx
├── ReportTopNav (print:hidden)      components/report/shell/report-top-nav.tsx
├── ReportSidebar (print:hidden)     components/report/shell/report-sidebar.tsx
├── <main class="report-print-canvas">
│   └── [page children]
│       ├── ReportPaper              components/report/shell/report-paper.tsx
│       │   ├── PaperHeader          (internal — PDF export button + section label + h2)
│       │   └── [section children]
│       └── ActionBar (print:hidden) components/report/executive-summary/action-bar.tsx
└── ReportFooter (print:hidden)      components/report/shell/report-footer.tsx
```

---

## Executive Summary Page

**Route:** `/report/executive-summary`  
**File:** `app/report/executive-summary/page.tsx`  
**Data:** `src/lib/report/executive-summary-data.ts` (mock; replace with `GET /api/v1/reports/{id}`)

### Section order (within ReportPaper)

1. **AssetSection** — Hotel facts table + `HotelPhotoCarousel`
2. **MarketSection** — Market metrics table + `ReportMap` (full CompSet map)
3. **ValuationSection** — Valuation table + `SparklineGroup`
4. **MethodologicalNote** — Disclaimer text block

### Section grid pattern

Every section uses a 12-col grid with explicit `print:` variants:
```tsx
<div className="grid grid-cols-1 md:grid-cols-12 print:grid-cols-12 gap-8 print:gap-4">
  <div className="md:col-span-7 print:col-span-7">  {/* left — table */}
  <div className="md:col-span-5 print:col-span-5">  {/* right — visual */}
```
`md:` variants handle screen layout; `print:` variants handle PDF layout (Chrome print viewport < 768px breakpoint).

---

## Components

### SparklineGroup
File: `components/report/executive-summary/sparkline-group.tsx`  
Renders 3 `MiniChartCard` (h-24 each): Occupancy TTM (bar), ADR TTM (line), RevPAR TTM (area).

### HotelPhotoCarousel
File: `components/report/executive-summary/hotel-photo-carousel.tsx`  
Client component. `aspect-[4/3]`, bottom-right nav arrows, `1/5` counter. Photos from `photos[]` prop; defaults to 5 Unsplash hotel images.

### ReportMap
File: `components/report/ui/report-map.tsx`  
Client component. Full CompSet map — uses `useCompset()` + `useMapViewport()`. Includes `CompsetMapGL` (dynamic, ssr:false), `MapControls` (zoom), `MapLegend` (layer toggles). No `CompetitorPanel` in report view.

### ActionBar
File: `components/report/executive-summary/action-bar.tsx`  
3-col grid, h-16, `print:hidden`. Buttons (text only): FAVORITOS | GUARDAR (with "Página X de Y") | UPGRADE (`bg-[#005db7]`).

### LockedGate
File: `components/report/ui/locked-gate.tsx`  
Displays blurred locked rows + tier badge + upgrade CTA. Has `print:hidden` — upgrade gates are removed from PDF.

### SubSectionHeading
File: `components/report/executive-summary/sub-section-heading.tsx`  
Uppercase label for each section. `print:text-xs print:mb-1`.

### MethodologicalNote
File: `components/report/ui/methodological-note.tsx`  
Disclaimer / data sources block. `print:p-3 print:bg-white`, `print:text-[8px]`.

---

## Sparkline Charts

| Component | File | Type |
|---|---|---|
| `SparklineBar` | `components/report/charts/sparkline-bar.tsx` | SVG bar chart |
| `SparklineLine` | `components/report/charts/sparkline-line.tsx` | SVG line / area chart |

Both are pure SVG, no external chart lib. `SparklineLine` accepts `showArea` + `gradientId` for area fill.

---

## Competitive Set Page

**Route:** `/report/competitive-set`  
**File:** `app/report/competitive-set/page.tsx`  
**Data:** `src/lib/report/competitive-set-data.ts` (mock; replace with API)

### Structure (within ReportPaper)

1. **CompetitiveSetTable** — 7-column comparison table (property name, stars, keys, submarket, facilities, location score, distance)
2. **HotelGalleryGrid** — 4-col grid of `HotelGalleryCard` (20 images, `aspect-[4/3]`)

### Header
- `titleSize="4xl"` → `text-4xl font-extrabold` (Stitch design spec)
- `headerRight={<PrimeToggle />}` — emerald toggle switch, client component, `print:hidden`

### Table row variants
- **Subject Property**: `bg-emerald-50/50` row, green dot, `text-emerald-500` stars, `text-emerald-600` facilities, `bg-emerald-200/600` score bar
- **Competitor**: normal row, `text-amber-400` stars, `text-slate-500` facilities, `bg-slate-200/600` score bar
- Unavailable facility: `opacity-30` on icon

### Facility icons (Lucide)
`bar → Wine` | `restaurant → UtensilsCrossed` | `rooftop → Sun` | `meeting → Users` | `gym → Dumbbell` | `spa → Leaf`

### Gallery card
`aspect-[4/3]`, `rounded-xl`, `border border-slate-200 shadow-sm`. Arrow button `absolute bottom-2 right-2`, frosted glass bg, `group-hover:scale-110`. Image scales `group-hover:scale-105`.

### Gallery layout

**Top block:** `grid-cols-12 min-h-[460px]`
- Left (`col-span-5`): `grid grid-cols-2 grid-rows-2 h-full` — 4 images fill the 2×2 cells with `h-full aspect-auto object-cover`
- Right (`col-span-7`): `ReportMap` with `h-full` — same height as 2×2 block. `min-h-[460px]` on parent satisfies the map's `min-height: 450px` CSS constraint.

**Bottom block:** `grid-cols-4` — remaining 16 images with standard `aspect-[4/3]` cards.

### Print
- Table: natural table layout at 960px canvas — no column collapse needed
- Top block: `print:min-h-0 print:h-80` → caps at 320px on the 960px canvas
- Map in print: `compset-map-container { min-height: 0 !important }` already in globals.css
- Gallery bottom: `print:grid-cols-4` to prevent column collapse
- `PrimeToggle`: `print:hidden`

---

## Premium Gating

See `docs/business-rules.md` for tier definitions.  
`LockedGate rows={[...]} tier="PRO"|"PREMIUM"` — renders after the visible table rows.  
In print (`print:hidden`): locked sections are removed entirely from PDF output.

---

## Data Formatters

File: `src/lib/report/executive-summary-data.ts`

| Function | Output |
|---|---|
| `fmtMillionsEUR(n)` | `€12.5M` |
| `fmtThousandsEUR(n)` | `€125K` |
| `fmtEURPerSqm(n)` | `€3,200/m²` |
| `fmtPercent(n, decimals?)` | `72.5%` |
| `fmtADR(n)` | `€185` |
| `fmtOccupancy(n)` | `74.2%` |
| `fmtRevPAR(n)` | `€137` |

---

## Report Navigation

Registry: `src/lib/report/report-nav.ts`  
6 sections, 15 items total. Sidebar uses this registry to render nav links. Add new sections here first.
