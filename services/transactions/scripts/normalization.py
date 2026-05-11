"""Field-by-field normalisation per `docs/intelligence/data-normalization-rules.md`.

Each normaliser is a pure function: input → (normalised_value, review_reasons[]).
The orchestrator (`ingest.py`) collects review_reasons across all fields of a row
and decides routing (MASTER vs staging/review vs staging/failed).
"""

from __future__ import annotations

import re
from datetime import date, datetime
from typing import Any

from dedup import strip_diacritics

NORMALIZATION_VERSION = "v1.0"

# ---------------------------------------------------------------------------
# Header aliases — operator-friendly. Input columns get folded into the
# canonical schema column names via case-insensitive + punctuation-stripped match.
# ---------------------------------------------------------------------------

def _hkey(s: str) -> str:
    s = strip_diacritics(str(s)).lower().strip()
    return re.sub(r"[^a-z0-9]+", "_", s).strip("_")


_TRANSACTION_HEADER_ALIASES: dict[str, str] = {
    # Identification
    "category": "category", "categoria": "category", "deal_type": "category", "transaction_type": "category",
    "asset_type": "asset_type", "tipo_activo": "asset_type",
    "asset_name": "asset_name", "asset": "asset_name", "property": "asset_name", "property_name": "asset_name", "hotel": "asset_name", "hotel_name": "asset_name", "nombre_hotel": "asset_name",
    "portfolio_name": "portfolio_name", "portfolio": "portfolio_name", "cartera": "portfolio_name",
    "portfolio_size_assets": "portfolio_size_assets", "portfolio_size": "portfolio_size_assets", "n_assets": "portfolio_size_assets",
    # Geo
    "city": "city", "ciudad": "city",
    "country": "country", "pais": "country",
    "market": "market", "mercado": "market",
    "submarket": "submarket", "submercado": "submarket",
    "address": "address", "direccion": "address",
    "latitude": "latitude", "lat": "latitude",
    "longitude": "longitude", "lon": "longitude", "lng": "longitude",
    # Asset
    "rooms": "rooms", "habitaciones": "rooms", "keys": "rooms",
    "hotel_segment": "hotel_segment", "segment": "hotel_segment", "segmento": "hotel_segment",
    "star_rating": "star_rating", "stars": "star_rating", "estrellas": "star_rating",
    "year_built": "year_built", "ano_construccion": "year_built", "built": "year_built",
    "year_renovated": "year_renovated", "ano_renovacion": "year_renovated", "renovated": "year_renovated", "refurb": "year_renovated",
    "gross_area_sqm": "gross_area_sqm", "sqm": "gross_area_sqm", "m2": "gross_area_sqm", "gross_area": "gross_area_sqm",
    # Pricing
    "price_eur": "price_eur", "price": "price_eur", "deal_value": "price_eur", "transaction_price": "price_eur", "precio": "price_eur", "valor": "price_eur", "valor_operacion": "price_eur",
    "price_currency_original": "price_currency_original", "currency": "price_currency_original", "moneda": "price_currency_original",
    "price_per_key_eur": "price_per_key_eur", "price_per_key": "price_per_key_eur", "precio_por_llave": "price_per_key_eur",
    "cap_rate": "cap_rate", "tasa_capitalizacion": "cap_rate",
    "gop_per_key_eur": "gop_per_key_eur", "gop_per_key": "gop_per_key_eur",
    "revpar_at_closing_eur": "revpar_at_closing_eur", "revpar": "revpar_at_closing_eur",
    # Timing
    "closed_at": "closed_at", "close_date": "closed_at", "fecha_cierre": "closed_at",
    "announced_at": "announced_at", "announce_date": "announced_at", "fecha_anuncio": "announced_at",
    # Parties
    "buyer_name": "buyer_name", "buyer": "buyer_name", "comprador": "buyer_name",
    "buyer_uid": "buyer_uid",
    "buyer_country": "buyer_country", "buyer_hq": "buyer_country",
    "buyer_kind": "buyer_kind", "buyer_type": "buyer_kind",
    "seller_name": "seller_name", "seller": "seller_name", "vendedor": "seller_name",
    "seller_uid": "seller_uid",
    "seller_country": "seller_country",
    "seller_kind": "seller_kind",
    "broker": "broker", "advisor": "broker", "asesor": "broker",
    "operator_at_closing": "operator_at_closing", "operator": "operator_at_closing", "operador": "operator_at_closing",
    "operator_post_closing": "operator_post_closing", "new_operator": "operator_post_closing", "nuevo_operador": "operator_post_closing",
    "brand_at_closing": "brand_at_closing", "brand": "brand_at_closing", "marca": "brand_at_closing",
    "brand_post_closing": "brand_post_closing", "new_brand": "brand_post_closing", "nueva_marca": "brand_post_closing",
    "financing_type": "financing_type", "financing": "financing_type", "financiacion": "financing_type",
    "disclosed_terms": "disclosed_terms",
    # Provenance
    "press_release_url": "press_release_url", "press_release": "press_release_url", "nota_prensa": "press_release_url",
    "news_url": "news_url", "url": "news_url", "noticia": "news_url",
    # Source meta (operator may include these for non-news sources)
    "source_kind": "source_kind",
    "source_file": "source_file",
    "source_url": "source_url",
    "notes": "notes", "notas": "notes",
}

