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
    # CoStar ES: "Clasificación hotelera" + "Clasificación por estrellas" (both
    # carry the star rating · the first is the institutional hotel-classification
    # field, the second is CoStar's stars column). Either populates `category`.
    "clasificacion_hotelera": "category", "clasificacion": "category",
    "clasificacion_por_estrellas": "category", "estrellas_rating": "category",
    "segment": "segment_type", "segment_type": "segment_type", "segmento": "segment_type", "hotel_segment": "segment_type",
    # CoStar ES: "Tipo de ubicación del hotel" / "Tipo secundario"
    "tipo_secundario": "segment_type",
    "rooms": "rooms_count", "rooms_count": "rooms_count", "habitaciones": "rooms_count", "n_habitaciones": "rooms_count", "keys": "rooms_count",
    "year_opened": "year_opened", "opened": "year_opened", "year_built": "year_opened", "ano_apertura": "year_opened", "ano_construccion": "year_opened",
    # CoStar ES: "Año de construcción" → "ano_de_construccion" (extra "de") · "Fecha de apertura del hotel"
    "ano_de_construccion": "year_opened", "fecha_de_apertura_del_hotel": "year_opened",
    "year_last_renovated": "year_last_renovated", "renovated": "year_last_renovated", "year_renovated": "year_last_renovated", "ano_renovacion": "year_last_renovated",
    # CoStar ES: "Año de reform."
    "ano_de_reform": "year_last_renovated", "ano_de_reforma": "year_last_renovated",
    "total_floors": "total_floors", "floors": "total_floors", "plantas": "total_floors",
    # Floors above / below ground (CoStar ES: "Plantas sobre rasante" / "Plantas bajo rasante")
    "plantas_sobre_rasante": "floors_above_ground", "floors_above_ground": "floors_above_ground",
    "plantas_bajo_rasante": "floors_below_ground", "floors_below_ground": "floors_below_ground",
    # Surface fields (CoStar ES institutional underwriting headline)
    # CoStar canonical column: "Superficie alquilable" → gross area (m²)
    # Also accept "Superficie construida" / "Gross Building Area" / "Área construida"
    "superficie_alquilable": "gross_building_sqm", "superficie_alquilable_m2": "gross_building_sqm",
    "superficie_alquilable_del_inmueble": "gross_building_sqm",
    "superficie_alquilable_del_inmueble_sba": "gross_building_sqm",
    "rentable_area": "gross_building_sqm", "leasable_area": "gross_building_sqm",
    "superficie_construida": "gross_building_sqm", "area_construida": "gross_building_sqm",
    "gross_building_sqm": "gross_building_sqm", "gross_building_area": "gross_building_sqm",
    "gross_area": "gross_building_sqm", "gross_area_sqm": "gross_building_sqm",
    "gba": "gross_building_sqm", "superficie_construida_m2": "gross_building_sqm",
    # CoStar canonical: "Terreno (m²)" → lot_size_sqm
    "terreno": "lot_size_sqm", "terreno_m2": "lot_size_sqm",
    "superficie_de_la_parcela": "lot_size_sqm", "superficie_del_terreno": "lot_size_sqm",
    "superficie_parcela": "lot_size_sqm", "lot_size": "lot_size_sqm", "lot_size_sqm": "lot_size_sqm",
    # CoStar canonical: "Planta tipo (m²)" → typical_floor_sqm
    "planta_tipo": "typical_floor_sqm", "planta_tipo_m2": "typical_floor_sqm",
    "superficie_planta_tipo": "typical_floor_sqm",
    "typical_floor": "typical_floor_sqm", "typical_floor_sqm": "typical_floor_sqm",
    # Facilities / scoring
    "facilities": "facilities_raw", "amenities": "amenities_raw", "servicios": "facilities_raw",
    "meeting_space_sqm": "meeting_space_sqm", "meeting_space": "meeting_space_sqm",
    # CoStar ES: "Espacio de reunión total" → meeting space in m²
    "espacio_de_reunion_total": "meeting_space_sqm", "espacio_de_reunion_contig_max": "meeting_space_contig_sqm",
    # CoStar ES: "Salas de reuniones" → count of meeting rooms (distinct rooms)
    "salas_de_reuniones": "meeting_rooms_count", "meeting_rooms_count": "meeting_rooms_count",
    "meeting_rooms": "meeting_rooms_count",
    "parking_spaces": "parking_spaces", "parking": "parking_spaces",
    "plazas_de_parking": "parking_spaces",  # CoStar ES literal column name
    "score": "score_costar", "score_costar": "score_costar", "puntuacion": "score_costar", "rating_costar": "score_costar",
    # ── v1.3 · institutional CoStar passthrough (2026-05-14) ──
    # Capture all institutionally-relevant CoStar columns so the master
    # XLSX reaches column-parity with the source export. FEMA flood-plain
    # fields (US-only · always NULL for Spain) and clear duplicates are
    # excluded by design.
    "id_del_inmueble": "costar_property_id",
    "tipo_de_operacion": "operation_type",
    "estado_de_construccion": "construction_state",
    "estado_de_funcionamiento": "operating_state",
    "habitaciones_de_expansion": "expansion_rooms",
    "fecha_de_estado_de_expansion": "expansion_status_date",
    "estado_de_expansion": "expansion_status",
    "ciudad": "city_es_costar",  # already aliased; kept here for visibility
    "estado_o_provincia": "state_province",
    "participacion_en_los_datos": "data_participation",
    "espacio_de_reunion_contig_max": "meeting_contig_sqm",
    "tipo_de_ubicacion_del_hotel": "location_type",  # overrides earlier segment_type mapping (operator confirmed: tipo_secundario = segment, ubicacion = location_type)
    "precio_todo_incluido": "all_inclusive_price",
    "todos_los_modulos": "modules",
    "ejes_principales": "main_axes",
    "plazas_de_parking_habitacion": "parking_per_room",
    "fondo": "fund",
    "tipo": "property_type",
    "clasificacion_ecologica": "eco_rating",
    "estado": "operating_status",
    "m2_disp": "rentable_sqm_available",  # CoStar: "m² disp." (available leasable area)
    # FEMA flood-plain (US-only · always null for Spanish hotels but captured for institutional parity)
    "riesgo_de_inundacion": "flood_risk",
    "zona_de_inundacion": "flood_zone",
    "fecha_del_mapa_de_la_fema": "fema_map_date",
    "identificador_de_mapa_de_la_fema": "fema_map_id",
    "id_del_mapa_firm": "firm_map_id",
    "numero_de_panel_de_firm": "firm_panel_number",
    "zona_especial_de_riesgo_de_inundacion": "flood_special_risk_zone",
    "zona_de_llanura_inundable": "flood_plain_zone",
    # Commercial-rent fields (mostly null for hotels but in source for parity)
    "precio_de_alquiler_min_m2_mes": "rent_min_per_sqm_month",
    "precio_de_alquiler_max_m2_mes": "rent_max_per_sqm_month",
    "precio_de_alquiler_no_divulgado": "rent_undisclosed",
    "precio_de_venta_no_divulgado": "sale_price_undisclosed",
    "venta_solo_de_multipropietarios": "multi_owner_sale_only",
    "precio_superficie_no_divulgado_a": "price_per_sqm_undisclosed",
    "pagina_de_mapa": "map_page",
    "precio_de_salida_de_alquiler_min_mes": "rent_listing_min_month",
    "precio_de_salida_de_alquiler_max_mes": "rent_listing_max_month",
    "precio_de_salida_de_alquiler_no_divulgado": "rent_listing_undisclosed",
    "repres_del_propietario": "owner_rep",
    "contacto_repres_del_propietario": "owner_rep_contact",
    "cluster_de_submercado": "submarket_cluster",
    "condado": "county",
    "pais": "country",  # already aliased above (line 56) · kept for visibility
    "continente": "continent",
    "subcontinente": "subcontinent",
    "empresa_de_ventas": "sales_company",
    "contacto_de_ventas": "sales_contact",
    "precio_de_venta": "asking_sale_price",
    "precio_min_m2": "price_per_sqm_min",
    "precio_max_m2": "price_per_sqm_max",
    "tipo_de_interes": "interest_rate_type",  # 2 cols in source (94+95) · second one overwrites · acceptable for institutional review
    # CoStar commercial-rent columns (mostly null for hotels but captured for parity)
    "alquiler_estimado": "rent_estimated",
    "alquiler": "rent_listing",
    "precio_habitacion": "price_per_room",
    "estado_de_venta": "sale_status",
    "alquilado": "leased_pct",
    "ratio_de_parking": "parking_ratio",
    "parque_de_edificios": "building_park",
    "mes_de_construccion": "construction_month",
    "mes_de_reform": "renovation_month",
    "zonificacion": "zoning",
    "propietario_registrado": "registered_owner",
    "inicio_de_construccion": "construction_start",
    "importe_de_originacion": "loan_origination_amount",
    "fecha_de_originacion": "loan_origination_date",
    "fecha_de_vencimiento": "loan_maturity_date",
    "prestamista": "lender",
    "tipo_de_garantia": "collateral_type",
    "tipo_de_prestamo": "loan_type",
    "multipropietarios": "co_owners",
    # CoStar ES: "Fecha de la última venta" + "Último precio de venta"
    "fecha_de_la_ultima_venta": "last_sale_date", "ultima_venta": "last_sale_date",
    "last_sale_date": "last_sale_date", "fecha_ultima_venta": "last_sale_date",
    "ultimo_precio_de_venta": "last_sale_price_eur", "ultimo_precio_venta": "last_sale_price_eur",
    "last_sale_price": "last_sale_price_eur", "last_sale_price_eur": "last_sale_price_eur",
    "precio_ultima_venta": "last_sale_price_eur",
}


