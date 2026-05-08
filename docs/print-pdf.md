# Print / PDF System

**Status:** canonical, Phase 0 + Market Overview iteration (2026-05-08).
The report module produces an A4 PDF via the browser's native print dialog. The system forces a fixed-width desktop canvas, scales it to the A4 printable column, and applies a Firefox fallback for browsers where `zoom` is a no-op.

Two canvas orientations are defined: **A4 portrait** (default) and **A4 landscape** (opt-in via `<ReportShell printOrientation="landscape">`). Every shipped page currently uses portrait; landscape remains wired for future opt-in.

---

## Single Source of Truth

| Concern | Where |
|---|---|
| Default `@page` rule (margin 10mm uniform) | `apps/web/src/app/globals.css` |
| Named `@page market-landscape` (size A4 landscape, margin 10mm) | `apps/web/src/app/globals.css` |
| `.report-print-canvas` (portrait — width 960 px, zoom 0.74) | `apps/web/src/app/globals.css` |
| `.report-print-canvas-landscape` (landscape — width 1400 px, zoom 0.76) | `apps/web/src/app/globals.css` |
| Firefox fallback for both orientations | `apps/web/src/app/globals.css` (`@-moz-document`) |
| Generic print utility classes (`.print-break-before`, `.print-break-after`, `.print-keep`) | `apps/web/src/app/globals.css` |
| Carousel print rules (`.market-carousel-track` → 2 × 2 grid + `break-inside: avoid`) | `apps/web/src/app/globals.css` |
| Section page-break declaration | `apps/web/src/lib/report/sections.ts` (`printPageBreak`) |
| Per-page orientation toggle | `<ReportShell printOrientation="portrait" \| "landscape">` |
| `PrintPage` primitive (declarative wrapper for inside-section breaks) | `apps/web/src/components/report/primitives/print-page.tsx` |
| PDF export entry | `apps/web/src/lib/report/pdf-export.ts` (`exportReport`) |
| PDF export button | `apps/web/src/components/report/primitives/pdf-export-button.tsx` |

No new print rules belong in components. New page-break needs go in `sections.ts` (`printPageBreak: true`) or in a `<PrintPage>` wrapper.

---

## Geometry

A4 at 96 dpi with **`@page { margin: 10mm }`** (uniform — was `8mm 10mm` before this iteration):

### Portrait (canonical default)

| Constant | Value |
|---|---|
| Printable area | ≈ 718 × 1063 px |
| Canvas width | 960 px (fixed desktop) |
| Scale factor | 718 / 960 ≈ 0.748 → **0.74** (2 px safety) |
| Scaled width | 960 × 0.74 = 710 px (inside 718 px) ✓ |

### Landscape (opt-in)

| Constant | Value |
|---|---|
| Printable area | ≈ 1063 × 718 px |
| Canvas width | 1400 px (fixed desktop) |
| Scale factor | 1063 / 1400 ≈ 0.759 → **0.76** (2 px safety) |
| Scaled width | 1400 × 0.76 = 1064 px (≈ 1063 px) ✓ |

Adjusting margins or canvas widths — change the constants in `globals.css` and update the table here.

---

## `@page` rules

```css
/* Default — every report page */
@page {
  size: A4 portrait;
  margin: 10mm;
}

/* Named page for landscape opt-in */
@media print {
  @page market-landscape {
    size: A4 landscape;
    margin: 10mm;
  }
}
```

The `.report-print-canvas-landscape` class carries `page: market-landscape;` so the print engine uses the landscape page rule for that element.

---

## `.report-print-canvas` (portrait)

```css
.report-print-canvas {
  width: 960px !important;
  zoom: 0.74;
  margin: 0 !important;
  padding: 0 !important;
}
```

Applied to `<main>` inside `ReportShell` when `printOrientation="portrait"` (default).

---

## `.report-print-canvas-landscape` (opt-in)

```css
.report-print-canvas-landscape {
  page: market-landscape;
  width: 1400px !important;
  zoom: 0.76;
  margin: 0 !important;
  padding: 0 !important;
}
```

Applied when `<ReportShell printOrientation="landscape">`. No shipped page currently opts in; remains wired for future use.

---

## Firefox fallback (both orientations)

Older Firefox (< 126) does not support `zoom`. A targeted rule restores the same visual via `transform: scale`:

```css
@-moz-document url-prefix() {
  @media print {
    .report-print-canvas {
      zoom: 1;
      transform: scale(0.74);
      transform-origin: top left;
    }
    .report-print-canvas-landscape {
      zoom: 1;
      transform: scale(0.76);
      transform-origin: top left;
    }
  }
}
```

Modern Firefox (≥ 126) supports `zoom` natively; the fallback layer is harmless because both `zoom` and `transform: scale` resolve to the same scale factor.

---

## Print utility classes (framework-agnostic)

| Class | Behaviour |
|---|---|
| `.print-break-before` | Force a page-break before this block |
| `.print-break-after` | Force a page-break after this block |
| `.print-keep` | Prevent the print engine from splitting this block across pages |

Tailwind's own `print:break-before-page`, `print:break-after-page`, `print:break-inside-avoid` are equivalent and are the preferred form inside JSX.

---

## Carousel ↔ static-grid print logic (Market Overview)

The Market Overview insight scroller uses the same JSX in three different modes; the mode switch is media-query driven via `.market-carousel-*` classes in `globals.css`.

