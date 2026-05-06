"""
Normalization rules demo — shows before/after for all six rule categories.

Run from repo root:
    PYTHONPATH=apps/api:services/data_pipeline python scripts/import/normalization_report.py
"""
from __future__ import annotations

import csv
import sys
from pathlib import Path

_ROOT = Path(__file__).parents[2]
for _p in [str(_ROOT / "apps" / "api"), str(_ROOT / "services" / "data_pipeline")]:
    if _p not in sys.path:
        sys.path.insert(0, _p)

from pipeline.cleaning.geography import normalize_city, normalize_country
from pipeline.cleaning.names import (
    OPERATOR_CANONICAL,
    SUBMARKET_ALIASES,
    hotel_dedup_key,
    normalize_hotel_name,
    normalize_market,
    normalize_operator,
    normalize_region,
    normalize_submarket,
)

W = 52  # column width

def sep(char="=", n=72): print(char * n)
def section(title): sep(); print(f"  {title}"); sep()
def sub(title): print(f"\n  {title}"); sep("-", 68)
def row(raw, result): print(f"    {str(raw)!r:<{W}} -> {str(result)!r}")


# ── 1. Hotel name normalization ─────────────────────────────────────────────────

section("1. Hotel Name Normalization")
print("  Aliases: CoStar variant names resolved to canonical internal names.\n")

HOTEL_TESTS = [
    # Known aliases
    "arts hotel barcelona",
    "ritz-carlton barcelona",
    "w hotel barcelona",
    "nh collection eurobuilding",
    "palacio del bailio",
    "melia castilla madrid",
    "hotel miramar malaga",
    "gran melia duques",
    # No alias -> returns as-is
    "Hotel Arts Barcelona",
    "NH Collection Madrid Eurobuilding",
    "Gran Hotel Miramar",
    "Hospes Palacio del Bailío",
    "Meliá Castilla",
]
for name in HOTEL_TESTS:
    row(name, normalize_hotel_name(name))


# ── 2. Hotel dedup keys ─────────────────────────────────────────────────────────

section("2. Duplicate Asset Detection Keys")
print("  hotel_dedup_key() strips prefixes + normalizes accents for comparison.\n")
print(f"    {'Name':<45}  {'City':<15}  Key")
print(f"    {'-'*45}  {'-'*15}  {'-'*30}")

DEDUP_TESTS = [
    ("Hotel Arts Barcelona",              "Barcelona"),
    ("Gran Hotel Miramar",               "Malaga"),
    ("Gran Hotel Miramar",               "Málaga"),    # same key as above
    ("Hotel Miramar",                    "Malaga"),    # same key -- true dupe
    ("Meliá Castilla",                   "Madrid"),
    ("Melia Castilla",                   "Madrid"),    # same key -- true dupe
    ("NH Collection Madrid Eurobuilding","Madrid"),
    ("Palacio de los Duques Gran Meliá", "Madrid"),
    ("Hotel W Barcelona",                "Barcelona"),
    ("W Barcelona",                      "Barcelona"), # same key -- true dupe
    ("Hotel Casa Fuster",                "Barcelona"),
    ("Casa Fuster Barcelona",            "Barcelona"), # same key -- true dupe
]
prev_key = None
for name, city in DEDUP_TESTS:
    k = hotel_dedup_key(name, city)
    marker = " <-- DUPE" if k == prev_key else ""
    print(f"    {name!r:<45}  {city!r:<15}  {k!r}{marker}")
    prev_key = k


# ── 3. Submarket normalization ───────────────────────────────────────────────────

section("3. Submarket Normalization")
print(f"  {len(SUBMARKET_ALIASES)} aliases registered.\n")

