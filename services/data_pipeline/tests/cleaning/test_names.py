"""
Tests for pipeline.cleaning.names — the core normalization engine.

Coverage:
  _key()                  — shared accent/case/whitespace helper
  hotel_dedup_key()       — duplicate detection key builder
  normalize_hotel_name()  — alias resolution for hotel display names
  normalize_submarket()   — submarket alias resolution
  normalize_market()      — market (city-level) alias resolution
  normalize_operator()    — operator/brand → parent company
  normalize_region()      — region/state alias resolution
  Alias dict integrity    — keys are pre-normalized, no duplicates
  Multilingual inputs     — Spanish, Catalan, Basque, French, German accents
  Malformed data          — None, empty, garbage, very long strings
  Fuzzy matching baseline — documents limits of the current exact-match system
"""
from __future__ import annotations

import pytest

from pipeline.cleaning.names import (
    HOTEL_NAME_ALIASES,
    MARKET_ALIASES,
    OPERATOR_CANONICAL,
    REGION_ALIASES,
    SUBMARKET_ALIASES,
    _key,
    hotel_dedup_key,
    normalize_hotel_name,
    normalize_market,
    normalize_operator,
    normalize_region,
    normalize_submarket,
)


# ── _key() ──────────────────────────────────────────────────────────────────────

class TestKeyFunction:
    def test_lowercase(self):
        assert _key("HOTEL ARTS BARCELONA") == "hotel arts barcelona"

    def test_accent_a_acute(self):
        assert _key("Málaga") == "malaga"

    def test_accent_i_acute_in_melia(self):
        assert _key("Meliá") == "melia"

    def test_accent_n_tilde(self):
        assert _key("Señoría") == "senoria"

    def test_accent_o_acute(self):
        assert _key("Córdoba") == "cordoba"

    def test_accent_u_diaeresis(self):
        assert _key("Güell") == "guell"

    def test_accent_san_sebastian(self):
        assert _key("San Sebastián") == "san sebastian"

    def test_accent_french_circumflex(self):
        assert _key("Hôtel de Paris") == "hotel de paris"

    def test_accent_german_umlaut_u(self):
        assert _key("München") == "munchen"

    def test_accent_german_umlaut_z(self):
        assert _key("Zürich") == "zurich"

    def test_whitespace_collapse(self):
        assert _key("  Gran   Hotel  ") == "gran hotel"

    def test_tab_treated_as_space(self):
        assert _key("\tBilbao\t") == "bilbao"

    def test_newline_treated_as_space(self):
        assert _key("Hotel\nArts") == "hotel arts"

    def test_mixed_whitespace_collapsed(self):
        assert _key("NH  \t Collection") == "nh collection"

    def test_empty_string(self):
        assert _key("") == ""

    def test_single_space_becomes_empty(self):
        assert _key(" ") == ""

    def test_already_normalized_is_stable(self):
        assert _key("hotel arts barcelona") == "hotel arts barcelona"

    def test_idempotent(self):
        s = "Meliá Castilla Madrid"
        assert _key(_key(s)) == _key(s)

    def test_hyphen_preserved(self):
        # _key does NOT strip punctuation — dedup_key handles that separately
        assert _key("Ritz-Carlton") == "ritz-carlton"

    def test_apostrophe_preserved(self):
        assert _key("L'Hotel") == "l'hotel"

    def test_unicode_ligature_fi_decomposes(self):
        # U+FB01 LATIN SMALL LIGATURE FI decomposes to "fi" under NFKD
        assert _key("ﬁlm") == "film"

    def test_combining_characters_stripped(self):
        # e + combining acute accent = é; combining char must be removed
        e_with_combining_acute = "é"
        assert _key(e_with_combining_acute) == "e"


# ── hotel_dedup_key() ───────────────────────────────────────────────────────────

