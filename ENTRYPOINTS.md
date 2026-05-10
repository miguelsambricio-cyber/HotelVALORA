# ENTRYPOINTS.md — HotelVALORA

Maps tasks to exact files. Start here before scanning.

---

## Backend

| Task | File(s) |
|---|---|
| New API route group | `apps/api/app/api/v1/<domain>/router.py` → register in `apps/api/app/api/v1/router.py` |
| New DB model | `apps/api/app/models/<name>.py` → `models/__init__.py` → `alembic/env.py` → migration |
| New Pydantic schema | `apps/api/app/schemas/<name>.py` (extend `ValoraBase`) |
| New service | `apps/api/app/services/<name>_service.py` |
| New migration | `apps/api/alembic/versions/NNNN_<desc>.py` — current head: `0004`, next: `0005` |
| Response / error contract | `apps/api/app/schemas/common.py` |
| Middleware or app factory | `apps/api/app/main.py` |
| DB connection / pooling | `apps/api/app/database.py` |
| Config / env vars | `apps/api/app/config.py` |
| Auth / JWT | `apps/api/app/core/security.py` |
| Exception types | `apps/api/app/core/exceptions.py` |

---

## Frontend

| Task | File(s) |
|---|---|
| New dashboard page | `apps/web/src/app/(dashboard)/<path>/page.tsx` |
| New API hook | `apps/web/src/lib/api/<domain>.ts` |
| New TS types | `apps/web/src/types/<domain>.ts` |
| Shared response wrappers | `apps/web/src/types/review.ts` (`SingleResponse`, `PagedResponse`) |
| Sidebar navigation | `apps/web/src/components/layout/sidebar.tsx` |
| Global providers / QueryClient | `apps/web/src/components/providers.tsx` |
| Root HTML / fonts / metadata | `apps/web/src/app/layout.tsx` |
| Dashboard shell | `apps/web/src/app/(dashboard)/layout.tsx` |
| Axios client / auth interceptors | `apps/web/src/lib/api/client.ts` |
| Global app header (sticky, all pages) | `apps/web/src/components/layout/app-header.tsx` |
| Settings shell + sidebar | `apps/web/src/components/settings/settings-layout.tsx` |
| Settings sidebar nav items | `apps/web/src/components/settings/settings-sidebar.tsx` |
| Auth store (Zustand persist) + tier system | `apps/web/src/lib/auth/store.ts`, `lib/auth/tier.ts` |
| OAuth provider registry (NextAuth-shaped) | `apps/web/src/lib/auth/providers.ts` |
| Provider brand marks (LinkedIn/Google/Apple/Microsoft) | `apps/web/src/components/auth/provider-marks.tsx` |
| Investment criteria store (Zustand persist) | `apps/web/src/lib/investment/store.ts` |
| Investment match engine stub + tier thresholds | `apps/web/src/lib/investment/match-engine.ts` |
| CAPEX taxonomy (Excel-mappable line ids) | `apps/web/src/lib/investment/capex.ts` |
| Investment criteria types + facilities + coverage | `apps/web/src/lib/investment/{types,facilities,coverage}.ts` |
| Investment Requirements page (Asset / index) | `apps/web/src/app/settings/investment/page.tsx` |
| Investment Requirements — Hotel Market page | `apps/web/src/app/settings/investment/market/page.tsx` |
| Investment Requirements — Hotel Value page | `apps/web/src/app/settings/investment/value/page.tsx` |
| Investment section cards + primitives | `apps/web/src/components/settings/investment/` |
| Hotel Market section cards | `apps/web/src/components/settings/investment/market/` |
| Hotel Value section cards + primitives | `apps/web/src/components/settings/investment/value/` |
| Market scenario KPI tables (DOWN/BASE/UP — internal, not shown in UI) | `apps/web/src/lib/investment/market-scenarios.ts` |
| Acquisition cost taxonomy (Excel-mappable line ids) | `apps/web/src/lib/investment/value-acquisition.ts` |
| Investment sub-tabs (route-driven via usePathname) | `apps/web/src/components/settings/investment/investment-tabs.tsx` |
| Canonical institutional ON/OFF toggle | `apps/web/src/components/settings/investment/institutional-toggle.tsx` |

