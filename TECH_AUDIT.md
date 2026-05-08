# TECH_AUDIT.md — HotelVALORA Architectural Audit

**Date (audit):** 2026-05-08
**Status update:** 2026-05-08 (same day — full Phase 0 + 4 section integrations completed)
**Auditor:** Claude Opus 4.7 (architectural review only — no code changes)
**Scope:** Frontend platform (`apps/web`), report system, design system, maps, docs, repo hygiene

---

## 🟢 Status Update — 2026-05-08

The body of this audit is **preserved as the original snapshot** at the moment the review was performed. Below is a status delta against every top-level finding.

### Critical findings — all resolved

| Original finding | Status | Resolution |
|---|---|---|
| Two parallel report architectures (`shell/` + `layout/`) | ✅ **Resolved** | Phase 0 — canonical shell only. `layout/`, `report-context.tsx`, `[reportId]` route tree all deleted. |
| Two competing section registries (`report-nav.ts` + `sections.ts`) | ✅ **Resolved** | `report-nav.ts` deleted; `sections.ts` is canonical. |
| Three PDF export entry points | ✅ **Resolved** | Single `lib/report/pdf-export.ts` + canonical `PdfExportButton` primitive. `export-button.tsx` and `pdf-export-button.tsx` (under `ui/`) deleted. |
| Repo-root Vite cruft | ✅ **Resolved** | `index.html`, `vite.config.js`, root `src/`, root `node_modules/` removed. `backup.ps1` moved to `scripts/`. |
| Documentation drift | ✅ **Resolved** | All docs updated; `docs/print-pdf.md`, `docs/component-library.md`, `docs/maps.md`, `REPORT_PAGES.md`, `UI_COMPONENTS.md` created. Legacy `docs/print-system.md` and `docs/components.md` removed. |
| Section components reused across two arches with diverging mocks | ✅ **Resolved** | Single canonical primitives barrel, single mock per section family. |
| `LockedGate` / `LockedUpgradeCard` raw access | ⚠ **Partial** | Surfaced as `UpgradeGate` / `UpgradeCard` primitives; raw files remain for backward-compat. |
| Frontend has no automated tests | ⏸ **Outstanding** | Next-phase. |

### New report sections shipped after the audit

| Section | Route | Status |
|---|---|---|
| Executive Summary | `/report/executive-summary` | ✅ Shipped (pre-audit) |
| Asset Analysis · Hotel personalizado | `/report/asset-analysis` | ✅ **Shipped post-audit** |
| Asset Analysis · CAPEX & Renders | `/report/asset-analysis/capex` | ✅ **Shipped post-audit** |
| Competitive Set | `/report/competitive-set` | ✅ Shipped (pre-audit) |
| Market Overview (Country / Market / Submarket / Class + shared modules) | `/report/market-overview` | ✅ **Shipped post-audit** |
| Financials | `/report/financials` | ⏸ Pending |
| Methodology | `/report/methodology` | ⏸ Pending |

### Architectural decisions taken

1. **Canonical sidebar from `sections.ts`.** Sub-items support absolute paths (sub-routes) and hash anchors. Two-pass active detection: prefer matching sub-route, fall back to first hash-anchor.
2. **Print canvas:** A4 portrait default (960 px / `zoom: 0.74`). Optional A4 landscape variant (1400 px / `zoom: 0.76`) via `<ReportShell printOrientation="landscape">` + named `@page market-landscape`. Firefox `@-moz-document` fallback uses `transform: scale()` for both orientations.
3. **`@page` margin:** unified to **`10mm`** (was `8mm 10mm`) for institutional symmetry.
4. **Market Overview carousel:** desktop paged (overflow hidden + transform translate driven by a `--page` CSS variable + floating arrow buttons), mobile/tablet free swipe with snap, print collapses to a static 2 × 2 grid via `.market-carousel-track { display: grid; ... break-inside: avoid }`.
5. **Stitch fidelity for Submarket / Class investment metrics:** match the source (Spain / Madrid context labels) verbatim per second-Stitch reference.
6. **Footer KPI tile:** Población / Premium Inventory rendered as a vertical tile in column 3 of a 3-col grid, leaving columns 1+2 reserved for future metrics (matches investment-tile styling).
7. **Sub-anchor active detection:** first hash-anchor wins when no sub-route matches, preventing the previous "all sub-anchors active" bug on hash-only sections.

### Reverted decisions

- A4 landscape for Market Overview was implemented and then reverted to portrait per institutional report standard. The landscape canvas variant remains available in `ReportShell` for future use; the named-page CSS rule is harmless when no element opts in.

### Outstanding (next-phase)

- `/report/financials` and `/report/methodology` pages.
- Real API integration (`lib/api/reports.ts` with TanStack Query hooks; backend stubs).
- Cross-browser print test matrix (currently Chromium-verified; Firefox fallback wired but not visually verified).
- Auth gating on report routes.
- Bundle audit — `recharts` and `numeral` are installed but unused.
- `next/image` migration for hotel photos.
- Mapbox `<MapProvider>` shared instance between `/compset` and `/report/competitive-set`.

