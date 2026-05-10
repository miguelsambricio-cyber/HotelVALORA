# Architecture · Report Engine

Canonical source: **`docs/report-system.md`**. This dossier explains the *engine* as a system — one shell, one sidebar, one paper, one PDF pipeline, one section registry.

## The 1-1-1-1-1 rule

- **One shell** — `ReportShell` (`apps/web/src/components/report/shell/report-shell.tsx`)
  - `printOrientation: "portrait" | "landscape"` — every shipped page uses `portrait`
  - Hosts `ReportTopNav` + `ReportSidebar` + `<main>` + `ReportFooter`
- **One sidebar** — `ReportSidebar` driven by the section registry, two-pass active detection (prefer matching sub-route → fall back to first hash-anchor with matching parent path)
- **One paper** — `ReportPaper` (or `ReportSection` for new pages) — institutional card with `closed` / `headerLayout` / `actions` props
- **One PDF pipeline** — `apps/web/src/lib/report/pdf-export.ts` exposes `exportReport(metadata?)`. Today it's a `window.print()` wrapper; the API is shaped so server-side rendering (Puppeteer / react-pdf) drops in without changing call sites.
- **One section registry** — `apps/web/src/lib/report/sections.ts` — 6 sections, each with `printPageBreak`, `implemented`, optional `subItems`. Adding a new section is **a one-line registry edit + a new page**.

## Shipped sections (5 of 6)

| # | Section | Status | Route |
|---|---|---|---|
| 1 | Executive Summary | ✅ | `/report/executive-summary` |
| 2 | Asset Analysis · Hotel personalizado | ✅ | `/report/asset-analysis` |
| 2 | Asset Analysis · CAPEX & Renders | ✅ | `/report/asset-analysis/capex` |
| 3 | Competitive Set | ✅ | `/report/competitive-set` |
| 4 | Market Overview | ✅ | `/report/market-overview` (+ subroutes) |
| 5 | Financials | ⏸ planned | `/report/financials` |
| 6 | Methodology | ⏸ planned | `/report/methodology` |

## Primitives barrel

`apps/web/src/components/report/primitives/index.ts` exports the canonical building blocks every new section should compose from:

- `ReportSection` — section page wrapper
- `ReportHeader` — page header bar
- `MetricRow` / `MetricTable`
- `StatCard` / `StatGrid`
- `UpgradeGate` / `UpgradeCard` — premium gating (`print:hidden`)
- `ImageGallery`
- `ReportMap` (re-exports `ui/report-map.tsx`)
- `PrintPage`
- `PdfExportButton`

## Print system

- `@page { size: A4 portrait; margin: 10mm }` default
- `.report-print-canvas` — portrait, 960 px / `zoom: 0.74`
- `.report-print-canvas-landscape` — landscape, 1400 px / `zoom: 0.76`
- Firefox fallback uses `transform: scale` (named-page rule)
- Carousel ↔ static-grid swap on Market Overview (see `docs/print-pdf.md`)
- `print:hidden` is used liberally on chrome (header / sidebar / footer / Upgrade gates)

## Data layer

Each section reads from its own mock-data file under `apps/web/src/lib/report/`:

```
executive-summary-data.ts
asset-analysis-data.ts
capex-renders-data.ts
competitive-set-data.ts
market-overview-data.ts
formatting.ts        — Intl-based formatters shared across sections
```

When real API hooks land (Phase 3 of the roadmap), each file becomes a one-line re-export from `lib/api/reports.ts`.

## Cross-references

| Topic | Doc |
|---|---|
| Section registry + sub-anchors | `docs/report-system.md` |
| Print + PDF mechanics | `docs/print-pdf.md` |
| Per-page composition trees | `REPORT_PAGES.md` (root) |
| Map embed in Market Overview | `docs/maps.md` |
| Primitive catalog | `docs/component-library.md` |