class TestHotelDedupKey:
    def test_prefix_hotel_stripped(self):
        assert hotel_dedup_key("Hotel Arts Barcelona", "Barcelona") == "arts barcelona|barcelona"

    def test_prefix_gran_hotel_stripped(self):
        assert hotel_dedup_key("Gran Hotel Miramar", "Malaga") == "miramar|malaga"

    def test_prefix_grand_hotel_stripped(self):
        assert hotel_dedup_key("Grand Hotel Central", "Barcelona") == "central|barcelona"

    def test_prefix_hotel_palacio_stripped(self):
        assert hotel_dedup_key("Hotel Palacio San Martín", "Madrid") == "san martin|madrid"

    def test_prefix_boutique_hotel_stripped(self):
        assert hotel_dedup_key("Boutique Hotel Casa Fuster", "Barcelona") == "casa fuster|barcelona"

    def test_prefix_the_hotel_stripped(self):
        assert hotel_dedup_key("The Hotel Arts", "Barcelona") == "arts|barcelona"

    def test_prefix_palace_hotel_stripped(self):
        assert hotel_dedup_key("Palace Hotel Arts", "Barcelona") == "arts|barcelona"

    def test_suffix_hotel_stripped(self):
        assert hotel_dedup_key("Arts Hotel", "Barcelona") == "arts|barcelona"

    def test_no_prefix_no_suffix_unchanged(self):
        assert hotel_dedup_key("W Barcelona", "Barcelona") == "w barcelona|barcelona"

    def test_city_accent_normalized(self):
        assert hotel_dedup_key("Gran Hotel Miramar", "Malaga") == hotel_dedup_key("Gran Hotel Miramar", "Málaga")

    def test_name_accent_normalized(self):
        assert hotel_dedup_key("Meliá Castilla", "Madrid") == hotel_dedup_key("Melia Castilla", "Madrid")

    def test_hyphen_becomes_space(self):
        assert hotel_dedup_key("Ritz-Carlton Barcelona", "Barcelona") == hotel_dedup_key("Ritz Carlton Barcelona", "Barcelona")

    def test_comma_removed(self):
        assert hotel_dedup_key("Arts, Barcelona", "Barcelona") == hotel_dedup_key("Arts Barcelona", "Barcelona")

    def test_apostrophe_removed(self):
        k = hotel_dedup_key("L'Hotel Arts", "Barcelona")
        assert "'" not in k
        assert "|" in k

    def test_parentheses_removed(self):
        assert hotel_dedup_key("Hotel Arts (Barcelona)", "Barcelona") == hotel_dedup_key("Hotel Arts Barcelona", "Barcelona")

    def test_different_cities_produce_different_keys(self):
        assert hotel_dedup_key("Hotel Arts Barcelona", "Barcelona") != hotel_dedup_key("Hotel Arts Barcelona", "Madrid")

    def test_case_insensitive(self):
        assert hotel_dedup_key("HOTEL ARTS BARCELONA", "BARCELONA") == hotel_dedup_key("hotel arts barcelona", "barcelona")

    def test_prefix_stripped_once(self):
        # "Hotel Palacio Real" — only "hotel palacio " is stripped, not "hotel " again
        assert hotel_dedup_key("Hotel Palacio Real", "Madrid") == "real|madrid"

    def test_prefix_then_suffix(self):
        # "Hotel Art Hotel" → strip prefix "hotel " → "art hotel" → strip suffix " hotel" → "art"
        assert hotel_dedup_key("Hotel Art Hotel", "Barcelona") == "art|barcelona"

    def test_empty_name_produces_pipe_city(self):
        k = hotel_dedup_key("", "Barcelona")
        assert k == "|barcelona"

    def test_only_hyphens_produces_empty_name(self):
        k = hotel_dedup_key("---", "Barcelona")
        assert k == "|barcelona"

    def test_both_empty(self):
        assert hotel_dedup_key("", "") == "|"

    def test_key_format_contains_pipe(self):
        k = hotel_dedup_key("Hotel Arts Barcelona", "Barcelona")
        assert k.count("|") == 1


# ── Duplicate detection ──────────────────────────────────────────────────────────

class TestDuplicateDetection:
    """Which name pairs share a dedup key (true duplicates) and which do not."""

    def _same(self, n1, c1, n2, c2):
        return hotel_dedup_key(n1, c1) == hotel_dedup_key(n2, c2)

    def test_gran_hotel_vs_hotel_prefix(self):
        assert self._same("Gran Hotel Miramar", "Malaga", "Hotel Miramar", "Malaga")

    def test_hotel_prefix_vs_no_prefix(self):
        assert self._same("Hotel W Barcelona", "Barcelona", "W Barcelona", "Barcelona")

    def test_accent_in_hotel_name(self):
        assert self._same("Meliá Castilla", "Madrid", "Melia Castilla", "Madrid")

    def test_accent_in_city(self):
        assert self._same("Gran Hotel Miramar", "Malaga", "Gran Hotel Miramar", "Málaga")

    def test_hyphen_vs_space(self):
        assert self._same("Ritz-Carlton Barcelona", "Barcelona", "Ritz Carlton Barcelona", "Barcelona")

    def test_hotel_prefix_stripped_matches_bare(self):
        assert self._same("Hotel Casa Fuster", "Barcelona", "Casa Fuster", "Barcelona")

    def test_palace_hotel_prefix_stripped_matches_bare(self):
        assert self._same("Palace Hotel Arts", "Barcelona", "Arts", "Barcelona")

    def test_boutique_hotel_prefix_stripped(self):
        assert self._same("Boutique Hotel NH Collection", "Madrid", "NH Collection", "Madrid")

    def test_different_cities_are_not_dupes(self):
        assert not self._same("Hotel Arts Barcelona", "Barcelona", "Hotel Arts Barcelona", "Madrid")

    def test_different_hotels_same_city_are_not_dupes(self):
        assert not self._same("Hotel Arts Barcelona", "Barcelona", "W Barcelona", "Barcelona")

    def test_completely_different_names_are_not_dupes(self):
        assert not self._same("Hotel Arts Barcelona", "Barcelona", "Four Seasons Hotel Barcelona", "Barcelona")

    def test_suffix_hotel_vs_prefix_hotel(self):
        # "Arts Hotel" suffix-stripped → "arts"; "Hotel Arts Barcelona" prefix-stripped → "arts barcelona"
        # These intentionally do NOT match (one has city word, the other doesn't)
        assert not self._same("Arts Hotel", "Barcelona", "Hotel Arts Barcelona", "Barcelona")

    # --- Known limitations: documents current exact-match behavior ---

    def test_known_limit_extra_city_word_in_name(self):
        """Raw 'Casa Fuster Barcelona' has an extra word that isn't stripped.
        However, normalize_hotel_name() maps it to 'Hotel Casa Fuster' first,
        so in practice the ETL pipeline handles this correctly end-to-end."""
        assert not self._same("Hotel Casa Fuster", "Barcelona", "Casa Fuster Barcelona", "Barcelona")
        # After name normalization both sides become "Hotel Casa Fuster":
        n1 = normalize_hotel_name("Hotel Casa Fuster")    # passthrough
        n2 = normalize_hotel_name("Casa Fuster Barcelona") # → "Hotel Casa Fuster"
        assert n1 == n2
        assert hotel_dedup_key(n1, "Barcelona") == hotel_dedup_key(n2, "Barcelona")

    def test_known_limit_word_order_swap(self):
        """Word-order variants require fuzzy matching to resolve."""
        assert not self._same("Hotel Arts Barcelona", "Barcelona", "Barcelona Arts Hotel", "Barcelona")

    def test_known_limit_partial_name(self):
        """Abbreviated names require fuzzy matching to resolve."""
        assert not self._same("NH Collection Madrid Eurobuilding", "Madrid", "NH Eurobuilding", "Madrid")


