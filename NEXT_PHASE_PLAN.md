# NEXT_PHASE_PLAN.md — HotelVALORA

**Companion to:** `TECH_AUDIT.md`, `ARCHITECTURE_SCORECARD.md`
**Date (plan):** 2026-05-08
**Status update:** 2026-05-08 (Phases 0–9 executed same day)

This plan is **sequenced**. Earlier items unblock later ones; do not pull from later phases until the current one is green. Nothing in this plan rewrites the application or redesigns the UI — it consolidates what is already built.

---

## 🟢 Status overview — 2026-05-08

| Phase | Title | Status |
|---|---|---|
| 0 | Repo Hygiene | ✅ Done |
| 1 | Architectural Decision: One Report Path | ✅ Done |
| 2 | Migrate the Two Finished Pages | ✅ Done (Stitch ports for Asset Analysis, CAPEX & Renders, Market Overview ALL completed in same session) |
| 3 | Single Sources of Truth | ✅ Done |
| 4 | Data Layer for Reports | ⏸ Outstanding (mocks remain; `lib/api/reports.ts` not yet built) |
| 5 | Component Primitives | ✅ Done (canonical primitives barrel built; section families layered on top) |
| 6 | Print Hardening | 🟡 Partial (Firefox `@-moz-document` fallback wired for both orientations; cross-browser visual matrix not yet captured) |
| 7 | Map System Polishing | ⏸ Outstanding (provider sharing between `/compset` and `/report/competitive-set` not yet done; `docs/maps.md` ✅ created) |
| 8 | Documentation Reconciliation | ✅ Done (this update) |
| 9 | Bundle and Dependency Audit | ⏸ Outstanding |
| 10 | Section 2-15 Roll-out Plan | 🟡 Partial — sections 1, 2, 2a, 3, 4 implemented; sections 5 (Financials) and 6 (Methodology) remain |

### Beyond the plan

The original plan targeted ~6–10 sessions before sections 4–15 could land safely. The actual cadence was much faster:

- Phase 0 stabilization: same session.
- 4 of 6 report sections shipped: same day.
- Market Overview integration introduced new patterns (paged carousel + 2 × 2 print + landscape canvas variant + Stitch-faithful Submarket/Class).

The architecture absorbed every new section without any shell, sidebar, print, or PDF changes — the canonical pattern is working as designed.

### Recommended next steps

1. **Phase 4 — Data layer.** Add `lib/api/reports.ts` with TanStack Query hooks `useReport(id)` and `useReportSection(id, sectionId)`. Stub the backend route at `apps/api/app/api/v1/reports/router.py` returning the same mock shape so the contract is exercised end-to-end.
2. **Phase 6 — Print test matrix.** Capture Chromium / Firefox / Safari PDF screenshots for every implemented page. Store under `docs/_screenshots/print/`.
3. **Phase 9 — Bundle audit.** Run the Next bundle analyzer; remove `recharts` and `numeral` if confirmed unused (they were installed for charts that ended up using pure SVG).
4. **Section 5 — Financials page.** Composes from existing primitives + new line-chart and waterfall components. Use `<ReportPaper headerLayout="stacked" closed>` and the standard `space-y-6` rhythm.
5. **Section 6 — Methodology page.** Lighter than Financials — mostly typography + locked tiers list. Reuse `MethodologicalNote` from `components/report/ui/`.
6. **Phase 7 — Mapbox provider.** Lift `useCompset` state into a `<CompsetProvider>` so layer toggles persist across `/compset` → `/report/competitive-set`.
7. **`next/image` migration.** Configure `images.remotePatterns` for the Stitch CDN + S3 bucket; replace raw `<img>` tags in galleries.

---

## Phase 0 — Repo Hygiene (½ session)

Remove drag from the working tree before any architectural surgery.

| # | Action | Files |
|---|---|---|
| 0.1 | Delete Vite-app cruft from repo root | `index.html`, `vite.config.js`, `vite.err.log`, `vite.out.log`, `src/App.jsx`, `src/main.jsx`, `src/index.css`, `src/components/`, `src/data/` |
| 0.2 | Delete root `node_modules/` (Vite-era install) | root `node_modules/` |
| 0.3 | Verify root `package.json` and root `package-lock.json` purpose; either keep as monorepo workspace manifest or delete | root `package.json`, `package-lock.json` |
| 0.4 | Move `backup.ps1` into `scripts/` | `backup.ps1` → `scripts/backup.ps1` |
| 0.5 | Delete or rename untracked junk file | `function hotelvalora {.txt` |
| 0.6 | Add `.gitignore` lines for any IDE/editor outputs left behind | `.gitignore` |

