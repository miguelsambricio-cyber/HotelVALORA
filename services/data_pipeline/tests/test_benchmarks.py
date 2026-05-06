"""
Performance benchmarks for the normalization engine.

Requires pytest-benchmark:
    pip install pytest-benchmark

Run benchmarks:
    pytest tests/test_benchmarks.py -v --benchmark-sort=mean

Skip benchmarks in normal test runs:
    pytest tests/ -m "not benchmark"
"""
from __future__ import annotations

import time

import pytest

from pipeline.cleaning.names import (
    OPERATOR_CANONICAL,
    SUBMARKET_ALIASES,
    _key,
    hotel_dedup_key,
    normalize_hotel_name,
    normalize_operator,
    normalize_submarket,
)

pytestmark = pytest.mark.benchmark

# ── Synthetic datasets ────────────────────────────────────────────────────────────

_VARIED_NAMES = [
    "Hotel Arts Barcelona",
    "Gran Hotel Miramar",
    "Meliá Castilla",
    "NH Collection Madrid Eurobuilding",
    "W Barcelona",
    "Mandarin Oriental Barcelona",
    "Four Seasons Hotel Barcelona",
    "Hospes Palacio del Bailío",
    "Iberostar Las Letras Gran Via",
    "Palacio de los Duques Gran Meliá",
    "Hotel Alfonso XIII",
    "AC Hotel Málaga Palacio",
    "Hilton Diagonal Mar Barcelona",
    "Grand Hotel Central",
    "Hotel Casa Fuster",
]

_VARIED_OPERATORS = list(OPERATOR_CANONICAL.keys())
_VARIED_SUBMARKETS = list(SUBMARKET_ALIASES.keys())

# Simulates a Barcelona city portfolio of 350 hotel assets
_BCN_PORTFOLIO = [
    (f"Hotel Barcelona Asset {i}", "Barcelona") for i in range(350)
]


# ── _key() throughput ─────────────────────────────────────────────────────────────

def test_key_throughput(benchmark):
    """_key() on 10,000 varied inputs. Target: < 1 second."""
    inputs = (_VARIED_NAMES * 667)[:10_000]
    benchmark(lambda: [_key(s) for s in inputs])


def test_key_accent_heavy(benchmark):
    """_key() on accent-heavy Spanish strings."""
    accented = [
        "Meliá Castilla Madrid",
        "Córdoba Histórica",
        "San Sebastián Norte",
        "Málaga Puerto Viejo",
        "Señoría de Bilbao",
    ] * 2000
    benchmark(lambda: [_key(s) for s in accented])


# ── hotel_dedup_key() throughput ──────────────────────────────────────────────────

def test_dedup_key_throughput(benchmark):
    """hotel_dedup_key() on 10,000 (name, city) pairs. Target: < 2 seconds."""
    pairs = [
        ("Hotel Arts Barcelona", "Barcelona"),
        ("Gran Hotel Miramar", "Málaga"),
        ("Meliá Castilla", "Madrid"),
        ("W Barcelona", "Barcelona"),
        ("NH Collection Madrid Eurobuilding", "Madrid"),
    ] * 2000
    benchmark(lambda: [hotel_dedup_key(n, c) for n, c in pairs])


def test_dedup_key_prefix_variants(benchmark):
    """hotel_dedup_key() on names with each prefix type."""
    pairs = [
        ("Hotel Arts Barcelona", "Barcelona"),
        ("Gran Hotel Miramar", "Málaga"),
        ("Grand Hotel Central", "Barcelona"),
        ("Hotel Palacio Real", "Madrid"),
        ("Boutique Hotel Casa Fuster", "Barcelona"),
        ("The Hotel Arts", "Barcelona"),
        ("Palace Hotel Arts", "Barcelona"),
    ] * 1429
    benchmark(lambda: [hotel_dedup_key(n, c) for n, c in pairs])


# ── Dict lookup throughput ────────────────────────────────────────────────────────

