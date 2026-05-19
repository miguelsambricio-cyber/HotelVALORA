# Report System Synchronization Audit · v1

**Status:** strategic audit · no implementation
**Author:** institutional audit pass · 2026-05-19
**Scope:** `/report/*` · `/user/admin/*` · `/settings/*` · `/library/*` · cross-cutting design system
**North Star:** make every HotelVALORA surface speak the same institutional language as `/report/financials/underwriting`
**Out of scope:** any code change · any refactor · any migration · any rename

> This is the synchronization blueprint, not the build. It maps what we have, what is misaligned, what to promote, what to leave alone, and in what order to do it. **Implementation is gated on explicit operator approval per phase.**

---

## 0 · TL;DR

1. **Underwriting is the most institutional surface in the repo** — 8-section investment memo, white + `#005db7` blue, edit-mode overlay, phase-aware year grids, FloatingKpiStrip, SectionShell with collapsible detail + assumptions. **It is the canonical reference for the rest of the report module.**
2. **The rest of `/report/*` is uneven.** P&L Forecast (`/report/financials/pl`) is the second-most mature surface and is the natural sibling for underwriting; Competitive Set and Executive Summary are clean but visually behind underwriting; Asset Analysis, CAPEX & Renders, and Market Overview are visually richer but architecturally further from the institutional standard.
3. **Twelve primitives in underwriting should be promoted to canonical** — `SectionShell`, `YearGrid`, `YearRow`, `SubtotalRow`, `DivisionRow`, `KpiHero`, `KpiTile`, `EditableTile`, `FloatingKpiStrip`, `InitialInvestmentBlock`, `ReconciliationBadge`, `RiskIndicator`. These are domain-agnostic today and live in `components/underwriting/primitives/`; they need to move (or re-export) to `components/report/primitives/` to break the implicit underwriting dependency.
4. **Three primitives in `report/primitives/` are currently bypassed in production code** — `MetricTable`, `MetricRow`, `ReportSection` are exported but no shipped page uses them. They are either redundant with the underwriting primitives or need re-targeting.
5. **Two real duplicates exist** — `LockedGate` ⇌ `LockedUpgradeCard` (identical visuals); `methodological-note.tsx` exists twice (ui/ and asset-analysis/). Both safe to consolidate.
6. **Admin and Library are intentionally on a different track.** Admin uses a dark Bloomberg-terminal aesthetic with lime-300 accents and bulk-action toolbars; Library uses a dense kiosk table (39 cols, sticky thead + sticky first col). **These should NOT be folded into the report-investment-memo language.** They should, however, share the same base token layer (typography, color, sticky offsets, badges).
7. **Twelve cross-cutting divergences** in the design-system base layer are the actual blocker to convergence — `#005db7` is hardcoded, z-indexes are magic numbers, sticky top offsets aren't synchronized, max-widths drift between shells, dark-mode infrastructure is configured but unused, etc. These need tokenization **before** any visual refactor, otherwise the new primitives will inherit the same drift.
8. **Recommended sequencing** — token harmonization (Phase 1) → primitive promotion (Phase 2) → per-page migration in maturity order (P&L → ExecSum → CompSet → Market → Asset → CAPEX) (Phase 3) → admin/library token-only alignment (Phase 4). Phases 1–2 are reversible and low-risk; Phase 3 is medium-risk; Phase 4 is cosmetic only.

---

## 1 · The North Star: Underwriting as Canonical Reference

`apps/web/src/app/report/financials/underwriting/page.tsx` and the supporting `components/underwriting/*` tree define the institutional language we want to extend.

### 1.1 What "institutional" means in this codebase

- **Memo, not dashboard.** Top-to-bottom single-scroll narrative; no left in-page nav; 8 sections with stable numbering (01–08); each section is a SectionShell with a sticky header, optional collapsible detail, optional collapsible assumptions, and a status badge.
- **Phase-aware time series.** YearGrid columns are projected via React context; an `excludeAcquisition` flag hides Y0 from operating tables and surfaces a separate `InitialInvestmentBlock` for capital deployment, the convention every IC memo uses.
- **One editable affordance, one color.** `#005db7` blue is the *only* visual signal for "operator can edit this value." Computed values are slate-900; highlighted results are forest-900; semantic tones are emerald (positive), amber (warn), rose (critical).
- **Edit mode is overlay, not page state.** SortableGrid arrow-reorder, EditableText contentEditable, all persisted to localStorage via a zustand store with a 3-state lifecycle (draft → saved → clean). Edit mode is a transient overlay; the canonical render is the read-only view.
- **Scenarios are first-class.** FloatingKpiStrip exposes a ScenarioPicker dropdown for live cap-rate-entry switching; SectionShell layouts react to scenario change via re-computation, not re-mount.
- **Print is the second canvas.** Landscape A4, all overlays (edit bar, KPI strip, scenario picker, assumptions, status toggles) hidden in print; collapsible state respects a `printIncludeDetail` flag; SectionShell ensures stable page breaks.

### 1.2 What underwriting deliberately is NOT

- Not a CRUD table.
- Not a configuration screen.
- Not a real-time monitoring surface.
- Not a kiosk display.
- Not a multi-record list view.

This negative space is important: the operational admin and library surfaces should NOT inherit the memo language because they serve different cognitive tasks.

---

## 2 · Visual Consistency Audit · `/report/*`

### 2.1 Per-page maturity ranking (vs underwriting standard)

