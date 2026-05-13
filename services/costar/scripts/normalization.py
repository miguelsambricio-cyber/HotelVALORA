"""Field-by-field normalisation for the COSTAR v1.2 ingestion engine.

Each normaliser is a pure function: input → (normalised_value, review_reasons[]).
The orchestrator (`ingest.py`) collects review_reasons across all fields of a row
and routes the row to MASTER · staging/review · staging/failed accordingly.
"""

from __future__ import annotations

import re
from datetime import date, datetime
from typing import Any

from dedup import (
    hotel_id,
    normalise_address,
    normalise_str_for_key,
    strip_diacritics,
)

NORMALIZATION_VERSION = "v1.4"  # `independent` retired from chain_scale; new affiliation_type field


# Default country for drops that don't carry an explicit `country` column.
# CoStar's "Inmuebles" / "Transacciones" exports for ES markets have no
# country field — the geo is inferred from the workspace context. Each
# INPUT/ folder today is country-scoped to Spain; widen this when the
# pipeline expands beyond ES.
DEFAULT_COUNTRY = "ES"


# ── Header alias maps (operator-friendly) ───────────────────────────────────
# Input CoStar columns get folded into the canonical schema columns via a
# case-insensitive + punctuation-stripped match. The right-hand side is the
# canonical column name in `docs/intelligence/costar-hotels-by-market-schema.md`.

def _hkey(s: str) -> str:
    s = strip_diacritics(str(s)).lower().strip()
    return re.sub(r"[^a-z0-9]+", "_", s).strip("_")


HOTEL_HEADER_ALIASES: dict[str, str] = {
    # Identification
    "property_id": "costar_property_id", "costar_property_id": "costar_property_id", "inmueble_id": "costar_property_id", "id_inmueble": "costar_property_id",
    "name": "name", "nombre": "name", "property_name": "name", "hotel_name": "name", "nombre_hotel": "name", "hotel": "name",
    # CoStar ES: "Nombre del edificio" → folds to "nombre_del_edificio"
    "nombre_del_edificio": "name", "edificio": "name",
    "brand": "brand", "marca": "brand", "flag": "brand",
    "operator": "operator", "operador": "operator", "management": "operator", "management_company": "operator",
    # CoStar ES: "Operador del hotel"
    "operador_del_hotel": "operator",
    "owner": "owner", "propietario": "owner", "ownership": "owner",
    # CoStar ES: "Propietario real" + "Empresa matriz" (parent company)
    "propietario_real": "owner", "empresa_matriz": "owner",
    # Geo
    "country": "country", "pais": "country",
    "market": "market_name", "market_name": "market_name", "mercado": "market_name",
    "submarket": "submarket_name", "submarket_name": "submarket_name", "submercado": "submarket_name", "barrio": "submarket_name",
    "address": "address_line", "direccion": "address_line", "calle": "address_line", "street": "address_line",
    "postal_code": "postal_code", "cp": "postal_code", "codigo_postal": "postal_code", "zip": "postal_code",
    "latitude": "latitude", "lat": "latitude",
    "longitude": "longitude", "lon": "longitude", "lng": "longitude", "long": "longitude",
    "neighborhood": "neighborhood",
    # CoStar ES: "Ciudad" (typically Madrid for ES drops — used as market fallback)
    "ciudad": "city_es_costar",
    # Property characteristics
    "chain_scale": "chain_scale", "class": "chain_scale", "categoria_cadena": "chain_scale", "scale": "chain_scale",
    # CoStar ES: "Clase" is the canonical chain scale tier (Luxury / Upscale / Midscale / …).
    #           "Escala" is the affiliation axis (Cadena / Independiente). We map Clase to
    #           chain_scale; Escala only catches "Independiente" → independent below.
    "clase": "chain_scale", "escala": "chain_scale_or_affiliation",
    "category": "category", "stars": "category", "estrellas": "category", "star_rating": "category",
    "segment": "segment_type", "segment_type": "segment_type", "segmento": "segment_type", "hotel_segment": "segment_type",
    # CoStar ES: "Tipo de ubicación del hotel" / "Tipo secundario"
    "tipo_de_ubicacion_del_hotel": "segment_type", "tipo_secundario": "segment_type",
    "rooms": "rooms_count", "rooms_count": "rooms_count", "habitaciones": "rooms_count", "n_habitaciones": "rooms_count", "keys": "rooms_count",
    "year_opened": "year_opened", "opened": "year_opened", "year_built": "year_opened", "ano_apertura": "year_opened", "ano_construccion": "year_opened",
    # CoStar ES: "Año de construcción" → "ano_de_construccion" (extra "de") · "Fecha de apertura del hotel"
    "ano_de_construccion": "year_opened", "fecha_de_apertura_del_hotel": "year_opened",
    "year_last_renovated": "year_last_renovated", "renovated": "year_last_renovated", "year_renovated": "year_last_renovated", "ano_renovacion": "year_last_renovated",
    # CoStar ES: "Año de reform."
    "ano_de_reform": "year_last_renovated", "ano_de_reforma": "year_last_renovated",
    "total_floors": "total_floors", "floors": "total_floors", "plantas": "total_floors",
    # Facilities / scoring
    "facilities": "facilities_raw", "amenities": "amenities_raw", "servicios": "facilities_raw",
    "meeting_space_sqm": "meeting_space_sqm", "meeting_space": "meeting_space_sqm",
    # CoStar ES: "Espacio de reunión total" → meeting space in m²
    "espacio_de_reunion_total": "meeting_space_sqm", "espacio_de_reunion_contig_max": "meeting_space_contig_sqm",
    "parking_spaces": "parking_spaces", "parking": "parking_spaces",
    "score": "score_costar", "score_costar": "score_costar", "puntuacion": "score_costar", "rating_costar": "score_costar",
}