# ── normalize_hotel_name() ──────────────────────────────────────────────────────

HOTEL_NAME_CASES = [
    ("arts hotel barcelona",                "Hotel Arts Barcelona"),
    ("ritz-carlton barcelona",              "Hotel Arts Barcelona"),
    ("ritz carlton barcelona",              "Hotel Arts Barcelona"),
    ("w hotel barcelona",                   "Hotel W Barcelona"),
    ("w barcelona hotel",                   "Hotel W Barcelona"),
    ("hilton diagonal mar",                 "Hilton Diagonal Mar Barcelona"),
    ("diagonal mar hilton",                 "Hilton Diagonal Mar Barcelona"),
    ("casa fuster barcelona",               "Hotel Casa Fuster"),
    ("nh collection eurobuilding",          "NH Collection Madrid Eurobuilding"),
    ("eurobuilding hotel",                  "NH Collection Madrid Eurobuilding"),
    ("nh eurobuilding",                     "NH Collection Madrid Eurobuilding"),
    ("melia castilla madrid",               "Meliá Castilla"),
    ("melia castilla",                      "Meliá Castilla"),
    ("iberostar gran via",                  "Iberostar Las Letras Gran Via"),
    ("las letras hotel",                    "Iberostar Las Letras Gran Via"),
    ("palacio de los duques",               "Palacio de los Duques Gran Meliá"),
    ("gran melia duques",                   "Palacio de los Duques Gran Meliá"),
    ("hotel alfonso xiii sevilla",          "Hotel Alfonso XIII"),
    ("alfonso xiii sevilla",                "Hotel Alfonso XIII"),
    ("palacio del bailio",                  "Hospes Palacio del Bailío"),
    ("hospes bailio",                       "Hospes Palacio del Bailío"),
    ("miramar malaga",                      "Gran Hotel Miramar"),
    ("hotel miramar malaga",                "Gran Hotel Miramar"),
    ("ac malaga palacio",                   "AC Hotel Málaga Palacio"),
    ("ac palacio malaga",                   "AC Hotel Málaga Palacio"),
]


class TestHotelNameNormalization:
    @pytest.mark.parametrize("raw,expected", HOTEL_NAME_CASES)
    def test_known_aliases(self, raw, expected):
        assert normalize_hotel_name(raw) == expected

    def test_case_insensitive_upper(self):
        assert normalize_hotel_name("ARTS HOTEL BARCELONA") == "Hotel Arts Barcelona"

    def test_case_insensitive_title(self):
        assert normalize_hotel_name("Arts Hotel Barcelona") == "Hotel Arts Barcelona"

    def test_accent_insensitive_lookup(self):
        assert normalize_hotel_name("Ritz-Carlton Barcelona") == "Hotel Arts Barcelona"

    def test_unknown_name_returns_stripped(self):
        assert normalize_hotel_name("  Boutique Garden Hotel  ") == "Boutique Garden Hotel"

    def test_unknown_name_with_accents_preserved(self):
        assert normalize_hotel_name("Palau de la Música") == "Palau de la Música"

    def test_none_returns_none(self):
        assert normalize_hotel_name(None) is None

    def test_empty_string_returns_none(self):
        assert normalize_hotel_name("") is None

    def test_whitespace_only_returns_none(self):
        assert normalize_hotel_name("   ") is None

    def test_leading_trailing_whitespace_stripped(self):
        assert normalize_hotel_name("  Unknown Hotel  ") == "Unknown Hotel"


# ── normalize_submarket() ───────────────────────────────────────────────────────

