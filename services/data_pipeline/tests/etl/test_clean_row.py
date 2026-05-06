"""
Tests for ETL _clean_row() methods — pure data transformation, no database required.

Each ETL class is tested by directly calling _clean_row(raw_dict) with a MagicMock db.
The _find_duplicate / _insert_record / _update_record methods are not called here;
those require DB integration tests.

Skipped if python_slugify is not installed (required by pipeline.cleaning.text).
"""
from __future__ import annotations

import pytest

try:
    from pipeline.etl.hotels import HotelETL
    from pipeline.etl.market import MarketSnapshotETL
    from pipeline.etl.transactions import TransactionETL
    from pipeline.etl.base import alias
    HAS_ETL = True
except ImportError:
    HAS_ETL = False

pytestmark = pytest.mark.skipif(not HAS_ETL, reason="ETL deps not installed")


# ── alias() utility ──────────────────────────────────────────────────────────────

class TestAlias:
    def test_renames_key(self):
        result = alias({"name": "Hotel Arts", "city": "Barcelona"}, {"name": "asset_name"})
        assert result == {"asset_name": "Hotel Arts", "city": "Barcelona"}

    def test_does_not_overwrite_existing_target(self):
        # If target key already exists, source key is not renamed
        result = alias(
            {"name": "From Name", "asset_name": "Already There"},
            {"name": "asset_name"},
        )
        assert result["asset_name"] == "Already There"
        assert "name" in result

    def test_no_match_unchanged(self):
        raw = {"city": "Barcelona", "keys": 100}
        result = alias(raw, {"name": "asset_name"})
        assert result == raw

    def test_multiple_aliases(self):
        raw = {"total_keys": 100, "year_built": 1994}
        result = alias(raw, {"total_keys": "keys", "year_built": "opening_year"})
        assert "keys" in result
        assert "opening_year" in result

    def test_source_key_removed_after_rename(self):
        result = alias({"name": "Hotel Arts"}, {"name": "asset_name"})
        assert "name" not in result
        assert "asset_name" in result


# ── HotelETL._clean_row() ────────────────────────────────────────────────────────

@pytest.fixture
def hotel_etl(mock_db):
    return HotelETL(mock_db)


