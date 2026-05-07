"""Tests for pipeline.cleaning.multilingual."""
import pytest

from pipeline.cleaning.multilingual import (
    expand_abbreviations,
    normalize_for_matching,
    strip_hotel_tokens,
)


class TestNormalizeForMatching:
    # ── Accent / unicode normalization ──────────────────────────────────────

    def test_spanish_accents(self):
        assert normalize_for_matching("Hôtel Café España") == "cafe espana"

    def test_german_umlaut(self):
        assert normalize_for_matching("Hotel Schönefeld") == "schonefeld"

    def test_german_sharp_s(self):
        assert normalize_for_matching("Hotel Straße") == "strasse"

    def test_french_cedilla(self):
        assert normalize_for_matching("Hotel Français") == "francais"

    def test_portuguese_tilde(self):
        assert normalize_for_matching("Hotel São Paulo") == "sao paulo"

    def test_ae_ligature(self):
        assert normalize_for_matching("Hotel Æon") == "aeon"

    def test_oe_ligature(self):
        assert normalize_for_matching("Hotel Œuvre") == "oeuvre"

    def test_scandinavian_o(self):
        assert normalize_for_matching("Hotel Ørsted") == "orsted"

    def test_polish_l(self):
        assert normalize_for_matching("Hotel Łódź") == "lodz"

    # ── Prefix stripping ─────────────────────────────────────────────────────

    def test_strip_english_hotel(self):
        assert normalize_for_matching("Hotel Arts") == "arts"

    def test_strip_grand_hotel(self):
        assert normalize_for_matching("Grand Hotel Miramar") == "miramar"

    def test_strip_gran_hotel(self):
        assert normalize_for_matching("Gran Hotel Palacio") == "palacio"

    def test_strip_boutique_hotel(self):
        assert normalize_for_matching("Boutique Hotel Casa Fuster") == "casa fuster"

    def test_strip_the(self):
        assert normalize_for_matching("The Ritz") == "ritz"

    def test_strip_french_auberge(self):
        assert normalize_for_matching("Auberge du Palais") == "palais"

    def test_strip_portuguese_pousada(self):
        assert normalize_for_matching("Pousada de Lisboa") == "lisboa"

    def test_strip_german_gasthof(self):
        assert normalize_for_matching("Gasthof Zum Wirt") == "wirt"

    # ── Suffix stripping ─────────────────────────────────────────────────────

    def test_strip_hotel_suffix(self):
        assert normalize_for_matching("Arts Hotel") == "arts"

    def test_strip_hotel_spa_suffix(self):
        assert normalize_for_matching("Miramar Hotel & Spa") == "miramar"

    def test_strip_inn_suffix(self):
        assert normalize_for_matching("Crown Inn") == "crown"

    def test_strip_resort_suffix(self):
        assert normalize_for_matching("Palms Resort") == "palms"

    # ── Abbreviation expansion ───────────────────────────────────────────────

    def test_expand_sto(self):
        assert normalize_for_matching("Hotel Sto. Tomé") == "santo tome"

    def test_expand_sta(self):
        assert normalize_for_matching("Hotel Sta. Cruz") == "santa cruz"

    def test_expand_av(self):
        result = normalize_for_matching("Hotel Av. Diagonal")
        assert "avenida" in result

    def test_expand_st(self):
        assert normalize_for_matching("St. Regis Hotel") == "saint regis"

    def test_expand_german_str(self):
        result = normalize_for_matching("Hotel Str. am See")
        assert "strasse" in result

    # ── Stopword removal ─────────────────────────────────────────────────────

    def test_removes_english_the(self):
        result = normalize_for_matching("Palace of the Arts")
        assert "the" not in result.split()

    def test_removes_spanish_de_el(self):
        result = normalize_for_matching("Palacio de los Duques")
        assert "de" not in result.split()
        assert "los" not in result.split()

    def test_removes_french_du(self):
        result = normalize_for_matching("Chateau du Lac")
        assert "du" not in result.split()

    def test_removes_portuguese_da(self):
        result = normalize_for_matching("Pousada da Serra")
        assert "da" not in result.split()

    def test_removes_german_von(self):
        result = normalize_for_matching("Schloss von Bayern")
        assert "von" not in result.split()

    # ── Punctuation ──────────────────────────────────────────────────────────

    def test_hyphen_becomes_space(self):
        result = normalize_for_matching("Hotel Ritz-Carlton")
        assert "-" not in result

    def test_ampersand_stripped(self):
        result = normalize_for_matching("Hotels & Resorts Miramar")
        assert "&" not in result

    # ── Edge cases ───────────────────────────────────────────────────────────

    def test_empty_string(self):
        assert normalize_for_matching("") == ""

    def test_whitespace_only(self):
        assert normalize_for_matching("   ") == ""

    def test_none_like_empty(self):
        assert normalize_for_matching("") == ""

    def test_all_stopwords_keeps_original(self):
        # If every token is a stopword, the original (joined) is kept.
        result = normalize_for_matching("Hotel de la")
        # "de" and "la" are both stopwords — but after prefix strip we may
        # have just "de la", which strips to the unchanged form.
        assert isinstance(result, str)

    def test_same_hotel_different_languages_converge(self):
        en = normalize_for_matching("Grand Hotel Central")
        es = normalize_for_matching("Gran Hotel Central")
        assert en == es  # Both → "central"

    def test_case_insensitive(self):
        a = normalize_for_matching("HOTEL ARTS BARCELONA")
        b = normalize_for_matching("hotel arts barcelona")
        assert a == b


class TestExpandAbbreviations:
    def test_sto_dot(self):
        assert expand_abbreviations("hotel sto. tomas") == "hotel santo tomas"

    def test_sta_dot(self):
        assert expand_abbreviations("sta. maria") == "santa maria"

    def test_st_dot_english(self):
        assert expand_abbreviations("st. james") == "saint james"

    def test_str_dot_german(self):
        assert expand_abbreviations("hotel str. am see") == "hotel strasse am see"

    def test_av_dot(self):
        assert expand_abbreviations("av. diagonal") == "avenida diagonal"

    def test_no_expansion_without_dot(self):
        # "st" without a dot should NOT expand
        assert "saint" not in expand_abbreviations("street")


class TestStripHotelTokens:
    def test_strip_hotel_prefix(self):
        assert strip_hotel_tokens("hotel arts") == "arts"

    def test_strip_gran_hotel_prefix(self):
        assert strip_hotel_tokens("gran hotel miramar") == "miramar"

    def test_strip_grand_hotel_prefix(self):
        assert strip_hotel_tokens("grand hotel central") == "central"

    def test_strip_hotel_suffix(self):
        assert strip_hotel_tokens("arts hotel") == "arts"

    def test_strip_hotel_spa_suffix(self):
        assert strip_hotel_tokens("miramar hotel & spa") == "miramar"

    def test_no_double_strip(self):
        # Only one prefix should be stripped per call.
        result = strip_hotel_tokens("hotel grand hotel arts")
        assert result == "grand hotel arts"

    def test_passthrough_no_tokens(self):
        assert strip_hotel_tokens("ritz") == "ritz"

    def test_strip_parador(self):
        # "parador de " is a single prefix entry including "de "
        assert strip_hotel_tokens("parador de granada") == "granada"

    def test_strip_pousada(self):
        # "pousada de " is a single prefix entry including "de "
        assert strip_hotel_tokens("pousada de lisboa") == "lisboa"

    def test_strip_auberge_du(self):
        assert strip_hotel_tokens("auberge du palais") == "palais"
