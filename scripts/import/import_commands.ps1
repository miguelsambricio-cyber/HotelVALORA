# HotelVALORA Import Command Reference
# Run these from the repo root after setting DATABASE_URL
#
# Usage: Copy individual commands into your terminal.
#        Set DATABASE_URL first for any command that writes to the DB.
#
# $env:DATABASE_URL = "postgresql://user:pass@localhost:5432/hotelvalora"
# $env:PYTHONPATH   = "apps/api;services/data_pipeline"

$env:PYTHONPATH = "apps/api;services/data_pipeline"

# ─── Generate Sample Data ─────────────────────────────────────────────────────

# Creates data/samples/*.xlsx and *.csv
python data/samples/generate_samples.py

# ─── Validate Only (no DB) ────────────────────────────────────────────────────

# Internal hotels template
python -m pipeline.cli.main validate `
    --file data/samples/internal_hotels.xlsx `
    --type hotels

# Financials template
python -m pipeline.cli.main validate `
    --file data/samples/hotel_financials.xlsx `
    --type financials

# Transactions template (after CoStar normalization)
python -m pipeline.cli.main validate `
    --file data/samples/costar_transactions.xlsx `
    --type transactions

# Market stats template
python -m pipeline.cli.main validate `
    --file data/samples/costar_market.xlsx `
    --type market

# Export validation errors to JSON
python -m pipeline.cli.main validate `
    --file data/samples/internal_hotels.xlsx `
    --type hotels `
    --output reports/hotels_validation.json

# ─── Dry-Run Imports (no DB write) ────────────────────────────────────────────

# Dry-run hotel import (shows what would be inserted/updated)
python -m pipeline.cli.main import-hotels `
    --file data/samples/internal_hotels.xlsx `
    --mode dry_run

# Dry-run CoStar property import
python -m pipeline.cli.main import-costar-props `
    --file data/samples/costar_hotels.xlsx `
    --mode dry_run

# Dry-run transaction import
python -m pipeline.cli.main import-costar-trans `
    --file data/samples/costar_transactions.xlsx `
    --mode dry_run

# ─── Live Imports (requires DATABASE_URL) ────────────────────────────────────

# Import internal hotel template (upsert mode)
python -m pipeline.cli.main import-hotels `
    --file data/samples/internal_hotels.xlsx `
    --mode upsert

# Import CoStar hotel export
python -m pipeline.cli.main import-costar-props `
    --file data/samples/costar_hotels.xlsx `
    --mode upsert

# Import CoStar transactions
python -m pipeline.cli.main import-costar-trans `
    --file data/samples/costar_transactions.xlsx `
    --mode upsert

# Import market stats
python -m pipeline.cli.main import-market `
    --file data/samples/costar_market.xlsx `
    --mode upsert `
    --source costar

# Import hotel financials (requires --hotel-id UUID)
# First get the hotel UUID from the DB, then:
# python -m pipeline.cli.main import-financials `
#     --file data/samples/hotel_financials.xlsx `
#     --hotel-id <UUID> `
#     --mode upsert

# ─── Validate All Samples (convenience wrapper) ───────────────────────────────

python scripts/import/validate_samples.py

# ─── Mapping Reference ────────────────────────────────────────────────────────

python scripts/import/mapping_report.py