SUB_TESTS = [
    # Barcelona
    ("Barcelona City Center", "Barcelona CBD"),
    ("BCN CBD",               "Barcelona CBD"),
    ("Barcelona Centro",      "Barcelona CBD"),
    ("Barceloneta",           "Barcelona Beach"),
    ("Barcelona Waterfront",  "Barcelona Beach"),
    ("22@ Barcelona",         "Barcelona 22@"),
    ("Zona Alta",             "Barcelona Zona Alta"),
    # Madrid
    ("Madrid City Center",    "Madrid CBD"),
    ("Centro Madrid",         "Madrid CBD"),
    ("IFEMA",                 "Madrid IFEMA"),
    ("Madrid Airport",        "Madrid IFEMA"),
    ("Barajas",               "Madrid IFEMA"),
    ("Paseo de la Castellana","Madrid Castellana"),
    # Sevilla / Malaga
    ("Seville City Center",   "Sevilla Centro"),
    ("Sevilla Casco Historico","Sevilla Centro"),
    ("Malaga City Center",    "Málaga Centro"),
    ("Malaga Port",           "Málaga Puerto"),
    # Already canonical -> unchanged
    ("Barcelona CBD",         "Barcelona CBD"),
    ("Madrid IFEMA",          "Madrid IFEMA"),
    # Unknown -> returned as-is
    ("Brand New Submarket",   "Brand New Submarket"),
]
sub("Input -> Canonical")
for raw, expected in SUB_TESTS:
    result = normalize_submarket(raw)
    match = "OK " if result == expected else "ERR"
    print(f"    [{match}]  {raw!r:<38} -> {result!r}")


# ── 4. Market (city-level) normalization ────────────────────────────────────────

section("4. Market Name Normalization")
print("  CoStar market labels resolved to canonical city names.\n")

MARKET_TESTS = [
    "Barcelona Market",
    "Barcelona Metropolitan Area",
    "Madrid MSA",
    "Comunidad de Madrid",
    "Costa del Sol",
    "Pais Vasco",
    "Baleares",
    "Islas Canarias",    # -> "Canary Islands"
    "Gran Canaria",
    "Galicia",
    "Barcelona",   # already canonical
    "Madrid",      # already canonical
]
for m in MARKET_TESTS:
    row(m, normalize_market(m))


# ── 5. Operator normalization ────────────────────────────────────────────────────

section("5. Operator Normalization")
print(f"  {len(OPERATOR_CANONICAL)} operator/brand aliases -> canonical parent company.\n")

OP_TESTS = [
    # Marriott family
    ("Ritz-Carlton",             "Marriott International"),
    ("W Hotels",                 "Marriott International"),
    ("AC Hotels by Marriott",    "Marriott International"),
    ("A Luxury Collection",      "Marriott International"),
    ("Autograph Collection",     "Marriott International"),
    ("Four Seasons Hotels and Resorts", "Four Seasons Hotels and Resorts"),  # independent
    # Hilton family
    ("Hilton",                   "Hilton Worldwide"),
    ("Hilton Worldwide",         "Hilton Worldwide"),
    ("DoubleTree by Hilton",     "Hilton Worldwide"),
    ("Waldorf Astoria",          "Hilton Worldwide"),
    ("Curio Collection",         "Hilton Worldwide"),
    # IHG
    ("InterContinental Hotels Group", "IHG Hotels & Resorts"),
    ("Crowne Plaza",             "IHG Hotels & Resorts"),
    ("Kimpton",                  "IHG Hotels & Resorts"),
    ("Six Senses",               "IHG Hotels & Resorts"),
    # Accor
    ("Sofitel",                  "Accor"),
    ("MGallery",                 "Accor"),
    ("Fairmont",                 "Accor"),
    ("Novotel",                  "Accor"),
    # Meliá
    ("Meliá",                    "Meliá Hotels International"),
    ("melia",                    "Meliá Hotels International"),
    ("Gran Meliá",               "Meliá Hotels International"),
    ("Innside by Melia",         "Meliá Hotels International"),
    # NH / Minor Hotels
    ("NH Hotel Group",           "Minor Hotels"),
    ("NH Collection",            "Minor Hotels"),
    ("nhow",                     "Minor Hotels"),
    ("Minor Hotels",             "Minor Hotels"),
    ("Anantara",                 "Minor Hotels"),
    # Spanish groups
    ("Barceló",                  "Barceló Hotel Group"),
    ("Royal Hideaway",           "Barceló Hotel Group"),
    ("Iberostar",                "Iberostar Group"),
    ("Hospes Hotels SL",         "Hospes Hotels"),
    ("GL Hotels",                "GL Hotels"),
    ("Grupo Hotusa",             "Grupo Hotusa"),
    ("Eurostars Hotels",         "Grupo Hotusa"),
    # Unknown -> returned as-is
    ("Boutique Local Operator",  "Boutique Local Operator"),
]
sub("Brand/variant -> Parent operator")
for raw, expected in OP_TESTS:
    result = normalize_operator(raw)
    match = "OK " if result == expected else "ERR"
    print(f"    [{match}]  {raw!r:<40} -> {result!r}")