### Where to look now

| Need | File |
|---|---|
| Implementation status of every page | `REPORT_PAGES.md` |
| Component catalog | `UI_COMPONENTS.md` and `docs/component-library.md` |
| Print/PDF rules | `docs/print-pdf.md` |
| Report architecture | `docs/report-system.md` |
| Map system | `docs/maps.md` |
| Updated scores | `ARCHITECTURE_SCORECARD.md` |
| Forward plan with status | `NEXT_PHASE_PLAN.md` |
| Day-by-day history | `docs/changelog.md` |

---

## 0. Executive Summary  *(original — preserved as audit snapshot)*

HotelVALORA is **structurally sound at the macro level** (clean monorepo, async FastAPI, async SQLAlchemy 2.0, Pydantic v2, App Router, TanStack Query, Tailwind+Radix). The backend domain layering is clean and the financial / dedup / alias domains are well-modeled.

The **critical architectural risk lives in the frontend report module**, which is currently mid-migration between two parallel architectures that **both contain real code, real routes, and real mock data**. This is the single biggest source of technical debt and the gating factor for "scaling to 15+ pages." Every other frontend issue is downstream of it.

> **Update:** the dual-architecture issue described above was fully resolved in Phase 0. See the status table at the top of this file.

---

## 1. Architecture Quality

### 1.1 Scalability — moderate

| Layer | State | Notes |
|---|---|---|
| Backend (`apps/api`) | Strong | Async throughout, JSONB flex columns, Celery for heavy work, response/error contract is single-source. Will scale horizontally. |
| Database | Strong | UUID PKs, FK CASCADE/SET NULL discipline, indexes on FKs and lookup columns, JSONB for `meta` / `cash_flows` / `sensitivity`. Migration head 0005. |
| Data pipeline | Strong | Multilingual normalisation (572 passing tests), confidence scoring, dedup tiers. `_key()` inlined in 3 services — known debt. |
| Financial engine | Decent | DCF projections live in `services/financial_engine`; tightness with `ValuationService` not fully tested. |
| Report module | **Fragile** | Two parallel architectures (see §3). Cannot scale to 15 pages in current form. |
| Auth | Incomplete | JWT exists, route-level role enforcement does not, refresh interceptor missing. |

### 1.2 Modularity — good at the seams, leaky inside the report tree

- Backend services do not import routers — clean.
- `services/data_pipeline` is correctly isolated from `apps/api` (logic re-implemented inline). This is documented as deliberate; debt acknowledged.
- Frontend `components/`, `lib/`, `types/` boundaries are honoured.
- **Inside `components/report/`**, the boundary collapses: section components (`AssetSection`, `MarketSection`, `ValuationSection`) are imported by both `shell/`-based and `layout/`-based pages, with different paper wrappers and different mock formatters around them.

### 1.3 Maintainability — currently degrading

- 2,078 LOC across 35 report components. Fine.
- Duplication is the maintenance tax: a designer change to "the report header" needs to land in `report-paper.tsx`, in the inline header inside `[reportId]/executive-summary/page.tsx`, **and** in `section-wrapper.tsx`. Three places, three styles.
- Documentation drift already detected: `docs/financial.md` says formatters output `€12.5M`; `executive-summary-data.ts` outputs `12,5M€` (Spanish locale, suffix). A reader following the docs will miswrite UI strings.

### 1.4 Reusable systems — partial

| Asset | Reuse status |
|---|---|
| `cn()` utility | Used everywhere ✓ |
| Section components (Asset/Market/Valuation) | Used by both architectures ✓ |
| `ReportMap` | Reused in MarketSection + HotelGalleryGrid top block ✓ |
| Sparklines (`SparklineBar`, `SparklineLine`) | Shared, pure SVG, no chart lib dep ✓ |
| `LockedGate` / `LockedUpgradeCard` | Single source ✓ |
| `KpiCard` / `KpiGrid` | Built (kpi-card 116 LOC, kpi-grid 32 LOC) but **not consumed by either current report page** — orphaned scaffolding |
| `ChartContainer` / `ChartPlaceholder` | Built but unused — orphaned scaffolding |
| `ReportPaper` | Used by standalone arch only; parametric arch reimplements paper inline |
| Paper header | Three implementations: `PaperHeader` (shell), inline header (parametric ES), `SectionWrapper` title bar (parametric sections) |

### 1.5 Report inheritance quality — **the central problem**

There are **two complete report shells** in the codebase, both wired to real routes:

**Architecture A — Standalone "Stitch shell"**
- Routes: `/report/executive-summary`, `/report/competitive-set`
- Shell: `components/report/shell/{report-shell, report-paper, report-sidebar, report-top-nav, report-footer}.tsx`
- Section registry: `lib/report/report-nav.ts` (6 items)
- Mock: `executive-summary-data.ts`, `competitive-set-data.ts`
- Print: A4 canvas via `report-print-canvas` class on `<main>`
- PDF export: `pdf-export-button.tsx` (16 LOC, naive `window.print()`)
- Has the actual finished pixels (the Stitch designs)

**Architecture B — Parametric report scaffold**
- Routes: `/report/[reportId]/`, `/report/[reportId]/executive-summary`, `/report/[reportId]/[section]`
- Shell: `components/report/layout/{report-layout, report-sidebar, report-header}.tsx`
- Provider: `components/report/report-context.tsx` (`ReportProvider`, `useReport`)
- Section registry: `lib/report/sections.ts` (15 items, 6 groups, page-break flags)
- Mock: `mock-data.ts` → `getMockReport(reportId)`
- Section system: `SectionWrapper` + `SectionPlaceholder` + `SectionNav` (prev/next)
- Formatters: `lib/report/formatting.ts` (Intl-based, multi-currency)
- PDF export: `pdf-export.ts` (40 LOC, dynamic title swap, server-export hook stub)
- Has the proper scaling architecture but no real pixels yet

**Both** importing the same `AssetSection` / `MarketSection` / `ValuationSection` from `components/report/executive-summary/`. **One** of them (`[reportId]/executive-summary/page.tsx`) reimplements `ReportPaper` inline rather than importing it.

This is **not a bug**; it is a partly-completed migration. But it must be resolved before adding sections 4–15.

### 1.6 Technical debt risks

Ordered by severity:

| # | Risk | Severity |
|---|---|---|
| 1 | Two parallel report shells; section content lives in one mock layer used by both | **Critical** |
| 2 | 6-item nav registry (`report-nav.ts`) and 15-item registry (`sections.ts`) describe different reports; sidebars target different routes | **Critical** |
| 3 | Repo-root Vite cruft (`index.html`, `vite.config.js`, `vite.err.log`, `vite.out.log`, `src/App.jsx`, `src/main.jsx`, `node_modules`) is committed | High |
| 4 | Three PDF export entry points (`pdf-export.ts`, `pdf-export-button.tsx`, `export-button.tsx`) | Medium |
| 5 | Documentation drift: formatters, registry counts (`docs/architecture.md` says "6 sections", `docs/report-system.md` says "15 items") | Medium |
| 6 | Frontend has no automated tests; no Storybook; no visual regression | Medium |
| 7 | `_key()` normalisation inlined in 3 backend services (acknowledged in roadmap) | Medium |
| 8 | No token refresh interceptor in Axios client | Low |
| 9 | KPI/Chart scaffolding components built but unused | Low |

---

## 2. Frontend Review

### 2.1 Component organisation

`components/report/` has **eight subfolders**: `charts`, `competitive-set`, `executive-summary`, `kpi`, `layout`, `sections`, `shell`, `ui`, plus a top-level `report-context.tsx`.

- `shell/` and `layout/` overlap completely in purpose — pick one.
- `kpi/` and `charts/chart-*` are proto-architecture for sections 3–15 that aren't implemented yet — fine to keep, but they should be exercised at least once before more components join them.
- `ui/` mixes generic primitives (`LockedGate`, `MethodologicalNote`) with feature-specific ones (`ReportMap`, `LockedUpgradeCard`). Name `ui/` is a misnomer — these are report-specific.

### 2.2 Unnecessary duplication

| Duplicate | Locations |
|---|---|
| Report shell | `components/report/shell/` and `components/report/layout/` |
| Report sidebar | `shell/report-sidebar.tsx` (70 LOC) and `layout/report-sidebar.tsx` (102 LOC) |
| Section registry | `lib/report/report-nav.ts` (6) and `lib/report/sections.ts` (15) |
| Mock data fn | `getMockExecutiveSummary` and `getMockReport` |
| Number formatters | `executive-summary-data.ts` (`fmtMillionsEUR` → `12,5M€`) and `formatting.ts` (`formatReportCurrency` → Intl) |
| PDF export | `pdf-export.ts` + `pdf-export-button.tsx` + `export-button.tsx` |
| Methodology block | `MethodologicalNote` component **and** an inline copy hard-coded in `[reportId]/executive-summary/page.tsx` (lines 41-50) |

### 2.3 Layout consistency — concerning

The same "Executive Summary" page renders with **two different paper styles**:
- `/report/executive-summary` uses `ReportPaper` (paper header has section label + h2 + PDF export button)
- `/report/<id>/executive-summary` uses an inline div with the same shadow/border classes but a different header structure (no PDF export button, no `headerRight` slot)

A user navigating both routes today sees inconsistent chrome.

### 2.4 Responsive behaviour

