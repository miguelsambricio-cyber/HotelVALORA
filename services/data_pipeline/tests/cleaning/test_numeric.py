"""
Tests for pipeline.cleaning.numeric — parse_percent, parse_currency, safe_int, safe_float.
"""
from __future__ import annotations

import math

import pytest

from pipeline.cleaning.numeric import parse_currency, parse_percent, safe_float, safe_int

try:
    import pandas as pd
    _NAN = float("nan")
    _PD_NAN = pd.NA
    HAS_PANDAS = True
except ImportError:
    HAS_PANDAS = False


# ── parse_percent() ──────────────────────────────────────────────────────────────

class TestParsePercent:
    # --- Normal percentage strings ---
    def test_string_with_percent_sign(self):
        assert parse_percent("75.3%") == 0.753

    def test_string_without_percent_sign_over_1(self):
        assert parse_percent("73.5") == 0.735

    def test_string_zero_percent(self):
        assert parse_percent("0%") == 0.0

    def test_string_hundred_percent(self):
        assert parse_percent("100%") == 1.0

    def test_string_with_comma_decimal(self):
        # European format: "75,3%"
        assert parse_percent("75,3%") == 0.753

    def test_string_with_spaces(self):
        assert parse_percent("  72.5%  ") == 0.725

    # --- Numeric inputs ---
    def test_float_over_1_divided(self):
        assert parse_percent(73.5) == 0.735

    def test_float_exactly_1_kept(self):
        # 1.0 is not > 1, treated as already-decimal (= 100%)
        assert parse_percent(1.0) == 1.0

    def test_float_under_1_kept(self):
        assert parse_percent(0.735) == 0.735

    def test_integer_over_1_divided(self):
        assert parse_percent(80) == 0.8

    def test_zero_integer(self):
        assert parse_percent(0) == 0.0

    # --- None / NaN ---
    def test_none_returns_none(self):
        assert parse_percent(None) is None

    def test_float_nan_returns_none(self):
        assert parse_percent(float("nan")) is None

    @pytest.mark.skipif(not HAS_PANDAS, reason="pandas not installed")
    def test_pandas_na_returns_none(self):
        import pandas as pd
        assert parse_percent(pd.NA) is None

    # --- Invalid strings ---
    def test_na_string_returns_none(self):
        assert parse_percent("n/a") is None

    def test_dash_string_returns_none(self):
        assert parse_percent("-") is None

    def test_empty_string_returns_none(self):
        assert parse_percent("") is None

    def test_non_numeric_string_returns_none(self):
        assert parse_percent("abc") is None

    def test_percent_sign_only_returns_none(self):
        assert parse_percent("%") is None

    # --- Precision ---
    def test_result_rounded_to_4_places(self):
        result = parse_percent("33.3333%")
        assert result == round(0.333333, 4)

    def test_result_type_is_float(self):
        result = parse_percent("72.5%")
        assert isinstance(result, float)


# ── parse_currency() ─────────────────────────────────────────────────────────────

class TestParseCurrency:
    # --- Plain numbers ---
    def test_integer(self):
        assert parse_currency(1_234_567) == 1_234_567.0

    def test_float(self):
        assert parse_currency(1_234_567.0) == 1_234_567.0

    # --- Currency symbol strings ---
    def test_euro_symbol(self):
        assert parse_currency("€1,234,567") == 1_234_567.0

    def test_dollar_symbol(self):
        assert parse_currency("$1,500,000") == 1_500_000.0

    def test_pound_symbol(self):
        assert parse_currency("£2,500,000") == 2_500_000.0

    def test_currency_code_eur(self):
        assert parse_currency("EUR1234567") == 1_234_567.0

    # --- Multiplier suffixes ---
    def test_millions_suffix_upper(self):
        assert parse_currency("1.5M") == 1_500_000.0

    def test_millions_suffix_lower(self):
        assert parse_currency("180m") == 180_000_000.0

    def test_thousands_suffix(self):
        assert parse_currency("500K") == 500_000.0

    def test_billions_suffix(self):
        assert parse_currency("1.2B") == 1_200_000_000.0

    def test_euro_with_millions(self):
        assert parse_currency("€85M") == 85_000_000.0

    # --- Thousand separators ---
    def test_comma_as_thousand_separator(self):
        assert parse_currency("1,234,567") == 1_234_567.0

    def test_large_number_with_commas(self):
        assert parse_currency("10,000,000") == 10_000_000.0

    # --- None / NaN ---
    def test_none_returns_none(self):
        assert parse_currency(None) is None

    def test_float_nan_returns_none(self):
        assert parse_currency(float("nan")) is None

    # --- Invalid / sentinel strings ---
    def test_na_string_returns_none(self):
        assert parse_currency("n/a") is None

    def test_dash_returns_none(self):
        assert parse_currency("-") is None

    def test_empty_string_returns_none(self):
        assert parse_currency("") is None

    def test_non_numeric_string_returns_none(self):
        assert parse_currency("abc") is None

    def test_currency_symbol_only_returns_none(self):
        assert parse_currency("€") is None

    # --- Type ---
    def test_result_type_is_float(self):
        assert isinstance(parse_currency(1000), float)


# ── safe_int() ───────────────────────────────────────────────────────────────────

class TestSafeInt:
    def test_int_value(self):
        assert safe_int(483) == 483

    def test_float_truncates(self):
        assert safe_int(483.9) == 483

    def test_string_integer(self):
        assert safe_int("483") == 483

    def test_string_float(self):
        assert safe_int("483.7") == 483

    def test_string_with_comma(self):
        assert safe_int("1,234") == 1234

    def test_string_with_leading_trailing_space(self):
        assert safe_int("  100  ") == 100

    def test_zero(self):
        assert safe_int(0) == 0

    def test_none_returns_none(self):
        assert safe_int(None) is None

    def test_float_nan_returns_none(self):
        assert safe_int(float("nan")) is None

    def test_invalid_string_returns_none(self):
        assert safe_int("abc") is None

    def test_empty_string_returns_none(self):
        assert safe_int("") is None

    def test_result_type_is_int(self):
        assert isinstance(safe_int(5), int)

    def test_negative_value(self):
        assert safe_int(-10) == -10

    def test_large_value(self):
        assert safe_int(1_000_000) == 1_000_000


# ── safe_float() ─────────────────────────────────────────────────────────────────

class TestSafeFloat:
    def test_float_value(self):
        assert safe_float(3.14) == 3.14

    def test_integer_cast(self):
        assert safe_float(5) == 5.0

    def test_string_float(self):
        assert safe_float("3.14") == 3.14

    def test_string_integer(self):
        assert safe_float("100") == 100.0

    def test_string_with_comma(self):
        assert safe_float("1,234.5") == 1234.5

    def test_string_with_leading_trailing_space(self):
        assert safe_float("  5.5  ") == 5.5

    def test_zero(self):
        assert safe_float(0) == 0.0

    def test_none_returns_none(self):
        assert safe_float(None) is None

    def test_float_nan_returns_none(self):
        assert safe_float(float("nan")) is None

    def test_invalid_string_returns_none(self):
        assert safe_float("abc") is None

    def test_empty_string_returns_none(self):
        assert safe_float("") is None

    def test_result_type_is_float(self):
        assert isinstance(safe_float(5), float)

    def test_negative_value(self):
        assert safe_float(-3.14) == -3.14

    def test_scientific_notation(self):
        result = safe_float("1.5e6")
        assert result == 1_500_000.0
