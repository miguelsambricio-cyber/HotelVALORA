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
| `docs/architecture.md` | Service topology, runtime infra, ports |
| `docs/database.md` | All table schemas and FK relationships |
| `docs/api.md` | All REST endpoints |
| `docs/backend.md` | FastAPI structure, service pattern, config |
| `docs/frontend.md` | App Router, component map, auth flow |
| `docs/financial-engine.md` | DCF engine, metrics |
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
