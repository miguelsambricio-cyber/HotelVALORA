# Import Workflow

End-to-end guide for loading hotel data into HotelVALORA from CoStar exports and internal Excel templates.

## Overview

The import pipeline follows a linear path: **parse → coerce → validate → clean → deduplicate → persist**.

```
Excel / CSV file
      │
  parse_excel()          normalize column names, enforce required fields
      │
  coerce_types()         cast to int/float/str per template schema
      │
  validate_dataframe()   range checks, cross-field rules, required fields
      │
  ETL.run()
    ├── _clean_row()     geography / text / numeric normalization
    ├── Pydantic validate HotelImportRow / TransactionImportRow / ...
    ├── _find_duplicate() query DB for (name+city), (name+city+date), etc.
    └── _insert_record() or _update_record()
          │
      ImportJob + ImportStagingRow (staging tables)
          │
      domain models (HotelAsset, Transaction, MarketSnapshot, HotelFinancials)
```

All operations are transactional. A failure in any row does not abort the job — invalid rows are flagged in `ImportStagingRow` and skipped. The final `ImportResult` summarises total / valid / invalid / duplicate / inserted / updated counts.

---

## Source Types

| Source | File | ETL class | Dedup key |
|--------|------|-----------|-----------|
| Internal hotel template | `internal_hotels.xlsx` | `HotelETL` | `(asset_name, city)` |
| CoStar property export | `costar_hotels.xlsx` | `HotelETL` | `(asset_name, city)` |
| CoStar transaction export | `costar_transactions.xlsx` | `TransactionETL` | `(property_name, city, sale_date)` |
| CoStar market stats | `costar_market.xlsx` | `MarketSnapshotETL` | `(submarket, period_year, source)` |
| Internal financials template | `hotel_financials.xlsx` | `FinancialETL` | `(asset_id, year, period)` |

---

## Sample Data

Generate all sample files (runs entirely offline):

```powershell
python data/samples/generate_samples.py
```

Produces in `data/samples/`:

| File | Rows | Description |
|------|------|-------------|
| `costar_hotels.xlsx` / `.csv` | 12 | Iberian 4-5* hotels, CoStar column format |
| `costar_transactions.xlsx` / `.csv` | 8 | 2021-2024 hotel sales with cap rates |
| `costar_market.xlsx` / `.csv` | 18 | Barcelona/Madrid/Sevilla/Malaga submarkets, 2022-2024 |
| `hotel_financials.xlsx` / `.csv` | 6 | Annual P&L for Hotel Arts BCN + NH Collection Madrid |
| `internal_hotels.xlsx` / `.csv` | 8 | Internal template format (includes 1 intentional error row) |

---

## Column Mappings

### CoStar Property Export → Internal

| CoStar column | Internal field | Notes |
|---|---|---|
| `Property Name` / `Building Name` | `name` | |
| `City` | `city` | normalized to canonical display name |
| `Number Of Rooms` / `# Rooms` | `total_keys` | |
| `Year Built` | `year_built` | |
| `Star Rating` | `star_rating` | |
| `Secondary Type` | `chain_scale` | Luxury / Upper Upscale / Upscale / … |
| `Brand` | `brand` | |
| `Latitude` / `Longitude` | `latitude` / `longitude` | |
| `CoStar Property ID` | `costar_id` | |

### CoStar Transaction Export → Internal

| CoStar column | Internal field | Notes |
|---|---|---|
| `Property Name` | `property_name` | |
| `Close Date` / `Sale Date` | `sale_date` | parsed to `YYYY-MM-DD` |
| `Sale Price` | `sale_price` | strips currency symbols, handles M/K suffixes |
| `Price/Key` / `Price Per Room` | `price_per_key` | |
| `Going-In Cap Rate` / `Cap Rate` | `cap_rate` | `"5.2%"` or `0.052` → stored as decimal |
| `Number Of Rooms` | `total_keys` | |
| `Buyer` / `Seller` | `buyer` / `seller` | |

