# Changelog

One entry per completed feature or significant task. Most recent first.

---

## 2026-05-09 — 5-Year P&L Forecast: Lectura A scenario architecture

Refactored `/report/financials/pl` so each underwriting scenario is an independent committee growth parameter instead of a globally-selected lens. Removed the global `ScenarioToggle` from the report header and the Zustand store under `lib/underwriting/scenario.ts` (kept the type + display labels for reuse).

### Changes
- **Sidebar**: `Financials → P&L` → `Financials → 5-Year P&L`.
- **RevparScenarioCard**: 3-tile readout → 3 editable inputs (Conservador / Mercado / Optimista). Each one a constant RevPAR growth rate.
- **EbitdaStabilizedCard**: assumption value `50.5%` → derived from `computed.results.ebitdaMargin[2]` (Year 3 % margin). Auto-tracks edits.
- **Header**: `ScenarioToggle` removed from header actions.
- **Calc model change**: `computePL(a, scenario)` → `computePL(a)`. Uses `a.scenarioGrowth.base` as a constant year-over-year multiplier (no more yr2/yr3/yr4-5 differentiation). Year 5 RevPAR ≈ €143.59 (vs prior €138.69 from differentiated growth).

### Data layer
- `PLAssumptions.revparGrowth { yr2; yr3; yr4to5 }` and `PLAssumptions.revparScenario` removed.
- New: `PLAssumptions.scenarioGrowth: Record<UnderwritingScenario, number>` — 3 independent constant growth rates.
- Defaults: `{ downside: 0.085, base: 0.060, upside: 0.030 }` (preserves Stitch reference values).

### Tier behaviour (unchanged)
FREE → page-level upgrade gate. PRO → all inputs (including the 3 scenario rates) render `readOnly`. PREMIUM → editable.

### Files
- `EDIT` `apps/web/src/lib/report/financials/{types,assumptions,calculations,index}.ts`
- `EDIT` `apps/web/src/lib/underwriting/scenario.ts` (drop store, keep type + labels)
- `EDIT` `apps/web/src/components/report/financials/pl-top-cards.tsx`
- `EDIT` `apps/web/src/app/report/financials/pl/{page,pl-content}.tsx`
- `EDIT` `apps/web/src/lib/report/sections.ts`
- `DELETE` `apps/web/src/components/report/scenario-toggle.tsx`

---

## 2026-05-09 — Projects page (sub-route under Market Overview)

Second sub-route under Market Overview. Mirrors Transactions structure with project-specific extensions.

### New page — `/report/market-overview/projects`
- Sub-route, sidebar two-pass detection picks it via Pass 1.
- Same shell pattern as Transactions: `<ReportShell>` → `<ReportPaper closed headerLayout="stacked">` → KPI row + projects table + gallery → `<ActionBar>`.

### Sidebar
- `sections.ts` Market Overview: `Projects` switched from `#projects` hash anchor → `/report/market-overview/projects` real sub-route.

### Reuse — no duplicate components built
- `TransactionsKpiCard` (cross-folder import) — same dual-metric shape; renders projects pipeline KPIs.
- `TransactionHotelCard` (cross-folder import) — same gallery card.
- `DualMetric`, `TransactionClass`, `TransactionHotelGalleryItem` types — re-imported.

### New section family — `components/report/market-overview/projects/`
- `ProjectsTable` — 19-column institutional table (one more than Transactions: STATUS pill column). Renames `Buyer→Owner`, `Seller→Developer`, `CAPEX→Construction Type`.
- `StatusBadge` — emerald (Complete) / blue (Under Construction) pill.

### Data layer — `lib/report/projects-data.ts`
- `ProjectRow` adds `status: ProjectStatus` and `constructionType: ConstructionType` discriminated unions.
- 5 mock projects (same Madrid hotels for cross-page consistency).
- 4 gallery items using real Stitch CDN URLs.

### Side-effect
- `TransactionsKpiCardData.scope` widened from union literal to `string` so `ProjectsKpiCardData.scope` (`"market" | "category"`) flows through the same component without TypeScript variance complaints. Component only uses `scope` as a DOM id key.

### Verification
- `pnpm typecheck` passes.
- HTTP 200 on `/report/market-overview/projects` and on every other report route.
- SSR confirms: 2 KPI titles, 5 status badges (3 Complete + 2 Under Construction), 5 construction types (3 Conversion + 2 New Development), all owner/developer fields. Sidebar Projects active.

---

## 2026-05-09 — Transactions page (sub-route under Market Overview)

New report sub-section integrated. Web layout + responsive shipped per priority order; print compaction will be the next pass.

### New page — `/report/market-overview/transactions`
- Sub-route under Market Overview (sidebar two-pass detection picks it via Pass 1 — sub-route match).
- `<ReportShell>` (default portrait) → `<ReportPaper closed headerLayout="stacked" actions={<HotelLabel + HotelToggle>}>` → KPI row + comp-set table + gallery → `<ActionBar>`.

### Sidebar
- `sections.ts` Market Overview sub-items updated:
  - `Market overview` → `/report/market-overview` (sub-route, was `#overview` hash anchor)
  - **`Transactions` → `/report/market-overview/transactions`** (NEW sub-route, was `#transactions` hash anchor)
  - `Projects` and `Market dynamics` remain hash-anchor placeholders.

