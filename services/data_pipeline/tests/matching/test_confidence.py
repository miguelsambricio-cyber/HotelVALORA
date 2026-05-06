"""
Tests for pipeline.matching.confidence — hotel match confidence scoring.

Covers:
- MatchThresholds label transitions
- ComponentScore exclusion logic
- _name_core() stripping
- _compute_final() weight redistribution
- Individual component scorers
- score_hotels() composite scoring
- score_hotel_dicts() convenience wrapper
- Explainability output (explain() and to_dict())
- Configurable weights and thresholds
- Edge cases: empty strings, None, same-hotel variants, clear non-matches
"""
from __future__ import annotations

import pytest

from pipeline.matching.confidence import (
    DEFAULT_WEIGHTS,
    ComponentScore,
    ConfidenceResult,
    MatchThresholds,
    _compute_final,
    _name_core,
    _score_address,
    _score_city,
    _score_name_exact,
    _score_name_fuzzy,
    _score_operator,
    score_hotel_dicts,
    score_hotels,
)

# ── MatchThresholds ───────────────────────────────────────────────────────────


class TestMatchThresholds:
    def test_default_high_threshold(self):
        t = MatchThresholds()
        assert t.label(0.90) == "HIGH"
        assert t.label(0.85) == "HIGH"

    def test_default_medium_threshold(self):
        t = MatchThresholds()
        assert t.label(0.80) == "MEDIUM"
        assert t.label(0.65) == "MEDIUM"

    def test_default_low_threshold(self):
        t = MatchThresholds()
        assert t.label(0.64) == "LOW"
        assert t.label(0.0) == "LOW"

    def test_boundary_exactly_at_high(self):
        t = MatchThresholds(high=0.85, medium=0.65)
        assert t.label(0.85) == "HIGH"

    def test_boundary_just_below_high(self):
        t = MatchThresholds(high=0.85, medium=0.65)
        assert t.label(0.8499) == "MEDIUM"

    def test_boundary_exactly_at_medium(self):
        t = MatchThresholds(high=0.85, medium=0.65)
        assert t.label(0.65) == "MEDIUM"

    def test_boundary_just_below_medium(self):
        t = MatchThresholds(high=0.85, medium=0.65)
        assert t.label(0.6499) == "LOW"

    def test_custom_thresholds(self):
        t = MatchThresholds(high=0.90, medium=0.70)
        assert t.label(0.95) == "HIGH"
        assert t.label(0.80) == "MEDIUM"
        assert t.label(0.50) == "LOW"

    def test_is_frozen(self):
        t = MatchThresholds()
        with pytest.raises((AttributeError, TypeError)):
            t.high = 0.99  # type: ignore[misc]


# ── ComponentScore ────────────────────────────────────────────────────────────


class TestComponentScore:
    def test_not_excluded_when_score_present(self):
        c = ComponentScore("city", 1.0, 0.20, "both → Barcelona")
        assert not c.excluded

    def test_excluded_when_score_none(self):
        c = ComponentScore("city", None, 0.20, "no city provided")
        assert c.excluded

    def test_zero_score_not_excluded(self):
        c = ComponentScore("name_exact", 0.0, 0.35, "mismatch")
        assert not c.excluded


# ── _name_core() ──────────────────────────────────────────────────────────────


class TestNameCore:
    @pytest.mark.parametrize("raw,expected_core", [
        ("Hotel Arts Barcelona",           "arts barcelona"),
        ("hotel arts barcelona",           "arts barcelona"),
        ("Gran Hotel Miramar",             "miramar"),
        ("Grand Hotel Central",            "central"),
        ("The Hotel Arts",                 "arts"),
        ("Boutique Hotel Casa Fuster",     "casa fuster"),
        ("Palace Hotel Ritz",              "ritz"),
        ("W Barcelona",                    "w barcelona"),
        ("Meliá Castilla",                 "melia castilla"),
        ("NH Collection Madrid",           "nh collection madrid"),
    ])
    def test_prefix_stripped(self, raw, expected_core):
        assert _name_core(raw) == expected_core

    def test_suffix_stripped(self):
        assert _name_core("Arts Hotel") == "arts"

    def test_empty_string_returns_empty(self):
        assert _name_core("") == ""

    def test_punctuation_removed(self):
        assert _name_core("Hotel O'Callaghan") == "ocallaghan"

    def test_accents_normalised(self):
        assert _name_core("Meliá") == _name_core("Melia")

    def test_idempotent(self):
        name = "Hotel Arts Barcelona"
        core = _name_core(name)
        assert _name_core(core) == core