SUBMARKET_CASES = [
    # Barcelona
    ("Barcelona City Center",    "Barcelona CBD"),
    ("BCN CBD",                  "Barcelona CBD"),
    ("Barcelona Centro",         "Barcelona CBD"),
    ("Eixample",                 "Barcelona CBD"),
    ("Barcelona Eixample",       "Barcelona CBD"),
    ("Barceloneta",              "Barcelona Beach"),
    ("Barcelona Waterfront",     "Barcelona Beach"),
    ("22@ Barcelona",            "Barcelona 22@"),
    ("Poblenou",                 "Barcelona 22@"),
    ("Zona Alta",                "Barcelona Zona Alta"),
    ("Pedralbes",                "Barcelona Zona Alta"),
    ("Sant Gervasi",             "Barcelona Zona Alta"),
    ("El Prat",                  "Barcelona Airport"),
    ("BCN Airport",              "Barcelona Airport"),
    # Madrid
    ("Madrid City Center",       "Madrid CBD"),
    ("Centro Madrid",            "Madrid CBD"),
    ("Retiro",                   "Madrid CBD"),
    ("Barrio de Salamanca",      "Madrid CBD"),
    ("Sol Gran Via",             "Madrid CBD"),
    ("IFEMA",                    "Madrid IFEMA"),
    ("Barajas",                  "Madrid IFEMA"),
    ("Madrid Airport",           "Madrid IFEMA"),
    ("Adolfo Suarez Madrid Barajas", "Madrid IFEMA"),
    ("Castellana",               "Madrid Castellana"),
    ("Paseo de la Castellana",   "Madrid Castellana"),
    ("AZCA",                     "Madrid Castellana"),
    ("Madrid Norte",             "Madrid Norte"),
    ("Las Tablas",               "Madrid Norte"),
    # Sevilla
    ("Seville City Center",      "Sevilla Centro"),
    ("Sevilla Casco Historico",  "Sevilla Centro"),
    ("Santa Cruz Sevilla",       "Sevilla Centro"),
    ("Triana",                   "Sevilla Triana"),
    # Málaga
    ("Malaga City Center",       "Málaga Centro"),
    ("Malaga Port",              "Málaga Puerto"),
    ("Puerto Malaga",            "Málaga Puerto"),
    # Other cities
    ("Bilbao City Center",       "Bilbao Centro"),
    ("Bilbao Casco Viejo",       "Bilbao Casco Viejo"),
    ("Casco Viejo Bilbao",       "Bilbao Casco Viejo"),
    ("San Sebastian City Center","San Sebastián Centro"),
    ("Donostia Centro",          "San Sebastián Centro"),
    ("Palma City Center",        "Palma Centro"),
    ("Palma Port",               "Palma Puerto"),
    # Already canonical
    ("Barcelona CBD",            "Barcelona CBD"),
    ("Madrid IFEMA",             "Madrid IFEMA"),
    # International
    ("Paris Center",             "Paris CBD"),
    ("Paris 1er",                "Paris CBD"),
    ("Lisbon Baixa",             "Lisbon Centro"),
    ("London West End",          "London West End"),
    ("London West End/Mayfair",  "London Mayfair"),
]


class TestSubmarketNormalization:
    @pytest.mark.parametrize("raw,expected", SUBMARKET_CASES)
    def test_known_aliases(self, raw, expected):
        assert normalize_submarket(raw) == expected

    def test_case_insensitive(self):
        assert normalize_submarket("BARCELONA CBD") == "Barcelona CBD"
        assert normalize_submarket("barcelona cbd") == "Barcelona CBD"

    def test_accent_insensitive_malaga(self):
        assert normalize_submarket("Malaga Centro") == "Málaga Centro"
        assert normalize_submarket("Málaga Centro") == "Málaga Centro"

    def test_unknown_returns_stripped(self):
        assert normalize_submarket("Brand New Submarket") == "Brand New Submarket"

    def test_unknown_strips_whitespace(self):
        assert normalize_submarket("  Unknown Area  ") == "Unknown Area"

    def test_none_returns_none(self):
        assert normalize_submarket(None) is None

    def test_empty_returns_none(self):
        assert normalize_submarket("") is None

    def test_whitespace_only_returns_none(self):
        assert normalize_submarket("   ") is None


# ── normalize_market() ──────────────────────────────────────────────────────────

MARKET_CASES = [
    ("Barcelona",                    "Barcelona"),
    ("Barcelona Market",             "Barcelona"),
    ("Barcelona Metropolitan Area",  "Barcelona"),
    ("Barcelona MSA",                "Barcelona"),
    ("Gran Barcelona",               "Barcelona"),
    ("Madrid",                       "Madrid"),
    ("Madrid MSA",                   "Madrid"),
    ("Comunidad de Madrid",          "Madrid"),
    ("Sevilla",                      "Sevilla"),
    ("Seville",                      "Sevilla"),
    ("Malaga",                       "Málaga"),
    ("Costa del Sol",                "Málaga"),
    ("Pais Vasco",                   "Bilbao"),
    ("San Sebastian",                "San Sebastián"),
    ("Donostia",                     "San Sebastián"),
    ("Baleares",                     "Palma de Mallorca"),
    ("Mallorca",                     "Palma de Mallorca"),
    ("Islas Canarias",               "Canary Islands"),
    ("Canary Islands",               "Canary Islands"),
    ("Canarias",                     "Canary Islands"),
    ("Gran Canaria",                 "Las Palmas de Gran Canaria"),
    ("Galicia",                      "A Coruña"),
    ("Aragon",                       "Zaragoza"),
    ("Cantabria",                    "Santander"),
    ("Navarra",                      "Pamplona"),
    ("La Rioja",                     "Logroño"),
]


