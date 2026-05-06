"""
Tests for pipeline.cleaning.text — clean_string, chain scale, asset type, status.

Skipped entirely if python_slugify is not installed.
"""
from __future__ import annotations

import pytest

try:
    from pipeline.cleaning.text import (
        clean_string,
        normalize_asset_type,
        normalize_chain_scale,
        normalize_status,
    )
    HAS_TEXT = True
except ImportError:
    HAS_TEXT = False

pytestmark = pytest.mark.skipif(not HAS_TEXT, reason="python_slugify not installed")


# ── clean_string() ───────────────────────────────────────────────────────────────

class TestCleanString:
    def test_basic_string(self):
        assert clean_string("Hotel Arts Barcelona") == "Hotel Arts Barcelona"

    def test_leading_trailing_whitespace_stripped(self):
        assert clean_string("  Hotel Arts  ") == "Hotel Arts"

    def test_internal_whitespace_collapsed(self):
        assert clean_string("Hotel   Arts   Barcelona") == "Hotel Arts Barcelona"

    def test_max_length_truncation(self):
        result = clean_string("A" * 300, max_length=255)
        assert len(result) == 255

    def test_max_length_none_no_truncation(self):
        s = "A" * 300
        result = clean_string(s, max_length=None)
        assert result == s

    def test_none_returns_none(self):
        assert clean_string(None) is None

    def test_empty_string_returns_none(self):
        assert clean_string("") is None

    def test_sentinel_nan_returns_none(self):
        assert clean_string("nan") is None
        assert clean_string("NaN") is None
        assert clean_string("NAN") is None

    def test_sentinel_none_returns_none(self):
        assert clean_string("none") is None
        assert clean_string("None") is None

    def test_sentinel_null_returns_none(self):
        assert clean_string("null") is None
        assert clean_string("NULL") is None

    def test_sentinel_na_returns_none(self):
        assert clean_string("n/a") is None
        assert clean_string("N/A") is None

    def test_sentinel_dash_returns_none(self):
        assert clean_string("-") is None

    def test_sentinel_em_dash_returns_none(self):
        assert clean_string("—") is None

    def test_numeric_string_returned(self):
        assert clean_string("12345") == "12345"

    def test_integer_input_converted(self):
        result = clean_string(12345)
        assert result == "12345"

    def test_accented_characters_preserved(self):
        assert clean_string("Meliá Castilla") == "Meliá Castilla"

    def test_tab_collapsed_to_space(self):
        assert clean_string("Hotel\tArts") == "Hotel Arts"

    def test_newline_collapsed_to_space(self):
        assert clean_string("Hotel\nArts") == "Hotel Arts"


# ── normalize_chain_scale() ──────────────────────────────────────────────────────

CHAIN_SCALE_CASES = [
    ("luxury",          "luxury"),
    ("Luxury",          "luxury"),
    ("LUXURY",          "luxury"),
    ("upper upscale",   "upper_upscale"),
    ("upper-upscale",   "upper_upscale"),
    ("upper_upscale",   "upper_upscale"),
    ("Upper Upscale",   "upper_upscale"),
    ("upscale",         "upscale"),
    ("Upscale",         "upscale"),
    ("upper midscale",  "upper_midscale"),
    ("upper-midscale",  "upper_midscale"),
    ("midscale",        "midscale"),
    ("economy",         "economy"),
    ("budget",          "economy"),
    ("select service",  "select"),
    ("select-service",  "select"),
    ("select",          "select"),
    ("extended stay",   "extended_stay"),
    ("extended-stay",   "extended_stay"),
]


class TestNormalizeChainScale:
    @pytest.mark.parametrize("raw,expected", CHAIN_SCALE_CASES)
    def test_known_values(self, raw, expected):
        assert normalize_chain_scale(raw) == expected

    def test_none_returns_none(self):
        assert normalize_chain_scale(None) is None

    def test_empty_returns_none(self):
        assert normalize_chain_scale("") is None

    def test_unknown_lowercased(self):
        # Unknown values are lowercased and returned
        assert normalize_chain_scale("SomeNewScale") == "somenewscale"


# ── normalize_asset_type() ───────────────────────────────────────────────────────

ASSET_TYPE_CASES = [
    ("full service",            "full_service"),
    ("full-service",            "full_service"),
    ("full_service",            "full_service"),
    ("Full Service",            "full_service"),
    ("select service",          "select_service"),
    ("select-service",          "select_service"),
    ("extended stay",           "extended_stay"),
    ("extended-stay",           "extended_stay"),
    ("resort",                  "resort"),
    ("Resort",                  "resort"),
    ("boutique",                "boutique"),
    ("apart hotel",             "apart_hotel"),
    ("apart-hotel",             "apart_hotel"),
    ("aparthotel",              "apart_hotel"),
    ("Aparthotel",              "apart_hotel"),
    ("serviced apartment",      "apart_hotel"),
    ("serviced apartments",     "apart_hotel"),
]


class TestNormalizeAssetType:
    @pytest.mark.parametrize("raw,expected", ASSET_TYPE_CASES)
    def test_known_values(self, raw, expected):
        assert normalize_asset_type(raw) == expected

    def test_none_returns_none(self):
        assert normalize_asset_type(None) is None

    def test_empty_returns_none(self):
        assert normalize_asset_type("") is None

    def test_unknown_lowercased(self):
        assert normalize_asset_type("Casino Hotel") == "casino hotel"


# ── normalize_status() ───────────────────────────────────────────────────────────

STATUS_CASES = [
    ("active",            "operating"),
    ("open",              "operating"),
    ("operating",         "operating"),
    ("operational",       "operating"),
    ("Active",            "operating"),
    ("Open",              "operating"),
    ("pipeline",          "pipeline"),
    ("under construction","pipeline"),
    ("planned",           "pipeline"),
    ("development",       "pipeline"),
    ("Pipeline",          "pipeline"),
    ("under renovation",  "under_renovation"),
    ("renovation",        "under_renovation"),
    ("under_renovation",  "under_renovation"),
    ("refurbishment",     "under_renovation"),
    ("distressed",        "distressed"),
    ("closed",            "distressed"),
    ("nla",               "distressed"),
]


class TestNormalizeStatus:
    @pytest.mark.parametrize("raw,expected", STATUS_CASES)
    def test_known_values(self, raw, expected):
        assert normalize_status(raw) == expected

    def test_none_returns_default_operating(self):
        assert normalize_status(None) == "operating"

    def test_empty_returns_default(self):
        assert normalize_status("") == "operating"

    def test_custom_default(self):
        assert normalize_status(None, default="pipeline") == "pipeline"

    def test_unknown_value_returns_default(self):
        assert normalize_status("unknown_status") == "operating"

    def test_case_insensitive(self):
        assert normalize_status("ACTIVE") == "operating"
        assert normalize_status("Under Construction") == "pipeline"