_PROJECT_HEADER_ALIASES: dict[str, str] = {
    "category": "category", "categoria": "category",
    "asset_type": "asset_type",
    "project_name": "project_name", "project": "project_name", "proyecto": "project_name",
    "city": "city", "ciudad": "city",
    "country": "country", "pais": "country",
    "market": "market", "mercado": "market",
    "submarket": "submarket",
    "address": "address", "direccion": "address",
    "latitude": "latitude", "lat": "latitude",
    "longitude": "longitude", "lon": "longitude", "lng": "longitude",
    "rooms": "rooms", "habitaciones": "rooms", "keys": "rooms",
    "gross_area_sqm": "gross_area_sqm", "sqm": "gross_area_sqm", "m2": "gross_area_sqm",
    "capex_eur": "capex_eur", "capex": "capex_eur", "inversion": "capex_eur", "inversion_total": "capex_eur",
    "capex_per_key_eur": "capex_per_key_eur", "capex_per_key": "capex_per_key_eur",
    "estimated_opening": "estimated_opening", "opening_date": "estimated_opening", "fecha_apertura": "estimated_opening", "apertura_prevista": "estimated_opening",
    "groundbreaking": "groundbreaking", "construction_start": "groundbreaking", "inicio_construccion": "groundbreaking",
    "announced_at": "announced_at", "announce_date": "announced_at", "fecha_anuncio": "announced_at",
    "project_stage": "project_stage", "stage": "project_stage", "etapa": "project_stage", "fase": "project_stage",
    "permitting_status": "permitting_status", "licencia": "permitting_status",
    "developer_name": "developer_name", "developer": "developer_name", "promotor": "developer_name",
    "developer_uid": "developer_uid",
    "developer_country": "developer_country",
    "developer_kind": "developer_kind",
    "operator_name": "operator_name", "operator": "operator_name", "operador": "operator_name",
    "operator_uid": "operator_uid",
    "operator_kind": "operator_kind",
    "brand": "brand", "marca": "brand",
    "hotel_segment": "hotel_segment", "segment": "hotel_segment",
    "star_rating": "star_rating", "stars": "star_rating",
    "mixed_use_flag": "mixed_use_flag", "mixed_use": "mixed_use_flag",
    "mixed_use_components": "mixed_use_components",
    "public_subsidy_flag": "public_subsidy_flag", "public_subsidy": "public_subsidy_flag", "subvencion": "public_subsidy_flag",
    "press_release_url": "press_release_url",
    "news_url": "news_url", "url": "news_url",
    "source_kind": "source_kind",
    "source_file": "source_file",
    "source_url": "source_url",
    "notes": "notes",
}


