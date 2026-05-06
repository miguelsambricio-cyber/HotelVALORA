# Data Pipeline

**Location:** `services/data_pipeline/`  
**Runtime:** Python, Pandas  
**Invocation:** Via API endpoints (`/imports/excel`, `/imports/costar`) or Celery tasks

## Overview

The pipeline handles two inbound data sources:

| Source | Module | Format |
|---|---|---|
| Excel templates | `pipeline/excel/` | `.xlsx` |
| CoStar API | `pipeline/costar/` | JSON (REST) |

## Excel Import

### Template Types

| Type | Required Columns | Optional |
|---|---|---|
| `hotels` | `name`, `city`, `total_keys` | `brand`, `chain_scale`, `year_built`, `star_rating`, `asset_status` |
| `financials` | `year`, `total_revenue`, `noi` | `rooms_revenue`, `occupancy_rate`, `adr`, `revpar`, `total_expenses` |
| `transactions` | `property_name`, `city`, `sale_date` | `total_keys`, `sale_price`, `price_per_key`, `cap_rate` |

### Processing Steps

1. **Parse** — Read `.xlsx` via `openpyxl`/Pandas; normalize column names (lowercase, underscores).
2. **Validate** — Check required columns are present; raise `ParseError` if missing.
3. **Coerce** — Cast columns to defined types (`int`, `float`, `str`); use `pd.to_numeric` with `errors="coerce"` for tolerant casting.
4. **Drop empties** — Remove fully blank rows.
5. **Load** — Hand `DataFrame` to the import service for upsert into PostgreSQL.

### Error Handling

- `ParseError` is raised for unrecognized template types or missing required columns.
- Type coercion errors are silent per-cell (coerced to `NaN`) — the service layer validates final row integrity.

## CoStar Integration

**Module:** `pipeline/costar/normalizer.py`

Normalizes CoStar API responses to the internal schema before persistence. Key mappings:

- CoStar submarket → `markets.costar_submarket_id`
- CoStar occupancy / ADR / RevPAR snapshots → `market_snapshots`
- CoStar transaction records → `comparable_transactions` (with `source="costar"`, `source_id` from CoStar's transaction ID)

**Credentials** configured via environment:
```
COSTAR_API_KEY
COSTAR_API_BASE_URL   # default: https://api.costar.com/v1
COSTAR_USERNAME
COSTAR_PASSWORD
```

## Storage

Uploaded files (pre-processing) are stored in S3-compatible object storage:

- Bucket `valora-documents` — raw uploaded Excel files
- Bucket `valora-exports` — generated report exports

In development, MinIO is used as the S3 backend (`http://minio:9000`).
