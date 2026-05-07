# Print System

The report module exports to A4 PDF via browser `window.print()`. The system forces a desktop-width canvas and scales it down to fit a single A4 page.

---

## Core Problem

Chrome's print viewport = printable A4 width ≈ **718px** (A4 210mm − 20mm margins at 96dpi).  
Tailwind's `md:` breakpoint = **768px**.  
718px < 768px → all `md:` responsive classes are **ignored in print** → every responsive grid collapses to single column.

**Solution:** explicit `print:col-span-*` variants on every column + a fixed-width 960px canvas with `zoom` scaling.

---

## `@page` Rule

```css
@page {
  size: A4 portrait;
  margin: 8mm 10mm;
}
```
Printable area: ~718 × 1063px at 96dpi.

---

## `.report-print-canvas`

Applied to `<main>` in `ReportShell`. Active only in `@media print`.

```css
.report-print-canvas {
  width: 960px !important;
  min-width: 960px !important;
  max-width: 960px !important;
  zoom: 0.74;
  margin: 0 !important;
  padding: 0 !important;
}
```

**Scale math:** `718px / 960px = 0.748` → `0.74` (2px safety gap).  
**Height check:** `~1240px × 0.74 = 918px < 1063px` ✓ fits on one page.

`zoom` (not `transform: scale`) is used because it affects layout AND rendering — no orphaned whitespace or float issues.

---

## Grid Columns in Print

Every section grid must have both `md:` and `print:` variants:

```tsx
// Container
className="grid grid-cols-1 md:grid-cols-12 print:grid-cols-12 gap-8 print:gap-4"

// Left column (7/12)
className="md:col-span-7 print:col-span-7"

// Right column (5/12)
className="md:col-span-5 print:col-span-5"
```

**Never rely on `md:col-span-*` alone** — it won't fire in Chrome print.

---

## What's Hidden in Print

All elements with `print:hidden` are removed from PDF output:

| Element | Class |
|---|---|
| `ReportTopNav` | `print:hidden` on `<header>` |
| `ReportSidebar` | `print:hidden` on sidebar wrapper |
| `ReportFooter` | `print:hidden` on `<footer>` |
| `ActionBar` | `print:hidden` |
| `LockedGate` | `print:hidden` |
| `LockedUpgradeCard` | `print:hidden` |
| `PrimeToggle` | `print:hidden` |

---

## Map Height in Print

`compset-map-container` has `min-height: 450px` on screen. In print:

```css
@media print {
  .compset-map-container { min-height: 0 !important; }
}
```

Map in `MarketSection` is capped at `print:h-36` to prevent overflow at 960px canvas width.

---

## Other Print Overrides (globals.css)

```css
html, body { background: white !important; overflow: hidden; }
.graph-paper { background-image: none !important; }   /* removes dot grid */
section, table { break-inside: avoid; page-break-inside: avoid; }
*, *::before, *::after {
  -webkit-print-color-adjust: exact !important;
  print-color-adjust: exact !important;               /* preserves colors */
}
```

---

## Component Print Variants Reference

| Component | Screen | Print |
|---|---|---|
| `ReportPaper` | `shadow-2xl rounded-t-xl` | `print:shadow-none print:rounded-none print:border-none` |
| `PaperHeader` | `px-8 py-4` | `print:py-2 print:px-4` |
| `SubSectionHeading` | `text-sm` | `print:text-xs print:mb-1` |
| `MethodologicalNote` | `p-6` | `print:p-3` |
| `MiniChartCard` | `h-24` | (unchanged — zoom handles scale) |
| `SparklineGroup` | `space-y-6` | (unchanged — zoom handles scale) |
| `HotelPhotoCarousel` | `aspect-[4/3]` | (unchanged — zoom handles scale) |
| `ReportMap` (MarketSection) | `aspect-video` | `print:aspect-auto print:h-36` |
| `HotelGalleryGrid` top block | `min-h-[460px]` | `print:min-h-0 print:h-80` — caps block at 320px on 960px canvas |
| `HotelGalleryGrid` bottom | `grid-cols-2 md:grid-cols-4` | `print:grid-cols-4` — prevents column collapse |

---

## PDF Export Entry Point

File: `src/lib/report/pdf-export.ts`  
Phase 1: calls `window.print()`. Swap body for react-pdf or Puppeteer without changing call sites.