**Exit criteria:** `git status` clean; repo root contains only monorepo orchestration files (`apps/`, `services/`, `infrastructure/`, `docs/`, `scripts/`, `data/`, MD docs, lockfiles, backup script).

---

## Phase 1 — Architectural Decision: One Report Path (1 session)

**Decision (recommended):** canonicalise on **Architecture B** (`/report/[reportId]/[section]`).

**Rationale:**
- Already 15-section-ready (`sections.ts`, `SectionWrapper`, `SectionPlaceholder`, `SectionNav`, `printPageBreak`).
- Has a working mobile drawer (`ReportLayout`).
- Has a `ReportProvider` context that the future PDF / print-mode toggle / role-gating logic needs.
- Architecture A's only structural advantage is `ReportPaper` — that is a component, not a routing strategy, and can be lifted into B without loss.

| # | Decision | Action |
|---|---|---|
| 1.1 | Adopt parametric route as canonical | Document in CLAUDE.md and `docs/report-system.md` |
| 1.2 | Lift `ReportPaper` (and `PaperHeader`) from `shell/` to `layout/` (or to `components/report/` directly) | Re-export, keep API identical |
| 1.3 | Standardise on `lib/report/sections.ts` (15 items) | `report-nav.ts` becomes deprecated |
| 1.4 | Standardise on `lib/report/formatting.ts` (Intl) | `executive-summary-data.ts` formatters become deprecated |
| 1.5 | Standardise on `lib/report/pdf-export.ts` | `pdf-export-button.tsx` becomes a thin caller; `export-button.tsx` deleted |
| 1.6 | Apply `report-print-canvas` class to `ReportLayout`'s `<main>` | One-line CSS class addition |

**Exit criteria:** ADR (architectural decision record) added to `docs/architecture.md` or as a new `docs/report-architecture-decision.md`; no code changes yet.

---

## Phase 2 — Migrate the Two Finished Pages (1–2 sessions)

Move the production-quality pixels from Architecture A into the canonical scaffold.