MARKET_HEADER_ALIASES: dict[str, str] = {
    "country": "country", "pais": "country",
    "market": "market_name", "market_name": "market_name", "mercado": "market_name",
    "period": "period", "periodo": "period",
    "period_kind": "period_kind",
    "occupancy": "occupancy", "ocupacion": "occupancy", "occ": "occupancy",
    "adr": "adr", "adr_eur": "adr",
    "revpar": "revpar", "revpar_eur": "revpar",
    "supply": "supply", "rooms_available": "supply",
    "demand": "demand", "rooms_sold": "demand", "room_nights": "demand",
    "pipeline": "pipeline", "pipeline_rooms": "pipeline",
    "absorption": "absorption",
}


# ── Canonical enum normalisers ──────────────────────────────────────────────

# Canonical chain_scale tiers (Phase 2.3.d.6e · 2026-05-14):
# six CoStar institutional tiers. `independent` is NOT a tier — it is a
# brand affiliation axis surfaced separately as `affiliation_type`.
_CHAIN_SCALE_MAP = {
    "luxury": "luxury",
    "lujo": "luxury",
    "luxury collection": "luxury",
    "upper_upscale": "upper_upscale", "upper-upscale": "upper_upscale", "upper upscale": "upper_upscale",
    "upscale": "upscale",
    "upper_midscale": "upper_midscale", "upper midscale": "upper_midscale",
    "midscale": "midscale", "media": "midscale", "media-gama": "midscale",
    "economy": "economy", "economico": "economy", "economy class": "economy",
    "budget": "economy",
    # "independent" / "independiente" intentionally NOT mapped — they are
    # affiliation values that flow to `affiliation_type`, not chain_scale.
}


def _infer_chain_scale_from_secondary(
    tipo_secundario: Any,
    rooms_count: int | None,
) -> tuple[str | None, list[str]]:
    """Best-effort inference when CoStar leaves `Clase` blank.

    Triggered for properties below CoStar's tracking-cohort threshold —
    hostels, serviced apartments, small boutiques — where Clase is
    omitted but the operator still needs a chain_scale assignment for
    compset + valuation logic to work.

    Rules:
      - hostel                                  → economy
      - apartamento con servicios (< 50 rooms)  → economy
      - apartamento con servicios (≥ 50 rooms)  → upper_midscale
      - boutique                                → upscale
    """
    if tipo_secundario in (None, ""):
        return None, []
    key = normalise_str_for_key(tipo_secundario)
    if "hostel" in key:
        return "economy", [f"chain_scale_inferred_from_secondary:hostel→economy"]
    if "apartament" in key:
        try:
            r = int(rooms_count) if rooms_count is not None else 0
        except (TypeError, ValueError):
            r = 0
        if r < 50:
            return "economy", [f"chain_scale_inferred_from_secondary:apartament_small→economy"]
        return "upper_midscale", [f"chain_scale_inferred_from_secondary:apartament_large→upper_midscale"]
    if "boutique" in key:
        return "upscale", [f"chain_scale_inferred_from_secondary:boutique→upscale"]
    return None, []


def normalise_chain_scale(value: Any) -> tuple[str | None, list[str]]:
    if value in (None, ""):
        return None, []
    key = normalise_str_for_key(value)
    canonical = _CHAIN_SCALE_MAP.get(key)
    if canonical is None:
        return None, [f"chain_scale_unrecognised:{value}"]
    return canonical, []


_SEGMENT_MAP = {
    "business": "business", "negocios": "business", "corp": "business", "corporate": "business",
    "leisure": "leisure", "ocio": "leisure", "vacacional": "leisure",
    "extended_stay": "extended_stay", "extended stay": "extended_stay", "estancia larga": "extended_stay",
    "resort": "resort",
    "convention": "convention", "mice": "convention", "congresos": "convention",
}


