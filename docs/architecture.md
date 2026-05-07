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
  → /compset                        (CompSet map — competitor selection)
      → /report/executive-summary   (Report — step 3; sidebar nav between report pages)
          ↔ /report/competitive-set (Competitive Set — sidebar item 3)
          ↔ /report/asset-analysis  (planned)
          ↔ /report/market-overview (planned)
          ↔ /report/financials      (planned)
          ↔ /report/methodology     (planned)
```

Three layout shells: `LandingHeader/Footer` (public), `ReportShell` (standalone report), `(dashboard)` shell (authenticated).

Report sidebar navigation is driven by `src/lib/report/report-nav.ts` (6 sections). All report pages share the same `ReportShell` → `ReportPaper` pattern.

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