| # | Page | Route | Maturity | Primitive Reuse | Editability | Year-grid | Sticky |
|---|---|---|---|---|---|---|---|
| 0 | **Underwriting** (reference) | `/report/financials/underwriting` | **10/10** | own primitives | EditableTile + EditableText | YearGrid, phase-aware | FloatingKpiStrip |
| 1 | P&L Forecast | `/report/financials/pl` | 9/10 | own primitives (`report/financials/*`) | EditableAssumptionCell | 5-year USALI + Y1 monthly expansion | none |
| 2 | Competitive Set | `/report/competitive-set` | 8/10 | bespoke `<table>` + ReportPaper | none | none | none |
| 3 | Executive Summary | `/report/executive-summary` | 7/10 | bespoke AssetFactsTable + StatGrid | none | none | none |
| 4 | Market Overview | `/report/market-overview` | 6/10 | HorizontalInsightScroller + insight cards | none | none | none |
| 5 | Asset Analysis · Hotel personalizado | `/report/asset-analysis` | 5/10 | AssetMetricsTable (raw flex) + LockedGate | none | none | none |
| 6 | Asset Analysis · CAPEX & Renders | `/report/asset-analysis/capex` | 4/10 | 14 bespoke components | render-configurator | none | none |

**Scoring rubric:** primitive reuse (3 pts) · editable affordance presence (2 pts) · time-series semantics (2 pts) · institutional rhythm/density (2 pts) · print parity (1 pt).

### 2.2 What is "behind" underwriting

| Page | Specific gap | Concrete observation |
|---|---|---|
| Executive Summary | No status badges; no editable drivers; uses bespoke `AssetFactsTable` instead of MetricRow/MetricTable primitives | `asset-section.tsx:79` builds its own `<table>` |
| Asset Analysis | `AssetMetricsTable` is a flex container, not a table primitive; double `methodology-note` import | `asset-metrics-table.tsx:37` |
| CAPEX & Renders | 14 bespoke components, none re-used by other pages; render-configurator is exploratory UI without a memo equivalent | entire `components/report/asset-analysis/capex/` |
| Competitive Set | Raw HTML `<table>` instead of MetricTable; emerald accent doesn't match underwriting's forest/blue palette | `competitive-set-table.tsx:207` |
| Market Overview | Visually rich but no editable drivers, no year-grid, no FloatingKpiStrip; emerald/slate palette diverges from forest/blue | `market-overview/` (18 components) |
| P&L Forecast | Already institutional; ASSUMP badge is red instead of `#005db7` blue; uses bespoke `FinancialTable` instead of YearGrid | `financial-table.tsx:204` · `editable-assumption-cell.tsx:108` |

### 2.3 What is "ahead" of the rest

- P&L Forecast's dual-header collapsible Y1-monthly expansion is genuinely novel — it doesn't exist in underwriting and isn't generalizable yet. **Keep specialized; do not force into YearGrid.**
- Library's `favorites-table.tsx` (581 LOC, 39 cols, sticky thead + sticky first col, locked-cell pattern) is institutional but for a different cognitive task (multi-record screening). **Do not merge into report-table primitive; align tokens only.**

---

## 3 · Component Reuse Matrix

Cell legend: ✅ uses canonical · 🟡 uses bespoke equivalent · ❌ no usage · 🚫 not applicable.

