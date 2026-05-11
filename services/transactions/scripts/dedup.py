"""Dedup helpers.

`dedup_key` and `content_hash` per `docs/intelligence/data-normalization-rules.md` §4.
"""

from __future__ import annotations

import hashlib
import unicodedata
from datetime import date, datetime
from typing import Any


def strip_diacritics(s: str) -> str:
    """Remove combining marks. 'Málaga' → 'Malaga'."""
    nkfd = unicodedata.normalize("NFKD", s)
    return "".join(c for c in nkfd if not unicodedata.combining(c)).strip()


def sha256_hex(parts: list[Any]) -> str:
    """Stable hash of pipe-joined parts. None → empty string."""
    payload = "|".join("" if p is None else str(p) for p in parts)
    return hashlib.sha256(payload.encode("utf-8")).hexdigest()


def normalise_str_for_key(value: Any) -> str:
    """Lowercase + strip diacritics + collapse whitespace."""
    if value is None:
        return ""
    text = str(value).strip()
    text = strip_diacritics(text).lower()
    return " ".join(text.split())


def iso_date(value: Any) -> str:
    """Date-like → ISO YYYY-MM-DD. None/invalid → empty."""
    if value is None:
        return ""
    if isinstance(value, date) and not isinstance(value, datetime):
        return value.isoformat()
    if isinstance(value, datetime):
        return value.date().isoformat()
    s = str(value).strip()
    if not s:
        return ""
    # ISO already
    try:
        return datetime.fromisoformat(s.replace("Z", "+00:00")).date().isoformat()
    except ValueError:
        pass
    # Try a couple of common formats
    for fmt in ("%Y-%m-%d", "%d/%m/%Y", "%m/%d/%Y", "%Y/%m/%d"):
        try:
            return datetime.strptime(s[:10], fmt).date().isoformat()
        except ValueError:
            continue
    return ""


def transaction_dedup_key(row: dict[str, Any]) -> str:
    """sha256 of (asset_name | city | closed_at OR announced_at | round(price_eur))."""
    return sha256_hex(
        [
            normalise_str_for_key(row.get("asset_name")),
            normalise_str_for_key(row.get("city")),
            iso_date(row.get("closed_at") or row.get("announced_at")),
            int(round(float(row["price_eur"]))) if row.get("price_eur") not in (None, "") else "",
        ]
    )


def project_dedup_key(row: dict[str, Any]) -> str:
    """sha256 of (project_name | city | announced_at | developer_name)."""
    return sha256_hex(
        [
            normalise_str_for_key(row.get("project_name")),
            normalise_str_for_key(row.get("city")),
            iso_date(row.get("announced_at")),
            normalise_str_for_key(row.get("developer_name")),
        ]
    )


def content_hash(row: dict[str, Any], domain_columns: list[str]) -> str:
    """sha256 of the concatenated domain columns. Nulls become empty.

    Used to detect publisher edits / price corrections / segment refines on
    rows that share a dedup_key.
    """
    parts: list[str] = []
    for col in domain_columns:
        v = row.get(col)
        if v is None:
            parts.append("")
        elif isinstance(v, float):
            # Stabilise float-as-str — avoid spurious diffs from rounding noise
            parts.append(f"{v:.4f}")
        else:
            parts.append(str(v).strip())
    return sha256_hex(parts)
