# RULES.md — HotelVALORA

Hard constraints for generating code in this repo. Violating these will break builds, type checks, or data integrity.

---

## Python / Backend

### Response shapes — never deviate
```python
# Single object
return SingleResponse(data=obj)

# Paginated list
return PagedResponse(data=rows, meta=Pagination(total=n, limit=limit, offset=offset, has_next=...))

# Errors — raise, don't return
raise ValoraException(status_code=404, code="NOT_FOUND", message="...")
```

### DB session — one source of truth
```python
# CORRECT
from app.database import get_db
async def endpoint(db: AsyncSession = Depends(get_db)): ...

# WRONG — does not exist
from app.api.deps import get_db
```

### SQLAlchemy models
- Inherit from `app.models.base.BaseModel` (gives UUID PK + timestamps).
- Use SQLAlchemy 2.0 syntax: `Mapped[T]` / `mapped_column()`. Never use old `Column()`.
- JSONB columns: `mapped_column(JSONB, nullable=True)` from `sqlalchemy.dialects.postgresql`.
- Register every new model in `app/models/__init__.py` and in `alembic/env.py` imports.

### Pydantic schemas
- Extend `ValoraBase` (not `BaseModel` directly).
- Separate `Create`, `Update`, `Read` schemas per resource; never reuse the ORM model as a response.
- Numeric fields that come from `Decimal` DB columns → `float` in schema (not `Decimal`).

### Alembic migrations
- File naming: `NNNN_description.py` where NNNN is zero-padded sequential (`0005_...`).
- `down_revision` must chain correctly — check the latest revision before creating.
- Never auto-generate migrations in production; write them explicitly.

### Services
- Services go in `app/services/<name>_service.py`.
- Keep services free of HTTP concerns (no `Request`, no `Response`). Routers call services; services own DB logic.
- `services/data_pipeline` is **not** importable from `apps/api`. Duplicate normalization inline when needed.

### Async rules
- All DB calls must be `await`-ed.
- Never use `session.execute(...).fetchall()` — use `scalars().all()` or `scalar()` for single values.
- Use `select(func.count()).select_from(Model).where(...)` for count queries.

---

## TypeScript / Frontend

### Fetching
- All server state via TanStack Query hooks in `src/lib/api/`.
- One file per domain (`review.ts`, `dedup.ts`, `hotels.ts`, ...).
- Query key hierarchy: `["domain", "sub", ...params]` so partial invalidation works.
- Mutations invalidate with `qc.invalidateQueries({ queryKey: ["domain"] })` — not individual keys.

### Types
- API response types live in `src/types/`. Match the backend schema shape exactly.
- `SingleResponse<T>` and `PagedResponse<T>` re-exported from `src/types/review.ts` — import from there.
- Never use `any`. Use `unknown` + type narrowing if the shape is uncertain.

### Components
- UI primitives: use existing `src/components/ui/` (Button, Card, Badge, Dialog). Don't add new primitives unless there's no match.
- Icons: Lucide only (`lucide-react`).
- Toast notifications: `import { toast } from "sonner"`.
- No inline styles. Tailwind utility classes only.

### Data tables
- Use TanStack Table (`@tanstack/react-table`) for any sortable/filterable table.
- Pagination state: `page` (0-indexed) + `limit` as local `useState`; pass as `offset = page * limit` to API.

### Auth
- Token stored in `localStorage` as `access_token` / `refresh_token`.
- The Axios client handles attachment and 401 redirect automatically — don't repeat this logic in components.

---

## General

### File placement
| What | Where |
|---|---|
| New API route group | `apps/api/app/api/v1/<domain>/router.py` then register in `apps/api/app/api/v1/router.py` |
| New DB model | `apps/api/app/models/<name>.py` |
| New Pydantic schema | `apps/api/app/schemas/<name>.py` |
| New service | `apps/api/app/services/<name>_service.py` |
| New migration | `apps/api/alembic/versions/NNNN_<description>.py` |
| New React page | `apps/web/src/app/(dashboard)/<path>/page.tsx` |
| New query hook | `apps/web/src/lib/api/<domain>.ts` |
| New TS types | `apps/web/src/types/<domain>.ts` |

### Comments
Write no comments unless the WHY is non-obvious (hidden constraint, workaround, subtle invariant). Never explain what the code does.

### Tests (data_pipeline)
- `pytest-asyncio` with `asyncio_mode = auto`.
- Test files mirror the module path: `services/data_pipeline/tests/cleaning/test_multilingual.py` for `pipeline/cleaning/multilingual.py`.
- No mocking the DB — integration tests use a real session.