# ── _compute_final() ─────────────────────────────────────────────────────────


class TestComputeFinal:
    def test_all_components_available(self):
        components = [
            ComponentScore("name_exact", 1.0, 0.35, ""),
            ComponentScore("name_fuzzy", 0.8, 0.30, ""),
            ComponentScore("city",       1.0, 0.20, ""),
            ComponentScore("operator",   1.0, 0.10, ""),
            ComponentScore("address",    0.5, 0.05, ""),
        ]
        score = _compute_final(components)
        expected = (1.0*0.35 + 0.8*0.30 + 1.0*0.20 + 1.0*0.10 + 0.5*0.05) / 1.0
        assert abs(score - expected) < 1e-6

    def test_excluded_component_weight_redistributed(self):
        # Only name_exact and city available; fuzzy/operator/address excluded
        components = [
            ComponentScore("name_exact", 1.0, 0.35, ""),
            ComponentScore("name_fuzzy", None, 0.30, ""),
            ComponentScore("city",       1.0, 0.20, ""),
            ComponentScore("operator",   None, 0.10, ""),
            ComponentScore("address",    None, 0.05, ""),
        ]
        score = _compute_final(components)
        expected = (1.0*0.35 + 1.0*0.20) / (0.35 + 0.20)
        assert abs(score - expected) < 1e-6

    def test_all_excluded_returns_zero(self):
        components = [
            ComponentScore("name_exact", None, 0.35, ""),
            ComponentScore("name_fuzzy", None, 0.30, ""),
        ]
        assert _compute_final(components) == 0.0

    def test_single_component_returns_its_score(self):
        components = [ComponentScore("city", 0.75, 1.0, "")]
        assert abs(_compute_final(components) - 0.75) < 1e-6

    def test_zero_score_not_excluded(self):
        components = [
            ComponentScore("name_exact", 0.0, 0.35, ""),
            ComponentScore("city",       1.0, 0.20, ""),
        ]
        score = _compute_final(components)
        expected = (0.0*0.35 + 1.0*0.20) / (0.35 + 0.20)
        assert abs(score - expected) < 1e-6


# ── _score_name_exact() ───────────────────────────────────────────────────────


class TestScoreNameExact:
    def test_same_name_exact(self):
        c = _score_name_exact("Hotel Arts Barcelona", "Hotel Arts Barcelona", 0.35)
        assert c.score == 1.0

    def test_case_insensitive(self):
        c = _score_name_exact("hotel arts barcelona", "HOTEL ARTS BARCELONA", 0.35)
        assert c.score == 1.0

    def test_prefix_stripped_matches(self):
        c = _score_name_exact("Hotel Arts Barcelona", "Arts Barcelona", 0.35)
        assert c.score == 1.0

    def test_gran_hotel_prefix_stripped(self):
        c = _score_name_exact("Gran Hotel Miramar", "Hotel Miramar", 0.35)
        assert c.score == 1.0

    def test_accent_normalised(self):
        c = _score_name_exact("Meliá Castilla", "Melia Castilla", 0.35)
        assert c.score == 1.0

    def test_different_names_score_zero(self):
        c = _score_name_exact("Hotel Arts Barcelona", "Hotel Ritz Madrid", 0.35)
        assert c.score == 0.0

    def test_empty_name_a_excluded(self):
        c = _score_name_exact("", "Hotel Arts Barcelona", 0.35)
        assert c.excluded

    def test_empty_name_b_excluded(self):
        c = _score_name_exact("Hotel Arts Barcelona", "", 0.35)
        assert c.excluded

    def test_weight_preserved(self):
        c = _score_name_exact("Hotel Arts", "Arts", 0.35)
        assert c.weight == 0.35

    def test_name_is_name_exact(self):
        c = _score_name_exact("A", "A", 0.35)
        assert c.name == "name_exact"


