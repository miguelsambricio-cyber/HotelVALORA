# Imports

End-to-end reference for loading data into HotelVALORA from Excel templates and CoStar exports.

---

## Excel Template Types

| Type | Required columns | Optional columns |
|---|---|---|
| `hotels` | `name`, `city`, `total_keys` | `brand`, `chain_scale`, `year_built`, `star_rating`, `asset_status`, `latitude`, `longitude` |
| `financials` | `year`, `total_revenue`, `noi` | `rooms_revenue`, `occupancy_rate`, `adr`, `revpar`, `total_expenses` |
| `transactions` | `property_name`, `city`, `sale_date` | `total_keys`, `sale_price`, `price_per_key`, `cap_rate`, `buyer`, `seller` |

---

## CoStar Column Mappings

### Property Export → Internal

| CoStar column | Internal field | Notes |
|---|---|---|
| `Property Name` / `Building Name` | `name` | |
| `City` | `city` | Normalised to canonical display name |
| `Number Of Rooms` / `# Rooms` | `total_keys` | |
| `Year Built` | `year_built` | |
| `Star Rating` | `star_rating` | |
| `Secondary Type` | `chain_scale` | Luxury / Upper Upscale / Upscale / … |
| `Brand` | `brand` | |
| `Latitude` / `Longitude` | `latitude` / `longitude` | |
| `CoStar Property ID` | `costar_id` | |

### Transaction Export → Internal

| CoStar column | Internal field | Notes |
|---|---|---|
| `Property Name` | `property_name` | |
| `Close Date` / `Sale Date` | `sale_date` | Parsed to `YYYY-MM-DD` |
| `Sale Price` | `sale_price` | Strips currency symbols, handles M/K suffixes |
| `Price/Key` / `Price Per Room` | `price_per_key` | |
| `Going-In Cap Rate` / `Cap Rate` | `cap_rate` | `"5.2%"` or `0.052` → stored as decimal |
| `Number Of Rooms` | `total_keys` | |
| `Buyer` / `Seller` | `buyer` / `seller` | |

### Market Stats → Internal

| CoStar column | Internal field | Notes |
|---|---|---|
| `Submarket` | `submarket` | |
| `Year` / `Period` | `period_year` | |
| `Occupancy` / `Occ` | `market_occupancy` | `73.5` → `0.735` (>1 means %) |
| `ADR` | `market_adr` | |
| `RevPAR` | `market_revpar` | |
| `RevPAR % Chg` / `RevPAR Change` | `revpar_growth_yoy` | Stored as decimal |

---

## Validation Rules

### Hotels

| Field | Rule |
|---|---|
| `name` | Required, non-empty |
| `city` | Required, non-empty |
| `total_keys` | Required, 1–10,000 |
| `star_rating` | 1.0–5.0 |
| `year_built` | 1800–2035 |
| `year_renovated` | 1800–2035, ≥ year_built |
| `latitude` | -90–90 |
| `longitude` | -180–180 |

### Transactions

| Field | Rule |
|---|---|
| `property_name` | Required |
| `city` | Required |
| `sale_date` | Required, parseable date |
| `sale_price` | > 0 if present |
| `cap_rate` | 0.0–0.3 (0%–30%) |
| `total_keys` | 1–10,000 |
| `star_rating` | 1.0–5.0 |

### Market Snapshots

| Field | Rule |
|---|---|
| `submarket` | Required |
| `city` | Required |
| `year` | Required, 2000–2030 |
| `occupancy` | 0.0–1.0 (after normalisation) |
| `adr` / `revpar` | > 0 |
| `revpar_change` | -1.0–2.0 |

### Financials

| Field | Rule |
|---|---|
| `year` | Required, 2000–2030 |
| `total_revenue` | Required, > 0 |
| `noi_margin` | 0.0–1.0 |
| `occupancy_rate` | 0.0–1.0 |
| `revpar` | 0–ADR (soft: RevPAR ≤ ADR × occupancy ± 10%) |

---

## CLI Reference

```powershell
# Set environment
$env:PYTHONPATH = "apps/api;services/data_pipeline"
$env:DATABASE_URL = "postgresql://user:pass@localhost:5432/hotelvalora"

# Validate only (no DB)
python -m pipeline.cli.main validate --file data/samples/internal_hotels.xlsx --type hotels

# Dry-run (no DB writes)
python -m pipeline.cli.main import-hotels --file data/samples/internal_hotels.xlsx --mode dry_run

# Live import
python -m pipeline.cli.main import-hotels           --file data/samples/internal_hotels.xlsx --mode upsert
python -m pipeline.cli.main import-costar-props     --file data/samples/costar_hotels.xlsx --mode upsert
python -m pipeline.cli.main import-costar-trans     --file data/samples/costar_transactions.xlsx --mode upsert
python -m pipeline.cli.main import-market           --file data/samples/costar_market.xlsx --mode upsert --source costar
python -m pipeline.cli.main import-financials       --file data/samples/hotel_financials.xlsx --hotel-id <UUID> --mode upsert
```

---

## Reference Scripts

| Script | Purpose |
|---|---|
| `data/samples/generate_samples.py` | Generate all sample xlsx + csv |
| `scripts/import/validate_samples.py` | Dry-run validation of all sample files |
| `scripts/import/mapping_report.py` | Print CoStar field maps + geography normalisation |
| `scripts/import/import_commands.ps1` | PowerShell CLI command reference |
| `services/data_pipeline/examples/sample_workflow.py` | In-process ETL dry-run demo |