---

## Domain — Library (institutional reports)

| Task | File(s) |
|---|---|
| Library page — Favoritos map | `apps/web/src/app/library/favorites-map/page.tsx` |
| Library route layout (LibraryShell wrapper) | `apps/web/src/app/library/layout.tsx` |
| Library types | `apps/web/src/types/library.ts` |
| Library mock dataset (6 hotels) | `apps/web/src/lib/library/mock-reports.ts` |
| Library Zustand UI store (legend / layers / filter / search / selection) | `apps/web/src/lib/library/store.ts` |
| Library components surface (barrel) | `apps/web/src/components/library/index.ts` |
| Library shell (AppHeader + body + slim footer) | `apps/web/src/components/library/library-shell.tsx` |
| Library sidebar (title + legend + filter + CTA) | `apps/web/src/components/library/library-sidebar.tsx` |
| Map legend card + layer toggles | `apps/web/src/components/library/map-legend-card.tsx` |
| Tiny rail toggle (32×18) | `apps/web/src/components/library/map-layer-toggle.tsx` |
| FAVORITOS / TOP segmented filter | `apps/web/src/components/library/library-filter-tabs.tsx` |
| Mock institutional grayscale map | `apps/web/src/components/library/hotel-map.tsx` |
| Hotel map marker (category-coloured) | `apps/web/src/components/library/hotel-map-marker.tsx` |
| Floating zoom +/- + layers control | `apps/web/src/components/library/institutional-map-controls.tsx` |
| Floating preview card | `apps/web/src/components/library/floating-hotel-card.tsx` |
| Shared institutional dark footer | `apps/web/src/components/layout/institutional-footer.tsx` |

---

## Domain — Report Module

| Task | File(s) |
|---|---|
| Section registry (canonical, 6 sections + sub-anchors + printPageBreak) | `apps/web/src/lib/report/sections.ts` |
| Section taxonomy types | `apps/web/src/types/report/index.ts` |
| Report shell (top-nav, sidebar, footer, main canvas) — `printOrientation: "portrait" \| "landscape"` | `apps/web/src/components/report/shell/report-shell.tsx` |
| Report paper card (`closed`, `headerLayout`, `actions`) | `apps/web/src/components/report/shell/report-paper.tsx` |
| Report sidebar (driven by sections.ts, two-pass active detection) | `apps/web/src/components/report/shell/report-sidebar.tsx` |
| Report top nav | `apps/web/src/components/report/shell/report-top-nav.tsx` |
| Report footer | `apps/web/src/components/report/shell/report-footer.tsx` |
| **Canonical primitives barrel** | `apps/web/src/components/report/primitives/index.ts` |
| Section page wrapper (preferred for new pages) | `apps/web/src/components/report/primitives/report-section.tsx` |
| Page header bar | `apps/web/src/components/report/primitives/report-header.tsx` |
| MetricRow / MetricTable | `apps/web/src/components/report/primitives/metric-row.tsx` / `metric-table.tsx` |
| StatCard / StatGrid | `apps/web/src/components/report/primitives/stat-card.tsx` |
| UpgradeGate / UpgradeCard | `apps/web/src/components/report/primitives/upgrade-gate.tsx` |
| ImageGallery | `apps/web/src/components/report/primitives/image-gallery.tsx` |
| ReportMap | `apps/web/src/components/report/primitives/report-map.tsx` (re-exports `ui/report-map.tsx`) |
| PrintPage | `apps/web/src/components/report/primitives/print-page.tsx` |
| PdfExportButton | `apps/web/src/components/report/primitives/pdf-export-button.tsx` |
| PDF export entry | `apps/web/src/lib/report/pdf-export.ts` (`exportReport`) |
| A4 print CSS (canvas, scaling, Firefox fallback, utilities) | `apps/web/src/app/globals.css` |
| Report page — Executive Summary | `apps/web/src/app/report/executive-summary/page.tsx` |
| Report page — Asset Analysis · Hotel personalizado | `apps/web/src/app/report/asset-analysis/page.tsx` |
| Report page — Asset Analysis · CAPEX & Renders | `apps/web/src/app/report/asset-analysis/capex/page.tsx` |
| Report page — Competitive Set | `apps/web/src/app/report/competitive-set/page.tsx` |
| Report page — Market Overview | `apps/web/src/app/report/market-overview/page.tsx` |
| Executive Summary data + locale formatters | `apps/web/src/lib/report/executive-summary-data.ts` |
| Competitive Set data + types | `apps/web/src/lib/report/competitive-set-data.ts` |
| Asset Analysis data | `apps/web/src/lib/report/asset-analysis-data.ts` |
| CAPEX & Renders data | `apps/web/src/lib/report/capex-renders-data.ts` |
| Market Overview data | `apps/web/src/lib/report/market-overview-data.ts` |
| Intl-based formatter library | `apps/web/src/lib/report/formatting.ts` |
| Executive Summary sub-components | `apps/web/src/components/report/executive-summary/` |
| Asset Analysis sub-components (Hotel personalizado) | `apps/web/src/components/report/asset-analysis/` |
| CAPEX & Renders sub-components | `apps/web/src/components/report/asset-analysis/capex/` |
| Competitive Set sub-components | `apps/web/src/components/report/competitive-set/` |
| Market Overview sub-components (insight card, charts, carousel, demand generators) | `apps/web/src/components/report/market-overview/` |
| KPICard / KPIGrid (used by StatCard primitive) | `apps/web/src/components/report/kpi/` |
| Sparkline bar / line charts | `apps/web/src/components/report/charts/` |
| Methodological note (full-width endcap) | `apps/web/src/components/report/ui/methodological-note.tsx` |
| Methodology note (inline column-fitted variant) | `apps/web/src/components/report/asset-analysis/methodology-note.tsx` |
| Locked gate / upgrade card (raw — prefer `UpgradeGate` primitive) | `apps/web/src/components/report/ui/locked-gate.tsx` / `locked-upgrade-card.tsx` |