| # | Action |
|---|---|
| 2.1 | Move `app/report/executive-summary/page.tsx` content → `app/report/[reportId]/executive-summary/page.tsx` (overwrite the placeholder version) |
| 2.2 | Move `app/report/competitive-set/page.tsx` content → `app/report/[reportId]/competitive-set/page.tsx` (new file under section system) |
| 2.3 | Both pages: wrap content in `SectionWrapper` (uses `sections.ts` metadata for title bar and page-break flag) |
| 2.4 | Both pages: place `ReportPaper` inside `SectionWrapper` (paper card stays — it's the brand) |
| 2.5 | Replace inline methodology block with `<MethodologicalNote />` |
| 2.6 | Sidebar: `ReportSidebar` (parametric) generates links from `sections.ts`; verify `/competitive-set` mapping (it's section 9 in the new taxonomy, formerly item 3 in legacy) |
| 2.7 | Delete `app/report/executive-summary/` and `app/report/competitive-set/` directories |
| 2.8 | Add temporary 301 redirects from old standalone routes → `/report/demo-report-001/{section}` so external links don't break |
| 2.9 | Delete `components/report/shell/` (5 files) |
| 2.10 | Delete `lib/report/report-nav.ts` |

**Exit criteria:** Both finished pages render identically before/after migration on a Chromium PDF print test; sidebar from `sections.ts` shows them with correct group + numbering.

---

## Phase 3 — Single Sources of Truth (1 session)

Eliminate the duplicates flagged in TECH_AUDIT §2.2.

| # | Action |
|---|---|
| 3.1 | **Mock data**: leave `getMockExecutiveSummary` and `getMockCompetitiveSet` in place; rename `getMockReport` to `getMockReportMetadata`; consolidate under `lib/report/mocks/` |
| 3.2 | **Formatters**: replace all imports of `fmtMillionsEUR`/`fmtThousandsEUR`/etc. with `formatReportCurrency`/`formatCompactNumber` from `formatting.ts`; **preserve Spanish locale output** (`12,5M€`) by passing `locale: "es-ES"` and adopting `currencyDisplay: "narrowSymbol"` plus a small post-format adjustment helper |
| 3.3 | **PDF export**: `pdf-export-button.tsx` calls `exportReportToPDF(reportMetadata, { format: "pdf", includeCharts: true, includeAppendix: false })`; remove `export-button.tsx` if unused |
| 3.4 | **Methodology**: ensure single `<MethodologicalNote />` import everywhere; remove inline copy in `[reportId]/executive-summary/page.tsx` |
| 3.5 | **Header actions**: replace `headerRight?: ReactNode` on `ReportPaper` with a typed `actions?: { primary?: ReactNode; secondary?: ReactNode }` slot — leaves room for filter/period/period-comparison controls |

**Exit criteria:** `grep` shows one definition for each of: report shell, sidebar, paper, formatter set, PDF export entry, methodology block.

---

## Phase 4 — Data Layer for Reports (1–2 sessions)

Make the path from mock → API a single API hook swap.

| # | Action |
|---|---|
| 4.1 | Create `apps/web/src/lib/api/reports.ts` with TanStack Query hooks: `useReport(reportId)`, `useReportSection(reportId, sectionId)`, `useReportPdfMetadata(reportId)` |
| 4.2 | Define query keys: `["reports", id]`, `["reports", id, "sections", sectionId]` so partial invalidation cascades |
| 4.3 | All section pages call the hooks; today they pass through to the mock fns; tomorrow they hit `GET /api/v1/reports/{id}` |
| 4.4 | Add `apps/api/app/api/v1/reports/router.py` stub returning the same mock shape — so the contract is exercised end-to-end before real data |
| 4.5 | Add `staleTime: 5 minutes` on `useReport` to prevent refetch on intra-report navigation |

**Exit criteria:** All report pages fetch data through TanStack Query; backend `/reports/{id}` stub returns 200 with the mock shape.

---

## Phase 5 — Component Primitives (1 session)

Lock in the design system before sections 4–15 multiply patterns.

| # | Primitive | Replaces |
|---|---|---|
| 5.1 | `<MetricRow label value sublabel? muted? highlight? />` | The hand-rolled rows in AssetSection / MarketSection / ValuationSection |
| 5.2 | `<MetricTable>` + `<MetricTable.Row>` (compound component) | The wrapper `<table className="w-full text-xs border-collapse">` repeated everywhere |
| 5.3 | `<Stat label value delta? trend? unit? />` | Fold `kpi/kpi-card.tsx` into this |
| 5.4 | `<Toggle>` (Radix-based) | Replace bespoke `PrimeToggle` |
| 5.5 | Document new primitives in `docs/components.md` — props, usage example, file path |

**Exit criteria:** All three Executive Summary sub-sections render via the new primitives; visual diff is zero.

---

## Phase 6 — Print Hardening (½ session)

Fix the cross-browser print risk before the platform is shown to any prospect.

| # | Action |
|---|---|
| 6.1 | Add **Firefox fallback** for `zoom`: use `transform: scale(0.74); transform-origin: top left; width: 718px;` inside an `@-moz-document` block (or detect via `@supports`) |
| 6.2 | Verify Safari behaviour; document any deviations in `docs/print-system.md` |
| 6.3 | Bump `MethodologicalNote` print font from `text-[8px]` to `text-[9px]` (≈7pt at zoom 0.74) |
| 6.4 | Confirm `print:break-before-page` survives `zoom: 0.74` — if not, move `printPageBreak` to a CSS class outside the canvas wrapper |
| 6.5 | Take 1×Chromium + 1×Firefox PDF screenshot of Executive Summary + Competitive Set, store under `docs/_screenshots/print/` |

**Exit criteria:** Both pages print to A4 single-page (or multi-page with clean breaks) on Chromium and Firefox; screenshots committed.

---

## Phase 7 — Map System Polishing (½ session)

| # | Action |
|---|---|
| 7.1 | Move `useCompset` state into a top-level `<CompsetProvider>` (Zustand store or React context) so `/compset` and `/report/competitive-set` share layer toggles within a session |
| 7.2 | Add Mapbox cluster source for hotel pins; switch on at >50 pins |
| 7.3 | Verify Mapbox attribution is visible (TOS); audit `compset-map-gl.tsx` |
| 7.4 | Verify Mapbox token is `NEXT_PUBLIC_MAPBOX_TOKEN`; document in `docs/maps.md` (new) |

**Exit criteria:** Layer toggles persist across `/compset` → `/report/competitive-set`; new `docs/maps.md` exists.

---

## Phase 8 — Documentation Reconciliation (½ session)

| # | Action |
|---|---|
| 8.1 | `docs/report-system.md` — rewrite for the canonical (parametric) architecture; remove all references to the deleted standalone routes |
| 8.2 | `docs/architecture.md` — update "Report sidebar navigation is driven by `report-nav.ts`" → `sections.ts` |
| 8.3 | `docs/financial.md` — fix formatter examples to match `formatting.ts` output |
| 8.4 | `docs/components.md` — add Phase 5 primitives; remove deleted shell components |
| 8.5 | `ENTRYPOINTS.md` — update file paths under "Report Module" |
| 8.6 | `docs/changelog.md` — add Phase 0–8 entries |
| 8.7 | New: `docs/maps.md` (Mapbox + layers + token + provider) |
| 8.8 | New: `docs/report-architecture-decision.md` (ADR documenting why parametric won) |
| 8.9 | Remove `pipeline.md` reference from CLAUDE.md if any (already noted as split) |

**Exit criteria:** `grep -r "report-nav.ts" docs/` = 0; `grep -r "ReportShell" docs/` shows only the deprecation note.

---

## Phase 9 — Bundle and Dependency Audit (½ session)

| # | Action |
|---|---|
| 9.1 | If `recharts` is unused in production code, remove it (~100kB gzipped saved) |
| 9.2 | If `numeral` is unused, remove it (use `Intl` everywhere) |
| 9.3 | If `zustand` will be adopted in Phase 7, keep it; otherwise remove |
| 9.4 | Run `pnpm dlx next-bundle-analyzer` (or built-in) once and screenshot top 10 chunks; commit under `docs/_screenshots/bundle/` |
| 9.5 | Replace raw `<img>` for hotel photos with `next/image`; configure `images.remotePatterns` for Unsplash + S3 |

**Exit criteria:** Web bundle < 500kB gzipped on first paint of `/`; report pages < 800kB including Mapbox split chunk.

---

## Phase 10 — Section 2-15 Roll-out Plan (sets up future work)

Once Phases 0–9 are green, sections can be added without architectural risk:

For each new section:

1. The page is `app/report/[reportId]/<section-id>/page.tsx`.
2. It fetches data via `useReportSection(reportId, "<section-id>")`.
3. It renders `<SectionWrapper section={section}><ReportPaper actions={...}>...</ReportPaper></SectionWrapper>`.
4. Internal layout uses `<MetricRow>`, `<MetricTable>`, `<Stat>`, `<SparklineLine>`, etc. — never raw tables.
5. Premium-gated rows use `<LockedGate tier="PRO|PREMIUM" rows={[...]} />`.
6. Page-break behaviour is declared in `sections.ts`, not in the section component.
7. Sidebar updates automatically (registry-driven).

**Exit criteria for Section 2 (Property Overview):** Lands without touching shell, sidebar, formatter, PDF export, or print canvas. If any of those change, the architecture is leaking — go back to Phase 5.

---

## Cross-Cutting Risks During Execution

| Risk | Mitigation |
|---|---|
| Migration breaks existing demo URLs (`/report/executive-summary`) | Phase 2.8 adds 301 redirects — keep them for ≥30 days |
| `formatting.ts` output differs from current `executive-summary-data.ts` (e.g., `12.5M€` vs `12,5M€`) | Phase 3.2 deliberately preserves Spanish format; regression-test with snapshot of pre/post strings |
| Removing `recharts` breaks an unaudited dependency | Phase 9.1: grep before deleting |
| Lifting `useCompset` into a Provider triggers Mapbox token re-init | Phase 7.1: use Zustand or React context with shallow selectors so map only re-renders on actual viewState change |
| Architecture B's `<main>` doesn't currently apply `report-print-canvas` | Phase 1.6: one-line fix; verify on Phase 6 print test |

---

## Done = Ready For Sections 4–15

When Phases 0–9 are complete the platform has:

- One report URL space.
- One shell, one sidebar, one paper card, one PDF pipeline, one formatter module, one section registry.
- A typed data layer (`useReport(id)`) with mock/API parity.
- Reusable `MetricRow` / `MetricTable` / `Stat` primitives.
- Cross-browser print verified.
- Map state shared between `/compset` and `/report/<id>/competitive-set`.
- Zero unused dependencies.
- Updated /docs reflecting the canonical architecture.

At that point sections 4–15 are **content** problems, not architecture problems.

— end of plan —