### New section family — `components/report/market-overview/transactions/` (4 components)
- `TransactionsKpiCard` — header + `InsightBadge` + 2×2 dual-metric grid. Same chrome as Market Overview insight cards.
- `DualMetricCell` — twin label+value pair via `flex justify-between` (replaces Stitch's whitespace-padding hack).
- `TransactionsTable` — institutional 18-column comp-set table with sticky-style header bar, "Add" placeholder CTA, divide-y rows, soft hover, asset-name highlight on row hover, local checkbox state for the Inc. column.
- `TransactionHotelCard` — 4:3 image card with dark gradient, white headline caption (bottom-left) + glass arrow button (bottom-right).

### Data layer — `lib/report/transactions-data.ts`
- 2 KPI cards × 4 dual metrics, 5 table rows (Madrid luxury hotels), 4 gallery items.
- Discriminated union `TransactionClass`. Numeric values pre-formatted strings (`€130,000,000`, `€849,673`).

### Reuse
- `ReportShell`, `ReportPaper`, `HotelToggle`, `InsightBadge`, `ActionBar` — all canonical, no changes.
- Print canvas portrait by default (no orientation prop on this page).

### Web priority — done
- ✅ Layout web: KPI row 2-col + table + gallery 4-col.
- ✅ Responsive: KPI `grid-cols-1 md:grid-cols-2`, gallery `grid-cols-1 sm:grid-cols-2 lg:grid-cols-4`, table `overflow-x-auto whitespace-nowrap`.
- ✅ Visual integration: same badge styling, same card chrome, sub-route under Market Overview.

### Print — basic only (next-pass focus)
- `print:break-inside-avoid` on KPI cards and table rows; `print:hidden` on Inc. checkbox column, "Add" CTA, gallery arrow button.
- Pending: column subset for portrait OR landscape opt-in, thead repeat (`display: table-header-group`), font-size compaction.

### Verification
- `pnpm typecheck` passes.
- HTTP 200 on `/report/market-overview/transactions` and all other report routes.
- SSR: 2 KPI cards · 2 badges · table title · 5 table rows · 4 gallery cards. Sidebar `Transactions` active (`text-emerald-900 font-bold`), `Market overview` inactive (`text-slate-500`).

---

## 2026-05-08 — Documentation pass (state-of-the-system refresh)

Full sweep refreshing every architecture / report / print / map doc to reflect the post-Phase-0 + 4-section-integration state. No code changes.

### Updated
- `TECH_AUDIT.md` — status banner at the top with per-finding resolution markers; original audit body preserved as snapshot.
- `NEXT_PHASE_PLAN.md` — per-phase status table (Phases 0, 1, 2, 3, 5, 8 ✅ Done; 6 / 10 🟡 Partial; 4, 7, 9 ⏸ Outstanding); updated next-step recommendations.
- `ARCHITECTURE_SCORECARD.md` — full re-score with delta column. Composite **6.42 → 7.42 / 10**. Heaviest movement: frontend architecture (6.3 → 7.8), report system (6.0 → 8.0), documentation (7.3 → 8.7).
- `docs/architecture.md` — application flow updated with all 5 implemented routes and 2 planned.
- `docs/report-system.md` — full rewrite covering canonical shell, registry, sub-anchor href contract, two-pass active-detection, page composition patterns (standard / stacked / carousel), per-page orientation.
- `docs/print-pdf.md` — extended with portrait + landscape canvases, named-page rules, carousel ↔ static-grid print logic, per-page print profiles, interactive-control print policy.
- `AI_CONTEXT.md` — Report Module section refreshed (5 of 6 sections, primitives barrel + section families, two-pass sidebar, carousel pattern, both canvas variants, all current mock files).
- `ENTRYPOINTS.md` — added page entries for Asset Analysis × 2 + Market Overview, all section family folders, `maps.md` doc reference, root-level `REPORT_PAGES.md` / `UI_COMPONENTS.md` references.
- `CLAUDE.md` — `docs/` tree updated with `maps.md`; doc-update mandate table extended with maps.md trigger.

### Created
- `docs/maps.md` — canonical doc covering both map systems: Mapbox CompSet map (`/compset` + `/report/competitive-set`) and stylised pin map (`SharedMapCard` for Market Overview demand generators), with reuse pattern, data shapes, print behaviour, and outstanding items.

### Decisions captured

| Decision | Source iteration | Rationale |
|---|---|---|
| Single canonical report shell (no parametric `[reportId]`) | Phase 0 | Eliminate dual-architecture risk identified in audit |
| `sections.ts` is the only registry | Phase 0 | One source of truth for sidebar + page-break + status |
| Sub-item href: absolute path OR hash anchor | Asset Analysis ports | Real sub-routes coexist with in-page anchors |
| Two-pass sidebar active detection | Market Overview | Prevent "all hash-anchors active" bug |
| Stacked header layout for Asset Analysis / CAPEX / Market Overview | Stitch ports | Matches Stitch reference (PDF button on its own row) |
| `closed` paper variant | Stitch ports | Fully bordered card for sections without trailing ActionBar attachment |
| `printOrientation` prop on ReportShell | Market Overview iteration | Two A4 canvases; default portrait; landscape opt-in |
| `@page { margin: 10mm }` (was `8mm 10mm`) | Market Overview iteration | Institutional symmetric margin |
| Market Overview portrait (was landscape) | Market Overview revision | Institutional report standard; landscape variant remains wired but unused |
| Carousel: paged desktop + free swipe mobile + static grid print | Market Overview integration | Three modes, one DOM render, media-query driven |
| Stitch-verbatim Submarket / Class investment metrics | Second Stitch screen | Honour source of truth even when Stitch reuses Country/Market labels |
| Population footer as vertical KPI tile in column 3 | Footer revision | Future-proofing for 2 additional metrics in cols 1+2 |

### Problems detected and resolution adopted

| Problem | Solution |
|---|---|
| Audit identified two parallel report shells | Phase 0 deleted `layout/`, `report-context.tsx`, `[reportId]` route tree |
| `report-nav.ts` (6 items) + `sections.ts` (15 items) both alive | Phase 0 deleted `report-nav.ts`; rewrote `sections.ts` to match the canonical 6-section visible structure |
| `pdf-export-button.tsx` (window.print()) + `export-button.tsx` (full API) + `pdf-export.ts` (named function) | Consolidated into `lib/report/pdf-export.ts` (`exportReport(metadata?)`) and a single `PdfExportButton` primitive |
| Repo-root Vite cruft (`index.html`, `vite.config.js`, root `src/`, root `node_modules`) | Phase 0 cleanup: `git rm` tracked + `rm` untracked + `git mv backup.ps1 scripts/` |
| Sidebar showed all 4 hash-anchors as active on Market Overview | Replaced per-sub-item check with section-level two-pass selection |
| Population footer spanning the full row blocked future metrics | Switched to `grid grid-cols-3` with `col-start-3`; cols 1+2 reserved |
| Stitch reference uses different content for Submarket / Class | Updated `lib/report/market-overview-data.ts` to match second Stitch HTML byte-for-byte (Spain / Madrid investment context labels) |
| Print canvas was Chromium-only (`zoom: 0.74`) | Added `@-moz-document` Firefox fallback using `transform: scale()` for both portrait and landscape |
| First Market Overview attempt rendered in landscape A4 | Reverted to portrait; landscape canvas variant remains wired in shell + globals.css |
| Per-card content too tall for 2 × 2 print grid | Aggressive `print:` compaction across MarketInsightCard + nested primitives (paddings, gaps, chart heights, font sizes) |

### Recommended next steps

1. **Phase 4 — Data layer.** `lib/api/reports.ts` with TanStack Query hooks; backend stub at `apps/api/app/api/v1/reports/router.py`.
2. **Section 5 — Financials page.** Compose from existing primitives; reuse SVG chart pattern from Market Overview / CAPEX.
3. **Section 6 — Methodology page.** Lighter — typography + locked tiers list. Reuse `MethodologicalNote`.
4. **Phase 6 — Cross-browser print matrix.** Capture Chromium / Firefox / Safari PDF screenshots; store under `docs/_screenshots/print/`.
5. **Phase 7 — Mapbox state sharing.** Lift `useCompset` into `<CompsetProvider>` so layer toggles persist across `/compset` ↔ `/report/competitive-set`.
6. **Phase 9 — Bundle audit.** Drop `recharts` and `numeral` if unused; replace `<img>` with `next/image` for hotel photos.
7. **Auth gating** on report routes once role enforcement is wired.

### Verification

- `pnpm typecheck` passes (verified earlier in this session).
- All 5 implemented report routes return HTTP 200.
- Doc set: every file referenced by `ENTRYPOINTS.md` exists and is current.

---

## 2026-05-08 — Market Overview footer KPI → vertical 3-col tile

The card footer (Población / Premium Inventory) was a horizontal strip (label left, value right). It now renders as a vertical KPI tile inside a 3-column grid so future metrics can fill the left and centre columns without a layout change.

### Change
- Footer container: `flex items-center justify-between` → `grid grid-cols-3 gap-4`.
- Población / Premium Inventory tile placed in **column 3** via `col-start-3`. Adding new metrics before this block in JSX will auto-flow into columns 1 and 2.
- Tile styling now matches the investment metric tiles (label `text-[9px] font-bold uppercase tracking-wider`, value `text-sm font-bold text-slate-800`, print sizes `print:text-[7px]` / `print:text-[9px]`).

### Preserved
- Web layout proportions (carousel, card size, charts, spacing).
- PDF behavior — same card height budget; the only footer change is the internal label / value stacking.
- All 4 cards render the change uniformly: España (47.4M), Madrid (6.7M), Madrid Centro (1.4M) all show **Población** vertically; Luxury (18.5%) shows **Premium Inventory** vertically.

### Verification
- `pnpm typecheck` passes. HTTP 200 on `/report/market-overview`.
- SSR confirms 8× `grid grid-cols-3` + `col-start-3` (4 cards × 2 RSC payload), 0× old horizontal layout, 3× Población + 1× Premium Inventory still rendered.

---

## 2026-05-08 — Market Overview print → A4 portrait, single page

Print mode reverted from landscape to portrait per the institutional report standard. The 4 insight cards now compact aggressively in print so the 2 × 2 grid lives on one A4 portrait page. Web / mobile layouts are untouched — the changes are entirely behind `print:` modifiers.

### Page-level
- `<ReportShell>` no longer carries `printOrientation="landscape"` — falls back to canonical portrait canvas.
- Page padding tightened in print: `print:px-3 print:py-2 print:space-y-2`.

### Carousel
- `.market-carousel-track` in print now carries `break-inside: avoid` so the 2 × 2 grid stays on one A4 page.
- Print grid gap tightened to **6 px** (was 16 px).

### Per-card compaction (web unchanged)
- Outer container: `p-6 → print:p-2`, `gap-6 → print:gap-1.5`, `print:rounded-md`.
- Title: `text-2xl → print:text-sm`.
- `MetricGrid`: `py-4 → print:py-1`, `gap-y-4 → print:gap-y-1`, value `text-sm → print:text-[9px]`.
- `MiniBarChart`: `p-3 → print:p-1`, bar area `h-16 → print:h-7`.
- `TrendBars`: `p-3 → print:p-1`, bar area `h-12 → print:h-6`.
- `InvestmentChart`: `h-24 → print:h-9`.
- `InsightBadge`: `text-[10px] → print:text-[6px]`, `px-2 py-1 → print:px-1 print:py-0.5`.
- `SplitBar`: bar height `h-1.5 → print:h-1`.
- Investment metric grid: `gap-4 → print:gap-x-2 print:gap-y-0.5`. Footer: `pt-4 → print:pt-1`.

### Global @page
- Margin updated to `10mm` uniform (was `8mm 10mm`) per spec.

### Verification
- `pnpm typecheck` passes.
- HTTP 200 on `/report/market-overview` and every other report page (no regression).
- SSR: 0 instances of `report-print-canvas-landscape` (reverted to portrait), portrait `report-print-canvas` applied on `<main>`. Carousel still 4 slides + 2 arrows on web. Print compaction classes (`print:p-2 print:gap-1.5`, `print:py-1`, `print:h-7`, `print:h-9`, …) all in DOM.

---

## 2026-05-08 — Market Overview integration

New report section consolidating the previous two Stitch pages (Country/Market and Submarket/Class) into a single horizontal-scroll experience that collapses to a 2 × 2 print grid for A4 export.

### New page — `/report/market-overview`
- One canvas, 4 insight cards in a horizontal snap-scroller (web) → static 2 × 2 grid (print).
- `sections.ts` entry flipped to `implemented: true`; sub-anchors updated to `#country / #market / #submarket / #class`.
- `ActionBar` rendered below the paper.

### New section family — `components/report/market-overview/` (13 components)
- `HorizontalInsightScroller`, `MarketInsightCard`.
- Visual primitives: `MetricGrid`, `SplitBar`, `MiniBarChart`, `TrendBars`, `InvestmentChart`, `InsightBadge`.
- Shared modules: `CorporateSportsCard`, `SharedMapCard`, `DemandGeneratorsBlock`, `DemandGeneratorCard`, `DemandGeneratorsGallery`.

### Data layer — `lib/report/market-overview-data.ts`
- Fully data-driven. `getMockMarketOverview()` populated from both Stitch pages.
- Discriminated unions `InsightScope` and `DemandGeneratorCategory`.

### Global utility
- `.scrollbar-hide` added to `globals.css` — consumed by the horizontal scroller.

### Verification
- `pnpm typecheck` passes. HTTP 200 on `/report/market-overview`.
- SSR confirms: page title, all 4 insight titles + badges, scroller class chain, print 2 × 2 fallback, 4-col gallery, 16 map pins, Corporate & Sport block.

---

## 2026-05-08 — Top-grid rebalance (~68 / 32) for A4 vertical alignment

Adjusted the CAPEX & Renders top-grid proportions so the Property Gallery's last tile (Spa) lands close to the bottom of the CAPEX Schedule block on the A4 page.

- Top grid right column: **250 px** (was 316 px). Roughly a 68 / 32 split with the CAPEX content on lg+.
- Property Gallery card padding: **14 px** (was 12 px).
- Tile height: **92 px** (was 115 px), fixed via inline style.
- Tile width: 100 % of card content area (no fixed pixel width — `tileWidth` prop removed; the gallery's column controls the tile width).
- Tile radius: `rounded-[10px]` (was `rounded-[12px]`).
- Tile gap: **10 px** (`gap-2.5`, was `gap-3` = 12 px).
- Caption unchanged (`text-[14px] font-semibold`, white, drop-shadow, bottom-left).
- All 8 tiles render identical dimensions in SSR (`style="height:92px"` × 8).

CAPEX Schedule card unchanged — already a symmetric 6-cell grid with paired sliders, paired tick labels, and the visible "¿Hotel abierto…?" / "Porcentaje operativo…" labels removed in the previous pass.

`pnpm typecheck` passes. SSR confirms: top grid `grid-cols-[minmax(0,1fr)_250px]`, 8× `height:92px`, card `padding:14px`, schedule grid still `grid-cols-1 lg:grid-cols-2 ... gap-x-12 gap-y-4 items-center`.

---

## 2026-05-08 — Property Gallery fixed-size tiles

Per spec, every gallery tile is now strictly the same dimensions — no responsive variation, no auto-height.

- Tile width: **290 px** (explicit `style={{ width: "290px" }}`).
- Tile height: **115 px** (explicit `style={{ height: "115px" }}`).
- Border radius: `rounded-[12px]` (was `rounded-[8px]`).
- Tile gap: **12 px** (`gap-3`, was `gap-2.5`).
- Caption: **14 px / 600** (was 12 px / 600).
- Tile carries `shrink-0` so it never shrinks under flex/grid constraints.
- Top grid right column: **316 px** (was 220 px) to fit 290 px tiles + 12 px card padding + 1 px borders without overflow.

`pnpm typecheck` passes. SSR confirms 8× `height:115px;width:290px` + caption at `text-[14px]`. All 8 captions still render in order: Lobby · Room · Bar · Restaurant · Exterior · Meeting Room · Pool · Spa.

---

## 2026-05-08 — CAPEX Schedule symmetric paired-slider rebuild

The CAPEX Schedule card is now a perfectly symmetric 2-column control with paired sliders sitting on the same grid row.

### Layout
- Card body padding bumped to **32 px** (`p-8`).
- Inner row rebuilt as a 6-cell CSS grid (2 cols × 3 rows, `gap-x-12 gap-y-4 items-center`).
  - Row 1: LEFT label + emerald pill / RIGHT Abierto-Cerrado toggle.
  - Row 2: LEFT months `RangeTrack [0, 36]` / RIGHT percent `RangeTrack [0, 100]`. Both sit on the same grid row → identical Y-position.
  - Row 3: LEFT "0 MESES / 36 MESES" / RIGHT "0% / 100%" tick labels.

### Component changes
- New `RangeTrack` primitive — bare slider track + fill + thumb + invisible `<input type="range">` overlay. Used twice in the schedule row to guarantee both sliders share the exact same row geometry.
- `CapexScheduleRow` rebuilt as a 6-cell grid that owns `months`, `mode`, `pct` state. Toggle ↔ % wiring: Cerrado → 0 %; Abierto → 100 %. Manual slider drag is independent.
- `CapexScheduleCard` body padding `px-5 py-4` → `p-8` (32 px); title margin `mb-4` → `mb-6`.

### Removed UI text per spec
- Eliminated visible label "¿Hotel abierto o cerrado durante el CAPEX?".
- Eliminated visible label "Porcentaje operativo durante CAPEX" + `OperationalPercentInput` numeric component (deleted file). The percentage is now controlled exclusively by the right-column slider; "Porcentaje operativo durante CAPEX" remains only as the slider's `aria-label` for screen readers.

### Verification
- `pnpm typecheck` passes.
- HTTP 200 on `/report/asset-analysis/capex`.
- SSR confirms: 6-cell grid `grid-cols-2 gap-x-12 gap-y-4 items-center`, card `p-8`, both `RangeTrack` instances with `aria-label="Duración del CAPEX"` + `aria-label="Porcentaje operativo durante CAPEX"`, all 4 tick labels (`0 MESES`, `36 MESES`, `0%`, `100%`), no visible "Hotel abierto" / "Porcentaje operativo" labels.

---

## 2026-05-08 — CAPEX Schedule structural rebuild + operational %

The schedule card now reads as a compact operational-assumptions module: both column titles align on the same top line, the duration badge tracks the slider thumb, and a new operational-percentage field is wired in.

### Data
- `CapexSchedule.operationalPercentage: number` — added to the contract; mock value 100. Designed to feed the future financial engine's revenue / GOP / EBITDA scaling during CAPEX (UI-local state for now).

### Component additions
- `OperationalPercentInput` — labelled numeric % field (0–100 clamp). Same border / sizing as the financial inputs in `CostInputRow`. Local React state.

### Component changes
- `CapexTimeline` gained a `floatingBadge` mode: the emerald pill is positioned absolutely above the slider thumb and follows it (transition-[left]) instead of sitting in the header row. `showBadge` and `floatingBadge` are now mutually exclusive (floating wins).
- `CapexScheduleRow` rebuilt as a 2-column grid `1.2fr 1fr` (`align-items: start`, gap 48 px). LEFT carries title + slider with floating badge + min/max ticks. RIGHT carries title + Abierto/Cerrado toggle + operational % field.

### Visual contract
- Both internal titles ("Duración del CAPEX" and "¿Hotel abierto o cerrado durante el CAPEX?") sit on the same top line.
- Card itself unchanged — same chrome, padding, and the "CAPEX Schedule" h4 title remain.
- Renders block, gallery, page header, shell — untouched.

### Verification
- `pnpm typecheck` passes.
- SSR confirms: schedule grid `grid-cols-[1.2fr_1fr]` (×2 lg + print), all 3 labels rendered, floating-badge selector present, operational % input rendered with `value="100"` and matching `aria-label`.

---

## 2026-05-08 — CAPEX Schedule moved into the left CAPEX stack

CAPEX Schedule is no longer a standalone full-width section below the grid — it now sits as the 5th card in the LEFT column, sharing the same chrome as Hard / Soft / Project Costs. This naturally balances the left stack height with the Property Gallery height.

### Component additions
- `CapexScheduleCard` — card wrapper that renders `CapexScheduleRow` inside the same `bg-white border-slate-200 rounded-xl shadow-sm` chrome used by `CapexCategory`. Accepts `id`, `title`, `className`. `print:break-inside-avoid` baked in.

### Component changes
- `CapexScheduleRow` inner grid gap tightened to 24 px (`gap-6`) per spec.

### Page restructure (`app/report/asset-analysis/capex/page.tsx`)
- Removed the standalone `<section id="schedule">` block.
- Added `<CapexScheduleCard schedule={...} />` as a sibling of `<CapexTable>` inside the LEFT column, wrapped in `space-y-4` so the gap matches the inter-category rhythm.
- Renders block stays full-width below the 2-column grid (`mt-8 pt-6 border-t`).

### Vertical balance check
- Left stack ≈ 933 px (TOTAL + 3 categories + Schedule card).
- Right gallery ≈ 927 px (8 × 92 px tiles + gaps + chrome).
- Bottom edges now align within ~6 px.

### Verification
- `pnpm typecheck` passes.
- SSR confirms: 1× `id="schedule"`, 1× h4 "CAPEX Schedule" inside the card, schedule grid at `gap-6`, renders block still rendered below.

---

## 2026-05-08 — Property Gallery vertical balance

Single proportional adjustment to balance the gallery's bottom edge with the bottom of CAPEX Schedule.

- Tile height: **92 px** (was 72 px).
- Tile gap: **10 px** (was 8 px).
- Card padding unchanged at 12 px; column width unchanged at 220 px; tile radius / overlay / caption / order unchanged.

`pnpm typecheck` passes. SSR confirms `height:92px` × 8 tiles and `gap-2.5` on the tile stack.

---

## 2026-05-08 — CAPEX & Renders strict alignment pass

Tight institutional proportions across the page. No component redesign — only dimension, spacing and alignment changes.

### Property Gallery Sidebar — compact 220 px column
- Top grid right column: **220 px** (was 240 px). Top grid gap: **20 px** (was 24 px).
- Tile height: **72 px** (was 86 px). Tile radius: **8 px** (was 10 px).
- Tile gap: **8 px** (was 12 px). Card padding: **12 px** (was 16 px).
- Caption: **12 px / 600** (was 14 px / 600).
- Title text-sm; "8 items" badge text-[10px]; "View All Photos" footer text-xs.

### Top grid + tables
- Top grid: `grid-cols-[minmax(0,1fr)_220px] gap-5 items-start`.
- TOTAL CAPEX: `px-5 py-3`, inputs `h-8`, label `text-base` — total ≈ 64 px row.
- Category header: `md:h-11 px-5` — 44 px row, 20 px horizontal padding.
- Line items inside categories: `h-11` (44 px) with `pl-8` indent.

### CAPEX Schedule row — 3-column grid
- Switched outer container from flex to **grid**: `grid-cols-[1.4fr_120px_1fr] items-center gap-8`.
- Slider max-width tightened to **360 px** (was 420 px).
- Operational toggle buttons: **38 px tall × 100 px wide**, strictly equal width.

### Vertical rhythm
- Section dividers tightened to `mt-8 pt-6` (was `mt-10 pt-8`) — schedule sits closer to Project Costs; renders block starts higher.
- H3 bottom margin: `mb-6` (was `mb-8`).

### Verification
- `pnpm typecheck` passes.
- All four routes return 200.
- SSR confirms: top grid `minmax(0,1fr)_220px` (×2), 8 tiles at `height:72px` + `rounded-[8px]`, all 8 captions at `text-[12px]`, schedule grid `1.4fr_120px_1fr`, 12 cost rows at `h-11`, both toggle buttons at `h-[38px] w-[100px]`.

---

## 2026-05-08 — CAPEX & Renders layout polish

### Property Gallery — fixed-width institutional sidebar
- Top grid switched from `lg:grid-cols-3` to `grid-cols-[minmax(0,1fr)_240px]` with `gap-6` and `items-start`. Gallery column is exactly 240 px on `lg+`; on narrower widths it wraps below the table.
- Tiles now stack vertically (1 per row) with a fixed 86 px height and `rounded-[10px]`. Dark gradient + bottom-left white caption (14 px / 600).
- "View All Photos" CTA pinned to the card's bottom edge via `mt-auto`.
- 8 captions render in the institutional order: Lobby · Room · Bar · Restaurant · Exterior · Meeting Room · Pool · Spa.

### CAPEX Schedule — three-block horizontal row
- New `CapexScheduleRow` (client) composes the row and owns the duration state — keeps the slider and the badge in sync.
- LEFT block (`flex: 1.2`) hosts a re-used `CapexTimeline` with `showBadge={false}` and `sliderMaxWidth={420}`.
- CENTER block (`width: 110px`) renders the new `CapexDurationBadge` atom — same emerald pill as the inline badge, lifted to a standalone column.
- RIGHT block (`flex: 1`, `justify-end`, `gap-4`) hosts the question text + `ToggleSelector size="lg"`.
- `ToggleSelector` lg variant updated to `h-10 min-w-[92px] px-6` so the operational buttons hit the spec exactly.

### Section rhythm
- Project Costs → CAPEX Schedule and CAPEX Schedule → Renders gaps standardised to 40 px (`mt-10` + `border-t` + `pt-8`).

### Component additions
- `CapexDurationBadge` — emerald pill atom.
- `CapexScheduleRow` — schedule composite owning duration state.
- `CapexTimeline` extended with `value` / `onChange` / `showLabel` / `showBadge` / `sliderMaxWidth` (all backward compatible).

### Verification
- `pnpm typecheck` passes.
- All four routes (executive-summary, competitive-set, asset-analysis, asset-analysis/capex) return 200.
- SSR output confirmed: `grid-cols-[minmax(0,1fr)_240px]` on the top row, `height:86px` + `rounded-[10px]` on every gallery tile, `flex-[1.2]` + `w-[110px]` + `h-10 min-w-[92px]` in the schedule row.

---

## 2026-05-08 — Asset Analysis · CAPEX & Renders integration

### New page — `/report/asset-analysis/capex`
- Stitch design replicated inside the canonical architecture (no shell, sidebar, print, or PDF changes).
- Combines CAPEX breakdown + property gallery + CAPEX schedule + AI render configurator on a single canvas; the renders block carries `id="renders"` so the sidebar's `Renders` sub-anchor lands correctly.
- Page does not use `ActionBar` — its terminal CTA is the in-section "Generar Variación IA" button.

### New section family — `components/report/asset-analysis/capex/`
Eleven components, all consumed through one barrel `index.ts`:
- `CapexTable` — composes `CapexTotalRow` + per-category breakdown.
- `CapexTotalRow` — headline TOTAL CAPEX band with editable amount + unit selector.
- `CapexCategory` — collapsible category block with editable category total + line items.
- `CostInputRow` — single label/value/unit row used inside categories.
- `CapexTimeline` — slider + duration badge with an accessible `<input type="range">` overlay (so the visual track + dragging both work).
- `ToggleSelector<T>` — generic segmented control (`size: "md" | "lg"`) reused for both CAPEX BÁSICO/PERSONALIZADO and Abierto/Cerrado.
- `PropertyGallerySidebar` — right-rail gallery with item-count badge + "View All Photos" CTA.
- `RenderConfigurator` — wraps preview + tag groups + final CTA row; whole block is `print:hidden`.
- `RenderPreviewCard` — hero render image with caption overlay.
- `RenderTagGroup` — one labelled row of pill buttons with single-select state.

### Data layer — `lib/report/capex-renders-data.ts`
- Fully data-driven: every CAPEX category, line item, render tag group, gallery item, and operational mode lives in the data file.
- Discriminated unions for future engine integration: `CapexUnit`, `CapexMode`, `OperationalMode`.
- `formatCapexAmount(n)` is the single Intl-based formatter for monetary display.
- `getMockCapexRenders()` mirrors Stitch reference values exactly.

### Sidebar sub-item migration — `hash` → `href`
- `ReportSubItem.hash: string` replaced by `ReportSubItem.href: string`. Sub-items can now point at full routes (`/report/asset-analysis/capex`) or page-relative anchors (`#renders`); the sidebar resolves either form.
- `sections.ts` updated for all sections; Asset Analysis now points its sub-anchors at the new sub-routes.
- `components/report/shell/report-sidebar.tsx` resolves sub-item href and adds an active-highlight rule (matches the Stitch bold-emerald sub-anchor when on a sub-route).

### Architecture invariants preserved
- Reused: `ReportShell`, `ReportPaper` (with `closed` + `headerLayout="stacked"`), `HotelToggle`, primitives barrel, print canvas, PDF pipeline.
- No edits to existing pages (`/report/executive-summary`, `/report/competitive-set`, `/report/asset-analysis`).

### Documentation
- Updated: `REPORT_PAGES.md` (added Page 2a layout block + sidebar wiring + future-proofing notes).
- Updated: `UI_COMPONENTS.md` (added CAPEX & Renders family table).
- Updated: `docs/print-pdf.md` (interactive-control print policy + the new `print:break-inside-avoid` schedule rule).
- This entry.

### Verification
- `pnpm typecheck` passes.
- All four routes return 200 on the dev server: `/report/executive-summary`, `/report/competitive-set`, `/report/asset-analysis`, `/report/asset-analysis/capex`.
- 26 canonical Stitch strings render in the new page's SSR output.

---

## 2026-05-08 — Asset Analysis (Hotel personalizado) integration

### New page — `/report/asset-analysis`
- Stitch design replicated inside the canonical architecture (no shell, sidebar, print, or PDF changes).
- Page composes `<ReportShell>` → `<ReportPaper closed headerLayout="stacked">` → 60/40 grid → `<ActionBar>`.
- `sections.ts` entry flipped to `implemented: true`; sidebar updates automatically.

### New section family — `components/report/asset-analysis/`
- `AssetMetricsTable` — left-column 12-row metrics with fixed-height label/value pairs.
- `FacilitiesCard` — 2-column availability checklist (Lucide `Check` / `Minus`).
- `RoomMixCard` — Type/Units/Size table with bolded totals row + thin spacer.
- `GuestInsightsCard` — slate-50 card with `tone: "positive" | "negative"` (Lucide `ThumbsUp` / `ThumbsDown`, filled).
- `PropertyImageCard` — square hero image + caption tabs (Catastro / Planos), client-side active-tab state.
- `PropertyGallery` — vertical labelled gallery with arrow-button `altSrc` swap (replaces Stitch inline `onclick`).
- `MethodologyNote` — compact inline variant of the methodology block, fits inside column layouts.
- Single barrel `index.ts` for the import surface.

### Page-local — `app/report/asset-analysis/`
- `page.tsx` — server component wiring data + composition.
- `hotel-toggle.tsx` — client toggle next to "Hotel personalizado" label (decoupled from `PrimeToggle` to avoid changing the Competitive Set toggle visual).

### Data layer
- `lib/report/asset-analysis-data.ts` — types (`AssetAnalysisData`, `AssetMetricsRow`, `FacilityItem`, `RoomMixRow`, `GalleryImage`, `PropertyMedia`, `GuestInsights`) + `getMockAssetAnalysis()` matching Stitch values.

### Canonical primitive extensions (backward-compatible)
- `ReportHeader` gains `layout?: "inline" | "stacked"` — `stacked` puts the PDF button on its own row above the section label / title row, matching Stitch. Default `inline` preserves Executive Summary + Competitive Set visuals unchanged.
- `ReportPaper` and `ReportSection` gain `closed?: boolean` — when `true`, the paper has full `border + rounded-xl` (Stitch Asset Analysis); default `false` preserves the rounded-top-only paper used by other pages.
- `ReportPaper` and `ReportSection` also gain pass-through `headerLayout?` and `hideExportButton?` for symmetry.

### Documentation
- New: `REPORT_PAGES.md` (root) — page-level reference for every report page (route, status, file path, component composition).
- New: `UI_COMPONENTS.md` (root) — catalog grouped by import surface (primitives → section families → shell).
- This entry.

### Verification
- `pnpm typecheck` passes.
- Existing `/report/executive-summary` and `/report/competitive-set` visuals unchanged (canonical defaults preserved).

---

## 2026-05-08 — Phase 0 architecture stabilization

### Canonical report architecture
- One shell, one sidebar, one paper, one PDF pipeline, one section registry.
- `lib/report/sections.ts` rewritten as the single canonical registry (6 sections, sub-anchors, `printPageBreak`, `implemented`).
- `types/report/index.ts` reworked to match the new section taxonomy.
- `shell/report-sidebar.tsx` refactored to consume `sections.ts` (Stitch visual preserved).
- `shell/report-paper.tsx` refactored to compose `ReportHeader` from primitives (eliminated internal duplicate).

### Canonical primitives — `components/report/primitives/`
- `MetricRow`, `MetricTable` — atomic table units for sections 4-15.
- `ReportSection` — page-level wrapper with section-metadata-driven page-breaks.
- `ReportHeader` — header bar primitive (extracted from internal `PaperHeader`).
- `StatCard` / `StatGrid` — re-exports `KPICard` / `KPIGrid` under canonical names.
- `UpgradeGate` / `UpgradeCard` — re-exports `LockedGate` / `LockedUpgradeCard`.
- `ImageGallery` / `ImageGalleryCard` — re-exports `HotelGalleryGrid` / `HotelGalleryCard`.
- `ReportMap` — re-exports from `ui/report-map.tsx`.
- `PrintPage` — declarative wrapper for inside-section page-break control.
- `PdfExportButton` — routes through canonical `exportReport()`.
- Barrel `primitives/index.ts` is the single import surface for new section pages.

### Print / PDF system
- `globals.css` print rules consolidated into a single block: `@page`, `.report-print-canvas`, generic utilities (`.print-break-before`, `.print-break-after`, `.print-keep`).
- Firefox fallback: `@-moz-document url-prefix() { @media print { transform: scale(0.74) } }` for older Firefox where `zoom` is a no-op.
- `lib/report/pdf-export.ts` simplified to a single `exportReport(metadata?)` entry; legacy `exportReportToPDF` aliased and marked deprecated.

### Deletions
- `components/report/layout/` (3 files — duplicate shell, replaced by `shell/`).
- `components/report/sections/` (3 files — only used by deleted parametric routes).
- `components/report/report-context.tsx` (only used by deleted layout).
- `components/report/ui/export-button.tsx` (dead code).
- `components/report/ui/pdf-export-button.tsx` (replaced by canonical primitive).
- `app/report/[reportId]/` (entire parametric tree — 4 files; will return under a single canonical pattern when multi-tenant data layer ships).
- `lib/report/mock-data.ts` (only used by deleted parametric layout).
- `lib/report/report-nav.ts` (replaced by canonical `sections.ts`).
- Repo root: `index.html`, `vite.config.js`, `vite.err.log`, `vite.out.log`, `src/` (Vite app leftovers), root `node_modules/`, `function hotelvalora {.txt`.
- `backup.ps1` moved to `scripts/backup.ps1` via `git mv`.

### Documentation
- New: `docs/print-pdf.md` — canonical print/PDF system reference.
- New: `docs/component-library.md` — canonical primitives catalog.
- Rewritten: `docs/report-system.md` — single-architecture reference, no parametric mentions.
- Updated: `docs/architecture.md` — registry pointer + primitives reference.
- Updated: `ENTRYPOINTS.md` — primitives table + canonical files.
- Updated: `AI_CONTEXT.md` — Phase 0 report module description.
- Audit artefacts: `TECH_AUDIT.md`, `NEXT_PHASE_PLAN.md`, `ARCHITECTURE_SCORECARD.md` (root).

### Verification
- `pnpm typecheck` passes (after clearing stale `.next/` types from deleted parametric routes).
- Visible pages (`/report/executive-summary`, `/report/competitive-set`) render unchanged.

---

## 2026-05-07 (continued)

### Navigation link — Sidebar item 3 "CompSET" → `/report/competitive-set`
- `report-nav.ts` item 3 `href` changed from `/report/compset` to `/report/competitive-set`
- `ReportSidebar` active-state highlight now lands correctly on the Competitive Set page

### Competitive Set — Distance column in comparison table
- Added `distance: string | null` to `CompetitorProperty` interface; `null` for the subject property itself (renders as `—`)
- Added **Distance** column to `CompetitiveSetTable` (rightmost, after Location Score); displays `"400 m"`, `"1.1 km"`, etc.
- Mock distances: Ritz-Carlton 650 m, Four Seasons 400 m, Rosewood Villa Magna 1.1 km, Westin Palace 320 m

### Competitive Set — gallery layout update
- `HotelGalleryGrid` restructured: top block = 2×2 images (left, `col-span-5`) + full CompSet map (right, `col-span-7`); bottom block = remaining 16 images in 4-per-row grid
- `HotelGalleryCard` updated: added optional `className` prop (`twMerge` handles conflict with `aspect-[4/3]`); top-4 images pass `h-full aspect-auto` to fill 2×2 cells; bottom images unchanged
- Parent block uses `min-h-[460px]` to satisfy map's `min-height: 450px` CSS constraint; `print:min-h-0 print:h-80` for PDF
- `ReportMap` reused exactly — same hooks (`useCompset`, `useMapViewport`), same overlays (`MapControls`, `MapLegend`), same layer toggles (heatmap/metro/histórico)

### Competitive Set report page — `/report/competitive-set`
- Created `src/app/report/competitive-set/page.tsx` — ReportShell + ReportPaper + ActionBar
- Created `CompetitiveSetTable` — 6-col table: property name (dot + name), stars, keys, submarket, facility icons, location score bar. Subject property row: emerald. Competitors: amber stars + slate bars
- Created `HotelGalleryGrid` — 4-col `aspect-[4/3]` image grid, `print:grid-cols-4`
- Created `HotelGalleryCard` — image with hover scale + frosted-glass arrow button bottom-right
- Created `PrimeToggle` — client component toggle switch (emerald-700 when on), `print:hidden`
- Updated `ReportPaper` — added `titleSize?: "2xl"|"4xl"` and `headerRight?: ReactNode` props; backward compatible
- Created `src/lib/report/competitive-set-data.ts` — `CompetitorProperty`, `GalleryImage`, `getMockCompetitiveSet()`
- Facility icons via Lucide: `Wine`, `UtensilsCrossed`, `Sun`, `Users`, `Dumbbell`, `Leaf`; unavailable = `opacity-30`

---

## 2026-05-07

### Navigation wiring — Landing ↔ CompSet ↔ Executive Summary
- `ReportTopNav`: "HotelVALORA" logo is now `<Link href="/">` (was inert `<div>`)
- `CompetitorPanel`: "Confirmar CompSet →" is now `<Link href="/report/executive-summary">` (was inert `<button>`)
- Establishes full 3-step flow: `/` → `/compset` → `/report/executive-summary`

### Mandatory documentation system
- Expanded `CLAUDE.md` with full docs maintenance rule (triggers, file list, process)
- Created 8 new `/docs` files: `routing.md`, `report-system.md`, `print-system.md`, `design-system.md`, `components.md`, `business-rules.md`, `financial.md`, `workflows.md`, `changelog.md`
- Updated `docs/frontend.md` and `ENTRYPOINTS.md` with report module + print system entries

---

## 2026-05-06 (prior session)

### Executive Summary — Professional A4 print system
- `globals.css`: `@page { size: A4 portrait; margin: 8mm 10mm }`, `.report-print-canvas { width: 960px; zoom: 0.74 }`, `compset-map-container { min-height: 0 }` in print
- `ReportShell`: added `report-print-canvas` class to `<main>`
- All 3 sections (`AssetSection`, `MarketSection`, `ValuationSection`): added `print:grid-cols-12`, `print:col-span-7`, `print:col-span-5` — fixes Chrome print grid collapse below 768px viewport
- `LockedGate` + `LockedUpgradeCard`: added `print:hidden`
- `MarketSection` map: `print:aspect-auto print:h-36` to cap height

### Hotel photo carousel
- Created `HotelPhotoCarousel` (client component) — `aspect-[4/3]`, 5 photos, prev/next arrows bottom-right, `1/5` counter
- Replaced static photo in `AssetSection`

### Full CompSet map in Market Overview
- Created `ReportMap` (`components/report/ui/report-map.tsx`) — uses `useCompset` + `useMapViewport`, renders `CompsetMapGL` + `MapControls` + `MapLegend`, no competitor panel
- Embedded in `MarketSection` right column

### Report shell infrastructure
- Created `ReportShell`, `ReportPaper`, `ReportTopNav`, `ReportSidebar`, `ReportFooter`, `ActionBar`
- Created `/report/executive-summary` standalone route
- `ActionBar`: 3 text-only buttons (FAVORITOS, GUARDAR, UPGRADE), positioned below ReportPaper

### Map size revert
- Map in MarketSection reverted to `aspect-video` (16:9) after carousel was added — user preferred original map proportions

---

## 2026-05-05 (initial build)

### Monorepo scaffold
- Next.js 14 + FastAPI monorepo initialized
- PostgreSQL domain schema established
- Core models: HotelAsset CRUD routes, service, schemas

### Executive Summary data layer
- `executive-summary-data.ts`: types (`AssetData`, `MarketMetricsData`, `ValuationData`, `ChartSeriesData`), formatters, mock data
- `SparklineBar`, `SparklineLine` SVG chart components
- `AssetSection`, `MarketSection`, `ValuationSection`, `SparklineGroup` components
- `LockedGate`, `LockedUpgradeCard`, `SubSectionHeading`, `MethodologicalNote` UI primitives

### CompSet map
- Mapbox GL integration with `react-map-gl` v8
- `CompsetMapGL`, `CompetitorPanel`, `CompetitorCard`, `MapControls`, `MapLegend`
- `useCompset`, `useMapViewport` hooks
- `/compset` route with full competitor selection flow

### Report navigation
- `report-nav.ts`: 6-section registry, 15 items
- `ReportSidebar` renders section links