class TestHotelCleanRow:
    def test_valid_minimal_row(self, hotel_etl):
        cleaned, errors = hotel_etl._clean_row({
            "asset_name": "Hotel Arts Barcelona",
            "city": "Barcelona",
            "keys": 483,
        })
        assert errors == []
        assert cleaned["asset_name"] == "Hotel Arts Barcelona"
        assert cleaned["city"] == "Barcelona"
        assert cleaned["keys"] == 483

    def test_column_alias_name_to_asset_name(self, hotel_etl):
        cleaned, errors = hotel_etl._clean_row({
            "name": "Hotel Arts Barcelona",
            "city": "Barcelona",
            "keys": 100,
        })
        assert errors == []
        assert cleaned["asset_name"] == "Hotel Arts Barcelona"

    def test_column_alias_total_keys_to_keys(self, hotel_etl):
        cleaned, errors = hotel_etl._clean_row({
            "asset_name": "Test Hotel",
            "city": "Madrid",
            "total_keys": 200,
        })
        assert errors == []
        assert cleaned["keys"] == 200

    def test_column_alias_year_built_to_opening_year(self, hotel_etl):
        cleaned, errors = hotel_etl._clean_row({
            "asset_name": "Test Hotel",
            "city": "Madrid",
            "keys": 100,
            "year_built": 1990,
        })
        assert errors == []
        assert cleaned["opening_year"] == 1990

    def test_hotel_name_alias_resolved(self, hotel_etl):
        cleaned, errors = hotel_etl._clean_row({
            "asset_name": "Ritz-Carlton Barcelona",
            "city": "Barcelona",
            "keys": 100,
        })
        assert errors == []
        assert cleaned["asset_name"] == "Hotel Arts Barcelona"

    def test_operator_normalized(self, hotel_etl):
        cleaned, errors = hotel_etl._clean_row({
            "asset_name": "Hotel Test",
            "city": "Barcelona",
            "keys": 100,
            "operator": "W Hotels",
        })
        assert errors == []
        assert cleaned["operator"] == "Marriott International"

    def test_submarket_normalized(self, hotel_etl):
        cleaned, errors = hotel_etl._clean_row({
            "asset_name": "Hotel Test",
            "city": "Barcelona",
            "keys": 100,
            "submarket": "Barcelona City Center",
        })
        assert errors == []
        assert cleaned["submarket"] == "Barcelona CBD"

    def test_city_normalized(self, hotel_etl):
        cleaned, errors = hotel_etl._clean_row({
            "asset_name": "Hotel Test",
            "city": "malaga",
            "keys": 100,
        })
        assert errors == []
        assert cleaned["city"] == "Málaga"

    def test_country_normalized(self, hotel_etl):
        cleaned, errors = hotel_etl._clean_row({
            "asset_name": "Hotel Test",
            "city": "Barcelona",
            "keys": 100,
            "country": "Spain",
        })
        assert errors == []
        assert cleaned["country"] == "ES"

    def test_country_defaults_to_es(self, hotel_etl):
        cleaned, errors = hotel_etl._clean_row({
            "asset_name": "Hotel Test",
            "city": "Barcelona",
            "keys": 100,
        })
        assert errors == []
        assert cleaned["country"] == "ES"

    def test_chain_scale_normalized(self, hotel_etl):
        cleaned, errors = hotel_etl._clean_row({
            "asset_name": "Hotel Test",
            "city": "Barcelona",
            "keys": 100,
            "chain_scale": "Upper Upscale",
        })
        assert errors == []
        assert cleaned["chain_scale"] == "upper_upscale"

    def test_status_normalized(self, hotel_etl):
        cleaned, errors = hotel_etl._clean_row({
            "asset_name": "Hotel Test",
            "city": "Barcelona",
            "keys": 100,
            "status": "Active",
        })
        assert errors == []
        assert cleaned["status"] == "operating"

    def test_status_defaults_to_operating(self, hotel_etl):
        cleaned, errors = hotel_etl._clean_row({
            "asset_name": "Hotel Test",
            "city": "Barcelona",
            "keys": 100,
        })
        assert errors == []
        assert cleaned["status"] == "operating"

    def test_star_rating_parsed(self, hotel_etl):
        cleaned, errors = hotel_etl._clean_row({
            "asset_name": "Hotel Test",
            "city": "Barcelona",
            "keys": 100,
            "star_rating": "5.0",
        })
        assert errors == []
        assert cleaned["star_rating"] == 5.0

    def test_numeric_keys_parsed(self, hotel_etl):
        cleaned, errors = hotel_etl._clean_row({
            "asset_name": "Hotel Test",
            "city": "Barcelona",
            "keys": "483",
        })
        assert errors == []
        assert cleaned["keys"] == 483

    def test_missing_asset_name_error(self, hotel_etl):
        cleaned, errors = hotel_etl._clean_row({
            "city": "Barcelona",
            "keys": 100,
        })
        assert any(e.column == "asset_name" for e in errors)

    def test_empty_asset_name_error(self, hotel_etl):
        cleaned, errors = hotel_etl._clean_row({
            "asset_name": "",
            "city": "Barcelona",
            "keys": 100,
        })
        assert any(e.column == "asset_name" for e in errors)

    def test_missing_city_error(self, hotel_etl):
        cleaned, errors = hotel_etl._clean_row({
            "asset_name": "Hotel Test",
            "keys": 100,
        })
        assert any(e.column == "city" for e in errors)

    def test_missing_keys_error(self, hotel_etl):
        cleaned, errors = hotel_etl._clean_row({
            "asset_name": "Hotel Test",
            "city": "Barcelona",
        })
        assert any(e.column == "keys" for e in errors)

    def test_multiple_missing_fields_produce_multiple_errors(self, hotel_etl):
        cleaned, errors = hotel_etl._clean_row({})
        assert len(errors) >= 3

    def test_optional_fields_none_when_absent(self, hotel_etl):
        cleaned, errors = hotel_etl._clean_row({
            "asset_name": "Hotel Test",
            "city": "Barcelona",
            "keys": 100,
        })
        assert errors == []
        assert cleaned["brand"] is None
        assert cleaned["operator"] is None
        assert cleaned["latitude"] is None
        assert cleaned["longitude"] is None

    def test_sentinel_nan_value_cleaned(self, hotel_etl):
        cleaned, errors = hotel_etl._clean_row({
            "asset_name": "Hotel Test",
            "city": "Barcelona",
            "keys": 100,
            "owner": "nan",
        })
        assert errors == []
        assert cleaned["owner"] is None


