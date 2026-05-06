"""
Tests for pipeline.cleaning.geography — city and country normalization.
"""
from __future__ import annotations

import pytest

from pipeline.cleaning.geography import (
    CITY_CANONICAL,
    COUNTRY_ALIASES,
    normalize_city,
    normalize_country,
)


# ── normalize_city() ─────────────────────────────────────────────────────────────

CITY_CASES = [
    # Spain — exact keys
    ("madrid",             "Madrid"),
    ("barcelona",          "Barcelona"),
    ("valencia",           "Valencia"),
    ("sevilla",            "Sevilla"),
    ("seville",            "Sevilla"),
    ("málaga",             "Málaga"),
    ("malaga",             "Málaga"),
    ("bilbao",             "Bilbao"),
    ("san sebastián",      "San Sebastián"),
    ("san sebastian",      "San Sebastián"),
    ("donostia",           "San Sebastián"),
    ("palma",              "Palma de Mallorca"),
    ("palma de mallorca",  "Palma de Mallorca"),
    ("granada",            "Granada"),
    ("córdoba",            "Córdoba"),
    ("cordoba",            "Córdoba"),
    ("las palmas",         "Las Palmas de Gran Canaria"),
    ("ibiza",              "Ibiza"),
    ("eivissa",            "Ibiza"),
    ("tenerife",           "Santa Cruz de Tenerife"),
    # Europe
    ("london",             "London"),
    ("paris",              "Paris"),
    ("berlin",             "Berlin"),
    ("amsterdam",          "Amsterdam"),
    ("rome",               "Rome"),
    ("roma",               "Rome"),
    ("milan",              "Milan"),
    ("milano",             "Milan"),
    ("lisbon",             "Lisbon"),
    ("lisboa",             "Lisbon"),
    ("vienna",             "Vienna"),
    ("wien",               "Vienna"),
    ("munich",             "Munich"),
    ("münchen",            "Munich"),
    ("zurich",             "Zurich"),
    ("zürich",             "Zurich"),
    # Americas
    ("new york",           "New York"),
    ("nyc",                "New York"),
    ("miami",              "Miami"),
    ("las vegas",          "Las Vegas"),
    ("mexico city",        "Mexico City"),
    ("cdmx",               "Mexico City"),
    ("são paulo",          "São Paulo"),
    ("sao paulo",          "São Paulo"),
    # Asia / MENA
    ("dubai",              "Dubai"),
    ("tokyo",              "Tokyo"),
    ("singapore",          "Singapore"),
    ("hong kong",          "Hong Kong"),
]


class TestNormalizeCity:
    @pytest.mark.parametrize("raw,expected", CITY_CASES)
    def test_known_cities(self, raw, expected):
        assert normalize_city(raw) == expected

    def test_case_insensitive(self):
        assert normalize_city("BARCELONA") == "Barcelona"
        assert normalize_city("Barcelona") == "Barcelona"

    def test_accent_via_dict_lookup(self):
        # "málaga" is a key in CITY_CANONICAL
        assert normalize_city("Málaga") == "Málaga"
        assert normalize_city("MÁLAGA") == "Málaga"

    def test_unknown_city_title_cased(self):
        result = normalize_city("some unknown city")
        assert result == "Some Unknown City"

    def test_unknown_city_with_accents_title_cased(self):
        result = normalize_city("ciudad nueva")
        assert result == "Ciudad Nueva"

    def test_leading_trailing_whitespace_stripped(self):
        assert normalize_city("  Barcelona  ") == "Barcelona"

    def test_none_returns_none(self):
        assert normalize_city(None) is None

    def test_empty_string_returns_none(self):
        assert normalize_city("") is None

    def test_city_canonical_dict_has_no_empty_values(self):
        bad = [k for k, v in CITY_CANONICAL.items() if not v or not v.strip()]
        assert bad == []

    def test_city_canonical_keys_are_lowercase(self):
        bad = [k for k in CITY_CANONICAL if k != k.lower()]
        assert bad == [], f"Keys not lowercase: {bad}"

    def test_alternative_spanish_city_names(self):
        assert normalize_city("donostia-san sebastián") == "San Sebastián"
        assert normalize_city("la coruña") == "A Coruña"

    def test_european_city_native_names(self):
        assert normalize_city("københavn") == "Copenhagen"
        assert normalize_city("warszawa") == "Warsaw"
        assert normalize_city("praha") == "Prague"

    def test_latin_american_cities(self):
        assert normalize_city("bogotá") == "Bogotá"
        assert normalize_city("bogota") == "Bogotá"
        assert normalize_city("ciudad de méxico") == "Mexico City"

    def test_middle_eastern_cities(self):
        assert normalize_city("abu dhabi") == "Abu Dhabi"
        assert normalize_city("cairo") == "Cairo"
        assert normalize_city("el cairo") == "Cairo"


# ── normalize_country() ──────────────────────────────────────────────────────────

COUNTRY_CASES = [
    # Spain
    ("España",      "ES"),
    ("Spain",       "ES"),
    ("espana",      "ES"),
    ("es",          "ES"),
    ("ES",          "ES"),
    # Other common countries
    ("France",      "FR"),
    ("fr",          "FR"),
    ("Francia",     "FR"),
    ("Germany",     "DE"),
    ("Alemania",    "DE"),
    ("de",          "DE"),
    ("Deutschland", "DE"),
    ("United Kingdom", "GB"),
    ("UK",          "GB"),
    ("England",     "GB"),
    ("Portugal",    "PT"),
    ("pt",          "PT"),
    ("Italy",       "IT"),
    ("Italia",      "IT"),
    ("it",          "IT"),
    ("United States", "US"),
    ("USA",         "US"),
    ("us",          "US"),
    ("Netherlands", "NL"),
    ("Holanda",     "NL"),
    ("Japan",       "JP"),
    ("Japon",       "JP"),
    ("Australia",   "AU"),
    ("Morocco",     "MA"),
    ("Marruecos",   "MA"),
]


class TestNormalizeCountry:
    @pytest.mark.parametrize("raw,expected", COUNTRY_CASES)
    def test_known_countries(self, raw, expected):
        assert normalize_country(raw) == expected

    def test_default_is_es(self):
        assert normalize_country(None) == "ES"
        assert normalize_country("") == "ES"

    def test_custom_default(self):
        assert normalize_country(None, "FR") == "FR"
        assert normalize_country("", "US") == "US"

    def test_unknown_uppercased_truncated(self):
        # Unknown → raw.strip().upper()[:3]
        assert normalize_country("Xyz") == "XYZ"
        assert normalize_country("xyz123") == "XYZ"

    def test_unknown_long_string_truncated_to_3(self):
        result = normalize_country("SomeUnknownCountry")
        assert len(result) <= 3

    def test_case_insensitive_lookup(self):
        assert normalize_country("FRANCE") == "FR"
        assert normalize_country("france") == "FR"

    def test_country_aliases_has_no_empty_values(self):
        bad = [k for k, v in COUNTRY_ALIASES.items() if not v or not v.strip()]
        assert bad == []

    def test_iso_two_letter_codes_resolve(self):
        for code in ["es", "fr", "de", "gb", "it", "pt", "nl", "us"]:
            result = normalize_country(code)
            assert len(result) == 2
            assert result == result.upper()

    def test_whitespace_stripped_before_lookup(self):
        assert normalize_country("  Spain  ") == "ES"
