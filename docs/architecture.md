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
