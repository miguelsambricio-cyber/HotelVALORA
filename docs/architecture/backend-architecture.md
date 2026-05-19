# Architecture · Backend

> ⚠️ **STALE · PARTIAL · 2026-05-19**
>
> **Status:** stale · partial
> **Reason:** The FastAPI backend (`apps/api/`) described here is no longer the primary runtime for underwriting / valuation. Live underwriting computation runs in the Next.js TypeScript engine (`apps/web/src/lib/underwriting/`). The FastAPI surface remains for legacy data quality / alias / merge / dedup operations only — not for valuation.
> **Canonical replacement (underwriting compute):** `docs/underwriting/*` for TS engine architecture.
> **Still valid (data quality surface):** alias-registry · merge-engine · dedup · review queue endpoints described below are still live in FastAPI.
>
> The content below mixes live + deprecated material. Treat valuation / DCF / financial-engine sections as deprecated · treat alias / merge / review sections as still current.

---

Canonical source: **`docs/backend.md`** has FastAPI structure, service pattern, config. This dossier highlights the *runtime reality* and the gap between built endpoints and consumed ones.

## Stack

- FastAPI + Uvicorn
- SQLAlchemy 2.0 async + asyncpg
- Pydantic v2 (`ValoraBase` with `from_attributes=True`)
- Alembic — sequential migration numbering (`0001` → `0005`; next: `0006`)
- python-jose (JWT) + passlib (password hashing)
- Celery + Redis (imports queue)
- structlog + Sentry

## Response contract

Every endpoint returns one of three shapes (`apps/api/app/schemas/common.py`):

```python
SingleResponse[T]   # { "data": T }
PagedResponse[T]    # { "data": T[], "meta": { total, limit, offset, has_next } }
ErrorResponse       # { "data": null, "errors": [{ code, message, field? }] }
```

Errors are *raised* (`ValoraException(status_code, code, message)`), handled globally in `main.py`.

## Endpoint surface (built vs consumed)

| Domain | Routes | Status |
|---|---|---|
| Auth | `/auth/{login,refresh,me}` | Built · **consumed mock-only** today (Zustand auth store does not call) |
| Hotels | `/hotels/*` | Stub |
| Valuations | `/valuations/{dcf,underwriting}` | Built · not yet consumed by `/report` |
| Imports | `/imports/{excel,costar}` | Built · admin CLI only today |
| Aliases | `/aliases/{hotel,operator,conflict,merge}` | Live (review surface) |
| Dedup | `/dedup/*` | Live (review surface) |
| Review | `/review/summary` | Live (review surface) |
| Audit | `/audit/*` | Live |

The **only frontend surface that talks to the real API today** is `/(dashboard)/review`.

## DB session pattern

```python
# CORRECT — always
from app.database import get_db
async def endpoint(db: AsyncSession = Depends(get_db)): ...
```

`get_db()` auto-commits on success, rolls back on exception. Do not import `app.api.deps`; it does not exist.

## Model conventions

Every model inherits `app.models.base.BaseModel` (UUID PK + timezone-aware timestamps + SQLAlchemy 2.0 `Mapped[T]` / `mapped_column()` syntax). New models must register in `app/models/__init__.py` AND in `alembic/env.py` for autogenerate.

## Audit-log pattern

`audit_log` is append-only. `AuditService(db).log(...)` is called in the same transaction as the triggering mutation. Reversible events store `before_state` / `after_state` JSONB; `POST /audit/{id}/rollback` restores them. Actor threading uses `get_optional_actor_id(request)` from `core/security.py`.

## Supabase scaffold (parallel backend lane)

As of 2026-05-11, the `apps/web/src/lib/supabase/*` layer is in place — browser + server + middleware + admin clients, plus the auth-helpers surface. The full SQL schema proposal lives in `docs/database/schema.sql` (7 tables + RLS). Migrations are not yet applied — see `docs/integrations/supabase.md` for activation.

When Supabase activates, the Phase 3 decision is binary:
1. Keep FastAPI for the heavy lifting (DCF / underwriting / aliases / dedup / imports) and use Supabase for auth + library reads + storage, OR
2. Migrate the FastAPI surfaces into Supabase Edge Functions and retire `apps/api` entirely.

Today neither is decided — the dual scaffold lets us pick later without rework.

## What's planned (Phase 3)

- Wire `/report/*` pages to `/api/v1/valuations/*` + a new `/api/v1/reports/*` resource — OR equivalent Supabase Edge Functions.
- Wire `/library/*` to the `public.valuations` table (Supabase) — replace `mock-reports.ts`.
- Stand up `/api/v1/promotions/*` for the Top Promote marketplace flow (payment + expiry + impressions) — OR the `public.top_promote` table directly.
- Replace mock auth store with NextAuth + `@auth/supabase-adapter` — keep `useAuth()` surface identical.

See `docs/roadmap/master-roadmap.md`.

## Cross-references

| Topic | Doc |
|---|---|
| Full module map | `docs/backend.md` |
| DB schema | `docs/database.md` |
| All REST endpoints | `docs/api.md` |
| Auth flow | `docs/auth.md` |
| Financial engine internals | `docs/financial-engine.md` |
| Data pipeline | `docs/data-pipeline.md` |
| Imports CLI | `docs/imports.md` |
