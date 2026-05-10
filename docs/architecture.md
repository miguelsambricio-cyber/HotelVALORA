# Architecture

## Overview

HotelVALORA is a monorepo organized into three layers: applications, services, and infrastructure.

```
HotelVALORA/
├── apps/
│   ├── api/          # FastAPI backend
│   └── web/          # Next.js frontend
├── services/
│   ├── financial_engine/   # DCF & underwriting engine
│   └── data_pipeline/      # ETL & import service
└── infrastructure/
    ├── docker/             # Docker Compose (dev + prod)
    ├── nginx/              # Reverse proxy config
    └── scripts/            # Migration & setup scripts
```

## Services

| Service | Runtime | Role |
|---|---|---|
| `apps/api` | FastAPI + Uvicorn | REST API, auth, business logic |
| `apps/web` | Next.js 14 | Dashboard UI |
| `services/financial_engine` | Python | DCF, NOI, underwriting calculations |
| `services/data_pipeline` | Python | Excel/CoStar ETL |

## Runtime Infrastructure

| Component | Image | Purpose |
|---|---|---|
| PostgreSQL 16 | `postgres:16-alpine` | Primary database |
| Redis 7 | `redis:7-alpine` | Cache + Celery broker |
| Celery | (api image) | Async task queue |
| MinIO | `minio/minio` | S3-compatible storage (dev) |
| Nginx | (prod only) | Reverse proxy + TLS |

## Request Flow

```
Browser → Nginx → Next.js (SSR)
                → FastAPI /api/v1 → PostgreSQL
                                  → Redis (cache)
                                  → Celery (async tasks)
                                      → financial_engine
                                      → data_pipeline → S3
```

## Application Flow (Frontend)

```
/ (Landing)
  → /compset                                  (CompSet map — competitor selection)
      → /report/executive-summary             ✅ shipped
      ↔ /report/asset-analysis                ✅ shipped (Hotel personalizado)
      ↔ /report/asset-analysis/capex          ✅ shipped (CAPEX & Renders, single page)
      ↔ /report/competitive-set               ✅ shipped
      ↔ /report/market-overview               ✅ shipped (Country / Market / Submarket / Class)
      ↔ /report/financials/pl                 ✅ shipped (5-Year Forecast w/ scenarios + monthly Y1)
      ↔ /report/methodology                   ⏸ planned

/login                                        ✅ shipped (institutional auth)
/settings/profile                             ✅ shipped
/settings/credentials                         ✅ shipped
/settings/investment                          ✅ shipped (Hotel Asset criteria)
/settings/investment/market                   ✅ shipped (Hotel Market — ADR/OCC/RevPAR/target)
/settings/investment/value                    ✅ shipped (Hotel Value — site/exit/rent/finance/PL)
/library                                      ⏸ next implementation target
```

Three layout shells: `LandingHeader/Footer` (public), `ReportShell` (standalone report — supports `printOrientation: "portrait" | "landscape"`), `(dashboard)` shell (authenticated).

Report sidebar navigation is driven by the canonical `src/lib/report/sections.ts` registry. Sub-items support absolute paths AND hash anchors. Two-pass active-detection picks the right sub-anchor: prefer a sub-route whose path matches; fall back to the first hash-anchor whose parent path matches.

All report pages share the same `ReportShell` → `ReportPaper` (or `ReportSection`) pattern. See `docs/report-system.md` for the full architecture, `docs/print-pdf.md` for the print/PDF system, `docs/maps.md` for the map system, `REPORT_PAGES.md` for per-page composition, and `docs/component-library.md` / `UI_COMPONENTS.md` for the primitives surface.

### Hybrid Gallery+Map Pattern (Competitive Set)

Gallery top block uses CSS grid stretch to align 2×2 image grid with full-height `ReportMap`:
- Parent: `grid-cols-12 min-h-[460px]` — `min-h` satisfies map's `min-height: 450px` CSS constraint
- Left (`col-span-5`): `grid-rows-2 grid-cols-2 h-full` — images fill cells with `h-full aspect-auto`
- Right (`col-span-7`): `ReportMap h-full` — map stretches to match left height via CSS grid default `align-items: stretch`

## Key Design Decisions

- **Async throughout**: FastAPI with `asyncpg` for non-blocking DB access.
- **Celery for heavy compute**: DCF projections and bulk imports run as background tasks.
- **JSONB columns**: `meta`, `cash_flows`, `sensitivity` stored as JSONB for schema flexibility.
- **Alembic migrations**: All schema changes are versioned.
- **Pydantic v2**: Strict validation at API boundaries and engine inputs.

## Ports (dev)

| Port | Service |
|---|---|
| 3000 | Next.js |
| 8000 | FastAPI |
| 5432 | PostgreSQL |
| 6379 | Redis |
| 9000/9001 | MinIO (API / Console) |