- Tailwind `md:` breakpoint is the de facto desktop trigger throughout.
- `globals.css` adds height-based viewport rules (`@media (min-height: 800px)`) — only used on landing/compset, not in report.
- No phone-targeted layout. The `ReportLayout` (parametric) implements a mobile drawer; `ReportShell` (standalone) does not (sidebar `hidden lg:block`).
- Print viewport (Chrome 718px) is treated as a third "device" via `print:` variants — well-handled inside Architecture A but not inside `SectionWrapper` of Architecture B.

### 2.5 Print behaviour

- Globally well-engineered: A4 portrait, 8×10mm margins, 960px canvas with `zoom: 0.74`, color-fidelity preservation, `break-inside: avoid` on section/table.
- Risk: `zoom` is **not supported in Firefox** (`zoom: 0.74` becomes a no-op). PDF export there will overflow the page.
- Risk: Print currently lives only on routes that mount `ReportShell` (the standalone arch). Architecture B's `ReportLayout` does **not** apply `report-print-canvas` to its `<main>` — printing a `[reportId]` page produces a full-width unscaled PDF.
- `MethodologicalNote` print font is `text-[8px]` — at A4 zoom 0.74 this is ~6pt. Borderline-legible.

### 2.6 Map integration quality

- Mapbox GL is encapsulated correctly: `CompsetMapGL` is dynamic-imported with `ssr:false`; the `useMapViewport` hook isolates camera state; layers pass through props.
- Three layer components (`map-heatmap-layer`, `map-metro-layer`, `map-polygon-layer`) — clean separation.
- `ReportMap` reuses the same hooks as `/compset` — the hybrid Gallery+Map pattern in `HotelGalleryGrid` is built on this and works.
- Concerns:
  - `ReportMap` always calls `useCompset(referenceHotelId?)`. When mounted twice on the same page (once in MarketSection, once in HotelGalleryGrid in CompetitiveSet) it triggers two independent state initializations. Fine for mock data, will need a singleton/context once it hits an API.
  - No `<MapProvider>` from react-map-gl — multiple maps cannot interact (acceptable today).
  - Mapbox token is not visible in the audited surface; verify it's behind `NEXT_PUBLIC_MAPBOX_TOKEN` and not hard-coded.

### 2.7 Performance concerns

| Concern | Impact |
|---|---|
| All report pages are **server components** that import client components — fine, but `getMockExecutiveSummary` runs on every navigation. When real, this becomes a per-request DB hit; needs caching/server actions. | Medium |
| `recharts` is in `package.json` but not used — adds ~100kB to bundle if tree-shake fails. | Low |
| `numeral` and `date-fns` both present; only `Intl` and ad-hoc strings used in audited paths. Two libraries with overlapping responsibilities. | Low |
| Map page mounts Mapbox even when mock data is small — fine, but lazy-loading is essential when token-gated tile usage is metered. | Low — already handled via `dynamic(ssr:false)` |
| No image optimisation (`next/image`) seen in carousel/gallery; using raw `<img>` against Unsplash. Paid plan target should switch to next/image + a CDN. | Medium |

---

## 3. Report System Review

### 3.1 Report shell quality

- `ReportShell` (Architecture A) is **31 lines and clean** — top nav + sidebar flex + main + footer. Easy to reason about.
- `ReportLayout` (Architecture B) is **95 lines** including a real mobile drawer, sticky brand bar, `lg:static` sidebar — more capable but heavier.
- Picking A means losing the mobile drawer + provider + 15-section sidebar.
- Picking B means losing `ReportPaper` + the paper-card design language already shipped on `/report/executive-summary`.
- **The right move is to merge:** keep B's outer chrome (provider + drawer + sticky shell), import A's `ReportPaper` for inner content, retire A's `ReportShell` and `shell/report-sidebar.tsx`.

### 3.2 Sidebar / navigation architecture

- `lib/report/sections.ts` (15 sections, 6 groups, page-break flag) is the **right** registry to standardise on. It carries everything needed for sidebar grouping, deep-linking, prev/next, and print behaviour.
- `lib/report/report-nav.ts` is a reduced 6-item legacy of the original Stitch design and should be deleted once the standalone routes are folded into `[reportId]`.
- Sidebar collapse (`layout/report-sidebar.tsx`) supports group toggling — A's sidebar does not. Keep B's.

### 3.3 Reusable report sections

| Section | Reusable? | Notes |
|---|---|---|
| `AssetSection` | Yes — already used by both arches | Hard-coded copy strings (Spanish), should accept i18n keys |
| `MarketSection` | Yes | Embeds `ReportMap` directly — good |
| `ValuationSection` | Yes | Embeds `SparklineGroup` directly — good |
| `CompetitiveSetTable` | Yes — but 207 LOC with inline icon mapping; pulls Lucide icons inline | Refactor candidate, low priority |
| `HotelGalleryGrid` | Yes | Tightly coupled to 20-image mock; consider passing top/bottom split as props |