MARKET_HEADER_ALIASES: dict[str, str] = {
    # Geo + identification
    "country": "country", "pais": "country",
    "market": "market_name", "market_name": "market_name", "mercado": "market_name",
    "submarket": "submarket_name", "submarket_name": "submarket_name", "submercado": "submarket_name",
    # Time axis (CoStar time-series files carry Periodo)
    "period": "period", "periodo": "period",
    "period_kind": "period_kind",
    # CoStar ES KPI columns · CRITICAL · spot vs 12m-rolling are
    # separate institutional metrics. The "12 m." suffix → _12m;
    # bare "Ocupación" / "ADR" / "RevPAR" map to *_spot (current-period
    # snapshot · last reported month).
    "ocupacion_12_m": "occupancy_12m",
    "ocupacion": "occupancy_spot",  # spot · current month
    "occupancy": "occupancy_12m", "occ": "occupancy_12m",
    "camb_ocupacion_interanual": "occupancy_yoy_spot",
    "adr_12_m": "adr_12m",
    "adr": "adr_spot",  # spot
    "adr_eur": "adr_12m",
    "camb_adr_interanual": "adr_yoy_spot",
    "revpar_12_m": "revpar_12m",
    "revpar": "revpar_spot",  # spot
    "revpar_eur": "revpar_12m",
    "camb_revpar_interanual": "revpar_yoy_spot",
    # CoStar ES institutional sale + yield columns (MERCADO only · 6 cols)
    "precio_venta_de_mercado_habitacion": "market_sale_price_per_room",
    "volumen_ventas_12_m": "sales_volume_12m",
    "rentabilidad_mercado": "market_yield",
    "habitaciones_inventario": "rooms_inventory",
    "habitaciones_construccion": "rooms_under_construction",
    "habitaciones_entregadas_12_m": "rooms_delivered_12m",
    "edificios_construidos": "buildings_built",
    "edificios_construccion": "buildings_under_construction",
    "media_habitaciones_por_edificio": "avg_rooms_per_building",
    "crecimiento_inventario_12_m": "inventory_growth_12m",
    "habitaciones_abiertas_12_m": "rooms_opened_12m",
    "edificios_abiertos_12_m": "buildings_opened_12m",
    "oferta_12_m": "supply_12m", "supply": "supply_12m",
    "demanda_12_m": "demand_12m", "demand": "demand_12m",
    "ingresos_12_m": "revenue_12m",
    # YoY change columns (Camb. ... 12 m.)
    "camb_ocupacion_12_m": "occupancy_yoy_12m",
    "camb_adr_12_m": "adr_yoy_12m",
    "camb_revpar_12_m": "revpar_yoy_12m",
    "camb_oferta_12_m": "supply_yoy_12m",
    "camb_demanda_12_m": "demand_yoy_12m",
    "camb_ingresos_12_m": "revenue_yoy_12m",
    # Pipeline (forward-looking)
    "pipeline": "pipeline", "pipeline_rooms": "pipeline",
    "absorption": "absorption",
}