### CoStar Market Stats → Internal

| CoStar column | Internal field | Notes |
|---|---|---|
| `Submarket` | `submarket` | |
| `Year` / `Period` | `period_year` | |
| `Occupancy` / `Occ` | `market_occupancy` | `73.5` → `0.735` (heuristic: >1 means %) |
| `ADR` | `market_adr` | |
| `RevPAR` | `market_revpar` | |
| `Supply` / `Demand` | `market_supply` / `market_demand` | |
| `RevPAR % Chg` / `RevPAR Change` | `revpar_growth_yoy` | stored as decimal |

---

## Geography Normalization

All city and country values are normalized before persistence.

**Cities** (`normalize_city(raw) -> str`):

```
"BARCELONA"   -> "Barcelona"
"madrid"      -> "Madrid"
"MALAGA"      -> "Malaga"  (accented form preserved internally)
"Lisboa"      -> "Lisbon"
"nueva york"  -> "Nueva York"  (unregistered alias -> title-cased)
"new york city" -> "New York"
```

118 city aliases registered. Unregistered values are title-cased as-is.

**Countries** (`normalize_country(raw, default="ES") -> str`):

```
"spain" / "España" / "SPAIN" / "ES"  -> "ES"
"United Kingdom" / "uk" / "GB"       -> "GB"
"USA" / "United States" / "us"       -> "US"
"Deutschland"                         -> "DE"
```

103 country aliases registered. Unknown values are upper-cased (up to 3 chars) or default is used.

---

## Validation Rules

### Hotels

| Field | Rule |
|---|---|
| `name` | required, non-empty |
| `city` | required, non-empty |
| `total_keys` | required, 1–10,000 |
| `star_rating` | 1.0–5.0 |
| `year_built` | 1800–2035 |
| `year_renovated` | 1800–2035, must be ≥ year_built |
| `latitude` | -90–90 |
| `longitude` | -180–180 |

### Transactions

| Field | Rule |
|---|---|
| `property_name` | required |
| `city` | required |
| `sale_date` | required, parseable date |
| `sale_price` | > 0 if present |
| `price_per_key` | > 0 if present |
| `cap_rate` | 0.0–0.3 (0%–30%) |
| `total_keys` | 1–10,000 |
| `year_built` | 1800–2035 |
| `star_rating` | 1.0–5.0 |

### Market Snapshots

| Field | Rule |
|---|---|
| `submarket` | required |
| `city` | required |
| `year` | required, 2000–2030 |
| `occupancy` | 0.0–1.0 (after normalization) |
| `adr` | > 0 |
| `revpar` | > 0 |
| `revpar_change` | -1.0–2.0 |

### Financials

| Field | Rule |
|---|---|
| `year` | required, 2000–2030 |
| `total_revenue` | required, > 0 |
| `noi_margin` | 0.0–1.0 |
| `occupancy_rate` | 0.0–1.0 |
| `adr` | > 0 |
| `revpar` | 0–ADR (soft: RevPAR = occupancy × ADR ± 10%) |

---

## Duplicate Detection

Detection runs as a DB query inside the ETL, before insert. In `dry_run` mode the query always returns None (no DB connection).

| ETL | Duplicate key |
|---|---|
| `HotelETL` | `(asset_name, city)` |
| `TransactionETL` | `(property_name, city, transaction_date)` + optional `transaction_price` |
| `MarketSnapshotETL` | `(submarket, period_year, source)` + optional `period_month` |
| `FinancialETL` | `(asset_id, year, period)` |

In `upsert` mode a matched duplicate triggers `_update_record()`. In `insert` mode duplicates are skipped.

---

## Import Modes

| Mode | Behaviour |
|---|---|
| `dry_run` | Parse, validate, and clean every row; no DB writes; returns a full result report |
| `insert` | Skip rows whose dedup key already exists |
| `upsert` | Update matching rows; insert new ones |