| Concern | Underwriting (ref) | P&L | ExecSum | CompSet | Market | Asset | CAPEX | Library | Admin |
|---|---|---|---|---|---|---|---|---|---|
| ReportShell + ReportPaper | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | 🚫 (LibraryShell) | 🚫 (AdminLayout) |
| ReportHeader | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | 🚫 | 🚫 |
| SectionShell (collapsible · status badge) | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | 🚫 | 🚫 |
| YearGrid · YearRow · SubtotalRow | ✅ | 🟡 (FinancialTable) | ❌ | ❌ | ❌ | ❌ | ❌ | 🚫 | 🚫 |
| KpiHero + KpiTile | ✅ | 🟡 (FinancialSummaryStrip) | 🟡 (StatGrid) | ❌ | 🟡 (MarketInsightCard) | ❌ | ❌ | 🚫 | 🟡 (ContactsKpis · per-domain) |
| EditableTile (#005db7) | ✅ | 🟡 (red ASSUMP badge) | ❌ | ❌ | ❌ | ❌ | 🟡 (cost-input-row) | 🚫 | 🟡 (admin/financials capex cells) |
| FloatingKpiStrip | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | 🚫 | 🚫 |
| InitialInvestmentBlock | ✅ | 🚫 | 🚫 | 🚫 | 🚫 | 🚫 | 🚫 | 🚫 | 🚫 |
| ReconciliationBadge · RiskIndicator | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | 🚫 | ❌ |
| ScenarioPicker | ✅ | 🟡 (RevparScenarioCard) | ❌ | ❌ | ❌ | ❌ | ❌ | 🚫 | 🚫 |
| EditMode overlay (SortableGrid + EditableText) | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | 🚫 | 🚫 |
| UpgradeGate / UpgradeCard | ✅ | 🟡 (FreeTierGate) | ✅ (LockedGate inline) | ❌ | ❌ | ✅ (LockedGate inline) | ❌ | ✅ (LockedCell) | 🚫 |
| MetricRow / MetricTable (primitive) | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | 🚫 | 🚫 |
| Sticky thead + first col (institutional dense) | 🚫 | 🚫 | 🚫 | 🚫 | 🚫 | 🚫 | 🚫 | ✅ | ✅ (contacts-table) |
| Bulk action toolbar | 🚫 | 🚫 | 🚫 | 🚫 | 🚫 | 🚫 | 🚫 | 🚫 | ✅ (contacts) |
| 3-state save (hydrating / clean / dirty) | localStorage zustand | 🚫 | 🚫 | 🚫 | 🚫 | 🚫 | 🚫 | 🚫 | ✅ (useDraftedOverrides) |

**Observations:**
- The vertical column for underwriting is the most ✅-rich; every other report page has only the shell + header in common.
- `MetricRow` / `MetricTable` / `ReportSection` from `report/primitives/` are exported but unused. They are **abandoned API surface** — either retire them or re-target them onto the underwriting primitives.
- `UpgradeGate` and `UpgradeCard` are aliases for `LockedGate` and `LockedUpgradeCard`, which are visually identical. One can be retired.
- Admin and Library share the dense-table pattern with each other but not with report.

---

## 4 · Canonical Primitives Proposal

This is the **promotion list**. Underwriting today owns these primitives; they need to live under `components/report/primitives/` so the other report pages can consume them without an implicit underwriting dependency.

### 4.1 Tier 1 — promote as-is (zero domain coupling)

| Primitive | Current path | Target path | LOC | Why it's promotable |
|---|---|---|---|---|
| `SectionShell` | `components/underwriting/primitives/section-shell.tsx` | `components/report/primitives/section-shell.tsx` | 143 | Pure layout; props are `number`, `title`, `summary`, `detail`, `assumptions` |
| `YearGrid` | `components/underwriting/primitives/year-grid.tsx` | `components/report/primitives/year-grid.tsx` | 191 | Context-based column projection; `kind` ∈ {operating, capital}; phase-aware via prop |
| `YearRow` | `components/underwriting/primitives/year-row.tsx` | `components/report/primitives/year-row.tsx` | 111 | Reads visible indices from parent grid context; format-aware |
| `SubtotalRow` | `components/underwriting/primitives/subtotal-row.tsx` | (same file) | 103 | Three tones: subtotal / result / warning |
| `DivisionRow` | (same file) | (same file) | (incl. above) | Section divider with colspan |
| `KpiHero` + `KpiTile` | `components/underwriting/primitives/kpi-hero.tsx` | `components/report/primitives/kpi-tile.tsx` | 55 | Responsive grid + tone-aware tile |
| `EditableTile` | `components/underwriting/primitives/editable-tile.tsx` | `components/report/primitives/editable-tile.tsx` | 154 | `#005db7` blue input with format parsers (integer/years/currency/percent); commit callback only |
| `FloatingKpiStrip` | `components/underwriting/primitives/floating-kpi-strip.tsx` | `components/report/primitives/floating-kpi-strip.tsx` | 173 | Sticky, scenario-picker slot is opt-in |
| `InitialInvestmentBlock` | `components/underwriting/primitives/initial-investment-block.tsx` | `components/report/primitives/initial-investment-block.tsx` | 192 | Sources/Uses card; no domain coupling |
| `ReconciliationBadge` | `components/underwriting/primitives/reconciliation-badge.tsx` | `components/report/primitives/reconciliation-badge.tsx` | 46 | Pill with status tones |
| `RiskIndicator` | `components/underwriting/primitives/risk-indicator.tsx` | `components/report/primitives/risk-indicator.tsx` | 68 | Severity card with parse helper |
| `ScenarioPicker` | `components/underwriting/primitives/scenario-picker.tsx` | `components/report/primitives/scenario-picker.tsx` | 87 | Parameterised on catalog; segmented control |

**Total ~1576 LOC promoted.** No prop changes; each move is mechanical (path + barrel re-export).

### 4.2 Tier 2 — promote with prop generalization

| Primitive | Reason it needs a small change |
|---|---|
| `EditModeToggle` / `EditModeBar` / `SortableGrid` / `EditableText` | Today they read from `useEditModeStore` (underwriting-specific zustand). Generalize to accept a store handle (or a thin store factory) so a future P&L edit mode can use the same primitives with its own store key |

### 4.3 Tier 3 — keep local to underwriting

| Primitive | Reason it must stay local |
|---|---|
| The 8 section components (`executive-summary-section`, `pnl-section`, …) | Consume `EngineBundle`; orchestrate underwriting-specific composition |
| `useEditModeStore` | Zustand store with underwriting-specific keys (`underwriting:layout:v1`) — the *pattern* generalizes; the *instance* doesn't |
| `buildBundleForScenario` + scenario catalog | Engine orchestration; not a UI primitive |
| Cap Rate Engine (Section 06 internals) | Institutional IP; lives only here |

### 4.4 Retire / consolidate (already in `report/primitives/`)

| Existing | Action |
|---|---|
| `MetricRow` · `MetricTable` (unused) | **Retire** if no consumer surfaces in 30 days; replaced functionally by `YearRow` + `YearGrid` for time series and by raw flex/HTML for non-time-series tables |
| `ReportSection` (unused) | **Retire**; `ReportPaper` covers the section wrapper role |
| `UpgradeCard` (aliases `LockedUpgradeCard`, never imported) | **Retire**; collapse into `UpgradeGate` with a `variant: "inline" \| "card"` prop |
| Two `methodological-note` variants | **Consolidate** into one primitive with `compact?: boolean` and optional `children` override |

### 4.5 Barrel after promotion

Proposed `components/report/primitives/index.ts` (additions only; existing exports kept):

```
ReportSection, ReportHeader,
SectionShell,                              ← new
MetricRow, MetricTable,                    ← marked deprecated
YearGrid, YearRow, SubtotalRow, DivisionRow, ← new
KpiHero, KpiTile,                          ← new
StatCard, StatGrid,                        ← existing (kept as alias)
EditableTile, FloatingKpiStrip,            ← new
InitialInvestmentBlock,                    ← new
ReconciliationBadge, RiskIndicator,        ← new
ScenarioPicker,                            ← new
UpgradeGate, UpgradeCard,                  ← existing (UpgradeCard deprecated)
ImageGallery, ImageGalleryCard,
ReportMap, PrintPage, PdfExportButton,
```

---

## 5 · Cross-Cutting Divergences (the actual blockers)

These are the **base-layer** issues that, if left unfixed, will cause the promoted primitives to drift the same way the current primitives have drifted. They must be addressed in Phase 1, *before* any visual refactor.

| # | Divergence | Today's state | Target |
|---|---|---|---|
| 1 | `#005db7` is a hex literal | hardcoded in ActionBar, FloatingKpiStrip, EditableTile, FreeTierGate | Tailwind token `brand-blue-600` (or `editable-500`) |
| 2 | Z-indexes are magic numbers | FloatingKpiStrip `z-30`, AppHeader `z-50`, drawers ad-hoc | `z-index` scale tokens (`z-overlay`, `z-sticky`, `z-modal`, `z-toast`) |
| 3 | Sticky top offsets unsynchronized | AppHeader `top-0`, ReportSidebar `top-28`, FloatingKpiStrip `top-20` | One token (`--app-header-height`) used everywhere |
| 4 | Max-widths drift between shells | `screen-2xl` (1536), `1600px` (library), `7xl` (footer) | One token (`--shell-max`) per shell type |
| 5 | Density is component-scoped | MetricTable 3 levels; sidebars `p-5`; floating cards `p-3` | Three named density tokens applied consistently |
| 6 | Print canvas widths hardcoded | 960 / 1400 in globals.css | Already centralized; surface as tokens in design-system doc |
| 7 | Badge sizes inconsistent | InsightBadge `text-[10px]`, CapexDurationBadge `text-sm` | One badge size scale (`xs/sm/md`) |
| 8 | Section header pattern divergent | ReportHeader inline/stacked vs CategoryHeading vs admin eyebrow | Single `SectionShell` header pattern |
| 9 | Dark-mode infrastructure unused | `darkMode: ["class"]` + shadcn CSS vars configured but inert | Decision: commit to light-only for report; admin can keep inline gradients OR adopt `dark:` |
| 10 | Tier badge is inline record | `TIER_STYLES` in `app-header.tsx` | `<TierBadge>` primitive |
| 11 | `methodological-note` duplicated | 2 files, near-identical | 1 primitive with `compact?` |
| 12 | `LockedGate` ⇌ `LockedUpgradeCard` duplicated | Visually identical | 1 `UpgradeGate` with `variant: "inline" \| "card"` |

---

## 6 · What Should NOT Be Unified

Boundary articulation is as important as the convergence list — it prevents the audit from becoming a contamination vector.

### 6.1 Admin surfaces stay operational

| Surface | Pattern that should NOT migrate to report | Why |
|---|---|---|
| `/user/admin/contacts` | Dense 8-col table with bulk action toolbar (12 workflows), drawer-driven detail/edit/create | Different cognitive task: operator throughput, not investment-memo reading. Bulk mutation is foreign to memo language. |
| `/user/admin/financials` | Dark forest-900 / lime-300 admin palette, `useDraftedOverrides` 3-state save model with explicit Save button | Operators set institution-wide defaults; the explicit save contract is intentional friction for high-blast-radius changes. Report consumers never modify defaults inline. |
| `/user/admin/hotels` | Tab + modal workflow pattern, Booking/Google Places enrichment buttons | Reconciliation/enrichment is not a memo task |

### 6.2 Library stays kiosk

| Surface | Pattern that should NOT migrate to report | Why |
|---|---|---|
| `/library/favorites-list` · `/library/top-list` | 39-col dense table with sticky thead + sticky first col, locked-cell pattern, contact-cell popover | Multi-record screening view, fundamentally different from per-asset memo |
| `/library/favorites-map` · `/library/top-map` | Kiosk layout (`h-screen`, inner scroll only), floating preview card | Map-first comparison surface |

### 6.3 Settings stays config

| Surface | Pattern | Why |
|---|---|---|
| `/settings/investment` | Auto-saving `useInvestmentStore`, institutional ON/OFF toggle, route-driven sub-tabs | Analyst sets personal criteria fluidly; auto-save fits the task |

### 6.4 What admin/library/settings SHOULD share with report

- Same color tokens (forest-900 · slate ramp · semantic emerald/amber/rose)
- Same typography scale and tracking conventions
- Same sticky offset variable
- Same z-index scale
- Same badge size scale
- Same print canvas (when applicable)
- Same `UpgradeGate` and `TierBadge` primitives

Token alignment ≠ visual identity. Admin can stay dark and dense; library can stay kiosk; report can stay memo. **They share vocabulary, not voice.**

---

## 7 · Risk Classification

### 7.1 Quick wins (≤ 1 day each, fully reversible)

| Item | Risk | Why low risk |
|---|---|---|
| Tokenize `#005db7` into Tailwind config | 🟢 trivial | Find-and-replace; no behaviour change |
| Add z-index token scale | 🟢 trivial | Additive |
| Add sticky-top CSS variable | 🟢 trivial | Additive |
| Consolidate `LockedGate` + `LockedUpgradeCard` | 🟢 low | One is unused |
| Consolidate two `methodological-note` files | 🟢 low | Same visual today |
| Retire unused `MetricRow` / `MetricTable` / `ReportSection` from barrel | 🟢 low | No consumers |
| Promote 12 Tier-1 primitives (path move + re-export) | 🟢 low | Pure relocation; underwriting still works because barrel re-exports |

### 7.2 Medium refactors (1–3 days each)

| Item | Risk | Mitigation |
|---|---|---|
| Migrate Executive Summary to `SectionShell` + `KpiTile` | 🟡 medium | Page is contained; visual diff reviewable; keep behind feature flag during cutover |
| Migrate Competitive Set table to YearGrid-equivalent (or keep bespoke if columns aren't time-series) | 🟡 medium | CompSet table is NOT a time series; likely keep as-is and only align tokens |
| Migrate P&L Forecast to share `EditableTile` instead of red ASSUMP badge | 🟡 medium | P&L is the highest-traffic page after underwriting; visual change must be approved screenshot-first |
| Generalize edit-mode store and bring P&L editable assumptions onto the same overlay | 🟡 medium | Touch zustand store contract; needs schema versioning |

### 7.3 Dangerous refactors (call out explicitly)

| Item | Risk | Why dangerous |
|---|---|---|
| Migrate Market Overview's `HorizontalInsightScroller` to YearGrid | 🔴 high | The carousel is the page's identity; collapsing it removes the differentiator. **Recommendation: do NOT unify.** Align tokens only. |
| Migrate Asset Analysis's bespoke `AssetMetricsTable` to MetricTable primitive | 🔴 high | Page layout assumes flex; column-based table changes the rhythm. **Recommendation: rebuild Asset Analysis on `SectionShell` rather than just swap the table.** |
| Migrate CAPEX & Renders render-configurator UI into the memo language | 🔴 high | Render-configurator is exploratory product surface; not a memo concept. **Recommendation: leave alone; build a `SectionShell` wrapper around it but keep its internals.** |
| Unify P&L's `FinancialTable` Y1 monthly expansion with YearGrid | 🔴 high | Monthly expansion is genuinely novel; forcing it into YearGrid risks regressing the institutional Y1 view. **Recommendation: keep FinancialTable specialized; build a `MonthlyExpandableYearGrid` later only if a second consumer appears.** |
| Move admin/financials editable cards to use `EditableTile` | 🔴 high | Admin save contract is explicit Save button (`useDraftedOverrides`); EditableTile commits on blur. Different save semantics. **Recommendation: align colors and density tokens, keep the commit model separate.** |

### 7.4 High-risk coupling areas

| Area | Coupling | Implication |
|---|---|---|
| `useEditModeStore` ⇌ `SortableGrid` ⇌ `EditableText` ⇌ `EditableTile` | Tight; all 4 read from the same zustand instance | Promoting any one of them without the others means the store contract leaks into the report primitives layer. **Promote the store factory together with the primitives.** |
| `defaults.ts` (admin/financials) ⇌ `lib/underwriting/defaults.ts` ⇌ admin canonical reference values | The user has stated `/user/admin/financials` is the source of truth for any reference value (cap rate adjustments, acquisition cost %s, CAPEX, financial structure). Underwriting `defaults.ts` re-states these. | Two divergence docs already exist (`cap-rate-policy-divergence.md`, `pl-data-divergence.md`). **Phase 3 must not deepen the divergence**; ideally Phase 5 collapses both into a single canonical source consumed by both. |
| ReportShell's `printOrientation` prop | Underwriting page uses landscape; other report pages use portrait | If a primitive assumes portrait, putting it on the underwriting page may break print layout. **Primitives must be orientation-agnostic.** |
| `sections.ts` registry | Adds new section by one-line edit; sidebar derives from it | The 8 underwriting sections are NOT in `sections.ts` because underwriting is a single-page memo, not 8 separate pages. Don't try to register them. |

---

## 8 · Dependency Graph

```
┌─────────────────────────────────────────────────────────────────┐
│ Phase 1 · TOKEN LAYER (no UI change)                            │
│                                                                 │
│   tailwind.config.ts ─┬─→ brand-blue-{50..900}                  │
│                       ├─→ z-index scale                         │
│                       ├─→ sticky offset CSS var                 │
│                       ├─→ density tokens                        │
│                       └─→ badge size scale                      │
│                                                                 │
│   docs/design-system.md ←── (documented + reviewable)           │
└────────────────┬────────────────────────────────────────────────┘
                 ↓
┌─────────────────────────────────────────────────────────────────┐
│ Phase 2 · PRIMITIVE PROMOTION (no UI consumer change)           │
│                                                                 │
│   components/underwriting/primitives/*                          │
│     ├─→ relocated to components/report/primitives/*             │
│     ├─→ re-exported from old path (deprecation aliases)         │
│     └─→ refactored to consume Phase 1 tokens                    │
│                                                                 │
│   components/report/primitives/index.ts                         │
│     ├─→ new exports added                                       │
│     ├─→ MetricRow/Table marked @deprecated                      │
│     └─→ ReportSection marked @deprecated                        │
└────────────────┬────────────────────────────────────────────────┘
                 ↓
┌─────────────────────────────────────────────────────────────────┐
│ Phase 3 · PER-PAGE MIGRATION (visible UI change, screenshot-    │
│           approved per page)                                    │
│                                                                 │
│   Sequence (maturity-ordered, lowest risk first):               │
│     3.1  P&L Forecast      ────→ EditableTile color alignment   │
│     3.2  Executive Summary ────→ SectionShell + KpiTile         │
│     3.3  Competitive Set   ────→ token alignment only           │
│     3.4  Market Overview   ────→ token + SectionShell wrapper   │
│     3.5  Asset Analysis    ────→ SectionShell rebuild           │
│     3.6  CAPEX & Renders   ────→ SectionShell wrapper, retain   │
│                                  render-configurator internals  │
└────────────────┬────────────────────────────────────────────────┘
                 ↓
┌─────────────────────────────────────────────────────────────────┐
│ Phase 4 · ADJACENT SURFACE ALIGNMENT (token-only)               │
│                                                                 │
│   /user/admin/* ──→ adopt Phase 1 tokens; keep dark palette     │
│   /library/*   ──→ adopt Phase 1 tokens; keep kiosk layout      │
│   /settings/*  ──→ adopt Phase 1 tokens                         │
│                                                                 │
│   No structural change. No new primitives.                      │
└────────────────┬────────────────────────────────────────────────┘
                 ↓
┌─────────────────────────────────────────────────────────────────┐
│ Phase 5 · DATA-MODEL CONVERGENCE (post-visual)                  │
│                                                                 │
│   Resolve documented divergences:                               │
│     · docs/underwriting/cap-rate-policy-divergence.md           │
│     · docs/underwriting/pl-data-divergence.md                   │
│                                                                 │
│   Goal: admin/financials is the single source of truth;         │
│         underwriting consumes typed defaults from it.           │
│                                                                 │
│   Out of scope for this audit; gated on operator decision.      │
└─────────────────────────────────────────────────────────────────┘
```

---

## 9 · Migration Roadmap

### 9.1 Phase ordering

| Phase | Goal | Duration | Risk | Reversible |
|---|---|---|---|---|
| 1 | Token harmonization | 1–2 d | 🟢 | Yes |
| 2 | Primitive promotion + retirement of unused exports | 1–2 d | 🟢 | Yes |
| 3.1 | P&L Forecast palette alignment (`#005db7` blue) | 0.5 d | 🟡 | Yes |
| 3.2 | Executive Summary rebuild on `SectionShell` | 1–2 d | 🟡 | Yes (per-page) |
| 3.3 | Competitive Set token alignment | 0.5 d | 🟢 | Yes |
| 3.4 | Market Overview `SectionShell` wrapper | 1 d | 🟡 | Yes |
| 3.5 | Asset Analysis rebuild on `SectionShell` | 2–3 d | 🔴 | Per-section |
| 3.6 | CAPEX & Renders `SectionShell` wrapper | 1 d | 🟡 | Yes |
| 4 | Admin / Library / Settings token alignment | 1–2 d | 🟢 | Yes |
| 5 | Data-model convergence (cap rate · P&L) | TBD | 🔴 | Per-decision |

**Total Phase 1–4 estimate:** ~10–16 working days.

### 9.2 Priority ranking

By **value × reversibility / risk**:

1. **P0 — Phase 1 (tokens).** Highest value-to-risk ratio; unlocks everything else.
2. **P0 — Phase 2 (promote primitives).** Mechanical, blocks Phase 3.
3. **P1 — Phase 3.1 (P&L palette).** Highest-traffic page; quickest visible win.
4. **P1 — Phase 3.3 (CompSet tokens).** Cleanest page; quickest win on a non-trivial surface.
5. **P1 — Phase 3.2 (ExecSum rebuild).** First proof that `SectionShell` works on a non-underwriting page.
6. **P2 — Phase 3.4 (Market Overview wrapper).** Keep carousel; only align outer chrome.
7. **P2 — Phase 4 (admin/library tokens).** Cosmetic; unblocks future report-→-admin handoff visual continuity.
8. **P3 — Phase 3.5 (Asset Analysis).** Most architectural change; do last among report pages.
9. **P3 — Phase 3.6 (CAPEX wrapper).** Lowest priority; keep render-configurator alone.
10. **P4 — Phase 5 (data-model convergence).** Strategic; not blocking visual sync.

### 9.3 Per-phase exit criteria (what "done" means)

| Phase | Exit criteria |
|---|---|
| 1 | All 12 cross-cutting divergences from §5 either fixed or explicitly accepted in `docs/design-system.md`; `tailwind.config.ts` PR merged; no UI changed |
| 2 | All Tier-1 primitives live under `components/report/primitives/` with barrel exports; underwriting still renders identically; deprecated exports flagged |
| 3.x | Per-page: screenshot-diff approved by operator; Storybook (if it exists, else dev page) shows old vs new side by side; production parity confirmed by visiting URL in browser; PDF print parity confirmed |
| 4 | Admin / Library / Settings consume Phase 1 tokens; visual diff is minimal (kept identity); no functional regressions in bulk actions, sticky tables, saves |
| 5 | One source of truth for cap-rate policy and P&L data; underwriting reads from admin/financials; divergence docs archived |

---

## 10 · Implementation Sequencing (Phase-by-Phase Detail)

### 10.1 Phase 1 — Token Harmonization

**Files touched:** `apps/web/tailwind.config.ts` · `apps/web/src/app/globals.css` · `docs/design-system.md`

**Concrete actions:**
1. Add `brand` palette to Tailwind: `brand-blue-{50,100,300,500,600,700,900}` (600 = `#005db7`).
2. Add z-index scale: `z-1 = 10` (base), `z-sticky = 20`, `z-overlay = 30`, `z-dropdown = 40`, `z-header = 50`, `z-modal = 60`, `z-toast = 70`.
3. Add CSS variables in globals.css: `--app-header-h: 4rem`, `--report-canvas-portrait: 960px`, `--report-canvas-landscape: 1400px`, `--shell-max: 1600px`.
4. Add badge size scale: `text-badge-xs (9px)`, `text-badge-sm (10px)`, `text-badge-md (11px)`.
5. Document in `docs/design-system.md` and split into `docs/design-system/colors-typography.md` if file grows past 300 lines.

**Acceptance:** zero pixel diff in screenshots before/after; only token names changed in the underlying classes.

### 10.2 Phase 2 — Primitive Promotion

**Files touched:** 12 files move from `components/underwriting/primitives/` → `components/report/primitives/`; barrel updates; deprecation aliases in old path.

**Concrete actions:**
1. For each of the 12 Tier-1 primitives, move the file and update import paths everywhere it's consumed (use IDE refactor; ≤ 30 import sites per primitive).
2. Leave a re-export shim at the old path: `export * from "@/components/report/primitives/section-shell"` — prevents underwriting from breaking.
3. Update `components/report/primitives/index.ts` to expose new primitives.
4. Mark `MetricRow`, `MetricTable`, `ReportSection`, `UpgradeCard` with JSDoc `@deprecated` tag and a target removal date (30 days out).
5. Update `docs/component-library.md` with the new catalog.

**Acceptance:** `pnpm typecheck` clean; `pnpm build` clean; underwriting page renders pixel-identical; no other page changes (yet).

### 10.3 Phase 3 — Per-Page Migration

Each sub-phase follows the same template:

1. **Pre-state screenshot** of the page (web + print PDF).
2. **Migration commit** — replace bespoke surfaces with canonical primitives.
3. **Post-state screenshot.**
4. **Operator review** before merge.
5. **No data contract changes** unless explicitly noted.

**Per-page deltas (high level):**

- **3.1 P&L Forecast** — swap the red `ASSUMP` badge styling to `#005db7` blue; keep `EditableAssumptionCell` and `FinancialTable` otherwise unchanged. **Smallest possible delta.**
- **3.2 Executive Summary** — wrap the 3 sub-sections (Asset Section · Market Section · Valuation Section) in `SectionShell` with section numbers 01/02/03; replace `StatCard` instances with `KpiTile` (visually the same, single canonical primitive); keep `AssetFactsTable` bespoke (not a time series).
- **3.3 Competitive Set** — token-only pass; no structural change. The 7-col bespoke table is fine as-is; align emerald accents with the institutional palette if needed.
- **3.4 Market Overview** — wrap each insight family (CountryInsight · MarketInsight · SubmarketInsight · ClassInsight) in `SectionShell`; keep `HorizontalInsightScroller` internally; add a `FloatingKpiStrip` with the page's top-line metrics (population, RevPAR YoY, supply pipeline) — first use of the strip outside underwriting.
- **3.5 Asset Analysis** — replace the 10-col flex layout with a stack of `SectionShell` instances: 01 Identity · 02 Facilities · 03 Room Mix · 04 Guest Insights · 05 Property Gallery. Each section has a status badge (e.g., "verified" / "partial"). `AssetMetricsTable` becomes a `KpiHero` row.
- **3.6 CAPEX & Renders** — wrap the entire CAPEX breakdown in a `SectionShell` (Section 01 CAPEX) and the entire render block in another (Section 02 Renders); leave the internals (render-configurator, schedule card, image gallery) untouched.

### 10.4 Phase 4 — Adjacent Surface Alignment

**Files touched:** `components/layout/app-header.tsx` · `components/admin/admin-sidebar.tsx` · `components/library/library-shell.tsx` · `components/layout/institutional-footer.tsx` · various badge usages.

**Concrete actions:**
1. Replace `#005db7` hex literal in `app-header.tsx`'s `TIER_STYLES` with `brand-blue-600` Tailwind class.
2. Make `AppHeader` consume `--app-header-h` so other shells (Library, Report, Admin) don't redeclare it.
3. Migrate all badge usages (InsightBadge · CapexDurationBadge · StatusBadge · ForecastBadge · TierBadge) to the new badge size scale.
4. Standardize max-widths — pick one (`--shell-max: 1600px`?) and apply to AppHeader · ReportShell · LibraryShell · footer.

**Acceptance:** admin / library / settings render pixel-identically; only token names changed.

### 10.5 Phase 5 — Data-Model Convergence (out of scope for this audit)

Tracked in two pre-existing docs:
- `docs/underwriting/cap-rate-policy-divergence.md`
- `docs/underwriting/pl-data-divergence.md`

Resolution requires a product decision (engine policy vs admin policy precedence) and is not part of the synchronization audit.

---

## 11 · Open Questions / Decisions Needed

These are the load-bearing decisions that must be made **before** Phase 1 starts. The audit cannot answer them.

| # | Question | Default if no answer | Owner |
|---|---|---|---|
| Q1 | Is `#005db7` the final brand blue, or is it a placeholder? Pantone? Hex variance for print? | Treat `#005db7` as final; tokenize as `brand-blue-600` | product |
| Q2 | Should dark mode (Tailwind `darkMode: class`) be retired, or kept for admin surfaces? | Retire from light surfaces; admin keeps inline gradients (no `dark:` class adoption) | engineering |
| Q3 | Does `MetricRow` / `MetricTable` have any consumer we missed? Should we keep them as a generic non-time-series row primitive? | Retire after 30 days unless a consumer surfaces | engineering |
| Q4 | Is the 8-section memo numbering (01–08) a brand element to preserve in other pages, or specific to underwriting? | Preserve numbering as a SectionShell prop default behavior; pages opt out via `hideNumber` | product |
| Q5 | Should the FloatingKpiStrip have a ScenarioPicker on non-underwriting pages? | No — strip is generic; scenario picker is opt-in via slot | product |
| Q6 | Phase 3.5 Asset Analysis rebuild — is this a sprint we're willing to take? It's the highest-risk page. | Defer to Q3 sprint; ship Phases 1–3.4 first | product |
| Q7 | Phase 5 (data-model convergence) — is this part of this initiative or a separate one? | Separate initiative; this audit only flags it | product |

---

## 12 · Appendix · File Inventory

### 12.1 Underwriting primitives (Tier 1 promotion candidates)

```
apps/web/src/components/underwriting/primitives/
  section-shell.tsx                  143 LOC
  year-grid.tsx                      191 LOC
  year-row.tsx                       111 LOC
  subtotal-row.tsx                   103 LOC  (incl. DivisionRow)
  kpi-hero.tsx                        55 LOC  (KpiHero + KpiTile)
  editable-tile.tsx                  154 LOC
  floating-kpi-strip.tsx             173 LOC
  initial-investment-block.tsx       192 LOC
  reconciliation-badge.tsx            46 LOC
  risk-indicator.tsx                  68 LOC
  scenario-picker.tsx                 87 LOC

Total: 1323 LOC, 11 files (12 primitives — DivisionRow lives in subtotal-row.tsx)
```

### 12.2 Underwriting edit mode (Tier 2)

```
apps/web/src/components/underwriting/edit/
  edit-mode-toggle.tsx                34 LOC
  edit-mode-bar.tsx                  115 LOC
  sortable-grid.tsx                  185 LOC
  editable-text.tsx                   75 LOC
apps/web/src/lib/underwriting/edit-mode/
  store.ts                           272 LOC

Total: 681 LOC, 5 files
```

### 12.3 Existing report primitives (to harmonize)

```
apps/web/src/components/report/primitives/index.ts
apps/web/src/components/report/primitives/report-section.tsx     [unused, retire]
apps/web/src/components/report/primitives/report-header.tsx      [keep]
apps/web/src/components/report/primitives/metric-row.tsx         [unused, retire]
apps/web/src/components/report/primitives/metric-table.tsx       [unused, retire]
apps/web/src/components/report/primitives/stat-card.tsx          [alias to kpi/kpi-card]
apps/web/src/components/report/primitives/upgrade-gate.tsx       [keep, consolidate w/ UpgradeCard]
apps/web/src/components/report/primitives/image-gallery.tsx      [keep]
apps/web/src/components/report/primitives/report-map.tsx         [keep]
apps/web/src/components/report/primitives/print-page.tsx         [keep]
apps/web/src/components/report/primitives/pdf-export-button.tsx  [keep]
```

### 12.4 Report pages in migration scope

```
apps/web/src/app/report/executive-summary/page.tsx                49 LOC
apps/web/src/app/report/asset-analysis/page.tsx                   92 LOC
apps/web/src/app/report/asset-analysis/capex/page.tsx             78 LOC
apps/web/src/app/report/competitive-set/page.tsx                  41 LOC
apps/web/src/app/report/market-overview/page.tsx                  70 LOC
apps/web/src/app/report/financials/pl/page.tsx                    52 LOC
apps/web/src/app/report/financials/underwriting/page.tsx          56 LOC  (reference)
```

### 12.5 Out-of-scope surfaces (token alignment only in Phase 4)

```
apps/web/src/app/user/admin/financials/page.tsx
apps/web/src/app/user/admin/contacts/page.tsx
apps/web/src/app/user/admin/hotels/page.tsx
apps/web/src/app/settings/investment/page.tsx
apps/web/src/app/library/favorites-map/page.tsx
apps/web/src/app/library/favorites-list/page.tsx
apps/web/src/app/library/top-map/page.tsx
apps/web/src/app/library/top-list/page.tsx
```

### 12.6 Reference docs

| Doc | What it covers |
|---|---|
| `docs/report-system.md` | 1-1-1-1-1 rule, shell hierarchy, section registry |
| `docs/component-library.md` | Current primitives catalog |
| `docs/design-system.md` + `docs/design-system/` | Color tokens, typography, spacing |
| `docs/print-pdf.md` | A4 canvases, named-page rules, Firefox fallback |
| `docs/underwriting/` (folder) | Engine + temporal model + IRR layers + cap rate engine |
| `docs/underwriting/cap-rate-policy-divergence.md` | Phase 5 input |
| `docs/underwriting/pl-data-divergence.md` | Phase 5 input |

---

## 13 · Next Steps

1. **Operator review of this audit.** Decisions Q1–Q7 in §11 must be answered before Phase 1.
2. **Approve Phase 1 token scope.** If approved, the token PR is a 1–2 day effort with zero visual change.
3. **Approve Phase 2 primitive promotion.** Mechanical relocation; zero visual change.
4. **Defer Phase 3 page-by-page sequencing.** Each sub-phase is its own approval; we don't pre-commit to all six.
5. **Phase 5 is a separate strategic decision.** This audit only flags the existing divergence docs.

**No implementation proceeds without explicit per-phase approval. This document supersedes any prior synchronization plan and is the single reference for the next decision cycle.**

---

*End of Synchronization Audit v1 · 2026-05-19*