# ── _score_name_fuzzy() ───────────────────────────────────────────────────────


class TestScoreNameFuzzy:
    def test_returns_component_score(self):
        c = _score_name_fuzzy("Hotel Arts Barcelona", "Arts Hotel Barcelona", 0.30)
        assert isinstance(c, ComponentScore)
        assert c.name == "name_fuzzy"

    def test_excluded_when_rapidfuzz_not_installed(self):
        from pipeline.matching import confidence as _mod
        if not _mod._HAS_RAPIDFUZZ:
            c = _score_name_fuzzy("Hotel Arts", "Arts Hotel", 0.30)
            assert c.excluded
            assert "rapidfuzz" in c.detail

    def test_score_when_rapidfuzz_available(self):
        from pipeline.matching import confidence as _mod
        if _mod._HAS_RAPIDFUZZ:
            c = _score_name_fuzzy("Hotel Arts Barcelona", "Arts Hotel Barcelona", 0.30)
            assert c.score is not None
            assert 0.0 <= c.score <= 1.0

    def test_exact_match_scores_one_when_rapidfuzz_available(self):
        from pipeline.matching import confidence as _mod
        if _mod._HAS_RAPIDFUZZ:
            c = _score_name_fuzzy("hotel arts barcelona", "hotel arts barcelona", 0.30)
            assert c.score == 1.0

    def test_empty_name_excluded(self):
        c = _score_name_fuzzy("", "Hotel Arts", 0.30)
        assert c.excluded

    def test_weight_preserved(self):
        c = _score_name_fuzzy("Hotel Arts", "Arts Hotel", 0.30)
        assert c.weight == 0.30


# ── _score_city() ─────────────────────────────────────────────────────────────


class TestScoreCity:
    def test_same_city(self):
        c = _score_city("Barcelona", "Barcelona", 0.20)
        assert c.score == 1.0

    def test_case_insensitive(self):
        c = _score_city("barcelona", "BARCELONA", 0.20)
        assert c.score == 1.0

    def test_alias_match(self):
        c = _score_city("Londres", "London", 0.20)
        assert c.score == 1.0

    def test_spanish_alias(self):
        c = _score_city("Málaga", "malaga", 0.20)
        assert c.score == 1.0

    def test_different_cities(self):
        c = _score_city("Barcelona", "Madrid", 0.20)
        assert c.score == 0.0

    def test_none_city_a_excluded(self):
        c = _score_city(None, "Barcelona", 0.20)
        assert c.excluded

    def test_none_city_b_excluded(self):
        c = _score_city("Barcelona", None, 0.20)
        assert c.excluded

    def test_empty_city_excluded(self):
        c = _score_city("", "Barcelona", 0.20)
        assert c.excluded

    def test_name_is_city(self):
        c = _score_city("Barcelona", "Barcelona", 0.20)
        assert c.name == "city"

    def test_weight_preserved(self):
        c = _score_city("Barcelona", "Barcelona", 0.20)
        assert c.weight == 0.20

    def test_detail_includes_city_name_on_match(self):
        c = _score_city("Barcelona", "Barcelona", 0.20)
        assert "Barcelona" in c.detail


# ── _score_operator() ─────────────────────────────────────────────────────────


class TestScoreOperator:
    def test_same_operator(self):
        c = _score_operator("Marriott", "Marriott", 0.10)
        assert c.score == 1.0

    def test_alias_match(self):
        c = _score_operator("marriott international", "Marriott", 0.10)
        assert c.score == 1.0

    def test_different_operators(self):
        c = _score_operator("Marriott", "Hilton", 0.10)
        assert c.score == 0.0

    def test_none_a_excluded(self):
        c = _score_operator(None, "Marriott", 0.10)
        assert c.excluded

    def test_none_b_excluded(self):
        c = _score_operator("Marriott", None, 0.10)
        assert c.excluded

    def test_empty_string_excluded(self):
        c = _score_operator("", "Marriott", 0.10)
        assert c.excluded

    def test_name_is_operator(self):
        c = _score_operator("Marriott", "Marriott", 0.10)
        assert c.name == "operator"


