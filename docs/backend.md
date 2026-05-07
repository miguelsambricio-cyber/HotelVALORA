# Backend

**Location:** `apps/api/`  
**Stack:** FastAPI 0.115, Uvicorn, SQLAlchemy 2.0 async (asyncpg), Alembic, Pydantic v2, Celery + Redis

---

## App Structure

```
app/
├── main.py           create_app() factory — middleware, router, exception handler
├── config.py         Settings (pydantic-settings, reads .env)
├── database.py       async engine, AsyncSessionLocal, get_db(), Base
├── core/
│   ├── exceptions.py ValoraException + subclasses (NotFoundError, ConflictError, …)
│   ├── middleware.py  RequestIDMiddleware, TimingMiddleware
│   └── security.py   hash_password, verify_password, create/decode JWT
├── models/           SQLAlchemy ORM models (all inherit BaseModel from models/base.py)
├── schemas/          Pydantic request/response schemas (all extend ValoraBase)
├── services/         Business logic — one service class per domain
└── api/v1/           Route handlers — thin, delegate to services
    └── router.py     Registers all sub-routers under /api/v1
```

---

## Middleware Stack (outermost → innermost)

```
GZipMiddleware        compress responses ≥ 1 KB
TimingMiddleware      adds X-Process-Time header
RequestIDMiddleware   injects X-Request-ID (UUID) per request
CORSMiddleware        origins from API_ALLOWED_ORIGINS env var
```

---

## Config (`app/config.py`)

Loaded once via `@lru_cache` as `settings` singleton. All values read from env / `.env`.

| Group | Key settings |
|---|---|
| App | `APP_ENV` (development\|staging\|production), `APP_SECRET_KEY`, `APP_DEBUG` |
| API | `API_HOST`, `API_PORT`, `API_ALLOWED_ORIGINS` (comma-separated) |
| DB | `DATABASE_URL`, `DATABASE_POOL_SIZE` (20), `DATABASE_MAX_OVERFLOW` (10) |
| Redis | `REDIS_URL`, `CELERY_BROKER_URL`, `CELERY_RESULT_BACKEND` |
| Auth | `JWT_ALGORITHM` (HS256), `JWT_ACCESS_TOKEN_EXPIRE_MINUTES` (60), `JWT_REFRESH_TOKEN_EXPIRE_DAYS` (30) |
| Storage | `S3_ENDPOINT_URL`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY`, `S3_BUCKET_DOCUMENTS`, `S3_BUCKET_EXPORTS` |
| CoStar | `COSTAR_API_KEY`, `COSTAR_API_BASE_URL`, `COSTAR_USERNAME`, `COSTAR_PASSWORD` |
| Financial | `DEFAULT_DISCOUNT_RATE` (0.10), `DEFAULT_TERMINAL_CAP_RATE` (0.07), `DEFAULT_PROJECTION_YEARS` (10) |
| Observability | `SENTRY_DSN`, `LOG_LEVEL` |

`settings.is_production` / `is_development` are computed properties.  
OpenAPI docs (`/docs`, `/redoc`) are disabled in production.

---

## Database (`app/database.py`)

- `create_async_engine` with `pool_pre_ping=True`, SQL echo in development
- `AsyncSessionLocal`: `expire_on_commit=False`, `autoflush=False`
- `get_db()`: async generator — auto-commit on success, rollback on exception
- `Base`: `DeclarativeBase` — all models inherit from it via `BaseModel`

**Inject in routes:**
```python
from app.database import get_db
async def endpoint(db: AsyncSession = Depends(get_db)): ...
```

---

## Model Conventions (`app/models/base.py`)

Every model inherits `BaseModel(UUIDMixin, TimestampMixin, Base)`:
- `id`: UUID PK, `uuid4` default
- `created_at` / `updated_at`: timezone-aware DateTime, server-managed via `func.now()`
- SQLAlchemy 2.0 syntax throughout: `Mapped[T]` + `mapped_column()`

---

## Schema Conventions (`app/schemas/common.py`)

All Pydantic schemas extend `ValoraBase` (`from_attributes=True`, `populate_by_name=True`).

| Type | Shape |
|---|---|
| `SingleResponse[T]` | `{ "data": T }` |
| `PagedResponse[T]` | `{ "data": T[], "meta": { total, limit, offset, has_next } }` |
| `ErrorResponse` | `{ "data": null, "errors": [{ code, message, field? }] }` |

---

## Exception Handling (`app/core/exceptions.py`)

Raise `ValoraException` subclasses — caught globally in `main.py`:

```python
raise NotFoundError("Hotel not found.")     # 404
raise ConflictError("Email taken.")          # 409
raise ValidationError("Invalid range.")      # 422
raise UnauthorizedError("Bad token.")        # 401
```

Do not return error shapes manually. Do not catch `ValoraException` inside services.

---

## Service Layer Pattern

Services own all DB logic. Routes are thin:

```python
# Route
@router.get("/{id}", response_model=SingleResponse[HotelRead])
async def get_hotel(id: UUID, db: AsyncSession = Depends(get_db)):
    svc = HotelService(db)
    hotel = await svc.get(id)          # raises NotFoundError if missing
    return SingleResponse(data=HotelRead.model_validate(hotel))

# Service
class HotelService:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def get(self, hotel_id: UUID) -> HotelAsset:
        row = await self.db.get(HotelAsset, hotel_id)
        if not row:
            raise NotFoundError(f"Hotel {hotel_id} not found.")
        return row
```

Services never import from `app.api.*`. Routes never write to the DB directly.

---

## Migrations (Alembic)

Versions in `apps/api/alembic/versions/`, naming: `NNNN_description.py`.

```bash
cd apps/api
alembic upgrade head
alembic revision -m "description"   # write manually; don't trust autogenerate blindly
```

Every new model must be imported in `alembic/env.py` for detection. Current head: `0004`.

---

## Celery

Broker: `redis://localhost:6379/1` (db 1)  
Result backend: `redis://localhost:6379/2` (db 2)  
Worker: `celery -A app.worker worker --concurrency=4`  
Heavy tasks (bulk imports, DCF batch runs) are dispatched as Celery tasks from the API.