def normalise_segment(value: Any) -> tuple[str | None, list[str]]:
    if value in (None, ""):
        return None, []
    key = normalise_str_for_key(value)
    canonical = _SEGMENT_MAP.get(key)
    if canonical is None:
        return None, [f"segment_type_unrecognised:{value}"]
    return canonical, []


_FACILITY_MAP = {
    "meeting_space": ["meeting", "meeting space", "salas", "salas de reuniones", "events", "eventos"],
    "pool": ["pool", "piscina", "swimming"],
    "spa": ["spa", "wellness"],
    "fitness": ["gym", "gimnasio", "fitness", "fitness center"],
    "restaurant": ["restaurant", "restaurante"],
    "bar": ["bar", "lounge"],
    "parking": ["parking", "garage", "garaje"],
    "pet_friendly": ["pet", "pet friendly", "mascotas"],
    "business_center": ["business center", "centro de negocios"],
    "accessibility": ["accessible", "wheelchair", "accesible"],
    "kids_club": ["kids club", "club infantil"],
}


def normalise_facilities(raw: Any) -> tuple[list[str], list[str]]:
    """Comma/semicolon-separated input → canonical facility code list."""
    if raw in (None, ""):
        return [], []
    tokens = re.split(r"[,;|]", str(raw))
    out: list[str] = []
    unknown: list[str] = []
    for tok in tokens:
        key = normalise_str_for_key(tok)
        if not key:
            continue
        matched = None
        for code, aliases in _FACILITY_MAP.items():
            if any(a in key for a in aliases):
                matched = code
                break
        if matched and matched not in out:
            out.append(matched)
        elif not matched:
            unknown.append(key)
    reasons = [f"facility_unrecognised:{u}" for u in unknown[:3]]  # cap
    return out, reasons


# ── Country / market normalisers ────────────────────────────────────────────

_COUNTRY_MAP = {
    "es": "ES", "espana": "ES", "spain": "ES",
    "us": "US", "usa": "US", "united states": "US",
    "fr": "FR", "france": "FR",
    "pt": "PT", "portugal": "PT",
    "gb": "GB", "uk": "GB", "united kingdom": "GB",
    "de": "DE", "germany": "DE",
    "it": "IT", "italy": "IT",
}


def normalise_country(value: Any) -> tuple[str | None, list[str]]:
    if value in (None, ""):
        return None, []
    raw = normalise_str_for_key(value)
    if len(raw) == 2 and raw.isalpha():
        return raw.upper(), []
    canonical = _COUNTRY_MAP.get(raw)
    if canonical is None:
        return None, [f"country_unrecognised:{value}"]
    return canonical, []


def normalise_numeric(value: Any, *, kind: str = "number") -> tuple[float | int | None, list[str]]:
    if value in (None, ""):
        return None, []
    s = str(value).strip().replace(",", ".")
    s = re.sub(r"[^\d.\-]", "", s)
    if s in ("", "-", "."):
        return None, [f"{kind}_unparseable:{value}"]
    try:
        v = float(s)
    except ValueError:
        return None, [f"{kind}_unparseable:{value}"]
    if kind == "integer":
        return int(round(v)), []
    return v, []


def normalise_year(value: Any) -> tuple[int | None, list[str]]:
    if value in (None, ""):
        return None, []
    s = str(value).strip()
    m = re.search(r"(19|20)\d{2}", s)
    if not m:
        return None, [f"year_unparseable:{value}"]
    return int(m.group(0)), []


# ── Per-row hotel normaliser ────────────────────────────────────────────────