def fold_header(target: str, raw_header: str) -> str | None:
    """Map an operator's raw header to a canonical column. None when unknown."""
    aliases = _TRANSACTION_HEADER_ALIASES if target == "transactions" else _PROJECT_HEADER_ALIASES
    return aliases.get(_hkey(raw_header))


# ---------------------------------------------------------------------------
# Controlled vocabularies
# ---------------------------------------------------------------------------

CATEGORY_TX = {"acquisition", "sale", "joint_venture", "refinancing", "distress"}
CATEGORY_PJ = {"development", "branded_residences", "flex_living", "pipeline_announcement", "rebranding", "operator_change"}

ASSET_TYPE_TX = {"single_property", "portfolio", "mixed_use"}
ASSET_TYPE_PJ = {"new_build", "conversion", "refurb", "extension", "mixed_use"}

HOTEL_SEGMENTS = {
    "luxury", "upper_upscale", "upscale", "upper_midscale", "midscale", "economy",
    "lifestyle", "resort", "boutique", "mixed_use", "serviced_apartments", "unknown",
}

INVESTOR_KINDS = {
    "pe", "reit", "sovereign", "family_office", "private_owner", "bank",
    "operator_owned", "hospitality_fund", "asset_manager", "developer", "unknown",
}

OPERATOR_KINDS = {
    "chain", "independent", "soft_brand", "franchise", "management_company",
    "operator_owner", "unknown",
}

PROJECT_STAGES = {
    "announced", "permitting", "under_construction", "pre_opening",
    "opened", "cancelled", "on_hold",
}

FINANCING_TYPES = {"equity", "senior_loan", "mezzanine", "cmbs", "mixed", "unknown"}
DISCLOSED_TERMS = {"full", "partial", "nondisclosed"}

SOURCE_KINDS = {"costar", "brokerage", "curated", "news_extract", "manual", "press_release"}


# Spanish → canonical mappings (case-insensitive)
_CATEGORY_TX_SYNONYMS = {
    "adquisicion": "acquisition", "adquisición": "acquisition", "compra": "acquisition", "buy": "acquisition",
    "venta": "sale",
    "joint venture": "joint_venture", "jv": "joint_venture",
    "refinanciacion": "refinancing", "refinanciación": "refinancing", "refinance": "refinancing",
    "distress": "distress", "distressed": "distress", "concurso": "distress", "default": "distress",
}
_CATEGORY_PJ_SYNONYMS = {
    "nueva apertura": "development", "nuevo hotel": "development", "new build": "development",
    "branded residences": "branded_residences", "residencias de marca": "branded_residences",
    "flex living": "flex_living", "coliving": "flex_living",
    "rebranding": "rebranding", "cambio de marca": "rebranding",
    "cambio de operador": "operator_change", "operator change": "operator_change",
    "pipeline": "pipeline_announcement", "anuncio": "pipeline_announcement",
}
_SEGMENT_SYNONYMS = {
    "lujo": "luxury", "5 estrellas": "luxury", "cinco estrellas": "luxury", "5*": "luxury",
    "upper upscale": "upper_upscale",
    "upper midscale": "upper_midscale",
    "serviced apartments": "serviced_apartments", "apartamentos con servicios": "serviced_apartments",
}


def _norm_enum(value: Any, vocab: set[str], synonyms: dict[str, str] | None = None) -> tuple[str | None, str | None]:
    """Returns (canonical_value_or_None, review_reason_or_None)."""
    if value in (None, ""):
        return None, None
    s = strip_diacritics(str(value)).lower().strip()
    s = re.sub(r"\s+", " ", s)
    if s in vocab:
        return s, None
    s_underscore = s.replace(" ", "_")
    if s_underscore in vocab:
        return s_underscore, None
    if synonyms and s in synonyms:
        return synonyms[s], None
    return None, f"enum_unknown:{value}"


