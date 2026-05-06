"""
CoStar export normalizer.

CoStar delivers property/transaction/market data as Excel or CSV exports with
inconsistent column naming across export types. This module provides a clean
normalization layer before records are persisted.
"""

from __future__ import annotations

import re
from typing import Any

import pandas as pd


# ─── Master field maps ──────────────────────────────────────────────────────

PROPERTY_FIELD_MAP: dict[str, str] = {
    # CoStar label            → internal field
    "Property Name": "name",
    "Building Name": "name",
    "City": "city",
    "State": "state",
    "Zip Code": "zip_code",
    "Zip": "zip_code",
    "Number Of Rooms": "total_keys",
    "# Rooms": "total_keys",
    "Number of Rooms": "total_keys",
    "Year Built": "year_built",
    "Star Rating": "star_rating",
    "Property Type": "property_type",
    "Secondary Type": "chain_scale",
    "Brand": "brand",
    "Latitude": "latitude",
    "Longitude": "longitude",
    "CoStar Property ID": "costar_id",
    "Property ID": "costar_id",
}

TRANSACTION_FIELD_MAP: dict[str, str] = {
    "Property Name": "property_name",
    "City": "city",
    "State": "state",
    "Sale Date": "sale_date",
    "Close Date": "sale_date",
    "Sale Price": "sale_price",
    "Price Per Room": "price_per_key",
    "Price/Key": "price_per_key",
    "Going-In Cap Rate": "cap_rate",
    "Cap Rate": "cap_rate",
    "Buyer": "buyer",
    "Seller": "seller",
    "Number Of Rooms": "total_keys",
    "CoStar Property ID": "source_id",
}

MARKET_FIELD_MAP: dict[str, str] = {
    "Submarket": "submarket",
    "City": "city",
    "State": "state",
    "Year": "period_year",
    "Period": "period_year",
    "Occupancy": "market_occupancy",
    "Occ": "market_occupancy",
    "ADR": "market_adr",
    "RevPAR": "market_revpar",
    "Supply": "market_supply",
    "Demand": "market_demand",
    "RevPAR Change": "revpar_growth_yoy",
    "RevPAR % Chg": "revpar_growth_yoy",
}


def _normalize_column_name(col: str) -> str:
    col = col.strip()
    col = re.sub(r"\s+", " ", col)
    return col


def normalize_dataframe(df: pd.DataFrame, field_map: dict[str, str]) -> pd.DataFrame:
    df.columns = [_normalize_column_name(c) for c in df.columns]
    rename_map = {k: v for k, v in field_map.items() if k in df.columns}
    df = df.rename(columns=rename_map)
    return df


def normalize_properties(df: pd.DataFrame) -> pd.DataFrame:
    df = normalize_dataframe(df, PROPERTY_FIELD_MAP)
    if "market_occupancy" in df.columns:
        df["market_occupancy"] = df["market_occupancy"].apply(_pct_to_decimal)
    if "star_rating" in df.columns:
        df["star_rating"] = pd.to_numeric(df["star_rating"], errors="coerce")
    return df


def normalize_transactions(df: pd.DataFrame) -> pd.DataFrame:
    df = normalize_dataframe(df, TRANSACTION_FIELD_MAP)
    if "sale_date" in df.columns:
        df["sale_date"] = pd.to_datetime(df["sale_date"], errors="coerce").dt.strftime("%Y-%m-%d")
    if "cap_rate" in df.columns:
        df["cap_rate"] = df["cap_rate"].apply(_pct_to_decimal)
    return df


def normalize_market_stats(df: pd.DataFrame) -> pd.DataFrame:
    df = normalize_dataframe(df, MARKET_FIELD_MAP)
    for pct_col in ("market_occupancy", "revpar_growth_yoy"):
        if pct_col in df.columns:
            df[pct_col] = df[pct_col].apply(_pct_to_decimal)
    return df


def _pct_to_decimal(val: Any) -> float | None:
    """Convert '75.3%' or 0.753 or 75.3 → 0.753."""
    if pd.isna(val):
        return None
    if isinstance(val, str):
        val = val.strip().replace("%", "")
        try:
            val = float(val)
        except ValueError:
            return None
    val = float(val)
    # Heuristic: CoStar stores occupancy as 73.5 (percentage), not 0.735
    if val > 1:
        val = val / 100
    return round(val, 4)