PROJECT_HEADER_ALIASES: dict[str, str] = {
    # CoStar pipeline export (ENGLISH headers — different file than market data)
    "project_name": "project_name", "nombre_del_proyecto": "project_name", "proyecto": "project_name",
    "street": "street", "calle": "street",
    "postcode": "postal_code", "postal_code": "postal_code", "codigo_postal": "postal_code",
    "city": "city", "ciudad": "city",
    "state": "state_province", "provincia": "state_province", "estado_o_provincia": "state_province",
    "country": "country", "pais": "country",
    "phase": "phase", "fase": "phase",
    "status": "status", "estado": "status",
    "opening_date": "opening_date", "fecha_apertura": "opening_date",
    "construction_type": "construction_type", "tipo_de_construccion": "construction_type",
    "stars": "stars", "estrellas": "stars", "categoria": "stars",
    "rooms": "rooms_count", "habitaciones": "rooms_count", "tbi": "tbi",
    "office_role": "office_role", "office_company": "office_company", "office_name": "office_name",
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


# Phase 2026-05-14 · segment_type rewritten · property-type axis
# (hotel / hotel project / tourist apartments) replaces the previous
# commercial-segment axis (business/leisure/etc). Operator institutional
# definition: this field describes WHAT the asset is, not its market
# positioning. Legacy values (business/leisure/extended_stay/resort/
# convention) fall through and remain in records until the next
# canonical re-ingestion — they will be normalised to `null` by the
# normaliser below.
_SEGMENT_MAP = {
    # Hotel (operating)
    "hotel": "hotel",
    # Hotel project (under development / planned)
    "hotel_project": "hotel_project", "hotel project": "hotel_project",
    "proyecto_hotelero": "hotel_project", "proyecto hotelero": "hotel_project",
    "en_desarrollo": "hotel_project", "en desarrollo": "hotel_project",
    "in_development": "hotel_project", "under_development": "hotel_project",
    "planned": "hotel_project", "pipeline": "hotel_project",
    # Tourist apartments / aparthotel / apartamento con servicios (CoStar canonical)
    "tourist_apartments": "tourist_apartments", "tourist apartments": "tourist_apartments",
    "apartamentos_turisticos": "tourist_apartments", "apartamentos turisticos": "tourist_apartments",
    "apartamento_con_servicios": "tourist_apartments", "apartamento con servicios": "tourist_apartments",
    "apartamentos_con_servicios": "tourist_apartments",
    "aparthotel": "tourist_apartments", "apart_hotel": "tourist_apartments", "apart-hotel": "tourist_apartments",
    "serviced_apartments": "tourist_apartments", "vacation_rental": "tourist_apartments",
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
    floors_above_ground, r = normalise_numeric(raw.get("floors_above_ground"), kind="integer")
    reasons += r
    floors_below_ground, r = normalise_numeric(raw.get("floors_below_ground"), kind="integer")
    reasons += r
    gross_building_sqm, r = normalise_numeric(raw.get("gross_building_sqm"))
    reasons += r
    lot_size_sqm, r = normalise_numeric(raw.get("lot_size_sqm"))
    reasons += r
    typical_floor_sqm, r = normalise_numeric(raw.get("typical_floor_sqm"))
    reasons += r
    last_sale_price_eur, r = normalise_numeric(raw.get("last_sale_price_eur"))
    reasons += r
    # last_sale_date · CoStar ES exports as "DD/MM/YYYY" string · also
    # accept Excel datetime cells (isoformat()) when openpyxl parsed them
    # natively. Output is ISO "YYYY-MM-DD" so the UI can sort/compare.
    raw_lsd = raw.get("last_sale_date")
    last_sale_date = None
    if raw_lsd is None:
        pass
    elif hasattr(raw_lsd, "isoformat"):
        last_sale_date = raw_lsd.isoformat()[:10]
    else:
        s = str(raw_lsd).strip()
        if s:
            # Try DD/MM/YYYY · DD-MM-YYYY · YYYY-MM-DD · M/D/YYYY (US fallback)
            import re as _re
            m = _re.match(r"^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$", s)
            if m:
                d, mo, y = m.group(1), m.group(2), m.group(3)
                # Heuristic: if first number > 12, it must be day · DD/MM/YYYY
                # If second > 12 it must be day · MM/DD/YYYY · else assume ES DD/MM/YYYY
                d_int, mo_int = int(d), int(mo)
                if mo_int > 12 and d_int <= 12:
                    d, mo = mo, d
                last_sale_date = f"{y}-{mo.zfill(2)}-{d.zfill(2)}"
            elif _re.match(r"^\d{4}-\d{2}-\d{2}", s):
                last_sale_date = s[:10]
            else:
                last_sale_date = s
    meeting_sqm, r = normalise_numeric(raw.get("meeting_space_sqm"))
    reasons += r
    meeting_rooms_count, r = normalise_numeric(raw.get("meeting_rooms_count"), kind="integer")
    reasons += r
    parking, r = normalise_numeric(raw.get("parking_spaces"), kind="integer")
    reasons += r
    lat, r = normalise_numeric(raw.get("latitude"))
    reasons += r
    lon, r = normalise_numeric(raw.get("longitude"))
    reasons += r
    score, r = normalise_numeric(raw.get("score_costar"))
    reasons += r

    # v1.3 stability constraint: hotel_id MUST stay synthetic to preserve
    # the linkage built on top of it (Booking enrichment in Supabase
    # Storage, transactions linkage, compset memberships). Include
    # costar_property_id as a passthrough column on the row but DO NOT
    # use it in the hash · otherwise existing enrichment is orphaned.
    costar_property_id = raw.get("costar_property_id")
    canonical_hotel_id = hotel_id(country, market, name, None)
    hotel_id_synthetic = True

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
        "floors_above_ground": floors_above_ground,
        "floors_below_ground": floors_below_ground,
        "gross_building_sqm": gross_building_sqm,
        "lot_size_sqm": lot_size_sqm,
        "typical_floor_sqm": typical_floor_sqm,
        "last_sale_date": last_sale_date,
        "last_sale_price_eur": last_sale_price_eur,
        "address_line": (raw.get("address_line") or None) or None,
        "postal_code": (raw.get("postal_code") or None) or None,
        "latitude": lat,
        "longitude": lon,
        "neighborhood": (raw.get("neighborhood") or None) or None,
        "facilities": facilities,
        "amenities": [],
        "meeting_space_sqm": meeting_sqm,
        "meeting_rooms_count": meeting_rooms_count,
        "parking_spaces": parking,
        "score_costar": score,
        "score_external": {},
        "competitive_set_ids": [],
        "transactions_history_ref": None,
        "notes": None,
        # ── v1.3 institutional CoStar passthrough (2026-05-14) ──
        # Direct passthrough · no normalisation · these fields carry
        # through to the HOTELESperMARKET master for institutional review.
        # Numeric fields stay as openpyxl returns them; string fields are
        # stripped to None when blank.
        "costar_property_id": raw.get("costar_property_id"),
        "city": (raw.get("city_es_costar") or None) or None,
        "state_province": (raw.get("state_province") or None) or None,
        "county": (raw.get("county") or None) or None,
        "continent": (raw.get("continent") or None) or None,
        "subcontinent": (raw.get("subcontinent") or None) or None,
        "submarket_cluster": (raw.get("submarket_cluster") or None) or None,
        "location_type": (raw.get("location_type") or None) or None,
        "operation_type": (raw.get("operation_type") or None) or None,
        "construction_state": (raw.get("construction_state") or None) or None,
        "operating_state": (raw.get("operating_state") or None) or None,
        "operating_status": (raw.get("operating_status") or None) or None,
        "expansion_rooms": raw.get("expansion_rooms"),
        "expansion_status": (raw.get("expansion_status") or None) or None,
        "expansion_status_date": raw.get("expansion_status_date"),
        "data_participation": (raw.get("data_participation") or None) or None,
        "meeting_contig_sqm": raw.get("meeting_contig_sqm"),
        "all_inclusive_price": raw.get("all_inclusive_price"),
        "modules": (raw.get("modules") or None) or None,
        "main_axes": (raw.get("main_axes") or None) or None,
        "parking_per_room": raw.get("parking_per_room"),
        "parking_ratio": raw.get("parking_ratio"),
        "fund": (raw.get("fund") or None) or None,
        "property_type": (raw.get("property_type") or None) or None,
        "eco_rating": (raw.get("eco_rating") or None) or None,
        "rentable_sqm_available": raw.get("rentable_sqm_available"),
        "owner_rep": (raw.get("owner_rep") or None) or None,
        "owner_rep_contact": (raw.get("owner_rep_contact") or None) or None,
        "sales_company": (raw.get("sales_company") or None) or None,
        "sales_contact": (raw.get("sales_contact") or None) or None,
        "asking_sale_price": raw.get("asking_sale_price"),
        "price_per_sqm_min": raw.get("price_per_sqm_min"),
        "price_per_sqm_max": raw.get("price_per_sqm_max"),
        "price_per_room": raw.get("price_per_room"),
        "sale_status": (raw.get("sale_status") or None) or None,
        "leased_pct": raw.get("leased_pct"),
        "building_park": (raw.get("building_park") or None) or None,
        "construction_month": (raw.get("construction_month") or None) or None,
        "renovation_month": (raw.get("renovation_month") or None) or None,
        "zoning": (raw.get("zoning") or None) or None,
        "registered_owner": (raw.get("registered_owner") or None) or None,
        "construction_start": raw.get("construction_start"),
        "loan_origination_amount": raw.get("loan_origination_amount"),
        "loan_origination_date": raw.get("loan_origination_date"),
        "loan_maturity_date": raw.get("loan_maturity_date"),
        "lender": (raw.get("lender") or None) or None,
        "interest_rate_type": (raw.get("interest_rate_type") or None) or None,
        "collateral_type": (raw.get("collateral_type") or None) or None,
        "loan_type": (raw.get("loan_type") or None) or None,
        "co_owners": (raw.get("co_owners") or None) or None,
        "rent_estimated": raw.get("rent_estimated"),
        "rent_listing": raw.get("rent_listing"),
        "rent_min_per_sqm_month": raw.get("rent_min_per_sqm_month"),
        "rent_max_per_sqm_month": raw.get("rent_max_per_sqm_month"),
        # Non-disclosed flags + FEMA · captured for parity · always null in Spain
        "rent_undisclosed": raw.get("rent_undisclosed"),
        "sale_price_undisclosed": raw.get("sale_price_undisclosed"),
        "multi_owner_sale_only": raw.get("multi_owner_sale_only"),
        "price_per_sqm_undisclosed": raw.get("price_per_sqm_undisclosed"),
        "map_page": raw.get("map_page"),
        "rent_listing_min_month": raw.get("rent_listing_min_month"),
        "rent_listing_max_month": raw.get("rent_listing_max_month"),
        "rent_listing_undisclosed": raw.get("rent_listing_undisclosed"),
        "flood_risk": (raw.get("flood_risk") or None) or None,
        "flood_zone": (raw.get("flood_zone") or None) or None,
        "fema_map_date": raw.get("fema_map_date"),
        "fema_map_id": raw.get("fema_map_id"),
        "firm_map_id": raw.get("firm_map_id"),
        "firm_panel_number": raw.get("firm_panel_number"),
        "flood_special_risk_zone": (raw.get("flood_special_risk_zone") or None) or None,
        "flood_plain_zone": (raw.get("flood_plain_zone") or None) or None,
        "_match_name": normalise_str_for_key(name),
        "_match_address": normalise_address(raw.get("address_line")),
    }
    return row, reasons
