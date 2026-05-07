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

---

## Domain — Report Module

| Task | File(s) |
|---|---|
| Report shell (layout, nav, footer) | `apps/web/src/components/report/shell/` |
| Report page — Executive Summary | `apps/web/src/app/report/executive-summary/page.tsx` |
| Report page — Competitive Set | `apps/web/src/app/report/competitive-set/page.tsx` |
| Competitive Set data + types | `apps/web/src/lib/report/competitive-set-data.ts` |
| Competitive Set sub-components | `apps/web/src/components/report/competitive-set/` |
| Report paper card + header | `apps/web/src/components/report/shell/report-paper.tsx` |
| Report top nav | `apps/web/src/components/report/shell/report-top-nav.tsx` |
| Report sidebar | `apps/web/src/components/report/shell/report-sidebar.tsx` |
| Report footer | `apps/web/src/components/report/shell/report-footer.tsx` |
| Report section nav registry | `apps/web/src/lib/report/report-nav.ts` |
| Executive Summary data + formatters | `apps/web/src/lib/report/executive-summary-data.ts` |
| Executive Summary sub-components | `apps/web/src/components/report/executive-summary/` |
| Hotel photo carousel | `apps/web/src/components/report/executive-summary/hotel-photo-carousel.tsx` |
| Action bar (Favoritos/Guardar/Upgrade) | `apps/web/src/components/report/executive-summary/action-bar.tsx` |
| Sparkline bar chart | `apps/web/src/components/report/charts/sparkline-bar.tsx` |
| Sparkline line/area chart | `apps/web/src/components/report/charts/sparkline-line.tsx` |
| Premium lock gate overlay | `apps/web/src/components/report/ui/locked-gate.tsx` |
| Report map (CompSet in report) | `apps/web/src/components/report/ui/report-map.tsx` |
| Methodological note | `apps/web/src/components/report/ui/methodological-note.tsx` |
| PDF export | `apps/web/src/lib/report/pdf-export.ts` |
| A4 print CSS | `apps/web/src/app/globals.css` — `.report-print-canvas`, `@page`, `@media print` |
| Dynamic report section | `apps/web/src/app/report/[reportId]/[section]/page.tsx` |

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
| `docs/report-system.md` | Report shell, sections, hierarchy, gating, print |
| `docs/print-system.md` | A4 print CSS, zoom/scale math, print variants |
| `docs/design-system.md` | Color tokens, typography, spacing, Tailwind conventions |
| `docs/components.md` | Reusable component catalog, props, file paths |
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
