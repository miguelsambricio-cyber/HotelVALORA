from __future__ import annotations

import io
import re
from pathlib import Path

import pandas as pd


class ParseError(Exception):
    pass


# ── Column schemas ─────────────────────────────────────────────────────────────

TEMPLATE_SCHEMAS: dict[str, dict[str, type]] = {
    "hotels": {
        "name": str, "city": str, "total_keys": int,
        "brand": str, "chain_scale": str, "year_built": int,
        "star_rating": float, "asset_status": str,
        "country": str, "submarket": str, "operator": str,
        "latitude": float, "longitude": float,
    },
    "financials": {
        "year": int, "rooms_revenue": float, "total_revenue": float,
        "occupancy_rate": float, "adr": float, "revpar": float,
        "total_expenses": float, "noi": float,
        "fb_revenue": float, "ebitda": float, "noi_margin": float,
    },
    "transactions": {
        "property_name": str, "city": str, "sale_date": str,
        "total_keys": int, "sale_price": float, "price_per_key": float,
        "cap_rate": float, "buyer": str, "seller": str,
        "star_rating": float, "year_built": int,
    },
    "market": {
        "submarket": str, "city": str, "year": int,
        "occupancy": float, "adr": float, "revpar": float,
        "supply": int, "demand": int, "revpar_change": float,
    },
}

REQUIRED_COLUMNS: dict[str, list[str]] = {
    "hotels": ["name", "city", "total_keys"],
    "financials": ["year", "total_revenue"],
    "transactions": ["property_name", "city", "sale_date"],
    "market": ["submarket", "city", "year"],
}

# Alternative column names to try when required columns are missing
REQUIRED_ALIASES: dict[str, dict[str, list[str]]] = {
    "hotels": {
        "name": ["asset_name", "hotel_name", "property_name"],
        "city": ["ciudad"],
        "total_keys": ["keys", "rooms", "num_rooms"],
    },
    "transactions": {
        "property_name": ["name", "property", "hotel_name"],
        "sale_date": ["transaction_date", "close_date", "date"],
    },
    "market": {
        "year": ["period_year", "period"],
        "submarket": ["market"],
    },
    "financials": {
        "total_revenue": ["revenue"],
    },
}


def _normalize_col(col: str) -> str:
    col = str(col).strip()
    col = re.sub(r"[\s\-/]+", "_", col)
    col = re.sub(r"[^\w]", "", col)
    return col.lower()


def parse_excel(
    source: bytes | Path | io.BytesIO,
    template_type: str,
    sheet_name: int | str = 0,
    header_row: int = 0,
) -> pd.DataFrame:
    if template_type not in TEMPLATE_SCHEMAS:
        raise ParseError(
            f"Unknown template type '{template_type}'. "
            f"Valid types: {sorted(TEMPLATE_SCHEMAS)}"
        )

    if isinstance(source, bytes):
        source = io.BytesIO(source)

    try:
        df = pd.read_excel(source, sheet_name=sheet_name, header=header_row)
    except Exception as exc:
        raise ParseError(f"Cannot read Excel file: {exc}") from exc

    if df.empty:
        raise ParseError("Excel file is empty or has no data rows")

    df.columns = [_normalize_col(c) for c in df.columns]
    df = df.dropna(how="all")

    # Resolve required column aliases
    aliases = REQUIRED_ALIASES.get(template_type, {})
    for required_col, candidates in aliases.items():
        if required_col not in df.columns:
            for candidate in candidates:
                if candidate in df.columns:
                    df = df.rename(columns={candidate: required_col})
                    break

    # Validate required columns
    required = REQUIRED_COLUMNS[template_type]
    missing = [c for c in required if c not in df.columns]
    if missing:
        raise ParseError(
            f"Missing required columns for '{template_type}': {missing}. "
            f"Found columns: {list(df.columns)}"
        )

    return df


def coerce_types(df: pd.DataFrame, template_type: str) -> pd.DataFrame:
    schema = TEMPLATE_SCHEMAS.get(template_type, {})
    df = df.copy()
    for col, dtype in schema.items():
        if col not in df.columns:
            continue
        if dtype is int:
            df[col] = pd.to_numeric(df[col], errors="coerce").astype("Int64")
        elif dtype is float:
            df[col] = pd.to_numeric(df[col], errors="coerce")
        else:
            df[col] = df[col].astype(str).where(df[col].notna(), None)
    return df


def detect_template_type(df: pd.DataFrame) -> str | None:
    """Best-effort template type detection from column names."""
    cols = set(df.columns)
    scores: dict[str, int] = {}
    for ttype, required in REQUIRED_COLUMNS.items():
        scores[ttype] = sum(1 for c in required if c in cols)
    best = max(scores, key=lambda k: scores[k])
    return best if scores[best] > 0 else None
