# Report System

**Status:** canonical (Phase 0 stabilization + 4 section integrations, 2026-05-08).

The report module renders institutional-quality hotel valuation reports. There is **one** shell, **one** sidebar, **one** paper card, **one** PDF pipeline, **one** section registry. Adding a new section is a one-line registry edit + a new page file — no shell, sidebar, or print changes required.

---

## Implemented sections

| # | Section | Route | File |
|---|---|---|---|
| 1 | Executive Summary | `/report/executive-summary` | `app/report/executive-summary/page.tsx` |
| 2 | Asset Analysis · Hotel personalizado | `/report/asset-analysis` | `app/report/asset-analysis/page.tsx` |
| 2a | Asset Analysis · CAPEX & Renders | `/report/asset-analysis/capex` | `app/report/asset-analysis/capex/page.tsx` |
| 3 | Competitive Set | `/report/competitive-set` | `app/report/competitive-set/page.tsx` |
| 4 | Market Overview | `/report/market-overview` | `app/report/market-overview/page.tsx` |
| 5 | Financials | `/report/financials` | (planned) |
| 6 | Methodology | `/report/methodology` | (planned) |

`REPORT_PAGES.md` holds the full per-page composition tree.

---

## Single Source of Truth

| Concern | File |
|---|---|
| Section registry (id, number, group, page-break, sub-anchors) | `src/lib/report/sections.ts` |
| Section taxonomy types | `src/types/report/index.ts` |
| Page chrome | `src/components/report/shell/report-shell.tsx` (accepts `printOrientation: "portrait" \| "landscape"`) |
| Sidebar (Stitch glass-card, registry-driven, two-pass active detection) | `src/components/report/shell/report-sidebar.tsx` |
| Paper card | `src/components/report/shell/report-paper.tsx` |
| Page header | `src/components/report/primitives/report-header.tsx` (supports `layout: "inline" \| "stacked"`) |
| Section page wrapper (preferred for new pages) | `src/components/report/primitives/report-section.tsx` |
| PDF export entry | `src/lib/report/pdf-export.ts` (`exportReport(metadata?)`) |
| PDF button | `src/components/report/primitives/pdf-export-button.tsx` |
| Print canvas + page rules + Firefox fallback | `src/app/globals.css` (see `docs/print-pdf.md`) |

---

## Shell Hierarchy

```
ReportShell (printOrientation: "portrait" | "landscape")
├── ReportTopNav (print:hidden)
├── ReportSidebar (print:hidden, driven by sections.ts)
├── <main class="report-print-canvas" or "report-print-canvas-landscape">
│   └── [page children]
│       └── ReportPaper (or ReportSection)
│           ├── ReportHeader (layout: inline | stacked)
│           │   └── PdfExportButton
│           └── [section content]
└── ReportFooter (print:hidden)
```

`<main>` carries `report-print-canvas` (default A4 portrait) or `report-print-canvas-landscape` (A4 landscape with named-page rule). All other report routes are portrait.

---

## Section Registry (`sections.ts`)

```ts
{
  id: ReportSectionId;
  number: number;                  // 1–6 display order
  group: ReportSectionGroup;       // overview | asset | compset | market | financials | methodology
  label: string;
  shortLabel?: string;
  description?: string;
  printPageBreak: boolean;
  implemented: boolean;
  subItems?: { href: string; label: string }[];  // sub-route OR hash anchor
}
```

### Sub-item href contract

- `/report/...` → absolute sub-route (Asset Analysis: `Hotel personalizado` / `CAPEX` are real routes).
- `/report/x#anchor` → absolute path with hash anchor.
- `#anchor` → hash anchor relative to the parent section href.

### Sidebar active-detection (two-pass)

1. **Pass 1** — prefer a sub-item with no hash whose path matches the current pathname (sub-route case).
2. **Pass 2** — fall back to the first sub-item whose path-part matches AND has a hash (in-page anchor case).

Prevents the "all hash-anchors active" bug that occurred when every sub-item resolved to the same path.

### Helpers

```ts
getSectionHref(id: ReportSectionId): string
getSectionById(id: string): ReportSection | undefined
getAdjacentSections(currentId: ReportSectionId): { prev?, next? }
getImplementedSections(): ReportSection[]
```

---

## Page composition patterns

### Standard page (Executive Summary, Competitive Set)