```css
@media print {
  .market-carousel-viewport {
    overflow: visible !important;
  }
  .market-carousel-track {
    display: grid !important;
    grid-template-columns: 1fr 1fr !important;
    gap: 6px !important;
    transform: none !important;
    transition: none !important;
    break-inside: avoid !important;
    page-break-inside: avoid !important;
  }
  .market-carousel-slide {
    flex: initial !important;
    min-width: 0 !important;
    max-width: none !important;
  }
}
```

Result: web carousel collapses to a static 2 × 2 grid; the entire grid is treated as one chunk by the print engine so all 4 cards fit on one A4 portrait page.

---

## What is hidden in print

All elements with `print:hidden` are removed from PDF output:

| Element | Source |
|---|---|
| `ReportTopNav` | `print:hidden` on `<header>` |
| `ReportSidebar` | `print:hidden` on the sidebar wrapper |
| `ReportFooter` | `print:hidden` on `<footer>` |
| `ActionBar` | `print:hidden` on the wrapper |
| `UpgradeGate` / `UpgradeCard` | `print:hidden` |
| `PdfExportButton` | `print:hidden` |
| `PrimeToggle` / `HotelToggle` | `print:hidden` (when used in `actions` slot) |
| `ToggleSelector` | `print:hidden` (default — interactive control) |
| `RenderConfigurator` (whole block) | `print:hidden` — the rendered preview is what should appear in the PDF, not the authoring controls |
| Carousel arrow buttons | `hidden lg:flex print:hidden` |
| Property Gallery footer "View All Photos" CTA | `print:hidden` |
| `RangeTrack` overlay `<input type="range">` | `print:hidden` (visual track + thumb still print) |

---

## Page-Break Strategy

| Mechanism | When to use |
|---|---|
| `section.printPageBreak: true` in `sections.ts` | Default for full-section pages — declarative, registry-driven |
| `<PrintPage pageBreakBefore avoidBreakInside>` | Fine-grained block-level control inside a section |
| `print:break-before-page` Tailwind variant | One-off needs in component JSX |
| `print:break-inside-avoid` Tailwind variant | Sub-section that should stay on one page |
| `.market-carousel-track` print rule | Keeps the 2 × 2 grid on a single page (Market Overview) |

`section`, `table`, and `.print-page` carry `break-inside: avoid` globally — long tables stay on one page when they fit. The CAPEX Schedule sub-section also carries `print:break-inside-avoid`.

---

## Per-page print profiles

| Page | Orientation | Notable rules |
|---|---|---|
| Executive Summary | Portrait | Section grids carry `print:grid-cols-12` so Chrome's < 768 px print viewport doesn't collapse them |
| Asset Analysis · Hotel personalizado | Portrait | 60/40 grid `md:grid-cols-10 print:grid-cols-10`; gallery hero block `print:h-80` |
| Asset Analysis · CAPEX & Renders | Portrait | Top grid `lg:grid-cols-[minmax(0,1fr)_250px]`; CAPEX Schedule `print:break-inside-avoid`; AI Render Configurator `print:hidden` |
| Competitive Set | Portrait | Comparison table at natural 960 px width (no column collapse needed) |
| Market Overview | Portrait | Carousel collapses to static 2 × 2 with aggressive per-card compaction (paddings → `print:p-2`, chart heights `print:h-7` / `print:h-9`, label text scales to `print:text-[6px]–[9px]`) |

---

## PDF Export Flow

```
PdfExportButton (primitive)
  └── exportReport(reportMetadata?) — lib/report/pdf-export.ts
      ├── if metadata: temporarily swap document.title, then window.print()
      └── else: window.print()
```

Phase 2 (when server-side PDFs ship) will replace the body of `exportReport` with a call to `requestServerExport(reportId, options)`. Every call site stays on `exportReport` so the swap is local.

---

## Browser Support Matrix

| Browser | `zoom` | `@page` | `print-color-adjust` | Status |
|---|---|---|---|---|
| Chromium ≥ 100 | ✓ | ✓ | ✓ | Primary target — every shipped page verified |
| Safari ≥ 16 | ✓ | ✓ | ✓ | Should work — visual not yet captured |
| Firefox ≥ 126 | ✓ (native) | ✓ | ✓ | Works via `zoom`; `@-moz-document` fallback is a no-op |
| Firefox < 126 | ✗ | ✓ | ✓ | Falls back to `transform: scale` (0.74 portrait, 0.76 landscape) |

When the next print regression lands, screenshot Chromium + Firefox + Safari side-by-side under `docs/_screenshots/print/` and update this table. (Pending — Phase 6.)

---

## Interactive-control print policy

Inputs (`<input>`, `<select>`, range sliders) carry their values in `value` / `defaultValue` attributes — those values **do** print. Control chrome (focus rings, dropdown arrows, slider thumbs) prints as the browser renders it. If a control's chrome is distracting in the PDF, hide the chrome with `print:hidden`. The CAPEX and CAPEX-schedule controls follow this policy; the AI render configurator is hidden wholesale because it is purely an authoring surface.

---

## Changing margins, canvas size, or adding a new orientation

1. Pick new `@page` margin and / or new canvas width.
2. Recompute `scale = printableArea / canvasWidth`.
3. Round down by 0.01 for safety.
4. Update three places in `globals.css`: `@page` (or named-page rule), the canvas class (`width`, `zoom`), and the `@-moz-document` `transform: scale` fallback.
5. Update the geometry table at the top of this doc.
6. If introducing a new orientation, also extend `ReportShell.printOrientation` and add the canvas-class branch.

Do not change print constants in component CSS. They live here, only.