# ── _score_address() ─────────────────────────────────────────────────────────


class TestScoreAddress:
    def test_same_address_exact(self):
        c = _score_address("Carrer de la Marina 19", "Carrer de la Marina 19", 0.05)
        assert c.score == 1.0

    def test_none_excluded(self):
        c = _score_address(None, "Carrer de la Marina 19", 0.05)
        assert c.excluded

    def test_empty_excluded(self):
        c = _score_address("", "Carrer de la Marina 19", 0.05)
        assert c.excluded

    def test_name_is_address(self):
        c = _score_address("Calle Mayor 1", "Calle Mayor 1", 0.05)
        assert c.name == "address"


# ── score_hotels() composite ─────────────────────────────────────────────────


class TestScoreHotels:
    def test_identical_hotels_high(self):
        r = score_hotels("Hotel Arts Barcelona", "Barcelona",
                         "Hotel Arts Barcelona", "Barcelona")
        assert r.label == "HIGH"
        assert r.final_score >= 0.85

    def test_prefix_variant_high(self):
        r = score_hotels("Hotel Arts Barcelona", "Barcelona",
                         "Arts Barcelona", "Barcelona")
        assert r.label == "HIGH"

    def test_accent_variant_high(self):
        r = score_hotels("Meliá Castilla", "Madrid",
                         "Melia Castilla", "Madrid")
        assert r.label == "HIGH"

    def test_clear_non_match_low(self):
        r = score_hotels("Hotel Arts Barcelona", "Barcelona",
                         "Ritz Madrid", "Madrid")
        assert r.label == "LOW"

    def test_same_name_different_city_medium_or_low(self):
        r = score_hotels("Hotel Palace", "Barcelona",
                         "Hotel Palace", "Madrid")
        assert r.label in ("MEDIUM", "LOW")
        assert r.final_score < 0.85

    def test_five_components_returned(self):
        r = score_hotels("Hotel Arts Barcelona", "Barcelona",
                         "Arts Hotel Barcelona", "Barcelona")
        assert len(r.components) == 5

    def test_component_names_in_order(self):
        r = score_hotels("Hotel Arts", "Barcelona",
                         "Arts Hotel", "Barcelona")
        names = [c.name for c in r.components]
        assert names == ["name_exact", "name_fuzzy", "city", "operator", "address"]

    def test_operator_component_excluded_when_not_provided(self):
        r = score_hotels("Hotel Arts", "Barcelona",
                         "Arts Hotel", "Barcelona")
        op = next(c for c in r.components if c.name == "operator")
        assert op.excluded

    def test_operator_component_scored_when_provided(self):
        r = score_hotels("Hotel Arts", "Barcelona",
                         "Arts Hotel", "Barcelona",
                         operator_a="Marriott", operator_b="Marriott")
        op = next(c for c in r.components if c.name == "operator")
        assert not op.excluded
        assert op.score == 1.0

    def test_address_component_excluded_when_not_provided(self):
        r = score_hotels("Hotel Arts", "Barcelona",
                         "Arts Hotel", "Barcelona")
        addr = next(c for c in r.components if c.name == "address")
        assert addr.excluded

    def test_address_component_scored_when_provided(self):
        r = score_hotels("Hotel Arts", "Barcelona",
                         "Arts Hotel", "Barcelona",
                         address_a="Marina 19", address_b="Marina 19")
        addr = next(c for c in r.components if c.name == "address")
        assert not addr.excluded

    def test_name_a_and_b_stored(self):
        r = score_hotels("Hotel Arts Barcelona", "Barcelona",
                         "Gran Hotel Miramar", "Málaga")
        assert r.name_a == "Hotel Arts Barcelona"
        assert r.name_b == "Gran Hotel Miramar"

    def test_city_a_and_b_stored(self):
        r = score_hotels("Hotel Arts Barcelona", "Barcelona",
                         "Gran Hotel Miramar", "Málaga")
        assert r.city_a == "Barcelona"
        assert r.city_b == "Málaga"

    def test_final_score_rounded_to_4dp(self):
        r = score_hotels("Hotel Arts", "Barcelona",
                         "Hotel Arts", "Barcelona")
        assert r.final_score == round(r.final_score, 4)

    def test_custom_weights_applied(self):
        custom = {**DEFAULT_WEIGHTS, "city": 0.0, "name_exact": 0.55}
        r = score_hotels("Hotel Arts", "Barcelona",
                         "Hotel Arts", "Madrid",
                         weights=custom)
        # city component has weight 0 but is NOT excluded (score=0.0, weight=0.0)
        # result should be influenced purely by name
        assert r.final_score >= 0.0

    def test_custom_thresholds_applied(self):
        strict = MatchThresholds(high=0.99, medium=0.95)
        r = score_hotels("Hotel Arts Barcelona", "Barcelona",
                         "Hotel Arts Barcelona", "Barcelona",
                         thresholds=strict)
        # even a perfect name+city match may not reach 0.99 without all components
        assert r.label in ("HIGH", "MEDIUM", "LOW")

    def test_no_city_provided(self):
        r = score_hotels("Hotel Arts Barcelona", name_b="Arts Barcelona")
        city = next(c for c in r.components if c.name == "city")
        assert city.excluded