---

## CLI Reference

Set up environment:

```powershell
$env:PYTHONPATH = "apps/api;services/data_pipeline"
$env:DATABASE_URL = "postgresql://user:pass@localhost:5432/hotelvalora"
```

### Validate only (no DB)

```powershell
# Single file
python -m pipeline.cli.main validate --file data/samples/internal_hotels.xlsx --type hotels

# Write error report to JSON
python -m pipeline.cli.main validate --file data/samples/internal_hotels.xlsx --type hotels --output errors.json

# Convenience: validate all 5 sample files at once
python scripts/import/validate_samples.py
```

### Dry-run import (no DB)

```powershell
python -m pipeline.cli.main import-hotels --file data/samples/internal_hotels.xlsx --mode dry_run
python -m pipeline.cli.main import-costar-props --file data/samples/costar_hotels.xlsx --mode dry_run
python -m pipeline.cli.main import-costar-trans --file data/samples/costar_transactions.xlsx --mode dry_run
```

### Live import (requires DATABASE_URL)

```powershell
# Hotels
python -m pipeline.cli.main import-hotels --file data/samples/internal_hotels.xlsx --mode upsert

# CoStar properties
python -m pipeline.cli.main import-costar-props --file data/samples/costar_hotels.xlsx --mode upsert

# CoStar transactions
python -m pipeline.cli.main import-costar-trans --file data/samples/costar_transactions.xlsx --mode upsert

# Market stats
python -m pipeline.cli.main import-market --file data/samples/costar_market.xlsx --mode upsert --source costar

# Financials (requires hotel UUID from DB)
python -m pipeline.cli.main import-financials \
    --file data/samples/hotel_financials.xlsx \
    --hotel-id <UUID> \
    --mode upsert
```

See `scripts/import/import_commands.ps1` for the complete PowerShell command reference.

---

## Import Result Schema

Every import returns an `ImportResult`:

```json
{
  "source_type": "excel_hotels",
  "file_name": "internal_hotels.xlsx",
  "total_rows": 8,
  "valid_rows": 7,
  "invalid_rows": 1,
  "duplicate_rows": 0,
  "inserted_rows": 7,
  "updated_rows": 0
}
```

Individual row results are stored in `import_staging_rows`:

```json
{
  "row_number": 9,
  "status": "invalid",
  "raw_data": { "name": "", "city": "Valencia", "star_rating": 9.0 },
  "cleaned_data": { "asset_name": null, "city": "Valencia", "star_rating": 9.0 },
  "validation_errors": [
    { "column": "star_rating", "message": "Value 9.0 out of range [1.0, 5.0]" }
  ]
}
```

---

## Staging Tables

All imports are tracked in two tables (added in migration `0002_import_staging.py`):

**`import_jobs`** — one row per import run  
Fields: `id`, `source_type`, `file_name`, `status` (pending/parsing/loading/completed/failed), `total_rows`, `valid_rows`, `invalid_rows`, `duplicate_rows`, `inserted_rows`, `updated_rows`, `error_message`, `meta` (JSONB), `started_at`, `completed_at`

**`import_staging_rows`** — one row per source data row  
Fields: `id`, `job_id` (FK → import_jobs), `row_number`, `status` (valid/invalid/duplicate/loaded), `raw_data` (JSONB), `cleaned_data` (JSONB), `validation_errors` (JSONB), `duplicate_of` (UUID, nullable)

---

## Reference Scripts

| Script | Purpose |
|---|---|
| `data/samples/generate_samples.py` | Generate all sample xlsx + csv files |
| `scripts/import/validate_samples.py` | Dry-run validation of all sample files |
| `scripts/import/mapping_report.py` | Print CoStar field maps + geography normalization |
| `scripts/import/import_commands.ps1` | PowerShell CLI command reference |
| `services/data_pipeline/examples/sample_workflow.py` | In-process ETL dry-run demo |
