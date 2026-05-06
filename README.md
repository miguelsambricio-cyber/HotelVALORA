# HotelVALORA

Hotel intelligence and valuation platform — DCF modeling, market analytics, and investment underwriting for hotel and flex-living assets.

---

## Stack

| Layer | Technology |
|---|---|
| API | FastAPI + Uvicorn (Python 3.12) |
| Frontend | Next.js 14 (TypeScript) |
| Database | PostgreSQL 16 |
| Cache / Queue | Redis 7 + Celery |
| Storage | S3 / MinIO |
| Financial Engine | Python, NumPy, SciPy |
| ORM / Migrations | SQLAlchemy 2.0 + Alembic |
| Infra | Docker Compose |

---

## Quick Start

**Prerequisites:** Docker, Docker Compose

```bash
# Clone and configure
cp .env.example .env          # fill in secrets

# Start all services
docker compose -f infrastructure/docker/docker-compose.dev.yml up -d

# Run migrations
bash infrastructure/scripts/migrate.sh
```

| Service | URL |
|---|---|
| Frontend | http://localhost:3000 |
| API | http://localhost:8000 |
| API Docs | http://localhost:8000/docs |
| MinIO Console | http://localhost:9001 |

---

## High-Level Architecture

```
Browser
  └── Next.js (port 3000)
        └── FastAPI /api/v1 (port 8000)
              ├── PostgreSQL  — primary data store
              ├── Redis       — cache + task broker
              └── Celery workers
                    ├── Financial Engine  — DCF, NOI, underwriting
                    └── Data Pipeline     — Excel / CoStar ETL → S3
```

**Monorepo layout:**

```
apps/
  api/              FastAPI backend
  web/              Next.js frontend
services/
  financial_engine/ DCF & metrics engine
  data_pipeline/    Import & normalization
infrastructure/
  docker/           Dev + prod Compose files
  nginx/            Reverse proxy
  scripts/          Migration & setup
```

---

## Documentation

| Document | Description |
|---|---|
| [docs/architecture.md](docs/architecture.md) | Services, infrastructure, design decisions |
| [docs/database.md](docs/database.md) | Schema, tables, relationships |
| [docs/api.md](docs/api.md) | REST endpoints reference |
| [docs/financial-engine.md](docs/financial-engine.md) | DCF engine, metrics, assumptions |
| [docs/data-pipeline.md](docs/data-pipeline.md) | Excel / CoStar import pipeline |
