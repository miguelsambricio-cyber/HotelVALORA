# Deployment

---

## Services (Docker Compose)

Config: `infrastructure/docker/docker-compose.dev.yml` / `docker-compose.prod.yml`

| Service | Image | Ports | Notes |
|---|---|---|---|
| `postgres` | `postgres:16-alpine` | 5432 | Primary DB; healthcheck via `pg_isready` |
| `redis` | `redis:7-alpine` | 6379 | Cache + Celery broker/backend |
| `minio` | `minio/minio` | 9000 / 9001 | S3-compatible dev storage; API / Console |
| `api` | `apps/api/Dockerfile` | 8000 | FastAPI + Uvicorn; `--reload` in dev |
| `worker` | same image as api | — | Celery worker; `--concurrency=4` |
| `web` | `apps/web/Dockerfile` | 3000 | Next.js; dev uses volume mount |

Redis DBs: `0` = cache, `1` = Celery broker, `2` = Celery result backend.

---

## Startup Order (depends_on)

```
postgres (healthy) ──┐
redis    (healthy) ──┴── api ── worker
                         │
                         └──── web
```

`api` and `worker` wait for both `postgres` and `redis` to pass healthchecks before starting.

---

## Volumes

| Volume | Mounted to |
|---|---|
| `postgres_data` | `/var/lib/postgresql/data` |
| `redis_data` | `/data` |
| `minio_data` | `/data` |
| `../../apps/api` | `/app` (dev hot-reload) |
| `../../apps/web` | `/app` (dev hot-reload) |

---

## Environment Variables

All services read from root `.env` (see `.env.example`).

**Required for any startup:**

| Var | Example | Notes |
|---|---|---|
| `APP_SECRET_KEY` | 64-char random hex | JWT signing; rotate to invalidate all tokens |
| `DATABASE_URL` | `postgresql+asyncpg://valora:pass@postgres:5432/hotelvalora` | |
| `REDIS_URL` | `redis://redis:6379/0` | |
| `CELERY_BROKER_URL` | `redis://redis:6379/1` | |
| `CELERY_RESULT_BACKEND` | `redis://redis:6379/2` | |
| `NEXT_PUBLIC_API_URL` | `http://localhost:8000/api/v1` | Frontend → API; use container name in Docker |

**Optional:**

| Var | Default | Notes |
|---|---|---|
| `APP_ENV` | `development` | `development \| staging \| production` |
| `SENTRY_DSN` | — | Enables Sentry error tracking |
| `S3_ENDPOINT_URL` | — | Set to `http://minio:9000` in dev |
| `S3_ACCESS_KEY_ID` / `S3_SECRET_ACCESS_KEY` | — | MinIO: `minioadmin` / `minioadmin` |
| `COSTAR_API_KEY` | — | |
| `API_ALLOWED_ORIGINS` | `http://localhost:3000` | Comma-separated |
| `POSTGRES_DB` | `hotelvalora` | |
| `POSTGRES_USER` / `POSTGRES_PASSWORD` | `valora` / `valora_dev_password` | |

---

## Dev Quick Start

```bash
# Start infrastructure only
docker compose -f infrastructure/docker/docker-compose.dev.yml up postgres redis minio -d

# Run API locally (hot reload)
cd apps/api
pip install -r requirements.txt
alembic upgrade head
uvicorn app.main:app --reload --port 8000

# Run web locally
cd apps/web
pnpm install && pnpm dev
```

---

## Production Differences

- Nginx reverse proxy (`infrastructure/nginx/nginx.conf`) handles TLS and routes `/api/v1` to the API container
- `APP_ENV=production` disables OpenAPI docs (`/docs`, `/redoc`)
- MinIO replaced by AWS S3 (set `S3_ENDPOINT_URL` to blank, configure AWS creds)
- `API_ALLOWED_ORIGINS` set to the production frontend domain

---

## Database Migrations

```bash
cd apps/api
alembic upgrade head            # apply all migrations
alembic downgrade -1            # roll back one
alembic current                 # show current revision
alembic history                 # show migration chain
```

Migration files: `apps/api/alembic/versions/`. Current head: `0004`. Next: `0005`.