class TestMarketNormalization:
    @pytest.mark.parametrize("raw,expected", MARKET_CASES)
    def test_known_aliases(self, raw, expected):
        assert normalize_market(raw) == expected

    def test_case_insensitive(self):
        assert normalize_market("BARCELONA MARKET") == "Barcelona"
        assert normalize_market("barcelona market") == "Barcelona"

    def test_accent_insensitive(self):
        assert normalize_market("Málaga") == "Málaga"
        assert normalize_market("Malaga") == "Málaga"

    def test_unknown_returns_stripped(self):
        assert normalize_market("Unknown Region X") == "Unknown Region X"

    def test_none_returns_none(self):
        assert normalize_market(None) is None

    def test_empty_returns_none(self):
        assert normalize_market("") is None

    def test_whitespace_only_returns_none(self):
        assert normalize_market("   ") is None


# ── normalize_operator() ────────────────────────────────────────────────────────

MARRIOTT_BRANDS = [
    ("Marriott",                        "Marriott International"),
    ("Marriott International",          "Marriott International"),
    ("Ritz-Carlton",                    "Marriott International"),
    ("Ritz Carlton",                    "Marriott International"),
    ("The Ritz-Carlton",                "Marriott International"),
    ("W Hotels",                        "Marriott International"),
    ("Westin",                          "Marriott International"),
    ("Sheraton",                        "Marriott International"),
    ("St. Regis",                       "Marriott International"),
    ("The Luxury Collection",           "Marriott International"),
    ("A Luxury Collection",             "Marriott International"),
    ("Autograph Collection",            "Marriott International"),
    ("AC Hotels by Marriott",           "Marriott International"),
    ("Renaissance",                     "Marriott International"),
    ("Le Meridien",                     "Marriott International"),
    ("Tribute Portfolio",               "Marriott International"),
    ("Moxy",                            "Marriott International"),
    ("Edition",                         "Marriott International"),
    ("The Edition",                     "Marriott International"),
    ("Aloft Hotels",                    "Marriott International"),
    ("Design Hotels",                   "Marriott International"),
]

HILTON_BRANDS = [
    ("Hilton",                          "Hilton Worldwide"),
    ("Hilton Worldwide",                "Hilton Worldwide"),
    ("DoubleTree by Hilton",            "Hilton Worldwide"),
    ("Waldorf Astoria",                 "Hilton Worldwide"),
    ("Curio Collection",                "Hilton Worldwide"),
    ("Tapestry Collection",             "Hilton Worldwide"),
    ("Conrad",                          "Hilton Worldwide"),
    ("LXR Hotels",                      "Hilton Worldwide"),
    ("Canopy by Hilton",                "Hilton Worldwide"),
    ("Hampton by Hilton",               "Hilton Worldwide"),
    ("Embassy Suites by Hilton",        "Hilton Worldwide"),
    ("Motto by Hilton",                 "Hilton Worldwide"),
]

IHG_BRANDS = [
    ("IHG",                             "IHG Hotels & Resorts"),
    ("InterContinental",                "IHG Hotels & Resorts"),
    ("InterContinental Hotels Group",   "IHG Hotels & Resorts"),
    ("Crowne Plaza",                    "IHG Hotels & Resorts"),
    ("Holiday Inn",                     "IHG Hotels & Resorts"),
    ("Holiday Inn Express",             "IHG Hotels & Resorts"),
    ("Kimpton",                         "IHG Hotels & Resorts"),
    ("Six Senses",                      "IHG Hotels & Resorts"),
    ("Regent",                          "IHG Hotels & Resorts"),
    ("voco",                            "IHG Hotels & Resorts"),
    ("Hotel Indigo",                    "IHG Hotels & Resorts"),
]

ACCOR_BRANDS = [
    ("Accor",                           "Accor"),
    ("Sofitel",                         "Accor"),
    ("Pullman",                         "Accor"),
    ("MGallery",                        "Accor"),
    ("MGallery by Sofitel",             "Accor"),
    ("Fairmont",                        "Accor"),
    ("Raffles",                         "Accor"),
    ("Novotel",                         "Accor"),
    ("Mercure",                         "Accor"),
    ("ibis",                            "Accor"),
    ("ibis Styles",                     "Accor"),
    ("Swissotel",                       "Accor"),
    ("25hours",                         "Accor"),
    ("Mama Shelter",                    "Accor"),
    ("Banyan Tree",                     "Accor"),
    ("Mondrian",                        "Accor"),
]

HYATT_BRANDS = [
    ("Hyatt",                           "Hyatt Hotels Corporation"),
    ("Park Hyatt",                      "Hyatt Hotels Corporation"),
    ("Grand Hyatt",                     "Hyatt Hotels Corporation"),
    ("Hyatt Regency",                   "Hyatt Hotels Corporation"),
    ("Andaz",                           "Hyatt Hotels Corporation"),
    ("Alila",                           "Hyatt Hotels Corporation"),
    ("Thompson Hotels",                 "Hyatt Hotels Corporation"),
    ("Small Luxury Hotels",             "Hyatt Hotels Corporation"),
]