# ── TransactionETL._clean_row() ──────────────────────────────────────────────────

@pytest.fixture
def transaction_etl(mock_db):
    return TransactionETL(mock_db)


class TestTransactionCleanRow:
    def test_valid_minimal_row(self, transaction_etl):
        cleaned, errors = transaction_etl._clean_row({
            "property_name": "W Hotel Barcelona",
            "city": "Barcelona",
            "sale_date": "2023-06-15",
            "sale_price": 180_000_000,
            "num_rooms": 473,
        })
        assert errors == []
        assert cleaned["property_name"] is not None
        assert cleaned["city"] == "Barcelona"
        assert cleaned["transaction_date"] == "2023-06-15"

    def test_date_alias_sale_date(self, transaction_etl):
        cleaned, errors = transaction_etl._clean_row({
            "property_name": "Test Hotel",
            "city": "Madrid",
            "sale_date": "2022-01-15",
            "sale_price": 50_000_000,
            "num_rooms": 100,
        })
        assert errors == []
        assert cleaned["transaction_date"] == "2022-01-15"

    def test_date_alias_close_date(self, transaction_etl):
        cleaned, errors = transaction_etl._clean_row({
            "property_name": "Test Hotel",
            "city": "Madrid",
            "close_date": "2022-01-15",
            "sale_price": 50_000_000,
            "num_rooms": 100,
        })
        assert errors == []
        assert cleaned["transaction_date"] == "2022-01-15"

    def test_date_various_formats_normalized(self, transaction_etl):
        for date_str in ("2023-06-15", "06/15/2023", "2023/06/15"):
            cleaned, errors = transaction_etl._clean_row({
                "property_name": "Test Hotel",
                "city": "Madrid",
                "sale_date": date_str,
                "num_rooms": 100,
            })
            assert cleaned["transaction_date"] == "2023-06-15", f"Failed for {date_str!r}"

    def test_invalid_date_produces_error(self, transaction_etl):
        cleaned, errors = transaction_etl._clean_row({
            "property_name": "Test Hotel",
            "city": "Madrid",
            "sale_date": "not-a-date",
            "num_rooms": 100,
        })
        assert any(e.column == "transaction_date" for e in errors)

    def test_hotel_name_normalized(self, transaction_etl):
        cleaned, errors = transaction_etl._clean_row({
            "property_name": "W Hotel Barcelona",
            "city": "Barcelona",
            "sale_date": "2023-01-01",
            "num_rooms": 100,
        })
        assert errors == []
        assert cleaned["property_name"] == "Hotel W Barcelona"

    def test_price_alias_sale_price(self, transaction_etl):
        cleaned, errors = transaction_etl._clean_row({
            "property_name": "Test Hotel",
            "city": "Madrid",
            "sale_date": "2023-01-01",
            "sale_price": "€50,000,000",
            "num_rooms": 100,
        })
        assert errors == []
        assert cleaned["transaction_price"] == 50_000_000.0

    def test_cap_rate_parsed_from_percent(self, transaction_etl):
        cleaned, errors = transaction_etl._clean_row({
            "property_name": "Test Hotel",
            "city": "Madrid",
            "sale_date": "2023-01-01",
            "num_rooms": 100,
            "cap_rate": "5.5%",
        })
        assert errors == []
        assert cleaned["cap_rate"] == pytest.approx(0.055, abs=1e-4)

    def test_missing_property_name_error(self, transaction_etl):
        cleaned, errors = transaction_etl._clean_row({
            "city": "Madrid",
            "sale_date": "2023-01-01",
        })
        assert any(e.column == "property_name" for e in errors)

    def test_missing_city_error(self, transaction_etl):
        cleaned, errors = transaction_etl._clean_row({
            "property_name": "Test Hotel",
            "sale_date": "2023-01-01",
        })
        assert any(e.column == "city" for e in errors)

    def test_missing_date_error(self, transaction_etl):
        cleaned, errors = transaction_etl._clean_row({
            "property_name": "Test Hotel",
            "city": "Madrid",
        })
        assert any(e.column == "transaction_date" for e in errors)

    def test_rooms_alias_num_rooms(self, transaction_etl):
        cleaned, errors = transaction_etl._clean_row({
            "property_name": "Test Hotel",
            "city": "Madrid",
            "sale_date": "2023-01-01",
            "num_rooms": 250,
        })
        assert errors == []
        assert cleaned["total_keys"] == 250