def test_operator_normalization_throughput(benchmark):
    """normalize_operator() across all ~241 known alias keys. Repeats to 10k calls."""
    inputs = (_VARIED_OPERATORS * (10_000 // len(_VARIED_OPERATORS) + 1))[:10_000]
    benchmark(lambda: [normalize_operator(op) for op in inputs])


def test_submarket_normalization_throughput(benchmark):
    """normalize_submarket() across all ~146 known alias keys."""
    inputs = (_VARIED_SUBMARKETS * (10_000 // len(_VARIED_SUBMARKETS) + 1))[:10_000]
    benchmark(lambda: [normalize_submarket(s) for s in inputs])


def test_hotel_name_normalization_throughput(benchmark):
    """normalize_hotel_name() — mix of alias hits and passthroughs."""
    known = [
        "arts hotel barcelona",
        "ritz-carlton barcelona",
        "w hotel barcelona",
        "nh collection eurobuilding",
        "palacio del bailio",
        "melia castilla",
    ]
    unknown = [
        "Random Hotel Name",
        "Another Unknown Property",
        "Boutique Garden Hotel",
    ]
    inputs = (known * 1200 + unknown * 1333)[:10_000]
    benchmark(lambda: [normalize_hotel_name(n) for n in inputs])


# ── Dedup scan simulation ─────────────────────────────────────────────────────────

def test_dedup_scan_full_city_500_rows(benchmark):
    """
    Simulates HotelETL._find_duplicate() for 500 incoming Barcelona rows
    against a 350-asset Barcelona portfolio — the expected O(n) Python scan.

    Total comparisons: 500 × 350 = 175,000 hotel_dedup_key() calls.
    Target: < 3 seconds.
    """
    incoming = [("Hotel Arts Barcelona", "Barcelona")] * 500

    def scan():
        for name, city in incoming:
            incoming_key = hotel_dedup_key(name, city)
            for existing_name, existing_city in _BCN_PORTFOLIO:
                if hotel_dedup_key(existing_name, existing_city) == incoming_key:
                    break

    benchmark(scan)


def test_dedup_scan_worst_case_no_match(benchmark):
    """
    Worst-case scan: incoming hotel never matches any existing one,
    so the inner loop always completes fully (350 comparisons per row, 100 rows).
    """
    incoming = [("Completely New Hotel XYZ999", "Barcelona")] * 100

    def scan():
        for name, city in incoming:
            incoming_key = hotel_dedup_key(name, city)
            for existing_name, existing_city in _BCN_PORTFOLIO:
                if hotel_dedup_key(existing_name, existing_city) == incoming_key:
                    break

    benchmark(scan)


# ── Module import time (one-shot, not benchmark fixture) ─────────────────────────

def test_names_module_import_time():
    """names.py (with all ~400 dict entries) must import in under 200 ms."""
    import importlib
    import sys

    # Remove cached module so import is fresh
    sys.modules.pop("pipeline.cleaning.names", None)

    start = time.perf_counter()
    importlib.import_module("pipeline.cleaning.names")
    elapsed_ms = (time.perf_counter() - start) * 1000

    assert elapsed_ms < 200, f"Module import took {elapsed_ms:.1f} ms (limit: 200 ms)"


# ── Idempotency at scale ──────────────────────────────────────────────────────────

def test_normalize_operator_idempotent_at_scale(benchmark):
    """Applying normalize_operator() twice produces the same result (idempotent)."""
    inputs = (_VARIED_OPERATORS * 50)[:5000]

    def double_pass():
        for op in inputs:
            first = normalize_operator(op)
            second = normalize_operator(first) if first else first
            assert first == second

    benchmark(double_pass)


def test_dedup_key_idempotent_at_scale(benchmark):
    """hotel_dedup_key() applied to an already-normalized name is stable."""
    pairs = [("Hotel Arts Barcelona", "Barcelona")] * 5000

    def check():
        for name, city in pairs:
            k1 = hotel_dedup_key(name, city)
            # Re-build a name from the key's name part and recompute
            name_part = k1.split("|")[0]
            k2 = hotel_dedup_key(name_part, city)
            # k2 should equal k1 (key of already-stripped name is stable)
            assert k1 == k2

    benchmark(check)