# ---------------------------------------------------------------------------
# Field normalisers
# ---------------------------------------------------------------------------

_COUNTRY_NAME_TO_ISO = {
    "spain": "ES", "espana": "ES", "españa": "ES",
    "portugal": "PT",
    "france": "FR", "francia": "FR",
    "italy": "IT", "italia": "IT",
    "germany": "DE", "alemania": "DE",
    "united kingdom": "GB", "uk": "GB", "great britain": "GB", "reino unido": "GB", "england": "GB",
    "ireland": "IE", "irlanda": "IE",
    "netherlands": "NL", "holanda": "NL",
    "belgium": "BE", "belgica": "BE",
    "switzerland": "CH", "suiza": "CH",
    "austria": "AT",
    "greece": "GR", "grecia": "GR",
    "united states": "US", "usa": "US", "estados unidos": "US",
    "mexico": "MX", "méxico": "MX",
    "morocco": "MA", "marruecos": "MA",
}


def norm_country(value: Any) -> tuple[str | None, str | None]:
    if value in (None, ""):
        return None, None
    s = str(value).strip()
    if len(s) == 2 and s.isalpha():
        return s.upper(), None
    folded = strip_diacritics(s).lower().strip()
    iso = _COUNTRY_NAME_TO_ISO.get(folded)
    if iso:
        return iso, None
    return None, f"country_unrecognised:{value}"


def norm_city(value: Any) -> tuple[str | None, str | None]:
    if value in (None, ""):
        return None, None
    s = str(value).strip()
    if not s:
        return None, None
    # Title-case display, but allow "de" / "del" / "la" / "el" lowercase in middle words
    parts = s.split()
    fixed = []
    for i, p in enumerate(parts):
        low = p.lower()
        if i > 0 and low in ("de", "del", "la", "el", "los", "las", "y", "i"):
            fixed.append(low)
        else:
            fixed.append(p[:1].upper() + p[1:].lower())
    return " ".join(fixed), None


def _coerce_float(value: Any) -> float | None:
    if value in (None, ""):
        return None
    if isinstance(value, (int, float)):
        return float(value)
    s = str(value).strip()
    # Strip currency symbols + thousand separators
    s = re.sub(r"[€$£¥]", "", s)
    s = s.replace(",", "")
    try:
        return float(s)
    except ValueError:
        return None


def norm_price_eur(value: Any, currency_original: Any) -> tuple[float | None, str | None]:
    if value in (None, ""):
        return None, None
    n = _coerce_float(value)
    if n is None:
        return None, "price_unparseable"
    if currency_original and str(currency_original).upper() not in ("EUR", "€", ""):
        # Phase 1: refuse silent FX conversion. Route to review.
        return n, f"non_eur_currency:{currency_original}"
    if not (100_000 <= n <= 5_000_000_000):
        return n, f"out_of_range:price_eur:{n:.0f}"
    return n, None


def norm_capex_eur(value: Any, currency_original: Any) -> tuple[float | None, str | None]:
    if value in (None, ""):
        return None, None
    n = _coerce_float(value)
    if n is None:
        return None, "capex_unparseable"
    if currency_original and str(currency_original).upper() not in ("EUR", "€", ""):
        return n, f"non_eur_currency:{currency_original}"
    if not (100_000 <= n <= 3_000_000_000):
        return n, f"out_of_range:capex_eur:{n:.0f}"
    return n, None


def norm_rooms(value: Any) -> tuple[int | None, str | None]:
    if value in (None, ""):
        return None, None
    n = _coerce_float(value)
    if n is None:
        return None, "rooms_unparseable"
    if not (0 <= n <= 5000):
        return int(n), f"out_of_range:rooms:{int(n)}"
    return int(n), None