# ── MarketSnapshotETL._clean_row() ───────────────────────────────────────────────

@pytest.fixture
def market_etl(mock_db):
    return MarketSnapshotETL(mock_db)


class TestMarketCleanRow:
    def test_valid_annual_row(self, market_etl):
        cleaned, errors = market_etl._clean_row({
            "submarket": "Barcelona CBD",
            "city": "Barcelona",
            "year": 2023,
            "occupancy": "72.5%",
            "adr": 245.50,
            "revpar": 178.0,
        })
        assert errors == []
        assert cleaned["submarket"] == "Barcelona CBD"
        assert cleaned["city"] == "Barcelona"
        assert cleaned["period_year"] == 2023
        assert cleaned["period_type"] == "annual"

    def test_period_alias_year(self, market_etl):
        cleaned, errors = market_etl._clean_row({
            "submarket": "Madrid CBD",
            "city": "Madrid",
            "year": 2022,
        })
        assert errors == []
        assert cleaned["period_year"] == 2022

    def test_period_alias_period(self, market_etl):
        cleaned, errors = market_etl._clean_row({
            "submarket": "Madrid CBD",
            "city": "Madrid",
            "period": 2022,
        })
        assert errors == []
        assert cleaned["period_year"] == 2022

    def test_monthly_period_detection(self, market_etl):
        cleaned, errors = market_etl._clean_row({
            "submarket": "Barcelona CBD",
            "city": "Barcelona",
            "year": 2023,
            "period_month": 6,
        })
        assert errors == []
        assert cleaned["period_month"] == 6
        assert cleaned["period_type"] == "monthly"

    def test_annual_period_when_no_month(self, market_etl):
        cleaned, errors = market_etl._clean_row({
            "submarket": "Barcelona CBD",
            "city": "Barcelona",
            "year": 2023,
        })
        assert errors == []
        assert cleaned["period_month"] is None
        assert cleaned["period_type"] == "annual"

    def test_occupancy_alias(self, market_etl):
        cleaned, errors = market_etl._clean_row({
            "submarket": "Barcelona CBD",
            "city": "Barcelona",
            "year": 2023,
            "occupancy": "71.4%",
        })
        assert errors == []
        assert cleaned["market_occupancy"] == pytest.approx(0.714, abs=1e-4)

    def test_occupancy_alias_occ(self, market_etl):
        cleaned, errors = market_etl._clean_row({
            "submarket": "Barcelona CBD",
            "city": "Barcelona",
            "year": 2023,
            "occ": "68.0%",
        })
        assert errors == []
        assert cleaned["market_occupancy"] == pytest.approx(0.68, abs=1e-4)

    def test_submarket_normalized(self, market_etl):
        cleaned, errors = market_etl._clean_row({
            "submarket": "Barcelona City Center",
            "city": "Barcelona",
            "year": 2023,
        })
        assert errors == []
        assert cleaned["submarket"] == "Barcelona CBD"

    def test_city_inferred_from_submarket_when_missing(self, market_etl):
        cleaned, errors = market_etl._clean_row({
            "submarket": "Madrid CBD",
            "year": 2023,
        })
        assert errors == []
        # city is inferred via normalize_market(submarket)
        assert cleaned["city"] is not None

    def test_missing_submarket_error(self, market_etl):
        cleaned, errors = market_etl._clean_row({
            "city": "Barcelona",
            "year": 2023,
        })
        assert any(e.column == "submarket" for e in errors)

    def test_missing_period_year_error(self, market_etl):
        cleaned, errors = market_etl._clean_row({
            "submarket": "Barcelona CBD",
            "city": "Barcelona",
        })
        assert any(e.column == "period_year" for e in errors)

    def test_revpar_growth_parsed(self, market_etl):
        cleaned, errors = market_etl._clean_row({
            "submarket": "Barcelona CBD",
            "city": "Barcelona",
            "year": 2023,
            "revpar_change": "8.5%",
        })
        assert errors == []
        assert cleaned["revpar_growth_yoy"] == pytest.approx(0.085, abs=1e-4)

    def test_source_defaults_to_import(self, market_etl):
        cleaned, errors = market_etl._clean_row({
            "submarket": "Barcelona CBD",
            "city": "Barcelona",
            "year": 2023,
        })
        assert errors == []
        assert cleaned["source"] == "import"
