from __future__ import annotations

from typing import Any
import pandas as pd


def parse_percent(value: Any) -> float | None:
    """
    Convert percentage values to decimal fraction.
    Handles: '75.3%', 75.3, 0.753
    CoStar/Excel typically store as 73.5 (not 0.735).
    """
    if value is None:
        return None
    if isinstance(value, float) and pd.isna(value):
        return None
    if isinstance(value, str):
        v = value.strip().replace("%", "").replace(",", ".").strip()
        if not v or v.lower() in {"n/a", "na", "-", ""}:
            return None
        try:
            value = float(v)
        except ValueError:
            return None
    try:
        f = float(value)
    except (TypeError, ValueError):
        return None
    return round(f / 100 if f > 1 else f, 4)


def parse_currency(value: Any) -> float | None:
    """
    Parse currency strings to float.
    Handles: '€1,234,567', '$1.5M', '1.5K', 1234567
    """
    if value is None:
        return None
    if isinstance(value, float) and pd.isna(value):
        return None
    if isinstance(value, (int, float)):
        return float(value)

    s = str(value).strip()
    # Strip currency symbols
    for sym in ("€", "$", "£", "¥", "USD", "EUR", "GBP", " "):
        s = s.replace(sym, "")
    s = s.strip()
    if not s or s.lower() in {"n/a", "na", "-", ""}:
        return None

    multiplier = 1.0
    upper = s.upper()
    if upper.endswith("M"):
        multiplier = 1_000_000
        s = s[:-1]
    elif upper.endswith("K"):
        multiplier = 1_000
        s = s[:-1]
    elif upper.endswith("B"):
        multiplier = 1_000_000_000
        s = s[:-1]

    # Remove thousand separators
    s = s.replace(",", "")
    try:
        return float(s) * multiplier
    except ValueError:
        return None


def safe_int(value: Any) -> int | None:
    if value is None:
        return None
    if isinstance(value, float) and pd.isna(value):
        return None
    try:
        return int(float(str(value).replace(",", "").strip()))
    except (TypeError, ValueError):
        return None


def safe_float(value: Any) -> float | None:
    if value is None:
        return None
    if isinstance(value, float) and pd.isna(value):
        return None
    try:
        return float(str(value).replace(",", "").strip())
    except (TypeError, ValueError):
        return None
