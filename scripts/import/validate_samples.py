"""
Dry-run validation of all sample datasets — no database connection required.

Tests the full parse → coerce → validate → clean → ETL(dry_run) pipeline
against the files in data/samples/.

Run from repo root:
    PYTHONPATH=apps/api:services/data_pipeline python scripts/import/validate_samples.py
"""
from __future__ import annotations

import asyncio
import io
import sys
from pathlib import Path

import pandas as pd

# ── Path setup ─────────────────────────────────────────────────────────────────
_ROOT = Path(__file__).parents[2]
for _p in [str(_ROOT / "apps" / "api"), str(_ROOT / "services" / "data_pipeline")]:
    if _p not in sys.path:
        sys.path.insert(0, _p)

SAMPLES = _ROOT / "data" / "samples"

from pipeline.costar.normalizer import normalize_market_stats, normalize_properties, normalize_transactions
from pipeline.core.logging import configure_logging
from pipeline.excel.parser import ParseError, coerce_types, parse_excel
from pipeline.excel.validator import validate_dataframe

configure_logging("WARNING")

SEP = "=" * 62


def _banner(title: str) -> None:
    print(f"\n{SEP}")
    print(f"  {title}")
    print(SEP)


def _val_report(df: pd.DataFrame, template_type: str) -> None:
    result = validate_dataframe(df, template_type)
    status = "PASS" if result.is_valid else "FAIL"
    print(f"  Validation [{status}]  rows={result.row_count}  errors={result.error_count}")
    for e in result.errors:
        col = e.get("column", "?")
        print(f"    row {e['row']:>3}  [{col:<22}]  {e['message']}")


# ── 1. Internal hotels template ────────────────────────────────────────────────

def _test_internal_hotels() -> None:
    _banner("1. Internal Hotels Template  (internal_hotels.xlsx)")
    src = SAMPLES / "internal_hotels.xlsx"
    if not src.exists():
        print("  SKIP — file not found. Run generate_samples.py first.")
        return

    try:
        df = parse_excel(src, "hotels")
        df = coerce_types(df, "hotels")
    except ParseError as exc:
        print(f"  ParseError: {exc}")
        return

    print(f"  Parsed {len(df)} rows, columns: {list(df.columns)}")
    _val_report(df, "hotels")


# ── 2. CoStar property export ──────────────────────────────────────────────────

def _test_costar_hotels() -> None:
    _banner("2. CoStar Hotel Property Export  (costar_hotels.xlsx)")
    src = SAMPLES / "costar_hotels.xlsx"
    if not src.exists():
        print("  SKIP — file not found. Run generate_samples.py first.")
        return

    raw = pd.read_excel(src)
    df = normalize_properties(raw)
    print(f"  CoStar columns normalized: {list(df.columns)}")
    print(f"  Rows: {len(df)}")

    # Re-map to internal template for validation
    df_hotels = df.rename(columns={"name": "name", "total_keys": "total_keys"})
    if "name" in df_hotels.columns and "total_keys" in df_hotels.columns:
        buf = io.BytesIO()
        df_hotels.to_excel(buf, index=False)
        buf.seek(0)
        try:
            parsed = parse_excel(buf, "hotels")
            parsed = coerce_types(parsed, "hotels")
            _val_report(parsed, "hotels")
        except ParseError as exc:
            print(f"  Validation skipped (column mismatch): {exc}")
    print(f"  Sample rows:")
    for _, row in df.head(3).iterrows():
        print(f"    {row.get('name','?')!r:<45}  keys={row.get('total_keys','?')}  scale={row.get('chain_scale','?')!r}")


# ── 3. CoStar transactions ─────────────────────────────────────────────────────

def _test_costar_transactions() -> None:
    _banner("3. CoStar Transaction Export  (costar_transactions.xlsx)")
    src = SAMPLES / "costar_transactions.xlsx"
    if not src.exists():
        print("  SKIP — file not found. Run generate_samples.py first.")
        return

    raw = pd.read_excel(src)
    df = normalize_transactions(raw)
    print(f"  Normalized columns: {list(df.columns)}")

    # Rewrite to internal transactions template
    df2 = df.rename(columns={
        "property_name": "property_name",
        "sale_date": "sale_date",
        "total_keys": "total_keys",
        "sale_price": "sale_price",
        "price_per_key": "price_per_key",
        "cap_rate": "cap_rate",
    })

    buf = io.BytesIO()
    df2.to_excel(buf, index=False)
    buf.seek(0)
    try:
        parsed = parse_excel(buf, "transactions")
        parsed = coerce_types(parsed, "transactions")
        _val_report(parsed, "transactions")
    except ParseError as exc:
        print(f"  Template parse error: {exc}")

    print(f"  Sample transactions:")
    for _, row in df.head(4).iterrows():
        price_m = row.get("sale_price")
        try:
            price_m = f"€{float(price_m)/1_000_000:.1f}M"
        except Exception:
            price_m = str(price_m)
        cap = row.get("cap_rate")
        try:
            cap = f"{float(cap)*100:.1f}%"
        except Exception:
            cap = str(cap)
        print(f"    {row.get('property_name','?')!r:<45}  {row.get('sale_date','?')}  {price_m}  cap={cap}")


# ── 4. CoStar market stats ─────────────────────────────────────────────────────

