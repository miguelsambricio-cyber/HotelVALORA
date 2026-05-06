"""
Field and geography mapping reference report.

Shows:
  - CoStar -> internal column mappings for all export types
  - Geography normalization (city aliases + country codes)
  - Chain scale normalization table

Run from repo root:
    PYTHONPATH=apps/api:services/data_pipeline python scripts/import/mapping_report.py
"""
from __future__ import annotations

import sys
from pathlib import Path

_ROOT = Path(__file__).parents[2]
for _p in [str(_ROOT / "apps" / "api"), str(_ROOT / "services" / "data_pipeline")]:
    if _p not in sys.path:
        sys.path.insert(0, _p)

from pipeline.cleaning.geography import CITY_CANONICAL, COUNTRY_ALIASES, normalize_city, normalize_country
from pipeline.costar.normalizer import MARKET_FIELD_MAP, PROPERTY_FIELD_MAP, TRANSACTION_FIELD_MAP

_CHAIN_SCALE_MAP = {
    "luxury": "luxury", "upper upscale": "upper_upscale", "upscale": "upscale",
    "upper midscale": "upper_midscale", "midscale": "midscale", "economy": "economy",
    "budget": "economy", "select service": "select", "extended stay": "extended_stay",
    "full service": "full_service", "boutique": "boutique",
}

def normalize_chain_scale(raw):
    if not raw:
        return None
    return _CHAIN_SCALE_MAP.get(raw.strip().lower(), raw.strip().lower())


def _section(title: str) -> None:
    print(f"\n{'='*62}")
    print(f"  {title}")
    print(f"{'='*62}")


def _subsection(title: str) -> None:
    print(f"\n  {title}")
    print(f"  {'-'*58}")


# ── 1. CoStar field mappings ────────────────────────────────────────────────────

_section("CoStar Column -> Internal Field Mappings")

_subsection("Property Export (costar_hotels.xlsx)")
for src, dst in PROPERTY_FIELD_MAP.items():
    print(f"    {src:<35} -> {dst}")

_subsection("Transaction Export (costar_transactions.xlsx)")
for src, dst in TRANSACTION_FIELD_MAP.items():
    print(f"    {src:<35} -> {dst}")

_subsection("Market Stats Export (costar_market.xlsx)")
for src, dst in MARKET_FIELD_MAP.items():
    print(f"    {src:<35} -> {dst}")


# ── 2. Geography normalization ─────────────────────────────────────────────────

_section("Geography Normalization")

_subsection("City alias -> canonical display name (selected)")
TEST_CITIES = [
    "BARCELONA", "madrid", "sevilla", "MALAGA", "malaga",
    "Lisboa", "LONDON", "nueva york", "new york city",
    "Milano", "PARIS", "FRANKFURT",
]
for city in TEST_CITIES:
    canonical = normalize_city(city)
    print(f"    {city!r:<30} -> {canonical!r}")

_subsection("Country alias -> ISO-2 code (selected)")
TEST_COUNTRIES = [
    "spain", "espana", "SPAIN", "ES",
    "france", "FR", "Portugal", "PT",
    "United Kingdom", "uk", "GB",
    "USA", "United States", "us",
    "germany", "DE", "Deutschland",
    "italia", "IT",
]
for c in TEST_COUNTRIES:
    print(f"    {c!r:<30} -> {normalize_country(c)!r}")

print(f"\n  Total city aliases registered:   {len(CITY_CANONICAL)}")
print(f"  Total country aliases registered: {len(COUNTRY_ALIASES)}")


# ── 3. Chain scale normalization ───────────────────────────────────────────────

_section("Chain Scale Normalization")
TEST_SCALES = [
    "Luxury", "luxury",
    "Upper Upscale", "upper upscale",
    "Upscale", "upscale",
    "Upper Midscale", "upper midscale",
    "Midscale", "midscale",
    "Economy", "economy",
    "Extended Stay", "extended-stay",
    "Select Service", "select service",
    "Full Service", "full service",
    "Boutique", "boutique",
]
seen: dict[str, str] = {}
for scale in TEST_SCALES:
    normalized = normalize_chain_scale(scale)
    key = scale.lower().replace(" ", "").replace("-", "")
    if key not in seen:
        print(f"    {scale!r:<35} -> {normalized!r}")
        seen[key] = normalized


# ── 4. Template field reference ────────────────────────────────────────────────

_section("Internal Template Field Reference")

print("""
  Template: hotels
  -----------------------------------------------------------
  Column           Type      Required  Notes
  -----------------------------------------------------------
  name             str       YES       hotel display name
  city             str       YES       normalized to canonical
  country          str       no        ISO-2 (default: ES)
  total_keys       int       YES       1-10,000
  brand            str       no        brand name
  chain_scale      str       no        Luxury/Upper Upscale/...
  year_built       int       no        1800-2035
  star_rating      float     no        1-5
  asset_status     str       no        operating/pipeline/...
  operator         str       no        management company
  submarket        str       no        CoStar submarket name
  latitude         float     no        -90 to 90
  longitude        float     no        -180 to 180

  Template: transactions
  -----------------------------------------------------------
  Column           Type      Required  Notes
  -----------------------------------------------------------
  property_name    str       YES       hotel name at sale
  city             str       YES
  sale_date        str       YES       YYYY-MM-DD or MM/YYYY
  total_keys       int       no
  sale_price       float     no        EUR total price
  price_per_key    float     no        EUR per room
  cap_rate         float     no        going-in cap rate (decimal)
  buyer            str       no
  seller           str       no

  Template: market
  -----------------------------------------------------------
  Column           Type      Required  Notes
  -----------------------------------------------------------
  submarket        str       YES       CoStar submarket name
  city             str       YES
  year             int       YES       YYYY
  occupancy        float     no        0-1 (or % string)
  adr              float     no        EUR average daily rate
  revpar           float     no        EUR revenue per avail. room
  supply           int       no        total available rooms
  demand           int       no        total room nights sold
  revpar_change    float     no        YoY % change (decimal)

  Template: financials
  -----------------------------------------------------------
  Column           Type      Required  Notes
  -----------------------------------------------------------
  year             int       YES       fiscal year YYYY
  total_revenue    float     YES       EUR total hotel revenue
  rooms_revenue    float     no        EUR rooms department
  fb_revenue       float     no        EUR F&B department
  total_expenses   float     no        EUR total operating expenses
  noi              float     no        EUR net operating income
  ebitda           float     no        EUR EBITDA
  noi_margin       float     no        NOI / total_revenue (decimal)
  occupancy_rate   float     no        0-1
  adr              float     no        EUR ADR
  revpar           float     no        EUR RevPAR
""")
