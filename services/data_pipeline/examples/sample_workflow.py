"""
Sample import workflow — runs entirely in-memory without a DB connection.
Demonstrates parse → validate → clean → ETL dry-run.

Run from repo root:
    PYTHONPATH=apps/api:services/data_pipeline python services/data_pipeline/examples/sample_workflow.py
"""
from __future__ import annotations

import asyncio
import io
import sys
from pathlib import Path

import pandas as pd

# ── Path setup ─────────────────────────────────────────────────────────────────
_ROOT = Path(__file__).parents[3]
for _p in [str(_ROOT / "apps" / "api"), str(_ROOT / "services" / "data_pipeline")]:
    if _p not in sys.path:
        sys.path.insert(0, _p)

from pipeline.cleaning.geography import normalize_city, normalize_country
from pipeline.cleaning.numeric import parse_currency, parse_percent
from pipeline.cleaning.text import normalize_chain_scale, normalize_status
from pipeline.core.logging import configure_logging
from pipeline.core.result import ImportResult
from pipeline.excel.parser import ParseError, coerce_types, parse_excel
from pipeline.excel.validator import validate_dataframe
from pipeline.costar.normalizer import normalize_transactions

configure_logging("INFO")


# ── 1. Build a sample hotels DataFrame ────────────────────────────────────────

SAMPLE_HOTELS = pd.DataFrame([
    {
        "name": "Hotel Arts Barcelona",
        "city": "BARCELONA",          # will be title-cased → Barcelona
        "country": "spain",           # will be normalized → ES
        "total_keys": 483,
        "brand": "Ritz-Carlton",
        "chain_scale": "Luxury",
        "star_rating": 5.0,
        "year_built": 1994,
        "asset_status": "operating",
        "latitude": 41.3857,
        "longitude": 2.1974,
    },
    {
        "name": "AC Hotel by Marriott Madrid",
        "city": "madrid",
        "country": "ES",
        "total_keys": 145,
        "brand": "AC Hotels",
        "chain_scale": "upscale",
        "star_rating": 4.0,
        "year_built": 2005,
        "asset_status": "OPERATING",  # will normalize → operating
    },
    {
        "name": "",                    # ← will fail: missing name
        "city": "Valencia",
        "country": "ES",
        "total_keys": -10,             # ← will fail: negative
        "star_rating": 7.0,            # ← will fail: out of range
    },
])

print("\n══ Step 1: Parse & Validate ══════════════════════════════════════")
try:
    # Write to bytes so parse_excel can read it
    buf = io.BytesIO()
    SAMPLE_HOTELS.to_excel(buf, index=False)
    buf.seek(0)
    df = parse_excel(buf, "hotels")
    df = coerce_types(df, "hotels")
    print(f"Parsed {len(df)} rows, columns: {list(df.columns)}")
except ParseError as e:
    print(f"ParseError: {e}")
    df = SAMPLE_HOTELS.copy()  # fall through for demo

val = validate_dataframe(df, "hotels")
print(f"Validation: {val.row_count} rows, {val.error_count} errors, valid={val.is_valid}")
for err in val.errors:
    print(f"  row {err['row']} [{err['column']}]: {err['message']}")


# ── 2. Demonstrate cleaning functions ─────────────────────────────────────────

print("\n══ Step 2: Cleaning Functions ════════════════════════════════════")

test_cities = ["BARCELONA", "madrid", "nueva york", "new york city", "lisboa", "Milano"]
for city in test_cities:
    print(f"  normalize_city({city!r}) → {normalize_city(city)!r}")

test_countries = ["spain", "USA", "fr", "United Kingdom", "PORTUGAL"]
for country in test_countries:
    print(f"  normalize_country({country!r}) → {normalize_country(country)!r}")

test_pcts = ["75.3%", "0.753", "73.5", 0.82, "N/A"]
for pct in test_pcts:
    print(f"  parse_percent({pct!r}) → {parse_percent(pct)}")

test_currencies = ["€1,500,000", "$2.5M", "750K", "1234567", "N/A"]
for cur in test_currencies:
    print(f"  parse_currency({cur!r}) → {parse_currency(cur)}")

test_scales = ["Luxury", "Upper Upscale", "select service", "extended-stay", "economy"]
for scale in test_scales:
    print(f"  normalize_chain_scale({scale!r}) → {normalize_chain_scale(scale)!r}")


# ── 3. CoStar normalization demo ───────────────────────────────────────────────

print("\n══ Step 3: CoStar Transaction Normalization ══════════════════════")

COSTAR_TRANSACTIONS = pd.DataFrame([
    {
        "Property Name": "Hotel Casa Fuster",
        "City": "Barcelona",
        "State": "Cataluña",
        "Close Date": "2024-03-15",
        "Sale Price": "€45,000,000",
        "Price/Key": "€312,500",
        "Going-In Cap Rate": "5.2%",
        "Buyer": "Grupo Hotusa",
        "Seller": "Private Fund",
        "Number Of Rooms": 144,
        "CoStar Property ID": "COSTAR-123456",
    },
    {
        "Property Name": "Meliá Castilla",
        "City": "MADRID",
        "Close Date": "05/2023",
        "Sale Price": "120000000",
        "Price/Key": "250000",
        "Going-In Cap Rate": "0.048",
        "Number Of Rooms": 936,
        "Buyer": "Meliá Hotels International",
        "Seller": "CBRE Investment",
    },
])

normalized = normalize_transactions(COSTAR_TRANSACTIONS)
print("Normalized CoStar columns:", list(normalized.columns))
print(normalized[["property_name", "city", "transaction_date", "cap_rate", "total_keys"]].to_string(index=False))


# ── 4. ETL dry-run (no DB required) ───────────────────────────────────────────

print("\n══ Step 4: ETL Dry-Run (no DB) ═══════════════════════════════════")


class _MockDB:
    """Minimal async session mock for dry-run demo."""
    def add(self, obj): pass
    async def flush(self): pass
    async def commit(self): pass
    async def execute(self, stmt):
        class _Result:
            def scalar_one_or_none(self): return None
        return _Result()


async def dry_run_demo():
    from pipeline.etl.hotels import HotelETL

    good_df = pd.DataFrame([
        {"name": "Hilton Barcelona", "city": "Barcelona", "total_keys": 290,
         "brand": "Hilton", "chain_scale": "Upscale", "country": "ES"},
        {"name": "NH Collection Madrid", "city": "Madrid", "total_keys": 162,
         "brand": "NH Hotels", "chain_scale": "Upper Upscale", "country": "ES"},
    ])

    etl = HotelETL(_MockDB())
    result = await etl.run(good_df, mode="dry_run", file_name="demo.xlsx")

    print(f"Dry-run result: {result.summary()}")
    for row in result.rows:
        print(f"  row {row.row_number}: {row.status} | {row.cleaned_data.get('asset_name')} ({row.cleaned_data.get('city')})")


asyncio.run(dry_run_demo())
print("\n══ Workflow complete ══════════════════════════════════════════════\n")