def norm_cap_rate(value: Any) -> tuple[float | None, str | None]:
    if value in (None, ""):
        return None, None
    n = _coerce_float(value)
    if n is None:
        return None, "cap_rate_unparseable"
    # Operator may write 0.054 instead of 5.4 — be defensive
    if 0 < n < 1.0:
        n = n * 100.0
    if not (0.5 <= n <= 25.0):
        return n, f"out_of_range:cap_rate:{n:.2f}"
    return round(n, 2), None


def norm_date(value: Any) -> tuple[str | None, str | None]:
    if value in (None, ""):
        return None, None
    if isinstance(value, date) and not isinstance(value, datetime):
        return value.isoformat(), None
    if isinstance(value, datetime):
        return value.date().isoformat(), None
    s = str(value).strip()
    # Year-only
    if re.fullmatch(r"\d{4}", s):
        return f"{s}-01-01", "date_year_only"
    # Q1/Q2/Q3/Q4 form
    m = re.fullmatch(r"(\d{4})\s*[Qq]([1-4])", s)
    if m:
        quarter_to_month = {1: 1, 2: 4, 3: 7, 4: 10}
        return f"{m.group(1)}-{quarter_to_month[int(m.group(2))]:02d}-01", "date_quarter_only"
    # Try common formats in order
    for fmt in ("%Y-%m-%d", "%d/%m/%Y", "%m/%d/%Y", "%Y/%m/%d", "%d-%m-%Y", "%m-%d-%Y", "%Y%m%d"):
        try:
            return datetime.strptime(s[:10], fmt).date().isoformat(), None
        except ValueError:
            continue
    return None, f"date_unparseable:{s}"


def norm_year(value: Any) -> tuple[int | None, str | None]:
    if value in (None, ""):
        return None, None
    n = _coerce_float(value)
    if n is None:
        return None, "year_unparseable"
    y = int(n)
    current = datetime.utcnow().year
    if not (1700 <= y <= current + 5):
        return None, f"out_of_range:year:{y}"
    return y, None


def norm_star_rating(value: Any) -> tuple[int | None, str | None]:
    if value in (None, ""):
        return None, None
    n = _coerce_float(value)
    if n is None:
        return None, "stars_unparseable"
    s = int(round(n))
    if not (1 <= s <= 5):
        return None, f"out_of_range:star_rating:{s}"
    return s, None


def norm_latlon(value: Any, kind: str) -> tuple[float | None, str | None]:
    if value in (None, ""):
        return None, None
    n = _coerce_float(value)
    if n is None:
        return None, f"{kind}_unparseable"
    bound = 90.0 if kind == "lat" else 180.0
    if not (-bound <= n <= bound):
        return None, f"out_of_range:{kind}:{n}"
    return n, None


def norm_area_sqm(value: Any) -> tuple[float | None, str | None]:
    if value in (None, ""):
        return None, None
    n = _coerce_float(value)
    if n is None:
        return None, "area_unparseable"
    if not (100 <= n <= 500_000):
        return n, f"out_of_range:gross_area_sqm:{n:.0f}"
    return n, None


def norm_bool(value: Any) -> tuple[bool | None, str | None]:
    if value in (None, ""):
        return None, None
    if isinstance(value, bool):
        return value, None
    s = str(value).strip().lower()
    if s in ("true", "yes", "y", "1", "si", "sí", "verdadero"):
        return True, None
    if s in ("false", "no", "n", "0", "falso"):
        return False, None
    return None, f"bool_unparseable:{value}"


_TRACKING_PARAMS = re.compile(r"^(utm_|_hs[a-z]+|mc_)", re.I)
_TRACKING_NAMES = {"gclid", "fbclid", "ref", "ref_src", "yclid", "msclkid", "icid", "cmpid"}