### 3.4 PDF export architecture

- `pdf-export.ts` is the **right** API surface (`exportReportToPDF(report, options)` + `requestServerExport()` stub for future Puppeteer hook). It is not actually wired to any button.
- `pdf-export-button.tsx` (used by `ReportPaper`) calls `window.print()` directly with no metadata, no hook into `ReportContext.togglePrintMode`.
- `export-button.tsx` (46 LOC) — not located in any rendered page in audited paths; likely dead code.
- **Consolidate to**: `pdf-export.ts` is the single API; one button component (`PdfExportButton`) calls `exportReportToPDF(report, options)` and uses `ReportContext` to set/clear `isPrintMode`. Delete the others.

### 3.5 Future scalability for 15+ pages

The scaffolding for 15 pages is ALREADY built (`SECTION_GROUPS`, `SectionWrapper`, `SectionPlaceholder`, `SectionNav` with prev/next, `printPageBreak` per section). This is correct. The blockers are:

1. The two finished pages live on **non-parametric** routes that don't share the scaffold.
2. `report-print-canvas` is applied only on Architecture A's main — Architecture B's `<main>` does not have it.
3. Per-section data fetching needs a per-section TanStack Query layer; today there is no `lib/api/reports.ts`.
4. Page-break handling is declared in `sections.ts` but `SectionWrapper`'s `print:break-before-page` only works if the section is NOT inside `zoom: 0.74` (zoom interferes with page breaks in some Chromium builds).

---

## 4. Design System Review

### 4.1 Typography consistency — solid

- Two fonts (Inter body, Manrope display/headline) loaded once at root via Next Font, consumed via Tailwind family aliases (`font-headline`, `font-display`, `font-body`, `font-label`).
- A risk: `font-display` and `font-headline` both alias to Manrope — if the brand changes one, the other will silently follow. Single token would be cleaner.

### 4.2 Spacing consistency — mixed

- Report sections inside `ReportPaper` use `px-8 pt-8 pb-6` / `px-8 py-6` — paired with `print:px-4 print:py-2`. Not extracted to a class — every page hard-codes it.
- The parametric `[reportId]/executive-summary/page.tsx` uses `px-8 py-6 space-y-12` instead — different spacing on the same logical content.

### 4.3 Color / token consistency — partly tokenised

| Source | Status |
|---|---|
| shadcn/ui CSS vars (`--primary`, `--background`, etc.) | Defined in `globals.css` ✓ |
| Tailwind config `forest`, `brand`, `gold` palettes | Defined ✓ |
| Hex literals in code (`#005db7`, `#0E4B31`) | Used in 2+ places — should be tokens |
| `bg-emerald-50/50`, `bg-emerald-100/50` | Used as semantic "highlight" — should be a `--row-highlight` token |
| Map pin colours | Inline in `hotel-marker.tsx` — not auditing in this pass, but flagged for consistency review |

The `forest` palette is incomplete (only 50, 700, 900 defined). Production-grade design systems usually define the full 50–950 ramp; without it, hover/focus states reach for arbitrary `forest-800` that **doesn't exist** in the config.

### 4.4 Reusable UI primitives

