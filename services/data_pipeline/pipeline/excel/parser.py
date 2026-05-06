"""
Generic Excel parser for HOTEL VALORA import templates.

Each template type (hotels, financials, transactions) has a defined
column schema. The parser validates structure before handing data
to the loader.
"""

from __future__ import annotations

import io
from pathlib import Path
from typing import Any

import pandas as pd


TEMPLATE_SCHEMAS: dict[str, dict[str, type]] = {
    "hotels": {
        "name": str,
        "city": str,
        "total_keys": int,
        "brand": str,
        "chain_scale": str,
        "year_built": int,
        "star_rating": float,
        "asset_status": str,
    },
    "financials": {
        "year": int,
        "rooms_revenue": float,
        "total_revenue": float,
        "occupancy_rate": float,
        "adr": float,
        "revpar": float,
        "total_expenses": float,
        "noi": float,
    },
    "transactions": {
        "property_name": str,
        "city": str,
        "sale_date": str,
        "total_keys": int,
        "sale_price": float,
        "price_per_key": float,
        "cap_rate": float,
    },
}

REQUIRED_COLUMNS: dict[str, list[str]] = {
    "hotels": ["name", "city", "total_keys"],
    "financials": ["year", "total_revenue", "noi"],
    "transactions": ["property_name", "city", "sale_date"],
}


class ParseError(Exception):
    pass


def parse_excel(
    source: bytes | Path | io.BytesIO,
    template_type: str,
    sheet_name: int | str = 0,
) -> pd.DataFrame:
    if template_type not in TEMPLATE_SCHEMAS:
        raise ParseError(f"Unknown template type '{template_type}'. "
                         f"Valid types: {list(TEMPLATE_SCHEMAS)}")

    if isinstance(source, bytes):
        source = io.BytesIO(source)

    try:
        df = pd.read_excel(source, sheet_name=sheet_name)
    except Exception as e:
        raise ParseError(f"Cannot read Excel file: {e}") from e

    # Normalize column names
    df.columns = [str(c).strip().lower().replace(" ", "_") for c in df.columns]

    # Check required columns
    required = REQUIRED_COLUMNS[template_type]
    missing = [c for c in required if c not in df.columns]
    if missing:
        raise ParseError(f"Missing required columns for '{template_type}': {missing}")

    # Drop fully empty rows
    df = df.dropna(how="all")

    return df


def coerce_types(df: pd.DataFrame, template_type: str) -> pd.DataFrame:
    schema = TEMPLATE_SCHEMAS.get(template_type, {})
    for col, dtype in schema.items():
        if col not in df.columns:
            continue
        try:
            if dtype is int:
                df[col] = pd.to_numeric(df[col], errors="coerce").astype("Int64")
            elif dtype is float:
                df[col] = pd.to_numeric(df[col], errors="coerce")
            else:
                df[col] = df[col].astype(str).str.strip()
        except Exception:
            pass
    return df
