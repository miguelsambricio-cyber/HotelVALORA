from __future__ import annotations

from dataclasses import dataclass, field

import pandas as pd


@dataclass
class ValidationResult:
    is_valid: bool
    row_count: int
    error_count: int = 0
    errors: list[dict] = field(default_factory=list)

    def add_error(self, row: int, column: str | None, message: str, value: object = None) -> None:
        self.errors.append({
            "row": row,
            "column": column,
            "message": message,
            "value": str(value) if value is not None else None,
        })
        self.error_count += 1
        self.is_valid = False

    def summary(self) -> dict:
        return {
            "is_valid": self.is_valid,
            "row_count": self.row_count,
            "error_count": self.error_count,
        }


# ── Range rules ────────────────────────────────────────────────────────────────

_RANGE_RULES: dict[str, tuple[float, float]] = {
    "occupancy_rate": (0.0, 1.0),
    "occupancy": (0.0, 100.0),
    "cap_rate": (0.0, 0.50),
    "star_rating": (1.0, 5.0),
    "total_keys": (1, 10_000),
    "keys": (1, 10_000),
    "year_built": (1800, 2030),
    "opening_year": (1800, 2030),
    "year_renovated": (1800, 2030),
    "latitude": (-90.0, 90.0),
    "longitude": (-180.0, 180.0),
    "revpar": (0, 10_000),
    "adr": (0, 50_000),
    "period_year": (1990, 2040),
}

_POSITIVE_COLS = {
    "total_revenue", "rooms_revenue", "fb_revenue", "noi",
    "transaction_price", "sale_price", "price_per_key",
    "market_adr", "market_revpar",
}


def validate_dataframe(df: pd.DataFrame, template_type: str) -> ValidationResult:
    result = ValidationResult(is_valid=True, row_count=len(df))

    for idx, row in df.iterrows():
        row_num = int(idx) + 2  # 1-indexed + header

        # ── Range validation ───────────────────────────────────────────────────
        for col, (lo, hi) in _RANGE_RULES.items():
            if col not in df.columns:
                continue
            val = row.get(col)
            if pd.isna(val):
                continue
            try:
                fval = float(val)
                if not (lo <= fval <= hi):
                    result.add_error(row_num, col, f"Value {fval} out of range [{lo}, {hi}]", fval)
            except (TypeError, ValueError):
                result.add_error(row_num, col, f"Non-numeric value: {val!r}", val)

        # ── Positive-only columns ──────────────────────────────────────────────
        for col in _POSITIVE_COLS:
            if col not in df.columns:
                continue
            val = row.get(col)
            if pd.isna(val):
                continue
            try:
                if float(val) < 0:
                    result.add_error(row_num, col, f"Value must be >= 0, got {val}", val)
            except (TypeError, ValueError):
                pass

        # ── Template-specific rules ────────────────────────────────────────────

        if template_type == "transactions":
            date_col = next(
                (c for c in ("sale_date", "transaction_date") if c in df.columns), None
            )
            if date_col:
                date_val = row.get(date_col)
                if pd.notna(date_val):
                    try:
                        pd.to_datetime(str(date_val))
                    except Exception:
                        result.add_error(row_num, date_col, f"Cannot parse date: {date_val!r}", date_val)

            # Cross-field: price_per_key consistency
            price = row.get("sale_price") or row.get("transaction_price")
            ppk = row.get("price_per_key")
            keys = row.get("total_keys") or row.get("keys")
            if price and keys and ppk:
                try:
                    implied_ppk = float(price) / float(keys)
                    if abs(implied_ppk - float(ppk)) / max(implied_ppk, 1) > 0.10:
                        result.add_error(
                            row_num, "price_per_key",
                            f"price_per_key {ppk} diverges >10% from price/keys ({implied_ppk:.0f})",
                        )
                except (TypeError, ZeroDivisionError):
                    pass

        elif template_type == "financials":
            year_val = row.get("year")
            if pd.notna(year_val):
                try:
                    y = int(float(year_val))
                    if not (1950 <= y <= 2035):
                        result.add_error(row_num, "year", f"Year {y} out of range [1950, 2035]", y)
                except (TypeError, ValueError):
                    result.add_error(row_num, "year", f"Non-integer year: {year_val!r}", year_val)

            # RevPAR consistency
            occ = row.get("occupancy_rate")
            adr = row.get("adr")
            revpar = row.get("revpar")
            if all(pd.notna(v) for v in [occ, adr, revpar]):
                try:
                    implied = float(occ) * float(adr)
                    if abs(implied - float(revpar)) / max(float(adr), 1) > 0.10:
                        result.add_error(
                            row_num, "revpar",
                            f"RevPAR {revpar} inconsistent with occupancy×ADR ({implied:.2f})",
                        )
                except (TypeError, ZeroDivisionError):
                    pass

        elif template_type == "hotels":
            opening = row.get("year_built") or row.get("opening_year")
            renovated = row.get("year_renovated")
            if pd.notna(opening) and pd.notna(renovated):
                try:
                    if int(renovated) < int(opening):
                        result.add_error(
                            row_num, "year_renovated",
                            f"year_renovated ({int(renovated)}) is before opening_year ({int(opening)})",
                        )
                except (TypeError, ValueError):
                    pass

    return result