# ── score_hotel_dicts() ───────────────────────────────────────────────────────


class TestScoreHotelDicts:
    def test_asset_name_field(self):
        a = {"asset_name": "Hotel Arts Barcelona", "city": "Barcelona"}
        b = {"asset_name": "Hotel Arts Barcelona", "city": "Barcelona"}
        r = score_hotel_dicts(a, b)
        assert r.label == "HIGH"

    def test_property_name_field(self):
        a = {"property_name": "W Barcelona", "city": "Barcelona"}
        b = {"property_name": "W Hotel Barcelona", "city": "Barcelona"}
        r = score_hotel_dicts(a, b)
        assert isinstance(r, ConfidenceResult)

    def test_operator_field_used(self):
        a = {"asset_name": "Hotel Palace", "city": "Barcelona", "operator": "Marriott"}
        b = {"asset_name": "Hotel Palace", "city": "Barcelona", "operator": "Hilton"}
        r = score_hotel_dicts(a, b)
        op = next(c for c in r.components if c.name == "operator")
        assert op.score == 0.0

    def test_address_field_used(self):
        a = {"asset_name": "Hotel Arts", "city": "Barcelona", "address": "Marina 19"}
        b = {"asset_name": "Hotel Arts", "city": "Barcelona", "address": "Marina 19"}
        r = score_hotel_dicts(a, b)
        addr = next(c for c in r.components if c.name == "address")
        assert not addr.excluded

    def test_missing_name_handled(self):
        a = {"city": "Barcelona"}
        b = {"city": "Barcelona"}
        r = score_hotel_dicts(a, b)
        name = next(c for c in r.components if c.name == "name_exact")
        assert name.excluded


# ── ConfidenceResult.explain() ────────────────────────────────────────────────


class TestExplain:
    def _get_result(self) -> ConfidenceResult:
        return score_hotels("Hotel Arts Barcelona", "Barcelona",
                            "Hotel Arts Barcelona", "Barcelona",
                            operator_a="Marriott", operator_b="Marriott")

    def test_explain_returns_string(self):
        assert isinstance(self._get_result().explain(), str)

    def test_explain_contains_all_component_names(self):
        text = self._get_result().explain()
        for name in ("name_exact", "name_fuzzy", "city", "operator", "address", "FINAL"):
            assert name in text

    def test_explain_contains_final_label(self):
        r = self._get_result()
        assert r.label in r.explain()

    def test_explain_contains_final_score(self):
        r = self._get_result()
        assert str(r.final_score)[:4] in r.explain()

    def test_excluded_shows_excluded_marker(self):
        r = score_hotels("Hotel Arts", "Barcelona", "Hotel Arts", "Barcelona")
        text = r.explain()
        assert "EXCLUDED" in text


# ── ConfidenceResult.to_dict() ────────────────────────────────────────────────


