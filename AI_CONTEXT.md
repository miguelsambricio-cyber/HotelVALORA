# AI_CONTEXT.md — HotelVALORA

Hotel intelligence & valuation platform. Manages hotel assets, runs DCF/underwriting valuations, ingests data from CoStar/Excel, resolves entity duplicates, and surfaces a data-quality review queue.

---

## Monorepo Layout

```
apps/
  api/          FastAPI backend (Python 3.12, asyncpg, SQLAlchemy 2.0 async)
  web/          Next.js 14 frontend (React 18, TypeScript, Tailwind, TanStack Query)
services/
  data_pipeline/    ETL, name cleaning, entity matching (standalone Python package)
  financial_engine/ DCF, RevPAR, NOI calculations (standalone Python package)
infrastructure/
  docker/       docker-compose.dev.yml / docker-compose.prod.yml
  nginx/        reverse proxy config
```

`services/` packages are **not imported by `apps/api`** — logic is re-implemented inline where needed (see dedup_service.py for the pattern).

---

## Backend (`apps/api`)

### Stack
- FastAPI + Uvicorn, SQLAlchemy 2.0 async (asyncpg), Alembic, Pydantic v2
- Auth: JWT (python-jose), passwords via passlib
- Observability: structlog + Sentry
- Task queue: Celery + Redis (imports)

### Request / Response contract
Every endpoint returns one of two shapes (see `app/schemas/common.py`):
```python
SingleResponse[T]   # { "data": T }
PagedResponse[T]    # { "data": T[], "meta": { total, limit, offset, has_next } }
ErrorResponse       # { "data": null, "errors": [{ code, message, field? }] }
```
Raise `ValoraException(status_code, code, message)` — handled globally in `main.py`.

### Database session
`get_db()` in `app/database.py` — async generator, auto-commit on success, rollback on exception. Inject via `Depends(get_db)`. Never import `app.api.deps`; use `app.database` directly.

### Model conventions
All models inherit `BaseModel` from `app/models/base.py`:
- `id`: UUID PK (uuid4 default)
- `created_at` / `updated_at`: timezone-aware DateTime, server-managed
- SQLAlchemy 2.0 style: `Mapped[T]` + `mapped_column()`

### Schema conventions
All Pydantic schemas extend `ValoraBase` (`from_attributes=True`, `populate_by_name=True`).

### Migrations
`apps/api/alembic/versions/` — sequential IDs: `0001`, `0002`, `0003`, `0004`. Next migration: `0005`.
Run via `alembic upgrade head`. All models must be imported in `alembic/env.py` for auto-detection.

---

## Frontend (`apps/web`)

### Stack
- Next.js 14 (App Router), TypeScript, Tailwind CSS
- TanStack Query v5 (data fetching/cache), TanStack Table (tables)
- Radix UI primitives in `components/ui/`, Lucide icons
- Forms: React Hook Form + Zod
- Notifications: sonner (`<Toaster>`)

### API client
`src/lib/api/client.ts` — Axios instance, base URL from `NEXT_PUBLIC_API_URL` (default `http://localhost:8000/api/v1`). Auth token auto-attached from `localStorage`. 401 → clears tokens → redirects `/login`.

### Data fetching pattern
All server state lives in TanStack Query hooks under `src/lib/api/`. Each domain has its own file (`review.ts`, `dedup.ts`). Query keys follow `["domain", "sub", ...filters]` hierarchy so `invalidateQueries({ queryKey: ["domain"] })` cascades correctly.

### Routing
`src/app/(dashboard)/` — all authenticated pages. Layout: fixed sidebar + header + scrollable main.
Pages: `assets/hotels`, `valuations`, `underwriting`, `transactions`, `market`, `review`.

---

## Data Quality / Review Domain

Three queues on `/review` page (tabs):
1. **Alias Conflicts** — `AliasConflict` rows with `status = "open"`
2. **Low Confidence** — `HotelAliasEntry` rows with `confidence < 0.65`
3. **Merge Recommendations** — `MergeRecommendation` rows with `status = "pending_review"`

Review summary endpoint: `GET /api/v1/review/summary` → `ReviewSummary` (counts for all three).

### Dedup scoring (inline in `dedup_service.py`)
Weighted composite: name_exact 35%, name_fuzzy 30%, city 20%, operator 10%, address 5%.
Tiers: `auto_merge` ≥0.92, `needs_review` ≥0.80, `likely_duplicate` ≥0.65, below that not saved.
Canonical pair: `asset_a_id < asset_b_id` (UUID order) to satisfy UniqueConstraint.
Human decisions (`accepted`/`dismissed`) are never overwritten by future scans.

---

## Data Pipeline (`services/data_pipeline`)

Key public APIs:
- `pipeline.cleaning.multilingual.normalize_for_matching(text, *, remove_stopwords=True)` — full EN/ES/FR/PT/DE normalization
- `pipeline.cleaning.names.hotel_dedup_key(name, city)` — canonical dedup key (calls normalize with `remove_stopwords=False`)
- `pipeline.matching.confidence` — fuzzy match confidence scoring

**Not importable from `apps/api`** — no shared dependency. Duplicate inline when needed.

---

## Environment Variables (key ones)
```
DATABASE_URL          postgresql+asyncpg://...
SECRET_KEY            JWT signing key
SENTRY_DSN            optional
NEXT_PUBLIC_API_URL   frontend → API base (default http://localhost:8000/api/v1)
```
See `.env.example` for full list.