---

## Domain — Review / Data Quality

| Task | File(s) |
|---|---|
| Review page (3 tabs) | `apps/web/src/app/(dashboard)/review/page.tsx` |
| KPI summary cards | `apps/web/src/components/review/summary-cards.tsx` |
| Merge recommendations UI | `apps/web/src/components/review/merge-queue.tsx` |
| Alias conflicts UI | `apps/web/src/components/review/conflict-queue.tsx` |
| Low-confidence UI | `apps/web/src/components/review/low-confidence-queue.tsx` |
| Review summary endpoint | `apps/api/app/api/v1/review/router.py` |

## Domain — Dedup / Merge Engine

| Task | File(s) |
|---|---|
| Scoring + scan logic | `apps/api/app/services/dedup_service.py` |
| Dedup API routes | `apps/api/app/api/v1/dedup/router.py` |
| MergeRecommendation model | `apps/api/app/models/merge_recommendation.py` |
| Dedup schemas | `apps/api/app/schemas/merge_recommendation.py` |
| Dedup TS types | `apps/web/src/types/dedup.ts` |
| Dedup hooks | `apps/web/src/lib/api/dedup.ts` |

## Domain — Alias Registry

| Task | File(s) |
|---|---|
| Alias models (4 tables) | `apps/api/app/models/alias.py` |
| Alias service | `apps/api/app/services/alias_service.py` |
| Hotel alias routes | `apps/api/app/api/v1/aliases/hotel_aliases.py` |
| Operator alias routes | `apps/api/app/api/v1/aliases/operator_aliases.py` |
| Conflict routes | `apps/api/app/api/v1/aliases/conflicts.py` |
| Merge history routes | `apps/api/app/api/v1/aliases/merges.py` |

## Domain — Audit Log

| Task | File(s) |
|---|---|
| Audit model | `apps/api/app/models/audit_log.py` |
| Audit schemas | `apps/api/app/schemas/audit_log.py` |
| Audit service (log, rollback, list) | `apps/api/app/services/audit_service.py` |
| Audit routes | `apps/api/app/api/v1/audit/router.py` |
| Optional actor dependency | `apps/api/app/core/security.py` → `get_optional_actor_id` |
| Migration | `apps/api/alembic/versions/0005_audit_log.py` |