# ── 6. Region / state normalization ─────────────────────────────────────────────

section("6. Region / State Normalization")
print("  CoStar 'State' field variants -> canonical English region name.\n")

REGION_TESTS = [
    # Spanish regions with encoding variants
    ("Cataluna",               "Catalonia"),
    ("Cataluña",               "Catalonia"),
    ("Catalunya",              "Catalonia"),
    ("Andalucia",              "Andalusia"),
    ("Andalucía",              "Andalusia"),
    ("Comunidad de Madrid",    "Community of Madrid"),
    ("Madrid Region",          "Community of Madrid"),
    ("Pais Vasco",             "Basque Country"),
    ("Euskadi",                "Basque Country"),
    ("Comunidad Valenciana",   "Valencian Community"),
    ("Islas Baleares",         "Balearic Islands"),
    ("Illes Balears",          "Balearic Islands"),
    ("Islas Canarias",         "Canary Islands"),
    ("Castilla y León",        "Castile and León"),
    ("Castilla y Leon",        "Castile and León"),
    ("Aragon",                 "Aragón"),
    ("Principado de Asturias", "Asturias"),
    # Already canonical
    ("Catalonia",              "Catalonia"),
    ("Andalusia",              "Andalusia"),
    # Unknown -> returned as-is
    ("Murcia Region",          "Murcia Region"),
]
for raw, expected in REGION_TESTS:
    result = normalize_region(raw)
    match = "OK " if result == expected else "ERR"
    print(f"    [{match}]  {raw!r:<32} -> {result!r}")


# ── 7. Cross-source dedup simulation ────────────────────────────────────────────

section("7. Cross-Source Duplicate Simulation")
print("  Simulates what _find_duplicate() sees when matching across CoStar + internal.\n")

# Load names from sample files
sources: list[tuple[str, str, str]] = []
for fname, src, col_name, col_city in [
    ("data/samples/costar_hotels.csv",       "CoStar Props", "Property Name", "City"),
    ("data/samples/costar_transactions.csv", "CoStar Trans", "Property Name", "City"),
    ("data/samples/internal_hotels.csv",     "Internal",     "name",          "city"),
]:
    p = _ROOT / fname
    if not p.exists():
        continue
    with open(p, encoding="utf-8") as f:
        for r in csv.DictReader(f):
            name = r.get(col_name, "").strip()
            city = r.get(col_city, "").strip()
            if name and city:
                sources.append((src, name, city))

# Group by dedup key
from collections import defaultdict
by_key: dict[str, list[tuple[str, str]]] = defaultdict(list)
for src, name, city in sources:
    k = hotel_dedup_key(name, city)
    by_key[k].append((src, name))

print(f"  Total entries: {len(sources)}  |  Unique dedup keys: {len(by_key)}\n")
print(f"  {'Dedup key':<45}  Sources")
print(f"  {'-'*45}  {'-'*30}")
for k, entries in sorted(by_key.items()):
    srcs_str = ", ".join(f"[{s}] {n!r}" for s, n in entries)
    marker = "  <-- CROSS-MATCH" if len(set(s for s, _ in entries)) > 1 else ""
    print(f"  {k!r:<47} {srcs_str}{marker}")

sep()
print("  Normalization report complete.")
sep()
