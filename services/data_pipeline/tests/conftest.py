"""
Shared pytest fixtures for the data_pipeline test suite.

Required packages:
    pip install pytest pandas pydantic structlog python-slugify
    pip install pytest-benchmark   # for tests/test_benchmarks.py
"""
from __future__ import annotations

from unittest.mock import MagicMock

import pytest


@pytest.fixture
def mock_db():
    """Minimal SQLAlchemy AsyncSession mock for ETL _clean_row tests."""
    return MagicMock()


@pytest.fixture
def minimal_hotel_row():
    return {
        "asset_name": "Hotel Arts Barcelona",
        "city": "Barcelona",
        "country": "ES",
        "keys": 483,
    }


@pytest.fixture
def full_hotel_row():
    return {
        "asset_name": "Hotel Arts Barcelona",
        "city": "Barcelona",
        "country": "ES",
        "keys": 483,
        "operator": "Ritz-Carlton",
        "star_rating": 5.0,
        "chain_scale": "Luxury",
        "submarket": "Barcelona Beach",
        "opening_year": 1994,
        "status": "operating",
    }


@pytest.fixture
def minimal_transaction_row():
    return {
        "property_name": "W Hotel Barcelona",
        "city": "Barcelona",
        "sale_date": "2023-06-15",
        "sale_price": 180_000_000,
        "num_rooms": 473,
    }


@pytest.fixture
def minimal_market_row():
    return {
        "submarket": "Barcelona CBD",
        "city": "Barcelona",
        "year": 2023,
        "occupancy": "72.5%",
        "adr": 245.50,
        "revpar": 178.0,
    }
