# Data Pipeline

**Location:** `services/data_pipeline/`  
**Entry points:** `POST /imports/excel`, `POST /imports/costar`, or CLI (`python -m pipeline.cli.main`)

---

## ETL Flow

```
Source file / API response
  │
parse / normalise column names
  │
coerce types (tolerant — bad cells → NaN, not abort)
  │
validate rows (range checks, required fields, cross-field rules)
  │
_clean_row()  ← geography + text + numeric normalisation
  │
_find_duplicate() ← DB query on dedup key (skipped in dry_run)
  │
_insert_record() or _update_record()
  │
ImportJob + ImportStagingRow  →  domain tables
```

Row failures do **not** abort the job — invalid rows are flagged in `import_staging_rows` and skipped.

---

## ETL Classes & Dedup Keys

| Source | ETL class | Dedup key |
|---|---|---|
| Internal hotels xlsx | `HotelETL` | `(asset_name, city)` |
| CoStar property export | `HotelETL` | `(asset_name, city)` |
| CoStar transaction export | `TransactionETL` | `(property_name, city, sale_date)` |
| CoStar market stats | `MarketSnapshotETL` | `(submarket, period_year, source)` + optional `period_month` |
| Internal financials xlsx | `FinancialETL` | `(asset_id, year, period)` |

---

## Import Modes

| Mode | Behaviour |
|---|---|
| `dry_run` | Parse + validate + clean; no DB writes; full result report |
| `insert` | Skip rows whose dedup key already exists |
| `upsert` | Update matched rows; insert new |

---

## Staging Tables (migration `0002`)

**`import_jobs`** — one row per run

| Column | Notes |
|---|---|
| `source_type` | `excel_hotels \| excel_financials \| excel_transactions \| costar_props \| costar_market` |
| `status` | `pending → parsing → loading → completed \| failed` |
| `total_rows / valid_rows / invalid_rows / duplicate_rows / inserted_rows / updated_rows` | |
| `error_message` | Set if status=failed |
| `meta` | JSONB (filename, template_type, etc.) |

**`import_staging_rows`** — one row per source row

| Column | Notes |
|---|---|
| `job_id` | FK → import_jobs |
| `row_number` | Source row index |
| `status` | `valid \| invalid \| duplicate \| loaded` |
| `raw_data` | JSONB — verbatim source row |
| `cleaned_data` | JSONB — post-normalisation |
| `validation_errors` | JSONB array of `{ column, message }` |
| `duplicate_of` | UUID of the existing matching record (nullable) |

---

## Module Map

| Path | Purpose |
|---|---|
| `pipeline/etl/base.py` | Base ETL class |
| `pipeline/etl/hotels.py` | `HotelETL` |
| `pipeline/etl/transactions.py` | `TransactionETL` |
| `pipeline/etl/market.py` | `MarketSnapshotETL` |
| `pipeline/etl/financials.py` | `FinancialETL` |
| `pipeline/excel/parser.py` | openpyxl/Pandas parse + column normalisation |
| `pipeline/excel/validator.py` | Range and cross-field validation |
| `pipeline/costar/normalizer.py` | CoStar JSON → internal schema |
| `pipeline/cleaning/multilingual.py` | `normalize_for_matching()` |
| `pipeline/cleaning/names.py` | `hotel_dedup_key()`, `_key()` |
| `pipeline/cleaning/geography.py` | `normalize_city()`, `normalize_country()` |
| `pipeline/cleaning/numeric.py` | Numeric coercion, % → decimal |
| `pipeline/matching/confidence.py` | Fuzzy match confidence scoring |
| `pipeline/cli/main.py` | CLI entry point |

---

## CoStar Environment Variables

```
COSTAR_API_KEY
COSTAR_API_BASE_URL   # default: https://api.costar.com/v1
COSTAR_USERNAME
COSTAR_PASSWORD
```

---

## Storage

- `valora-documents` — raw uploaded files (pre-processing)
- `valora-exports` — generated report exports
- Dev: MinIO at `http://minio:9000`; S3 credentials: `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY`

---

## Sample Data

```powershell
python data/samples/generate_samples.py   # generates all xlsx + csv in data/samples/
python scripts/import/validate_samples.py  # dry-run all samples, no DB needed
```

| File | Rows | Description |
|---|---|---|
| `costar_hotels.xlsx` | 12 | Iberian 4-5★ hotels |
| `costar_transactions.xlsx` | 8 | 2021–2024 hotel sales |
| `costar_market.xlsx` | 18 | Barcelona/Madrid/Sevilla/Malaga submarkets |
| `hotel_financials.xlsx` | 6 | Annual P&L (Hotel Arts BCN + NH Collection Madrid) |
| `internal_hotels.xlsx` | 8 | Internal template (1 intentional error row) |

---

## Import Result Schema

```json
{
  "source_type": "excel_hotels",
  "file_name": "internal_hotels.xlsx",
  "total_rows": 8, "valid_rows": 7, "invalid_rows": 1,
  "duplicate_rows": 0, "inserted_rows": 7, "updated_rows": 0
}
```

---

## Not Importable from API

`services/data_pipeline` has no shared dependency with `apps/api`. Any pipeline logic needed in the API must be re-implemented inline. See `docs/normalization.md` for the inlining convention.