SPANISH_OPERATORS = [
    ("Meliá",                           "Meliá Hotels International"),
    ("melia",                           "Meliá Hotels International"),
    ("Gran Meliá",                      "Meliá Hotels International"),
    ("Innside by Melia",                "Meliá Hotels International"),
    ("Paradisus",                       "Meliá Hotels International"),
    ("Sol Hotels",                      "Meliá Hotels International"),
    ("NH Hotel Group",                  "Minor Hotels"),
    ("NH Collection",                   "Minor Hotels"),
    ("nhow",                            "Minor Hotels"),
    ("Minor Hotels",                    "Minor Hotels"),
    ("Anantara",                        "Minor Hotels"),
    ("Avani",                           "Minor Hotels"),
    ("Tivoli Hotels",                   "Minor Hotels"),
    ("Barceló",                         "Barceló Hotel Group"),
    ("Royal Hideaway",                  "Barceló Hotel Group"),
    ("Allegro Hotels",                  "Barceló Hotel Group"),
    ("Iberostar",                       "Iberostar Group"),
    ("Iberostar Selection",             "Iberostar Group"),
    ("Iberostar Grand",                 "Iberostar Group"),
    ("Hospes Hotels SL",                "Hospes Hotels"),
    ("GL Hotels",                       "GL Hotels"),
    ("Grupo Hotusa",                    "Grupo Hotusa"),
    ("Eurostars Hotels",                "Grupo Hotusa"),
    ("Vincci Hotels",                   "Vincci Hotels"),
    ("Silken Hotels",                   "Silken Hotels"),
    ("Palladium Hotel Group",           "Palladium Hotel Group"),
    ("Riu Hotels & Resorts",            "Riu Hotels & Resorts"),
    ("Riu Palace",                      "Riu Hotels & Resorts"),
]

INDEPENDENT_OPERATORS = [
    ("Four Seasons Hotels and Resorts", "Four Seasons Hotels and Resorts"),
    ("Four Seasons",                    "Four Seasons Hotels and Resorts"),
    ("Mandarin Oriental",               "Mandarin Oriental Hotel Group"),
    ("Rosewood",                        "Rosewood Hotels & Resorts"),
    ("Aman",                            "Aman Resorts"),
    ("Belmond",                         "Belmond"),
    ("Orient-Express",                  "Belmond"),
    ("Relais & Chateaux",               "Relais & Châteaux"),
]


class TestOperatorNormalization:
    @pytest.mark.parametrize("raw,expected", MARRIOTT_BRANDS)
    def test_marriott_brands(self, raw, expected):
        assert normalize_operator(raw) == expected

    @pytest.mark.parametrize("raw,expected", HILTON_BRANDS)
    def test_hilton_brands(self, raw, expected):
        assert normalize_operator(raw) == expected

    @pytest.mark.parametrize("raw,expected", IHG_BRANDS)
    def test_ihg_brands(self, raw, expected):
        assert normalize_operator(raw) == expected

    @pytest.mark.parametrize("raw,expected", ACCOR_BRANDS)
    def test_accor_brands(self, raw, expected):
        assert normalize_operator(raw) == expected

    @pytest.mark.parametrize("raw,expected", HYATT_BRANDS)
    def test_hyatt_brands(self, raw, expected):
        assert normalize_operator(raw) == expected

    @pytest.mark.parametrize("raw,expected", SPANISH_OPERATORS)
    def test_spanish_operators(self, raw, expected):
        assert normalize_operator(raw) == expected

    @pytest.mark.parametrize("raw,expected", INDEPENDENT_OPERATORS)
    def test_independent_operators(self, raw, expected):
        assert normalize_operator(raw) == expected

    def test_case_insensitive_upper(self):
        assert normalize_operator("MARRIOTT") == "Marriott International"

    def test_case_insensitive_lower(self):
        assert normalize_operator("marriott") == "Marriott International"

    def test_accent_insensitive_melia(self):
        assert normalize_operator("Melia Hotels International") == "Meliá Hotels International"

    def test_accent_insensitive_barcelo(self):
        assert normalize_operator("Barcelo") == "Barceló Hotel Group"
        assert normalize_operator("Barceló") == "Barceló Hotel Group"

    def test_unknown_operator_passthrough(self):
        assert normalize_operator("Boutique Local Operator") == "Boutique Local Operator"

    def test_unknown_operator_strips_whitespace(self):
        assert normalize_operator("  Some Unknown Brand  ") == "Some Unknown Brand"

    def test_none_returns_none(self):
        assert normalize_operator(None) is None

    def test_empty_returns_none(self):
        assert normalize_operator("") is None

    def test_whitespace_only_returns_none(self):
        assert normalize_operator("   ") is None


# ── normalize_region() ──────────────────────────────────────────────────────────

REGION_CASES = [
    ("Cataluna",              "Catalonia"),
    ("Cataluña",              "Catalonia"),
    ("Catalunya",             "Catalonia"),
    ("Catalonia",             "Catalonia"),
    ("cat",                   "Catalonia"),
    ("Andalucia",             "Andalusia"),
    ("Andalucía",             "Andalusia"),
    ("Andalusia",             "Andalusia"),
    ("Comunidad de Madrid",   "Community of Madrid"),
    ("Madrid Region",         "Community of Madrid"),
    ("madrid",                "Community of Madrid"),
    ("Pais Vasco",            "Basque Country"),
    ("País Vasco",            "Basque Country"),
    ("Euskadi",               "Basque Country"),
    ("Euskal Herria",         "Basque Country"),
    ("Comunidad Valenciana",  "Valencian Community"),
    ("Comunitat Valenciana",  "Valencian Community"),
    ("Islas Baleares",        "Balearic Islands"),
    ("Baleares",              "Balearic Islands"),
    ("Illes Balears",         "Balearic Islands"),
    ("Islas Canarias",        "Canary Islands"),
    ("Canary Islands",        "Canary Islands"),
    ("Canarias",              "Canary Islands"),
    ("Castilla y León",       "Castile and León"),
    ("Castilla y Leon",       "Castile and León"),
    ("Aragon",                "Aragón"),
    ("Principado de Asturias","Asturias"),
    ("Murcia",                "Region of Murcia"),
    ("Navarra",               "Navarre"),
    ("La Rioja",              "La Rioja"),
    ("Cantabria",             "Cantabria"),
    ("Galicia",               "Galicia"),
    ("Lisboa",                "Lisbon"),
    ("Porto",                 "Porto"),
    ("Algarve",               "Algarve"),
    ("Ile de France",         "Île-de-France"),
    ("Bavaria",               "Bavaria"),
    ("Bayern",                "Bavaria"),
]