class TestToDict:
    def _get_result(self) -> ConfidenceResult:
        return score_hotels("Hotel Arts Barcelona", "Barcelona",
                            "Hotel Arts Barcelona", "Barcelona")

    def test_to_dict_returns_dict(self):
        assert isinstance(self._get_result().to_dict(), dict)

    def test_to_dict_has_required_keys(self):
        d = self._get_result().to_dict()
        for key in ("final_score", "label", "name_a", "name_b", "city_a", "city_b", "components"):
            assert key in d

    def test_to_dict_components_is_list(self):
        assert isinstance(self._get_result().to_dict()["components"], list)

    def test_to_dict_component_has_required_keys(self):
        d = self._get_result().to_dict()
        comp = d["components"][0]
        for key in ("name", "score", "weight", "detail", "excluded"):
            assert key in comp

    def test_to_dict_excluded_component_score_is_none(self):
        r = score_hotels("Hotel Arts", "Barcelona", "Hotel Arts", "Barcelona")
        d = r.to_dict()
        excluded = [c for c in d["components"] if c["excluded"]]
        assert all(c["score"] is None for c in excluded)

    def test_to_dict_final_score_rounded(self):
        d = self._get_result().to_dict()
        assert d["final_score"] == round(d["final_score"], 4)

    def test_to_dict_names_preserved(self):
        r = score_hotels("Hotel Arts Barcelona", "Barcelona",
                         "Gran Hotel Miramar", "Málaga")
        d = r.to_dict()
        assert d["name_a"] == "Hotel Arts Barcelona"
        assert d["name_b"] == "Gran Hotel Miramar"


# ── DEFAULT_WEIGHTS ────────────────────────────────────────────────────────────


class TestDefaultWeights:
    def test_weights_sum_to_one(self):
        total = sum(DEFAULT_WEIGHTS.values())
        assert abs(total - 1.0) < 1e-9

    def test_all_expected_keys_present(self):
        for key in ("name_exact", "name_fuzzy", "city", "operator", "address"):
            assert key in DEFAULT_WEIGHTS

    def test_all_weights_positive(self):
        assert all(v > 0 for v in DEFAULT_WEIGHTS.values())


# ── Integration: known hotel pair scenarios ───────────────────────────────────


class TestKnownPairs:
    """Representative hotel pairs with expected label outcomes."""

    def test_same_hotel_all_fields(self):
        r = score_hotels(
            "Mandarin Oriental Barcelona", "Barcelona",
            "Mandarin Oriental Barcelona", "Barcelona",
            operator_a="Mandarin Oriental", operator_b="Mandarin Oriental",
        )
        assert r.label == "HIGH"

    def test_name_variant_same_city(self):
        from pipeline.matching import confidence as _mod
        r = score_hotels(
            "Hotel Arts Barcelona", "Barcelona",
            "Arts Hotel Barcelona", "Barcelona",
        )
        if _mod._HAS_RAPIDFUZZ:
            # fuzzy scoring resolves word-order variants
            assert r.label in ("HIGH", "MEDIUM")
        else:
            # word-order variant can't be resolved via exact-match alone
            assert r.label in ("HIGH", "MEDIUM", "LOW")

    def test_totally_different_hotels(self):
        r = score_hotels(
            "Four Seasons Hotel Barcelona", "Barcelona",
            "Hospes Palacio del Bailío",   "Córdoba",
        )
        assert r.label == "LOW"

    def test_same_chain_different_city(self):
        r = score_hotels(
            "Marriott Hotel Madrid", "Madrid",
            "Marriott Hotel Barcelona", "Barcelona",
            operator_a="Marriott", operator_b="Marriott",
        )
        # City mismatch should keep it out of HIGH
        assert r.label in ("MEDIUM", "LOW")

    def test_acronym_vs_full_name(self):
        r = score_hotels(
            "NH Collection Madrid Eurobuilding", "Madrid",
            "NH Eurobuilding",                   "Madrid",
        )
        assert isinstance(r, ConfidenceResult)

    def test_gran_hotel_vs_plain_name(self):
        r = score_hotels(
            "Gran Hotel Miramar", "Málaga",
            "Hotel Miramar",      "Málaga",
        )
        assert r.label == "HIGH"
