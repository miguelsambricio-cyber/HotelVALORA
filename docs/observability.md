# Observability

---

## Structured Logging (structlog)

**Package:** `structlog==24.4.0`  
**Usage:** `log = structlog.get_logger(__name__)` at module level

```python
log.info("scan_complete", city=city, pairs=n, new=new_recs)
log.warning("conflict_detected", alias_key=key, asset_ids=ids)
log.error("import_failed", job_id=str(job.id), error=str(exc))
```

Log level controlled by `LOG_LEVEL` env var (default: `INFO`).  
In production, structlog outputs JSON-formatted log lines for ingestion by log aggregators.

---

## Error Tracking (Sentry)

**Package:** `sentry-sdk[fastapi]==2.14.0`  
**Configured in:** `app/main.py`

```python
if settings.sentry_dsn:
    sentry_sdk.init(
        dsn=settings.sentry_dsn,
        environment=settings.app_env,
        traces_sample_rate=0.2,
    )
```

- Enabled only when `SENTRY_DSN` env var is set
- `traces_sample_rate=0.2` — 20% of requests generate performance traces
- FastAPI integration auto-captures unhandled exceptions
- `ValoraException` subclasses are raised intentionally and handled by the global exception handler — they do **not** appear as Sentry errors unless re-raised

---

## Request Tracing (Middleware)

Both middleware headers are set on **every** response:

| Header | Value | Set by |
|---|---|---|
| `X-Request-ID` | UUID v4 string | `RequestIDMiddleware` |
| `X-Process-Time` | Elapsed seconds (float) | `TimingMiddleware` |

`X-Request-ID` is also injected into the structlog context so all log lines within a request carry it automatically.

**Middleware files:** `app/core/middleware.py`

---

## Health Check

```
GET /health
→ { "status": "ok", "env": "development" }
```

Always public (no auth). Used by Docker healthchecks and load balancers. Does not check DB or Redis connectivity — it is a liveness probe only.

---

## What Is Not Yet Implemented

- **Metrics / Prometheus endpoint** — no `/metrics` route; no OpenTelemetry
- **Celery monitoring** — Flower not configured in Docker Compose
- **Alerting** — no PagerDuty / OpsGenie integration
- **Log aggregation** — no Loki / CloudWatch configuration in repo
- **Database query tracing** — SQLAlchemy echo enabled in dev (`settings.is_development`) but not shipped to an APM tool