```tsx
<ReportShell>
  <div className="space-y-6 print:space-y-0">
    <ReportPaper sectionLabel="..." title="..." titleSize="..." actions={...}>
      ...sections...
    </ReportPaper>
    <ActionBar />
  </div>
</ReportShell>
```

### Stacked-header page (Asset Analysis, CAPEX & Renders)

```tsx
<ReportPaper
  sectionLabel="hotel valuation"
  title="..."
  titleSize="4xl"
  headerLayout="stacked"   // PDF button on row 1; label + title row 2-3
  closed                   // full rounded + bordered (no flow into ActionBar)
  actions={<HotelLabel + HotelToggle>}
>
  ...
</ReportPaper>
```

### Carousel page (Market Overview)

```tsx
<ReportShell>  {/* default portrait */}
  <ReportPaper closed headerLayout="stacked" actions={...}>
    <HorizontalInsightScroller>
      {data.insights.map(insight => <MarketInsightCard ... />)}
    </HorizontalInsightScroller>
    <CorporateSportsCard />
    <DemandGeneratorsBlock />
    <DemandGeneratorsGallery />
  </ReportPaper>
  <ActionBar />
</ReportShell>
```

The `HorizontalInsightScroller` runs in three modes:
- **Mobile / tablet:** free swipe (`overflow-x-auto scroll-snap-type: x mandatory`).
- **Desktop:** paged carousel (`overflow: hidden`, transform driven by `--page` CSS variable, floating arrows move 2 cards per click).
- **Print:** static 2 × 2 grid (`break-inside: avoid` keeps it on one A4 page).

See `docs/print-pdf.md` for the canvas math and `docs/component-library.md` for the primitive surface.

---

## Adding a new section

1. **Flip `implemented: true`** in `sections.ts`. Adjust `subItems` if applicable.
2. **Create the page** at `app/report/<section-id>/page.tsx`. Compose with `ReportShell` + `ReportPaper`/`ReportSection` + primitives:
   ```tsx
   import { ReportShell } from "@/components/report/shell/report-shell";
   import { ReportPaper } from "@/components/report/shell/report-paper";
   import { MetricRow, MetricTable, StatGrid /* ... */ } from "@/components/report/primitives";
   ```
3. **Add the data file** at `lib/report/<section-id>-data.ts` with TypeScript types + `getMock<Section>()`.
4. **No** edits to the sidebar, the shell, the print system, or the PDF pipeline.
5. Update `REPORT_PAGES.md`, `UI_COMPONENTS.md`, `docs/changelog.md`.

If a new section requires touching anything outside the section's own folder, the architecture is leaking — fall back to the primitives.

---

## Mock vs API

Phase 0 + 4 section integrations keep mock data in place. The five existing pages call `getMock<Section>()` directly. When `lib/api/reports.ts` lands, those calls are replaced by TanStack Query hooks (`useReport`, `useReportSection`) without touching the section components.

Outstanding for Phase 4:
- `lib/api/reports.ts` with `useReport(reportId)` + `useReportSection(reportId, sectionId)`.
- `apps/api/app/api/v1/reports/router.py` stub returning the same mock shape.

---

## Premium Gating

`UpgradeGate` (canonical) wraps the legacy `LockedGate` implementation. Always `print:hidden`. See `docs/business-rules.md` for tier definitions and per-section locked rows.

---

## Print orientation

| Page | Orientation | Why |
|---|---|---|
| Executive Summary, Competitive Set, Asset Analysis × 2, Market Overview | Portrait | Institutional standard |
| (none currently) | Landscape | Available via `<ReportShell printOrientation="landscape">` for sections that benefit (e.g. wide tables, flow diagrams) |

Market Overview was prototyped in landscape and reverted to portrait per institutional standard. The landscape canvas, named-page rule, and Firefox fallback all remain wired in `globals.css` for future use.

---

## See Also

- `REPORT_PAGES.md` — per-page composition trees, web↔print contracts, future-proofing notes.
- `docs/print-pdf.md` — A4 canvas math, both orientations, Firefox fallback, print utilities.
- `docs/component-library.md` and `UI_COMPONENTS.md` — primitives + section family catalogs.
- `docs/maps.md` — Mapbox + stylised map systems.
- `docs/design-system.md` — typography, spacing, colour tokens.
- `docs/workflows.md` — Landing → CompSet → Report user flow.