## Domain — Valuations

| Task | File(s) |
|---|---|
| DCF + underwriting service | `apps/api/app/services/valuation_service.py` |
| DCF routes | `apps/api/app/api/v1/valuations/dcf.py` |
| Underwriting routes | `apps/api/app/api/v1/valuations/underwriting.py` |
| Standalone financial engine | `services/financial_engine/engine/dcf/projections.py` |

## Domain — Normalisation

| Task | File(s) |
|---|---|
| Full multilingual pipeline | `services/data_pipeline/pipeline/cleaning/multilingual.py` |
| Dedup key | `services/data_pipeline/pipeline/cleaning/names.py` |
| Geography | `services/data_pipeline/pipeline/cleaning/geography.py` |
| Inlined copy (dedup service) | `apps/api/app/services/dedup_service.py` (top section) |
| Inlined copy (alias service) | `apps/api/app/services/alias_service.py` (`_key()`) |

## Domain — Data Pipeline / Imports

| Task | File(s) |
|---|---|
| ETL base class | `services/data_pipeline/pipeline/etl/base.py` |
| Hotel ETL | `services/data_pipeline/pipeline/etl/hotels.py` |
| Excel parser / validator | `services/data_pipeline/pipeline/excel/parser.py` / `validator.py` |
| CoStar normaliser | `services/data_pipeline/pipeline/costar/normalizer.py` |
| CLI | `services/data_pipeline/pipeline/cli/main.py` |
| Import API routes | `apps/api/app/api/v1/imports/excel.py` / `costar.py` |

---

## Infrastructure

| Task | File(s) |
|---|---|
| Docker Compose (dev) | `infrastructure/docker/docker-compose.dev.yml` |
| Nginx (prod) | `infrastructure/nginx/nginx.conf` |
| Alembic migrations | `apps/api/alembic/versions/` |

---

## Documentation

| Doc | When to read |
|---|---|
| `docs/architecture.md` | Service topology, runtime infra, ports, app flow |
| `docs/routing.md` | All routes, layout shells, navigation wiring |
| `docs/frontend.md` | App Router, component map, auth flow |
| `docs/report-system.md` | Canonical report architecture: shell, sidebar, 5 implemented sections |
| `docs/print-pdf.md` | A4 portrait + landscape canvases, named-page rules, Firefox fallback, carousel ↔ static-grid logic |
| `docs/maps.md` | Mapbox CompSet map + stylised pin map (Market Overview) |
| `docs/design-system.md` | Color tokens, typography, spacing, Tailwind conventions |
| `docs/component-library.md` | Canonical primitives catalog (preferred for new pages) |
| `REPORT_PAGES.md` | Per-page composition trees, web↔print contracts (root-level) |
| `UI_COMPONENTS.md` | All component families grouped by import surface (root-level) |
| `docs/business-rules.md` | Premium tiers, locked gates, workflow constraints |
| `docs/financial.md` | Valuation metrics, formatters, display rules |
| `docs/workflows.md` | User flows, CTA wiring, navigation state |
| `docs/changelog.md` | Feature history — one entry per task |
| `docs/database.md` | All table schemas and FK relationships |
| `docs/api.md` | All REST endpoints |
| `docs/backend.md` | FastAPI structure, service pattern, config |
| `docs/financial-engine.md` | DCF engine internals (Python) |
| `docs/underwriting.md` | Valuation model, DCF logic, sensitivity |
| `docs/data-pipeline.md` | ETL flow, import modes, staging tables |
| `docs/normalization.md` | Multilingual pipeline, `_key()`, geography |
| `docs/alias-registry.md` | Alias tables, conflict detection |
| `docs/merge-engine.md` | Dedup scoring, FP signals, recommendation tiers |
| `docs/imports.md` | Column mappings, validation rules, CLI |
| `docs/deployment.md` | Docker, env vars, dev quick-start |
| `docs/auth.md` | JWT flow, token lifetimes |
| `docs/testing.md` | pytest config, markers, fixtures |
| `docs/observability.md` | structlog, Sentry, middleware headers |
| `docs/roadmap.md` | Planned features, tech debt |