def norm_url(value: Any) -> tuple[str | None, str | None]:
    if value in (None, ""):
        return None, None
    from urllib.parse import urlparse, urlunparse, parse_qsl, urlencode
    s = str(value).strip()
    if s.startswith("http://"):
        s = "https://" + s[len("http://"):]
    if not s.startswith("https://"):
        return None, f"invalid_url:scheme:{s[:30]}"
    parsed = urlparse(s)
    if not parsed.netloc:
        return None, f"invalid_url:no_host:{s[:30]}"
    # Strip tracking params + fragment
    kept = [(k, v) for (k, v) in parse_qsl(parsed.query, keep_blank_values=False)
            if not _TRACKING_PARAMS.match(k) and k.lower() not in _TRACKING_NAMES]
    cleaned = urlunparse(parsed._replace(query=urlencode(kept), fragment=""))
    return cleaned.rstrip("/") if parsed.path != "/" else cleaned, None


# ---------------------------------------------------------------------------
# Row-level normalisation
# ---------------------------------------------------------------------------

TX_REQUIRED = ["category", "asset_type", "asset_name", "city", "country", "price_eur", "buyer_name"]
PJ_REQUIRED = ["category", "asset_type", "project_name", "city", "country", "announced_at", "project_stage", "developer_name"]


def normalise_transaction(raw: dict[str, Any]) -> tuple[dict[str, Any], list[str], list[str]]:
    """Returns (normalised_row, review_reasons, missing_required)."""
    review: list[str] = []
    row: dict[str, Any] = dict(raw)

    cat, r = _norm_enum(row.get("category"), CATEGORY_TX, _CATEGORY_TX_SYNONYMS)
    row["category"] = cat
    if r: review.append(r)

    at, r = _norm_enum(row.get("asset_type"), ASSET_TYPE_TX)
    row["asset_type"] = at
    if r: review.append(r)

    city, r = norm_city(row.get("city"))
    row["city"] = city
    if r: review.append(r)

    country, r = norm_country(row.get("country"))
    row["country"] = country
    if r: review.append(r)

    price, r = norm_price_eur(row.get("price_eur"), row.get("price_currency_original"))
    row["price_eur"] = price
    if r: review.append(r)

    rooms, r = norm_rooms(row.get("rooms"))
    row["rooms"] = rooms
    if r: review.append(r)

    if rooms and price and not row.get("price_per_key_eur"):
        row["price_per_key_eur"] = round(price / rooms, 2) if rooms > 0 else None

    seg, r = _norm_enum(row.get("hotel_segment"), HOTEL_SEGMENTS, _SEGMENT_SYNONYMS)
    row["hotel_segment"] = seg
    if r: review.append(r)

    bk, r = _norm_enum(row.get("buyer_kind"), INVESTOR_KINDS)
    row["buyer_kind"] = bk
    if r: review.append(r)

    sk, r = _norm_enum(row.get("seller_kind"), INVESTOR_KINDS)
    row["seller_kind"] = sk
    if r: review.append(r)

    for col in ("closed_at", "announced_at"):
        d, r = norm_date(row.get(col))
        row[col] = d
        if r: review.append(r)

    for col in ("year_built", "year_renovated"):
        y, r = norm_year(row.get(col))
        row[col] = y
        if r: review.append(r)

    sr, r = norm_star_rating(row.get("star_rating"))
    row["star_rating"] = sr
    if r: review.append(r)

    lat, r = norm_latlon(row.get("latitude"), "lat")
    row["latitude"] = lat
    if r: review.append(r)

    lon, r = norm_latlon(row.get("longitude"), "lon")
    row["longitude"] = lon
    if r: review.append(r)

    area, r = norm_area_sqm(row.get("gross_area_sqm"))
    row["gross_area_sqm"] = area
    if r: review.append(r)

    cap, r = norm_cap_rate(row.get("cap_rate"))
    row["cap_rate"] = cap
    if r: review.append(r)

    ft, r = _norm_enum(row.get("financing_type"), FINANCING_TYPES)
    row["financing_type"] = ft
    if r: review.append(r)

    dt, r = _norm_enum(row.get("disclosed_terms"), DISCLOSED_TERMS)
    row["disclosed_terms"] = dt
    if r: review.append(r)

    for col in ("buyer_country", "seller_country"):
        c, r = norm_country(row.get(col))
        row[col] = c
        if r: review.append(r)

    for col in ("press_release_url", "news_url", "source_url"):
        u, r = norm_url(row.get(col))
        row[col] = u
        if r: review.append(r)

    # source_kind default to 'manual' when missing — the operator-typed row case
    sk_kind, r = _norm_enum(row.get("source_kind") or "manual", SOURCE_KINDS)
    row["source_kind"] = sk_kind or "manual"

    # Required-column gate (excluding closed_at/announced_at — handled below)
    missing = [col for col in TX_REQUIRED if not row.get(col)]
    # at least one of closed_at OR announced_at
    if not row.get("closed_at") and not row.get("announced_at"):
        missing.append("closed_at_or_announced_at")

    return row, review, missing