class TestRegionNormalization:
    @pytest.mark.parametrize("raw,expected", REGION_CASES)
    def test_known_regions(self, raw, expected):
        assert normalize_region(raw) == expected

    def test_case_insensitive(self):
        assert normalize_region("CATALONIA") == "Catalonia"
        assert normalize_region("catalonia") == "Catalonia"

    def test_accent_insensitive(self):
        assert normalize_region("Castilla y León") == "Castile and León"
        assert normalize_region("Castilla y Leon") == "Castile and León"

    def test_unknown_returns_stripped(self):
        # "Murcia Region" is not a key (only "murcia" is) → passthrough
        assert normalize_region("Murcia Region") == "Murcia Region"

    def test_none_returns_none(self):
        assert normalize_region(None) is None

    def test_empty_returns_none(self):
        assert normalize_region("") is None

    def test_whitespace_only_returns_none(self):
        assert normalize_region("   ") is None

    def test_strips_whitespace_on_passthrough(self):
        assert normalize_region("  Murcia Region  ") == "Murcia Region"


# ── Alias dict integrity ─────────────────────────────────────────────────────────

class TestAliasIntegrity:
    """Validates every alias dict key is already in _key() form (pre-normalized)."""

    def test_hotel_name_alias_keys_prenormalized(self):
        bad = [k for k in HOTEL_NAME_ALIASES if _key(k) != k]
        assert bad == [], f"Keys not in _key() form: {bad}"

    def test_submarket_alias_keys_prenormalized(self):
        bad = [k for k in SUBMARKET_ALIASES if _key(k) != k]
        assert bad == [], f"Keys not in _key() form: {bad}"

    def test_market_alias_keys_prenormalized(self):
        bad = [k for k in MARKET_ALIASES if _key(k) != k]
        assert bad == [], f"Keys not in _key() form: {bad}"

    def test_operator_canonical_keys_prenormalized(self):
        bad = [k for k in OPERATOR_CANONICAL if _key(k) != k]
        assert bad == [], f"Keys not in _key() form: {bad}"

    def test_region_alias_keys_prenormalized(self):
        bad = [k for k in REGION_ALIASES if _key(k) != k]
        assert bad == [], f"Keys not in _key() form: {bad}"

    def test_no_duplicate_hotel_name_keys(self):
        keys = list(HOTEL_NAME_ALIASES.keys())
        assert len(keys) == len(set(keys))

    def test_no_duplicate_submarket_keys(self):
        keys = list(SUBMARKET_ALIASES.keys())
        assert len(keys) == len(set(keys))

    def test_no_duplicate_market_keys(self):
        keys = list(MARKET_ALIASES.keys())
        assert len(keys) == len(set(keys))

    def test_no_duplicate_operator_keys(self):
        keys = list(OPERATOR_CANONICAL.keys())
        assert len(keys) == len(set(keys))

    def test_no_duplicate_region_keys(self):
        keys = list(REGION_ALIASES.keys())
        assert len(keys) == len(set(keys))

    def test_hotel_name_alias_values_nonempty(self):
        bad = [k for k, v in HOTEL_NAME_ALIASES.items() if not v or not v.strip()]
        assert bad == []

    def test_submarket_alias_values_nonempty(self):
        bad = [k for k, v in SUBMARKET_ALIASES.items() if not v or not v.strip()]
        assert bad == []

    def test_operator_canonical_values_nonempty(self):
        bad = [k for k, v in OPERATOR_CANONICAL.items() if not v or not v.strip()]
        assert bad == []

    def test_region_alias_values_nonempty(self):
        bad = [k for k, v in REGION_ALIASES.items() if not v or not v.strip()]
        assert bad == []


# ── Multilingual inputs ──────────────────────────────────────────────────────────