def normalise_hotel_row(raw: dict[str, Any]) -> tuple[dict[str, Any] | None, list[str]]:
    """Fold a raw operator row into the canonical hotel schema.

    Returns (row, reasons). When `row` is None the row is unrecoverable
    (missing primary key inputs) and should land in staging/failed.

    Country fallback: when the source row has no `country` column (CoStar
    ES "Inmuebles" exports omit it), we default to `DEFAULT_COUNTRY` and
    flag the row as `country_defaulted`. This is reversible — set the
    column explicitly in the source to override.
    """
    reasons: list[str] = []
    country, r = normalise_country(raw.get("country"))
    reasons += r
    if not country:
        country = DEFAULT_COUNTRY
        reasons.append(f"country_defaulted:{DEFAULT_COUNTRY}")

    market = (raw.get("market_name") or "").strip() or None
    # Fallback: when "Mercado" is empty but the CoStar "Ciudad" column is
    # present (e.g. ES inventory rows that didn't carry market explicitly),
    # use the city as the market name. Most CoStar ES rows ship both;
    # the data we've seen treats Madrid as market and submarkets as the
    # finer cut.
    if not market:
        market = (raw.get("city_es_costar") or "").strip() or None
        if market:
            reasons.append("market_defaulted_from_city")

    name = (raw.get("name") or "").strip() or None

    if not (country and market and name):
        # Cannot derive a hotel_id without these
        return None, reasons + ["missing_pk_inputs"]

    # CoStar ES carries two columns; v1.4 splits them cleanly:
    #   "Clase"  → `chain_scale` (Luxury / Upper Upscale / Upscale /
    #              Upper Midscale / Midscale / Economy)
    #   "Escala" → `affiliation_type` (chain / independent) — a separate
    #              axis from chain_scale, never coerced into it.
    chain_scale, r = normalise_chain_scale(raw.get("chain_scale"))
    reasons += r

    # affiliation_type: surface "Independiente" / "Cadena" as its own field
    escala = (raw.get("chain_scale_or_affiliation") or "").strip()
    affiliation_type: str | None = None
    if escala:
        norm_escala = normalise_str_for_key(escala)
        if norm_escala in ("independiente", "independent", "indie"):
            affiliation_type = "independent"
        elif norm_escala in ("cadena", "chain"):
            affiliation_type = "chain"
        # other values (e.g. "Marca", "Soft brand") could be added later

    # When `Clase` is blank (CoStar omits it for sub-cohort properties:
    # hostels, small serviced apartments, boutique indies), infer the
    # chain_scale heuristically from `Tipo secundario` + rooms count.
    # This stops the historical "independent" misclassification —
    # independent is an affiliation, NOT a chain-scale tier.
    if not chain_scale:
        # Try to grab a number for rooms before the dedicated normaliser
        rooms_raw = raw.get("rooms_count")
        try:
            rooms_pre = int(rooms_raw) if rooms_raw not in (None, "") else None
        except (TypeError, ValueError):
            rooms_pre = None
        inferred, infer_reasons = _infer_chain_scale_from_secondary(
            raw.get("segment_type"),  # = CoStar "Tipo secundario"
            rooms_pre,
        )
        if inferred:
            chain_scale = inferred
            reasons += infer_reasons
    segment_type, r = normalise_segment(raw.get("segment_type"))
    reasons += r
    facilities, r = normalise_facilities(raw.get("facilities_raw"))
    reasons += r
    rooms_count, r = normalise_numeric(raw.get("rooms_count"), kind="integer")
    reasons += r
    year_opened, r = normalise_year(raw.get("year_opened"))
    reasons += r
    year_renovated, r = normalise_year(raw.get("year_last_renovated"))
    reasons += r
    total_floors, r = normalise_numeric(raw.get("total_floors"), kind="integer")
    reasons += r
    meeting_sqm, r = normalise_numeric(raw.get("meeting_space_sqm"))
    reasons += r
    parking, r = normalise_numeric(raw.get("parking_spaces"), kind="integer")
    reasons += r
    lat, r = normalise_numeric(raw.get("latitude"))
    reasons += r
    lon, r = normalise_numeric(raw.get("longitude"))
    reasons += r
    score, r = normalise_numeric(raw.get("score_costar"))
    reasons += r

    costar_property_id = raw.get("costar_property_id")
    canonical_hotel_id = hotel_id(country, market, name, str(costar_property_id) if costar_property_id else None)
    hotel_id_synthetic = not bool(costar_property_id)

    row = {
        "country": country,
        "market_name": market,
        "submarket_name": (raw.get("submarket_name") or None) or None,
        "hotel_id": canonical_hotel_id,
        "hotel_id_synthetic": hotel_id_synthetic,
        "name": name,
        "brand": (raw.get("brand") or None) or None,
        "operator": (raw.get("operator") or None) or None,
        "owner": (raw.get("owner") or None) or None,
        "chain_scale": chain_scale,
        # Phase 2.3.d.6e: affiliation_type is the brand-affiliation axis
        # (chain / independent), separate from chain_scale (the tier axis).
        "affiliation_type": affiliation_type,
        "category": (raw.get("category") or None) or None,
        "segment_type": segment_type,
        "rooms_count": rooms_count,
        "year_opened": year_opened,
        "year_last_renovated": year_renovated,
        "total_floors": total_floors,
        "address_line": (raw.get("address_line") or None) or None,
        "postal_code": (raw.get("postal_code") or None) or None,
        "latitude": lat,
        "longitude": lon,
        "neighborhood": (raw.get("neighborhood") or None) or None,
        "facilities": facilities,
        "amenities": [],
        "meeting_space_sqm": meeting_sqm,
        "parking_spaces": parking,
        "score_costar": score,
        "score_external": {},
        "competitive_set_ids": [],
        "transactions_history_ref": None,
        "notes": None,
        "_match_name": normalise_str_for_key(name),
        "_match_address": normalise_address(raw.get("address_line")),
    }
    return row, reasons