def normalise_project(raw: dict[str, Any]) -> tuple[dict[str, Any], list[str], list[str]]:
    review: list[str] = []
    row: dict[str, Any] = dict(raw)

    cat, r = _norm_enum(row.get("category"), CATEGORY_PJ, _CATEGORY_PJ_SYNONYMS)
    row["category"] = cat
    if r: review.append(r)

    at, r = _norm_enum(row.get("asset_type"), ASSET_TYPE_PJ)
    row["asset_type"] = at
    if r: review.append(r)

    city, r = norm_city(row.get("city"))
    row["city"] = city
    if r: review.append(r)

    country, r = norm_country(row.get("country"))
    row["country"] = country
    if r: review.append(r)

    capex, r = norm_capex_eur(row.get("capex_eur"), None)
    row["capex_eur"] = capex
    if r: review.append(r)

    rooms, r = norm_rooms(row.get("rooms"))
    row["rooms"] = rooms
    if r: review.append(r)

    if rooms and capex and rooms > 0 and not row.get("capex_per_key_eur"):
        row["capex_per_key_eur"] = round(capex / rooms, 2)

    seg, r = _norm_enum(row.get("hotel_segment"), HOTEL_SEGMENTS, _SEGMENT_SYNONYMS)
    row["hotel_segment"] = seg
    if r: review.append(r)

    dk, r = _norm_enum(row.get("developer_kind"), INVESTOR_KINDS)
    row["developer_kind"] = dk
    if r: review.append(r)

    ok, r = _norm_enum(row.get("operator_kind"), OPERATOR_KINDS)
    row["operator_kind"] = ok
    if r: review.append(r)

    stage, r = _norm_enum(row.get("project_stage"), PROJECT_STAGES)
    row["project_stage"] = stage
    if r: review.append(r)

    for col in ("estimated_opening", "groundbreaking", "announced_at"):
        d, r = norm_date(row.get(col))
        row[col] = d
        if r: review.append(r)

    sr, r = norm_star_rating(row.get("star_rating"))
    row["star_rating"] = sr
    if r: review.append(r)

    lat, r = norm_latlon(row.get("latitude"), "lat")
    row["latitude"] = lat
    if r: review.append(r)

    lon, r = norm_latlon(row.get("longitude"), "lon")
    row["longitude"] = lon
    if r: review.append(r)

    area, r = norm_area_sqm(row.get("gross_area_sqm"))
    row["gross_area_sqm"] = area
    if r: review.append(r)

    for col in ("mixed_use_flag", "public_subsidy_flag"):
        b, r = norm_bool(row.get(col))
        row[col] = b
        if r: review.append(r)

    c, r = norm_country(row.get("developer_country"))
    row["developer_country"] = c
    if r: review.append(r)

    for col in ("press_release_url", "news_url", "source_url"):
        u, r = norm_url(row.get(col))
        row[col] = u
        if r: review.append(r)

    sk_kind, r = _norm_enum(row.get("source_kind") or "manual", SOURCE_KINDS)
    row["source_kind"] = sk_kind or "manual"

    missing = [col for col in PJ_REQUIRED if not row.get(col)]
    return row, review, missing