class TestMultilingualInputs:
    """Correct handling of non-ASCII inputs from various languages."""

    def test_spanish_a_acute_strips_in_key(self):
        assert _key("Málaga") == "malaga"

    def test_spanish_melia_accent_normalizes(self):
        assert normalize_operator("Meliá Hotels International") == "Meliá Hotels International"
        assert normalize_operator("Melia Hotels International") == "Meliá Hotels International"

    def test_catalan_donostia_market(self):
        assert normalize_market("Donostia") == "San Sebastián"

    def test_basque_euskadi_region(self):
        assert normalize_region("Euskadi") == "Basque Country"

    def test_basque_pais_vasco_with_accent(self):
        assert normalize_region("País Vasco") == "Basque Country"
        assert normalize_region("Pais Vasco") == "Basque Country"

    def test_portuguese_region_lisboa(self):
        assert normalize_region("Lisboa") == "Lisbon"

    def test_french_hotel_prefix_stripping(self):
        k = hotel_dedup_key("Hôtel de Paris", "Paris")
        assert k == "de paris|paris"

    def test_german_umlaut_in_key(self):
        assert _key("München") == "munchen"
        assert _key("Zürich") == "zurich"

    def test_french_ile_de_france_with_accent(self):
        assert normalize_region("Île-de-France") == "Île-de-France"

    def test_french_ile_de_france_without_accent(self):
        assert normalize_region("Ile de France") == "Île-de-France"

    def test_accent_variant_submarket_equivalence(self):
        assert normalize_submarket("Malaga City Center") == normalize_submarket("Málaga City Center")

    def test_catalan_l_dot_l_does_not_raise(self):
        result = _key("col·legi")
        assert isinstance(result, str)

    def test_combining_chars_in_operator_input(self):
        # e + combining acute = é; should normalize the same as é
        e_acute_composed = "é"       # é precomposed
        e_acute_decomposed = "é"   # e + combining acute
        assert _key("meli" + e_acute_decomposed) == _key("meli" + e_acute_composed)


# ── Malformed data ───────────────────────────────────────────────────────────────

_ALL_NORMALIZERS = [
    normalize_hotel_name,
    normalize_submarket,
    normalize_market,
    normalize_operator,
    normalize_region,
]


class TestMalformedData:

    @pytest.mark.parametrize("fn", _ALL_NORMALIZERS)
    def test_none_returns_none(self, fn):
        assert fn(None) is None

    @pytest.mark.parametrize("fn", _ALL_NORMALIZERS)
    def test_empty_string_returns_none(self, fn):
        assert fn("") is None

    @pytest.mark.parametrize("fn", _ALL_NORMALIZERS)
    def test_whitespace_only_returns_none(self, fn):
        assert fn("   ") is None

    def test_very_long_string_does_not_raise(self):
        long_name = "A" * 10_000
        result = normalize_hotel_name(long_name)
        assert result == long_name

    def test_only_hyphens_dedup_key(self):
        assert hotel_dedup_key("---", "Barcelona") == "|barcelona"

    def test_only_punctuation_dedup_key(self):
        assert hotel_dedup_key("(((,,,)))", "Barcelona") == "|barcelona"

    def test_numeric_string_passthrough(self):
        assert normalize_hotel_name("12345") == "12345"
        assert normalize_operator("12345") == "12345"

    def test_newline_in_name_does_not_raise(self):
        result = normalize_hotel_name("Hotel\nArts\nBarcelona")
        assert result is not None

    def test_null_byte_does_not_raise(self):
        result = normalize_hotel_name("Hotel\x00Arts")
        assert result is not None

    def test_html_entity_passthrough(self):
        result = normalize_hotel_name("H&ocirc;tel de Ville")
        assert result == "H&ocirc;tel de Ville"

    def test_single_character_passthrough(self):
        assert normalize_market("X") == "X"

    def test_dedup_key_both_empty(self):
        assert hotel_dedup_key("", "") == "|"

    def test_key_on_empty_string(self):
        assert _key("") == ""

    def test_unicode_control_characters_do_not_crash(self):
        for fn in _ALL_NORMALIZERS:
            result = fn("Hotel\x01\x02\x03Arts")
            assert result is not None


# ── Fuzzy matching baseline ──────────────────────────────────────────────────────

class TestFuzzyMatchingBaseline:
    """
    Documents what the current exact-match system CANNOT resolve.
    Each test confirms current behavior as a regression anchor.
    If a test starts passing, it means fuzzy matching was added for that case.
    """

    def test_typo_hotel_name_not_resolved(self):
        assert normalize_hotel_name("Hotel Arts Barcleona") == "Hotel Arts Barcleona"

    def test_transposed_words_not_resolved(self):
        assert normalize_hotel_name("Barcelona Arts Hotel") == "Barcelona Arts Hotel"

    def test_abbreviated_operator_not_resolved(self):
        assert normalize_operator("Marriott Intl") == "Marriott Intl"

    def test_single_letter_abbreviation_not_resolved(self):
        # "MO" is not mapped to Mandarin Oriental
        assert normalize_operator("MO") == "MO"

    def test_partial_submarket_not_resolved(self):
        assert normalize_submarket("BCN") == "BCN"

    def test_typo_region_not_resolved(self):
        # "Catalona" (missing 'i')
        assert normalize_region("Catalona") == "Catalona"

    def test_extra_descriptor_submarket_not_resolved(self):
        assert normalize_submarket("Málaga Costa") == "Málaga Costa"

    def test_operator_with_country_suffix_not_resolved(self):
        assert normalize_operator("Marriott Spain") == "Marriott Spain"

    def test_dedup_key_typo_does_not_match(self):
        k1 = hotel_dedup_key("Hotel Arts Barcleona", "Barcelona")
        k2 = hotel_dedup_key("Hotel Arts Barcelona", "Barcelona")
        assert k1 != k2

    def test_dedup_key_word_order_does_not_match(self):
        k1 = hotel_dedup_key("Hotel Arts Barcelona", "Barcelona")
        k2 = hotel_dedup_key("Barcelona Arts Hotel", "Barcelona")
        assert k1 != k2