def _test_costar_market() -> None:
    _banner("4. CoStar Submarket Stats  (costar_market.xlsx)")
    src = SAMPLES / "costar_market.xlsx"
    if not src.exists():
        print("  SKIP — file not found. Run generate_samples.py first.")
        return

    raw = pd.read_excel(src)
    df = normalize_market_stats(raw)
    print(f"  Normalized columns: {list(df.columns)}")

    buf = io.BytesIO()
    df.to_excel(buf, index=False)
    buf.seek(0)
    try:
        parsed = parse_excel(buf, "market")
        parsed = coerce_types(parsed, "market")
        _val_report(parsed, "market")
    except ParseError as exc:
        print(f"  Template parse error: {exc}")

    print(f"  Sample market rows (2024):")
    latest = df[df.get("period_year", df.get("year", pd.Series([]))) == 2024] if "period_year" in df.columns or "year" in df.columns else df
    for _, row in latest.head(4).iterrows():
        sub = row.get("submarket", row.get("Submarket", "?"))
        occ = row.get("market_occupancy", "?")
        adr = row.get("market_adr", "?")
        try:
            occ = f"{float(occ)*100:.1f}%"
        except Exception:
            occ = str(occ)
        try:
            adr = f"€{float(adr):.2f}"
        except Exception:
            adr = str(adr)
        print(f"    {sub!r:<28}  occ={occ}  ADR={adr}")


# ── 5. Hotel financials ────────────────────────────────────────────────────────

def _test_financials() -> None:
    _banner("5. Hotel Financials  (hotel_financials.xlsx)")
    src = SAMPLES / "hotel_financials.xlsx"
    if not src.exists():
        print("  SKIP — file not found. Run generate_samples.py first.")
        return

    try:
        df = parse_excel(src, "financials")
        df = coerce_types(df, "financials")
    except ParseError as exc:
        print(f"  ParseError: {exc}")
        return

    print(f"  Parsed {len(df)} rows, columns: {list(df.columns)}")
    _val_report(df, "financials")

    print(f"  Sample rows:")
    for _, row in df.iterrows():
        asset = row.get("asset_name", "—")
        year = row.get("year", "?")
        rev = row.get("total_revenue")
        noi = row.get("noi")
        try:
            rev = f"€{float(rev)/1_000_000:.2f}M"
        except Exception:
            rev = str(rev)
        try:
            noi = f"€{float(noi)/1_000_000:.2f}M"
        except Exception:
            noi = str(noi)
        print(f"    {str(asset)!r:<45}  {year}  rev={rev}  NOI={noi}")


# ── 6. ETL dry-run ─────────────────────────────────────────────────────────────

class _MockDB:
    def add(self, obj): pass
    async def flush(self): pass
    async def commit(self): pass
    async def execute(self, stmt):
        class _R:
            def scalar_one_or_none(self): return None
        return _R()


async def _test_etl_dryrun() -> None:
    _banner("6. ETL Dry-Run  (no DB required)")
    try:
        from pipeline.etl.hotels import HotelETL
        from pipeline.etl.transactions import TransactionETL
        from pipeline.etl.market import MarketSnapshotETL
    except ImportError as exc:
        print(f"  SKIP — ETL modules require full API env: {exc}")
        print("  Run: PYTHONPATH=apps/api:services/data_pipeline python services/data_pipeline/examples/sample_workflow.py")
        return

    # Hotels
    src = SAMPLES / "internal_hotels.xlsx"
    if src.exists():
        try:
            df = parse_excel(src, "hotels")
            df = coerce_types(df, "hotels")
            result = await HotelETL(_MockDB()).run(df, mode="dry_run", file_name="internal_hotels.xlsx")
            s = result.summary()
            print(f"  HotelETL dry-run: total={s['total_rows']}  valid={s['valid_rows']}  invalid={s['invalid_rows']}  dupes={s['duplicate_rows']}")
            for row in result.rows:
                name = row.cleaned_data.get("asset_name", "?")
                city = row.cleaned_data.get("city", "?")
                keys = row.cleaned_data.get("keys", "?")
                errs = [e.message for e in row.errors] if row.errors else []
                errs_str = f"  ← {'; '.join(errs)}" if errs else ""
                print(f"    [{row.status:<8}]  {name!r:<45}  {city}, keys={keys}{errs_str}")
        except Exception as exc:
            print(f"  HotelETL error: {exc}")

    # Transactions
    src_t = SAMPLES / "costar_transactions.xlsx"
    if src_t.exists():
        try:
            raw = pd.read_excel(src_t)
            df_t = normalize_transactions(raw)
            # The transaction ETL expects internal column names
            df_t2 = df_t.rename(columns={"sale_date": "sale_date"})
            result_t = await TransactionETL(_MockDB()).run(df_t2, mode="dry_run", file_name="costar_transactions.xlsx")
            s = result_t.summary()
            print(f"\n  TransactionETL dry-run: total={s['total_rows']}  valid={s['valid_rows']}  invalid={s['invalid_rows']}")
        except Exception as exc:
            print(f"  TransactionETL error: {exc}")


if __name__ == "__main__":
    _test_internal_hotels()
    _test_costar_hotels()
    _test_costar_transactions()
    _test_costar_market()
    _test_financials()
    asyncio.run(_test_etl_dryrun())
    print(f"\n{SEP}")
    print("  All validations complete")
    print(f"{SEP}\n")