- `components/ui/` has six items: `badge`, `button`, `card`, `dialog`, `pricing-card`, `search-bar`. That is small for a platform aiming at 15+ report pages.
- Missing primitives that would prevent ad-hoc duplication when sections 4–15 land:
  - `Table` / `TableRow` (every section reimplements the table classes)
  - `MetricRow` (label + value + delta — 5 inline copies in valuation/market/asset sections)
  - `Stat` / `StatGrid` (KPI primitive — `report/kpi/kpi-card.tsx` exists but is unused)
  - `Toggle` (CompSet's `PrimeToggle` is bespoke; should be Radix-based)
  - `Tabs` (Radix package is installed but no shared wrapper)

### 4.5 Institutional design quality

Visual quality of the two finished pages is high (white paper, graph-paper texture, conservative type, emerald-forest palette, sparklines without chart-lib chrome — this is the right aesthetic for institutional valuation reports). The risk is **drift** as sections 4–15 land: without a documented Stat / MetricRow / Table primitive, each section will reinvent the row.

---

## 5. Map System Review

### 5.1 Reuse between CompSet and Report

- `useCompset` and `useMapViewport` are reused identically.
- `CompsetMapGL` is reused identically.
- `MapControls` and `MapLegend` are reused identically.
- `ReportMap` is a thin wrapper that omits `CompetitorPanel`. Clean.
- The CompSet selection page (`/compset`) and the Competitive Set report page (`/report/competitive-set`) end up with the **same layer toggles, same camera state** — except the underlying `useCompset()` is independently instantiated in each mount. If a user toggles the heatmap on `/compset` and confirms, the toggle does **not** persist into `/report/competitive-set`.

### 5.2 Mapbox architecture

- Dynamic import + `ssr:false` is correct for Mapbox GL.
- `react-map-gl v8` (current) is correct for Next 14.
- No `MapProvider` from react-map-gl — single map per page, no inter-map sync. Acceptable.
- No on-screen attribution/footer override audited — verify Mapbox attribution is not hidden (TOS).

### 5.3 Geo-layer scalability

- Three layers today: heatmap, transport, historic. Each has its own component (`map-heatmap-layer`, `map-metro-layer`, `map-polygon-layer`).
- Layer state is a flat object inside `useCompset`. Adding a 4th layer means: add to type, add to component tree, add to legend, add to mock data.
- Will work for 5–10 layers; beyond that, a layer-registry pattern (similar to `sections.ts`) is preferable.
- Heatmap is data-driven — but the data source today is mock; once real, watch for the GeoJSON payload size on initial map load.

### 5.4 Heatmap / layer architecture

- Heatmap layer is separate from polygon and transport — good.
- No clustering logic visible — at >50 hotel pins, Mapbox will need clustering (cluster-source + click-to-zoom). Not implemented.
- No legend numeric scale for heatmap intensity — only on/off toggle. Acceptable for marketing, weak for institutional.

---

## 6. Documentation Review

### 6.1 Strengths

- The /docs system is **well-organised and disciplined** — 24 files, each tightly scoped, ENTRYPOINTS.md as a task→file index, AI_CONTEXT.md as the compressed mental model.
- CLAUDE.md mandates docs maintenance; recent commits show it being honoured.
- Print system, design system, and report system each have dedicated files — non-trivial discipline.

### 6.2 Missing docs

- **No doc covers Architecture A vs Architecture B.** A reader following `docs/report-system.md` will assume only `ReportShell` exists; they will not find `ReportLayout` or `ReportProvider` until they grep for them.
- No `docs/state-management.md` — `zustand` is in `package.json` but unused; `useCompset` is documented but no broader state strategy.
- No `docs/i18n.md` — current copy is mixed Spanish/English, hard-coded; a localisation strategy is overdue.
- No `docs/maps.md` — the map system is non-trivial (Mapbox + dynamic import + 3 layers + report reuse) and currently spans `docs/frontend.md` + `docs/report-system.md`. It deserves its own page.
- No `docs/tests-frontend.md` — frontend test policy is undefined.

### 6.3 Outdated docs

| Doc | Drift |
|---|---|
| `docs/architecture.md` | "Report sidebar navigation is driven by `report-nav.ts` (6 sections)" — true for A only; B uses `sections.ts` (15) |
| `docs/report-system.md` | Refers only to Architecture A; never mentions `[reportId]` route or `ReportProvider` |
| `docs/financial.md` | Formatter examples (`€12.5M`) do not match implementation (`12,5M€`) |
| `docs/components.md` | `ReportPaper` table omits `titleSize`/`headerRight` props (added in latest commit) — actually says they exist; verify after re-read |
| `ENTRYPOINTS.md` | Lists `/report/[reportId]/[section]/page.tsx` but not `[reportId]/page.tsx` (root redirect) or `[reportId]/layout.tsx` |
| `docs/changelog.md` | Stops at 2026-05-07; latest commit `2428db1` (2026-05-08) not entered |

### 6.4 Unnecessary docs

None. Every /docs file pulls weight. Some are slim (`docs/observability.md`, `docs/testing.md` not audited but listed) — pre-emptive scaffolding is fine.

### 6.5 Context-loading optimisation

- AI_CONTEXT.md (140 lines) is the right size — fits comfortably in context.
- ENTRYPOINTS.md (186 lines) at the limit — okay.
- RULES.md (109 lines) — comfortable.
- The "read these first" rule in CLAUDE.md is followed by the mandate but **not enforced** — there is no automated check that an agent reads them before grepping. This is a process risk, not an architectural one.
- Recommended: drop a one-line pointer in CLAUDE.md to the **two-architecture state** so a future session is warned about it within the first 200 lines of context.

---

## 7. Codebase Risks

### 7.1 Fragile areas

| File / system | Why fragile |
|---|---|
| `report-print-canvas` (`globals.css`) | `zoom: 0.74` is Chromium-only. Firefox PDF export overflows. Safari unverified. |
| Architecture A vs B routing | Two source-of-truth registries (`report-nav.ts` 6 vs `sections.ts` 15). Sidebar links will diverge as content lands. |
| `getMockReport(reportId)` | Returns the same hotel regardless of ID. Any logic that branches on report content will break silently when real data arrives. |
| `executive-summary-data.ts` formatters | Spanish suffix style (`12,5M€`) is locale-correct but not Intl-driven; will fight `formatting.ts` which IS Intl-driven. |
| `useCompset(referenceHotelId?)` | Hook fetches its own state per mount; multiple instances on a page = multiple independent fetches. Fine on mock, will become a perf issue. |
| Untracked file `function hotelvalora {.txt` and tracked `backup.ps1` | Operational scripts inside the repo without `scripts/` placement; risk of accidental commit / dead automation. |

### 7.2 Future bottlenecks

1. **Per-section data fetching.** When real `GET /api/v1/reports/{id}` arrives, it has to either return the whole 15-section payload (large JSON) or be split per section. Today there is no `lib/api/reports.ts`.
2. **Image hosting.** Hotel photos default to Unsplash. A paying customer's hotel photos must come from S3 (`S3_BUCKET_DOCUMENTS` exists in config). No CDN-aware image component is wired.
3. **PDF fidelity at scale.** `zoom: 0.74` works for one page. For 15 sections with `print:break-before-page`, the canvas zoom + page breaks need explicit testing; today only Chromium is exercised.
4. **Bundle size.** `recharts` (~100kB) is installed but the actual sparklines are pure SVG — recharts is dead weight. Same with `numeral` if `Intl` is the chosen path.
5. **Mapbox tile usage.** Once production traffic arrives, the same map mounts on `/compset` and `/report/competitive-set`. If a user navigates A→B, the second mount is a fresh tile fetch. Caching layer or shared `<MapProvider>` is overdue.

### 7.3 Oversized components

| File | LOC | Verdict |
|---|---|---|
| `competitive-set-table.tsx` | 207 | Above the comfortable ceiling; split out facility-icon mapping + score-bar into helpers |
| `kpi/kpi-card.tsx` | 116 | Borderline; acceptable if it pays off when 15 sections use it |
| `valuation-section.tsx` | 102 | Fine |
| `layout/report-sidebar.tsx` | 102 | Fine |
| `layout/report-layout.tsx` | 95 | Fine |
| All others ≤ 85 LOC | | Healthy |

### 7.4 Bad abstractions

- **`ReportPaper` titleSize prop** (`"2xl" \| "4xl"`) — string-literal sizing is brittle. Should be a variant token (`"default" \| "hero"`).
- **Inline methodology copy** in `[reportId]/executive-summary/page.tsx` — the `MethodologicalNote` component already exists and is used by the standalone arch; this is a copy-paste regression, not an abstraction. Delete the inline copy.
- **`headerRight` prop on `ReportPaper`** — fine in isolation, but it's used to hand-render `<PrimeToggle />` on Competitive Set. As more pages need page-specific header controls (filter dropdowns, period pickers), this will become a junk drawer. Define a `PaperHeaderActions` slot pattern instead.

### 7.5 Routing risks

- **Two report URL spaces** (`/report/<section>` and `/report/<id>/<section>`). When Auth lands and routes are gated, both paths need guarding — duplicated logic.
- **`/report/[reportId]/page.tsx`** redirects to `[reportId]/executive-summary` — fine, but Next 14 will warn on `redirect()` from a non-async server component in some configurations.
- **Hash anchors** in `report-nav.ts` (`/report/asset-analysis#capex`) point to routes that **don't exist** as pages yet. Sidebar links will 404.

### 7.6 Print rendering risks

- Firefox: `zoom` is unsupported. PDF export will overflow A4.
- Safari: `zoom` is supported but with subtle differences in how it interacts with `position: sticky` (sidebar). Probably fine because sidebar is `print:hidden`.
- `[reportId]/...` routes do **not** apply `report-print-canvas` to their `<main>`. Printing them produces a full-width unscaled PDF.
- `MethodologicalNote` `text-[8px]` × `zoom 0.74` ≈ 6pt — borderline on legibility.

### 7.7 State management risks

- `zustand` is in `package.json` but no store file exists — installed-but-unused dependency.
- `useCompset` and `useMapViewport` are React-state-only; no global store. Acceptable today.
- `ReportContext` provider exists but is mounted only by `[reportId]/layout.tsx`. Calling `useReport()` from inside `/report/executive-summary` (Architecture A) will throw. As components are shared across both architectures, this is a latent crash.
- TanStack Query is configured (per `docs/frontend.md`) but no report-domain hooks (`lib/api/reports.ts`) exist. When real data arrives the cache architecture is undefined.

---

## 8. Optimisation Plan (high-level — full plan in `NEXT_PHASE_PLAN.md`)

### 8.1 Highest-priority fixes (architectural, P0)

1. **Resolve the dual report architecture.** Pick parametric (`/report/[reportId]/[section]`) as the canonical path; migrate the two finished Stitch pages into it; delete `components/report/shell/` and `lib/report/report-nav.ts`.
2. **Apply `report-print-canvas` to Architecture B's `<main>`** so PDF works on the canonical routes.
3. **Wire the existing `executive-summary` mock + section components** into the SectionWrapper system so it stops being a one-off page.
4. **Delete repo-root Vite cruft** (`index.html`, `vite.config.js`, `vite.*.log`, `src/App.jsx`, `src/main.jsx`, root `node_modules`).
5. **Single PDF export pipeline.** Consolidate to `pdf-export.ts` + one button component; use `ReportContext.togglePrintMode`; delete duplicates.

### 8.2 Architectural improvements (P1)

6. **Single formatter module.** Pick `formatting.ts` (Intl) as canonical; replace `executive-summary-data.ts` formatters; codify Spanish locale rules in one place.
7. **Per-section data layer.** Add `lib/api/reports.ts` with `useReport(id)`, `useReportSection(id, sectionId)` TanStack Query hooks; replace `getMockReport` callers behind them.
8. **Component primitives.** Extract `MetricRow`, `MetricTable`, `Stat` so sections 4–15 don't reimplement table rows.
9. **`forest` palette completion.** Define forest 50–950 in `tailwind.config.ts`.
10. **Token consolidation.** Replace `#005db7` and `#0E4B31` hex literals with named tokens.

### 8.3 Future-proofing (P2)

11. **Firefox / Safari print test matrix** — block the next PDF-related claim until both are verified.
12. **Mapbox `<MapProvider>` shared instance** between `/compset` and `/report/competitive-set` so layer toggles persist.
13. **Cluster source on Mapbox** before pin count exceeds 50.
14. **Replace `<img>` with `next/image`** for hotel photos; configure CDN allow-list for Unsplash + S3.
15. **Drop `recharts` and `numeral`** if not used — saves ~150kB gzipped.

### 8.4 Performance improvements (P2)

16. **TanStack Query cache for report data** — `staleTime: 5 minutes` on `useReport` so navigating across sections doesn't refetch.
17. **Defer `MapboxGL` tile preload** until `ReportMap` is in viewport — IntersectionObserver wrapping the dynamic import.
18. **Preload Manrope/Inter** with `next/font` — already done — verify font-display: optional vs swap on slow links.

### 8.5 Component standardisation (P2)

19. **Define `<MetricRow>` and `<Stat>` primitives**, port `AssetSection`/`MarketSection`/`ValuationSection` to them — proves the abstraction before sections 4–15 duplicate the patterns.
20. **Promote `kpi/` and `charts/chart-*` from scaffolding to consumed components** by using them in at least one section; delete if not adopted within the next two report pages.

---

## Appendix A — File-Level Hot Spots

| Path | Reason it's flagged |
|---|---|
| `apps/web/src/components/report/shell/` (5 files) | Architecture A shell — to be retired |
| `apps/web/src/components/report/layout/` (3 files) | Architecture B shell — to be canonicalised |
| `apps/web/src/lib/report/report-nav.ts` | Legacy 6-section registry — to be deleted |
| `apps/web/src/lib/report/sections.ts` | 15-section registry — to be canonicalised |
| `apps/web/src/lib/report/executive-summary-data.ts` | Mock + locale-naive formatters — split mock from formatters; drop formatters |
| `apps/web/src/lib/report/formatting.ts` | Canonical formatter module — to be promoted |
| `apps/web/src/lib/report/pdf-export.ts` | Right API; not yet wired into UI |
| `apps/web/src/components/report/ui/pdf-export-button.tsx` | Naive `window.print()`; replace with `pdf-export.ts`-backed version |
| `apps/web/src/components/report/ui/export-button.tsx` | Likely dead code — verify usage, delete if unused |
| `apps/web/src/app/report/[reportId]/executive-summary/page.tsx` | Inlines paper card + methodology — replace with `ReportPaper` + `MethodologicalNote` |
| `apps/web/src/app/report/executive-summary/page.tsx` | Standalone arch route — to be migrated under `[reportId]` |
| `apps/web/src/app/report/competitive-set/page.tsx` | Standalone arch route — to be migrated under `[reportId]` |
| `apps/web/src/components/report/competitive-set/competitive-set-table.tsx` | 207 LOC — refactor candidate |
| Repo root: `index.html`, `vite.*`, `src/App.jsx`, `src/main.jsx`, `node_modules/` | Vite leftovers — delete |
| Repo root: `function hotelvalora {.txt` | Untracked junk — delete |
| `package.json` (web): `recharts`, `numeral` | Verify use; consider removal |

---

## Appendix B — What's Working Well (don't break)

- Backend service / schema / response-contract discipline.
- Async DB session pattern with global commit/rollback.
- Audit log domain (append-only, rollback support, transactional logging).
- Dedup scoring (weighted composite, 5 dimensions, three tiers, FK-safe).
- A4 print canvas approach (the right idea; only Chromium-tested).
- Section registry + `printPageBreak` flag in `sections.ts` — already correct for 15 pages.
- Map componentisation (CompsetMapGL + hooks + layers + dynamic import).
- /docs maintenance discipline (24 files, ENTRYPOINTS index, CLAUDE.md mandate).
- Tailwind + Radix + Lucide stack (typical, low-friction, easy to onboard).
- Use of `cn()` + `tailwind-merge` everywhere.

— end of audit —
