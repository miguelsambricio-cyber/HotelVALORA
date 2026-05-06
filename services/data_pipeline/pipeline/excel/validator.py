from __future__ import annotations

from dataclasses import dataclass, field

import pandas as pd


@dataclass
class ValidationResult:
    is_valid: bool
    row_count: int
    error_count: int
    errors: list[dict] = field(default_factory=list)

    def add_error(self, row: int, column: str, message: str) -> None:
        self.errors.append({"row": row, "column": column, "message": message})
        self.error_count += 1
        self.is_valid = False


RANGE_RULES: dict[str, tuple[float, float]] = {
    "occupancy_rate": (0.0, 1.0),
    "cap_rate": (0.0, 0.50),
    "star_rating": (1.0, 5.0),
    "total_keys": (1, 10_000),
    "year_built": (1800, 2030),
}


def validate_dataframe(df: pd.DataFrame, template_type: str) -> ValidationResult:
    result = ValidationResult(is_valid=True, row_count=len(df), error_count=0)

    for idx, row in df.iterrows():
        row_num = int(idx) + 2  # Excel rows start at 1 + header

        # Validate ranges
        for col, (lo, hi) in RANGE_RULES.items():
            if col not in df.columns:
                continue
            val = row.get(col)
            if pd.isna(val):
                continue
            try:
                fval = float(val)
                if not (lo <= fval <= hi):
                    result.add_error(
                        row_num, col,
                        f"Value {fval} out of expected range [{lo}, {hi}]"
                    )
            except (TypeError, ValueError):
                result.add_error(row_num, col, f"Non-numeric value: {val!r}")

        # Template-specific rules
        if template_type == "transactions":
            sale_date = row.get("sale_date")
            if pd.notna(sale_date):
                try:
                    pd.to_datetime(str(sale_date))
                except Exception:
                    result.add_error(row_num, "sale_date", f"Cannot parse date: {sale_date!r}")

        if template_type == "financials":
            year = row.get("year")
            if pd.notna(year):
                try:
                    y = int(year)
                    if not (1950 <= y <= 2035):
                        result.add_error(row_num, "year", f"Year {y} out of range [1950, 2035]")
                except (TypeError, ValueError):
                    result.add_error(row_num, "year", f"Non-integer year: {year!r}")

    return result
