"""Reproducible builder for the canonical HOTELVALORA CoStar masters.

Run from repo root:
    python services/costar/scripts/build_masters.py

Produces (v1.2 · 2026-05-14):
    services/costar/MASTER/COSTAR_MASTER_PAIS.xlsx
    services/costar/MASTER/COSTAR_MASTER_MERCADOS.xlsx
    services/costar/MASTER/COSTAR_MASTER_SUBMERCADOS.xlsx
    services/costar/MASTER/COSTAR_MASTER_HOTELES_POR_MERCADO.xlsx

Retired in v1.2:
    services/costar/MASTER/COSTAR_MASTER_CLASS.xlsx — chain-scale aggregates
    are no longer a separate granularity. chain_scale becomes an attribute
    on each hotel record in HOTELESperMARKET. The legacy file stays in
    MASTER/ for archival but is no longer regenerated.

CompSet datasets live in services/compset/ — operationally distinct
(hotel-specific underwriting workflows, not warehouse ingestion). See
docs/architecture/market-vs-underwriting-separation.md.

For per-file ingestion (sweep INPUT/, normalise, dedup, emit snapshot.json),
use `ingest.py` not this script. `build_masters.py` regenerates the empty
template workbooks with the canonical schema in DICTIONARY sheets.

Each workbook contains five sheets:
    1. DATA              — the canonical row table (one per granularity)
    2. DICTIONARY        — column name + type + required + notes
    3. INGESTION_LOG     — one row per processed file (history of ingestion runs)
    4. SOURCES_REGISTRY  — labelled source kinds with reliability tiers
    5. README            — operator instructions

The schema lives here so it is regenerable. The .xlsx is the frozen artefact
in git; this script regenerates it identically when run again. NORMALIZATION_VERSION
bumps on every breaking schema change.

Why four masters, not one
=========================
country / market / submarket / class have different schemas, different
granularity, different KPIs, different aggregation logic, and different
underwriting relevance. Mixing them once would force endless filters on every
analyst query. They share infrastructure (workspace + ingestion-meta block +
SOURCES_REGISTRY) but never share a DATA sheet. CompSet datasets live in
services/compset/ (operational workspace, not warehouse) since they are
hotel-specific underwriting outputs rather than market aggregates.
"""

from __future__ import annotations

import json
import os
import sys
import urllib.error
import urllib.request
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from openpyxl import Workbook
from openpyxl.styles import Alignment, Font, PatternFill
from openpyxl.utils import get_column_letter

NORMALIZATION_VERSION = "v1.2"
BUILT_AT = datetime.now(timezone.utc).isoformat(timespec="seconds")

HERE = Path(__file__).resolve().parent
ROOT = HERE.parent  # services/costar
MASTER_DIR = ROOT / "MASTER"


# ---------------------------------------------------------------------------
# Shared ingestion-meta block — IDENTICAL across all 4 masters and across
# the entire services/* family of ingestion workspaces.
# ---------------------------------------------------------------------------
INGESTION_META_COLUMNS: list[tuple[str, str, bool, str]] = [
    ("canonical_id", "uuid", True, "Primary key in the master. Generated on first insertion. Stable across edits."),
    ("ingestion_id", "text", True, "Matches the ingestion log entry that landed this row."),
    ("source_file", "text", True, "Original filename verbatim — e.g. 'CoStar_ES_Country_2026Q1.xlsx'."),
    ("source_kind", "enum", True, "costar | str | kalibri | curated | manual"),
    ("source_url", "url", False, "Public URL when applicable."),
    ("ingested_at", "timestamp", True, "ISO-8601 UTC. Auto-stamped by the ingestion run."),
    ("ingested_by", "email", True, "Operator email — audit trail."),
    ("normalization_version", "text", True, f"Schema/rules version applied at ingestion time. Today: {NORMALIZATION_VERSION}."),
    ("dedup_key", "text", True, "sha256 of the canonicalised dedup fields (see costar-normalization-rules.md §4)."),
    ("review_required", "bool", True, "TRUE when validation flagged something."),
    ("review_reason", "text", False, "Short label — e.g. 'missing_period', 'duplicate_candidate', 'fx_conversion_applied'."),
    ("ingestion_status", "enum", True, "ingested | under_review | superseded | rejected"),
    ("supersedes_id", "uuid", False, "Set when this row corrects/replaces a previously canonical row."),
    ("notes", "text", False, "Free-form operator notes."),
]


# ---------------------------------------------------------------------------
# Country-level schema (COSTAR_MASTER_PAIS)
# ---------------------------------------------------------------------------
COUNTRY_COLUMNS: list[tuple[str, str, bool, str]] = [
    ("country", "text", True, "ISO-3166-1 alpha-2 uppercase. Anchors the row to a nation."),
    ("country_name_display", "text", False, "Display form — 'España', 'Spain', 'Portugal'."),
    ("period_kind", "enum", True, "daily | weekly | monthly | quarterly | ytd | ltm | annual"),
    ("period_start", "date", True, "ISO-8601 YYYY-MM-DD. Start of the reporting window."),
    ("period_end", "date", True, "ISO-8601 YYYY-MM-DD. End of the reporting window (inclusive)."),
    ("currency", "text", True, "ISO-4217 — all monetary KPIs in this row are denominated here. EUR canonical; others trigger fx review."),
    ("occupancy_pct", "numeric", False, "Country-level occupancy %. Range [0, 100]."),
    ("adr", "numeric", False, "Average Daily Rate in the row's currency."),
    ("revpar", "numeric", False, "Revenue Per Available Room in the row's currency."),
    ("supply_rooms", "numeric", False, "Total rooms available in the period (room-nights)."),
    ("demand_rooms", "numeric", False, "Total rooms sold in the period (room-nights)."),
    ("revenue", "numeric", False, "Total accommodation revenue in the row's currency."),
    ("supply_yoy_pct", "numeric", False, "YoY % change in supply."),
    ("demand_yoy_pct", "numeric", False, "YoY % change in demand."),
    ("occupancy_yoy_pp", "numeric", False, "YoY change in occupancy in percentage points (+/-)."),
    ("adr_yoy_pct", "numeric", False, "YoY % change in ADR."),
    ("revpar_yoy_pct", "numeric", False, "YoY % change in RevPAR."),
    ("hotel_count", "int", False, "Number of hotels in scope for the period."),
    ("room_count_total", "int", False, "Snapshot room count at the start of the period."),
    ("pipeline_rooms", "int", False, "Rooms in pipeline (planned/under construction/pre-opening) — when reported."),
    ("pipeline_hotels", "int", False, "Hotels in pipeline."),
    ("tourism_arrivals", "numeric", False, "Inbound international tourist arrivals — when reported by the source."),
    ("tourism_arrivals_yoy_pct", "numeric", False, "YoY % change in international tourist arrivals."),
    ("gdp_growth_pct", "numeric", False, "GDP growth — macro context column, optional."),
    ("inflation_rate_pct", "numeric", False, "CPI inflation rate — macro context, optional."),
]


# ---------------------------------------------------------------------------
# Market-level schema (COSTAR_MASTER_MERCADOS)
# ---------------------------------------------------------------------------
MARKET_COLUMNS: list[tuple[str, str, bool, str]] = [
    ("country", "text", True, "ISO-3166-1 alpha-2 uppercase."),
    ("market_name", "text", True, "Canonical market name — 'Madrid', 'Costa del Sol', 'Baleares'."),
    ("costar_market_code", "text", False, "CoStar / STR market code when available — preserves cross-product joinability."),
    ("market_uid", "uuid", False, "Resolved canonical market id — populated by future entity resolver."),
    ("region", "text", False, "Region or autonomous community — 'Madrid', 'Andalucía'."),
    ("period_kind", "enum", True, "daily | weekly | monthly | quarterly | ytd | ltm | annual"),
    ("period_start", "date", True, "ISO-8601 start."),
    ("period_end", "date", True, "ISO-8601 end (inclusive)."),
    ("currency", "text", True, "ISO-4217 — row's monetary denomination."),
    ("occupancy_pct", "numeric", False, "Market occupancy %. Range [0, 100]."),
    ("adr", "numeric", False, "Average Daily Rate in the row's currency."),
    ("revpar", "numeric", False, "RevPAR in the row's currency."),
    ("supply_rooms", "numeric", False, "Total rooms available (room-nights)."),
    ("demand_rooms", "numeric", False, "Total rooms sold (room-nights)."),
    ("revenue", "numeric", False, "Total accommodation revenue in the row's currency."),
    ("supply_yoy_pct", "numeric", False, "YoY % change in supply."),
    ("demand_yoy_pct", "numeric", False, "YoY % change in demand."),
    ("occupancy_yoy_pp", "numeric", False, "YoY change in occupancy (pp)."),
    ("adr_yoy_pct", "numeric", False, "YoY % change in ADR."),
    ("revpar_yoy_pct", "numeric", False, "YoY % change in RevPAR."),
    ("revpar_index_vs_country", "numeric", False, "Market RevPAR as % of national RevPAR — positioning indicator."),
    ("hotel_count", "int", False, "Hotels in market in scope for the period."),
    ("room_count_total", "int", False, "Room snapshot at period start."),
    ("pipeline_rooms", "int", False, "Pipeline rooms in this market."),
    ("pipeline_hotels", "int", False, "Pipeline hotels in this market."),
    ("seasonality_index", "numeric", False, "Period RevPAR / annual average RevPAR — context for sub-annual rows."),
]


# ---------------------------------------------------------------------------
# Submarket-level schema (COSTAR_MASTER_SUBMERCADOS)
# ---------------------------------------------------------------------------
SUBMARKET_COLUMNS: list[tuple[str, str, bool, str]] = [
    ("country", "text", True, "ISO-3166-1 alpha-2."),
    ("market_name", "text", True, "Parent market — 'Madrid'."),
    ("submarket_name", "text", True, "Submarket — 'Salamanca', 'Madrid Centro', 'Aeropuerto'."),
    ("costar_submarket_code", "text", False, "CoStar / STR submarket code when available."),
    ("submarket_uid", "uuid", False, "Resolved canonical submarket id."),
    ("chain_scale", "enum", False, "luxury | upper_upscale | upscale | upper_midscale | midscale | economy | independent | all (when row aggregates the submarket overall)"),
    ("segment_type", "enum", False, "transient | group | contract | combined — KPI breakdown by guest segment."),
    ("period_kind", "enum", True, "daily | weekly | monthly | quarterly | ytd | ltm | annual"),
    ("period_start", "date", True, "ISO-8601 start."),
    ("period_end", "date", True, "ISO-8601 end (inclusive)."),
    ("currency", "text", True, "ISO-4217."),
    ("occupancy_pct", "numeric", False, "Submarket occupancy %."),
    ("adr", "numeric", False, "ADR in the row's currency."),
    ("revpar", "numeric", False, "RevPAR in the row's currency."),
    ("supply_rooms", "numeric", False, "Room-nights available."),
    ("demand_rooms", "numeric", False, "Room-nights sold."),
    ("revenue", "numeric", False, "Period accommodation revenue."),
    ("supply_yoy_pct", "numeric", False, "YoY % change in supply."),
    ("demand_yoy_pct", "numeric", False, "YoY % change in demand."),
    ("occupancy_yoy_pp", "numeric", False, "YoY change in occupancy (pp)."),
    ("adr_yoy_pct", "numeric", False, "YoY % change in ADR."),
    ("revpar_yoy_pct", "numeric", False, "YoY % change in RevPAR."),
    ("revpar_index_vs_market", "numeric", False, "Submarket RevPAR as % of parent market RevPAR."),
    ("hotel_count", "int", False, "Hotels in submarket in scope."),
    ("room_count_total", "int", False, "Room snapshot."),
    ("pipeline_rooms", "int", False, "Submarket pipeline rooms."),
    ("pipeline_hotels", "int", False, "Submarket pipeline hotels."),
]


# ---------------------------------------------------------------------------
# Class-level schema (COSTAR_MASTER_CLASS) — chain-scale time series
# ---------------------------------------------------------------------------
# Class (chain_scale) is its own granularity because:
#  - operators report KPIs by class within country AND within market
#  - aggregate by-class series are critical for sub-segment positioning
#  - operationally simpler than carrying chain_scale on every submarket row
# A class row either anchors at country level (market_name=null) OR at market
# level (market_name='Madrid'). Both legitimate; dedup_key distinguishes.
CLASS_COLUMNS: list[tuple[str, str, bool, str]] = [
    ("country", "text", True, "ISO-3166-1 alpha-2 uppercase."),
    ("market_name", "text", False, "Parent market — null = country-level class aggregate."),
    ("submarket_name", "text", False, "Parent submarket — typically null at this granularity."),
    ("chain_scale", "enum", True, "luxury | upper_upscale | upscale | upper_midscale | midscale | economy | independent | all_classes (aggregate)"),
    ("class_label_display", "text", False, "Operator-facing label — 'Luxury', 'Upper Upscale', 'Independent'."),
    ("segment_type", "enum", False, "transient | group | contract | combined — KPI breakdown by guest segment when reported."),
    ("period_kind", "enum", True, "daily | weekly | monthly | quarterly | ytd | ltm | annual"),
    ("period_start", "date", True, "ISO-8601 start."),
    ("period_end", "date", True, "ISO-8601 end (inclusive)."),
    ("currency", "text", True, "ISO-4217 — row's monetary denomination."),
    ("occupancy_pct", "numeric", False, "Class occupancy %. Range [0, 100]."),
    ("adr", "numeric", False, "ADR in row's currency. Range [10, 5000]."),
    ("revpar", "numeric", False, "RevPAR in row's currency. Range [5, 5000]."),
    ("supply_rooms", "numeric", False, "Room-nights available for this class within scope."),
    ("demand_rooms", "numeric", False, "Room-nights sold."),
    ("revenue", "numeric", False, "Period accommodation revenue."),
    ("supply_yoy_pct", "numeric", False, "YoY % change in supply."),
    ("demand_yoy_pct", "numeric", False, "YoY % change in demand."),
    ("occupancy_yoy_pp", "numeric", False, "YoY change in occupancy in percentage points."),
    ("adr_yoy_pct", "numeric", False, "YoY % change in ADR."),
    ("revpar_yoy_pct", "numeric", False, "YoY % change in RevPAR."),
    ("revpar_index_vs_country", "numeric", False, "When market_name=null: ignored. When market_name set: this class's RevPAR vs national class RevPAR."),
    ("revpar_index_vs_market", "numeric", False, "Class RevPAR as % of parent market overall RevPAR (`market_name` row in COSTAR_MASTER_MERCADOS)."),
    ("hotel_count", "int", False, "Hotels in this class within scope."),
    ("room_count_total", "int", False, "Snapshot room count at period start."),
    ("pipeline_rooms", "int", False, "Pipeline rooms for this class."),
    ("pipeline_hotels", "int", False, "Pipeline hotels for this class."),
]


# ---------------------------------------------------------------------------
# Hotel-by-market inventory schema (COSTAR_MASTER_HOTELES_POR_MERCADO · v1.2)
# ---------------------------------------------------------------------------
# Mirrors the schema doc at docs/intelligence/costar-hotels-by-market-schema.md.
# This is Dataset B (slowly-changing hotel inventory) — NOT a time series.
# Primary key: (country, market_name, hotel_id).
HOTELS_BY_MARKET_COLUMNS: list[tuple[str, str, bool, str]] = [
    # Identification
    ("country", "text", True, "ISO-3166-1 alpha-2 uppercase."),
    ("market_name", "text", True, "Canonical market — matches COSTAR_MASTER_MERCADOS.market_name."),
    ("submarket_name", "text", False, "Optional submarket — canonical neighborhood where the hotel sits."),
    ("hotel_id", "text", True, "Canonical hotel identifier. costar_<PROPERTY_ID> when present; otherwise h_<sha256[:16]>(country|market|name)."),
    ("hotel_id_synthetic", "boolean", True, "True when hotel_id was computed because the export lacked a CoStar PROPERTY ID."),
    ("name", "text", True, "Hotel display name."),
    ("brand", "text", False, "Brand affiliation. null for independent."),
    ("operator", "text", False, "Operating company. May differ from brand (white-label management)."),
    ("owner", "text", False, "Ownership entity when disclosed in the CoStar export."),
    # Property characteristics
    ("chain_scale", "enum", False, "luxury | upper_upscale | upscale | upper_midscale | midscale | economy | independent"),
    ("category", "text", False, "Star rating or local equivalent (e.g. '5-star', '4-star superior')."),
    ("segment_type", "enum", False, "business | leisure | extended_stay | resort | convention"),
    ("rooms_count", "int", False, "Total guest rooms."),
    ("year_opened", "int", False, "Original opening year."),
    ("year_last_renovated", "int", False, "Most recent renovation year."),
    ("total_floors", "int", False, "Building floors."),
    # Location
    ("address_line", "text", False, "Street + number."),
    ("postal_code", "text", False, "Local postal code."),
    ("latitude", "numeric", False, "Decimal degrees."),
    ("longitude", "numeric", False, "Decimal degrees."),
    ("neighborhood", "text", False, "Free-text neighborhood when finer than submarket."),
    # Facilities · amenities · scoring
    ("facilities", "text[]", False, "Normalised facility codes — meeting_space · pool · spa · fitness · restaurant · bar · parking · pet_friendly · business_center · accessibility · kids_club."),
    ("amenities", "text[]", False, "Free-text amenities not in the canonical facility enum."),
    ("meeting_space_sqm", "numeric", False, "Total meeting/event space when reported."),
    ("parking_spaces", "int", False, "Total parking spaces."),
    ("score_costar", "numeric", False, "CoStar property score when present (0–5 scale)."),
    ("score_external", "jsonb", False, "External-platform scores (Booking · Tripadvisor) keyed by source."),
    # Property additions (v1.3 · 2026-05-14)
    ("floors_above_ground", "int", False, "Floors above grade — CoStar 'Plantas sobre rasante'."),
    ("floors_below_ground", "int", False, "Floors below grade (basements) — CoStar 'Plantas bajo rasante'."),
    ("gross_building_sqm", "numeric", False, "Gross built area (m²) — CoStar 'Superficie alquilable del inmueble/SBA'."),
    ("lot_size_sqm", "numeric", False, "Plot/lot area (m²) — CoStar 'Terreno (m²)'."),
    ("typical_floor_sqm", "numeric", False, "Typical-floor area (m²) — CoStar 'Planta tipo (m²)'."),
    ("meeting_rooms_count", "int", False, "Count of distinct meeting rooms — CoStar 'Salas de reuniones'."),
    ("last_sale_date", "date", False, "Date of last asset sale — CoStar 'Fecha de la última venta'."),
    ("last_sale_price_eur", "numeric", False, "Last sale price in EUR — CoStar 'Último precio de venta'."),
    ("catastro_id", "text", False, "Spanish cadastre identifier (manual entry today; Catastro API later)."),
    # Booking enrichment merge (v1.3 · sourced from RapidAPI booking-com15)
    ("booking_hotel_id", "int", False, "Booking.com property id from manual_enrichment merge."),
    ("booking_url", "text", False, "Booking.com canonical URL when matched."),
    ("review_score", "numeric", False, "Booking overall review score (0–10)."),
    ("review_count", "int", False, "Booking total review count."),
    ("location_score", "numeric", False, "Booking sub-score · hotel_location."),
    ("comfort_score", "numeric", False, "Booking sub-score · hotel_comfort."),
    ("cleanliness_score", "numeric", False, "Booking sub-score · hotel_clean."),
    ("staff_score", "numeric", False, "Booking sub-score · hotel_staff."),
    ("value_score", "numeric", False, "Booking sub-score · hotel_value."),
    ("facilities_score", "numeric", False, "Booking sub-score · hotel_facilities."),
    ("has_bar", "bool", False, "Booking · bar present."),
    ("has_restaurant", "bool", False, "Booking · restaurant present."),
    ("has_rooftop", "bool", False, "Booking · rooftop present."),
    ("has_gym", "bool", False, "Booking · gym present."),
    ("has_spa", "bool", False, "Booking · spa present."),
    ("has_pool", "bool", False, "Booking · pool present."),
    ("has_parking", "bool", False, "Booking · parking present."),
    ("has_meeting", "bool", False, "Booking · meeting rooms present."),
    ("booking_facilities_count", "int", False, "Count of raw Booking facility strings captured."),
    ("booking_room_types_count", "int", False, "Count of distinct Booking room types."),
    ("check_in_time", "text", False, "Booking policy · check-in time."),
    ("check_out_time", "text", False, "Booking policy · check-out time."),
    ("pet_policy", "text", False, "Booking policy · pets."),
    ("cancellation_policy", "text", False, "Booking policy · cancellation/prepayment."),
    ("smoking_policy", "text", False, "Booking policy · smoking."),
    ("coords_source", "enum", False, "Provenance of latitude/longitude · CoStar | Booking | null."),
    ("enrichment_sources", "text", False, "Comma-separated provenance · rapidapi_booking · manual_operator · google_places."),
    ("enrichment_confidence", "numeric", False, "0–1 match confidence at enrichment time."),
    ("profile_completeness_score", "numeric", False, "0–100 % of priority enrichment fields populated."),
    ("last_scraped_at", "timestamp", False, "ISO timestamp of last enrichment scrape."),
    # Commercial context
    ("competitive_set_ids", "text[]", False, "Sibling hotel_ids in the property's competitive set."),
    ("transactions_history_ref", "text", False, "Foreign key into HOTEL_TRANSACCIONES_MASTER when the hotel has known transaction history."),
    ("notes", "text", False, "Operator-curated free-text notes."),
]


SOURCES_REGISTRY = [
    ("costar", "CoStar Hospitality Export", "A", "Authoritative — institutional, paid product. The canonical source."),
    ("str", "STR (CoStar subsidiary)", "A", "STR-direct exports — same provenance as CoStar; preserve attribution."),
    ("kalibri", "Kalibri Labs export", "B", "Operator analytics — useful for cross-validation."),
    ("curated", "Curated internal compilation", "A", "Hand-maintained HOTELVALORA spreadsheets — treat as ground-truth."),
    ("manual", "Manual operator entry", "C", "Operator-typed row. Audit trail in ingested_by."),
]


# ---------------------------------------------------------------------------
# Sheet builders (identical pattern across the four masters)
# ---------------------------------------------------------------------------
HEADER_FILL = PatternFill(start_color="FF003B2A", end_color="FF003B2A", fill_type="solid")
HEADER_FONT = Font(bold=True, color="FFD7F587", name="Calibri", size=11)
WRAP = Alignment(wrap_text=True, vertical="top")


def style_header(ws, header_row=1):
    for cell in ws[header_row]:
        cell.fill = HEADER_FILL
        cell.font = HEADER_FONT
        cell.alignment = Alignment(horizontal="left", vertical="center")
    ws.freeze_panes = f"A{header_row + 1}"


def autosize(ws, max_width=44):
    for col in ws.columns:
        col_letter = get_column_letter(col[0].column)
        max_len = 0
        for cell in col:
            value = "" if cell.value is None else str(cell.value)
            max_len = max(max_len, len(value))
        ws.column_dimensions[col_letter].width = min(max(max_len + 2, 12), max_width)


def build_data_sheet(ws, title: str, domain_columns, data_rows: list[dict] | None = None):
    ws.title = title
    columns = domain_columns + INGESTION_META_COLUMNS
    column_names = [name for (name, _t, _r, _n) in columns]
    ws.append(column_names)
    style_header(ws)
    if data_rows:
        for row in data_rows:
            ws.append([row.get(col) for col in column_names])
    autosize(ws)


def build_dictionary_sheet(wb, title: str, domain_columns):
    ws = wb.create_sheet(title)
    ws.append(["section", "column", "type", "required", "notes"])
    style_header(ws)
    for (name, t, req, notes) in domain_columns:
        ws.append(["domain", name, t, "YES" if req else "no", notes])
    for (name, t, req, notes) in INGESTION_META_COLUMNS:
        ws.append(["ingestion_meta", name, t, "YES" if req else "no", notes])
    for row in ws.iter_rows(min_row=2):
        for c in row:
            c.alignment = WRAP
    autosize(ws, max_width=80)


def build_ingestion_log_sheet(wb):
    ws = wb.create_sheet("INGESTION_LOG")
    ws.append([
        "ingestion_id", "source_file", "source_kind",
        "started_at", "completed_at",
        "rows_seen", "rows_inserted", "rows_updated", "rows_skipped",
        "rows_flagged_review", "rows_failed",
        "operator_email", "normalization_version", "outcome", "notes",
    ])
    style_header(ws)
    autosize(ws)


def build_sources_registry_sheet(wb):
    ws = wb.create_sheet("SOURCES_REGISTRY")
    ws.append(["source_kind", "label", "reliability_tier", "notes"])
    style_header(ws)
    for row in SOURCES_REGISTRY:
        ws.append(row)
    for row in ws.iter_rows(min_row=2):
        for c in row:
            c.alignment = WRAP
    autosize(ws, max_width=80)


def build_readme_sheet(wb, dataset_label: str, domain_label: str, schema_doc: str):
    ws = wb.create_sheet("README")
    ws.append([f"HOTELVALORA · {dataset_label}"])
    ws.cell(row=1, column=1).font = Font(bold=True, size=16, color="FF003B2A")

    body = [
        "",
        f"Canonical institutional dataset for {domain_label}. Append-only — never overwrite an existing canonical row.",
        f"Built {BUILT_AT}. Normalization version: {NORMALIZATION_VERSION}.",
        "",
        "Sister workbooks (services/costar/MASTER/):",
        "  • COSTAR_MASTER_PAIS.xlsx                  — country aggregates (Dataset A)",
        "  • COSTAR_MASTER_MERCADOS.xlsx              — market aggregates (Dataset A)",
        "  • COSTAR_MASTER_SUBMERCADOS.xlsx           — submarket aggregates (Dataset A)",
        "  • COSTAR_MASTER_HOTELES_POR_MERCADO.xlsx   — hotel inventory (Dataset B · v1.2)",
        "  • COSTAR_MASTER_CLASS.xlsx                 — LEGACY (chain-scale aggregates · retired v1.2)",
        "",
        "  CompSet workbooks now live in the OPERATIONAL workspace at services/compset/",
        "  (different purpose — hotel-specific underwriting outputs, not warehouse ingestion).",
        "",
        "Operating contract:",
        "  1. The Data Ingestion Agent appends new rows. It NEVER edits in place.",
        "  2. Corrections → insert a new row with",
        "     supersedes_id = <old canonical_id> and ingestion_status='superseded'.",
        "  3. Manual edits follow the same contract — track who, when, why",
        "     in ingested_by + notes.",
        "",
        "Sheets:",
        "  • DATA              — canonical row corpus",
        "  • DICTIONARY        — column schema + required flags + notes",
        "  • INGESTION_LOG     — one row per processed import file",
        "  • SOURCES_REGISTRY  — labels + reliability tiers per source_kind",
        "  • README            — this sheet",
        "",
        "Reference docs:",
        f"  • {schema_doc}",
        "  • docs/intelligence/costar-master-dataset-architecture.md",
        "  • docs/intelligence/costar-normalization-rules.md",
        "  • docs/intelligence/costar-ingestion-workflow.md",
        "",
        "Regenerating this workbook:",
        "  python services/costar/scripts/build_masters.py",
        "  (Idempotent. Run when the schema evolves; commit both the script and the regenerated .xlsx.)",
    ]
    for line in body:
        ws.append([line])
    ws.column_dimensions["A"].width = 110


def build_workbook(
    dataset_label: str,
    domain_columns,
    data_sheet_title: str,
    schema_doc: str,
    output_path: Path,
    data_rows: list[dict] | None = None,
):
    wb = Workbook()
    build_data_sheet(wb.active, data_sheet_title, domain_columns, data_rows)
    build_dictionary_sheet(wb, "DICTIONARY", domain_columns)
    build_ingestion_log_sheet(wb)
    build_sources_registry_sheet(wb)
    build_readme_sheet(wb, dataset_label, data_sheet_title.lower(), schema_doc)

    output_path.parent.mkdir(parents=True, exist_ok=True)
    wb.save(output_path)
    rows_written = len(data_rows) if data_rows else 0
    print(f"[build_masters] wrote {output_path.relative_to(ROOT.parent.parent)} · {rows_written} rows")


# ---------------------------------------------------------------------------
# Data extraction from snapshot.json + Supabase Storage enrichment
# ---------------------------------------------------------------------------
SNAPSHOT_PATH = ROOT / "MASTER" / "snapshot.json"
SUPABASE_BUCKET = "costar-master"
ENRICHMENT_PREFIX = "manual_enrichment"


def _read_env_local() -> dict[str, str]:
    """Lightweight parser for apps/web/.env.local · KEY=VALUE per line."""
    env_path = ROOT.parent.parent / "apps" / "web" / ".env.local"
    if not env_path.exists():
        return {}
    out: dict[str, str] = {}
    for line in env_path.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        k, v = line.split("=", 1)
        out[k.strip()] = v.strip()
    return out


def _supabase_env() -> tuple[str | None, str | None]:
    url = os.environ.get("NEXT_PUBLIC_SUPABASE_URL")
    key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
    if url and key:
        return url, key
    env = _read_env_local()
    return env.get("NEXT_PUBLIC_SUPABASE_URL"), env.get("SUPABASE_SERVICE_ROLE_KEY")


def _load_enrichment_from_storage() -> dict[str, dict]:
    """Returns { hotel_id: payload } · empty dict if Supabase not reachable."""
    url, key = _supabase_env()
    if not url or not key:
        print("[build_masters] Supabase env not set · skipping Booking enrichment merge")
        return {}
    try:
        req = urllib.request.Request(
            f"{url}/storage/v1/object/list/{SUPABASE_BUCKET}",
            data=json.dumps({"prefix": ENRICHMENT_PREFIX, "limit": 1000, "offset": 0}).encode("utf-8"),
            headers={"Authorization": f"Bearer {key}", "apikey": key, "Content-Type": "application/json"},
            method="POST",
        )
        with urllib.request.urlopen(req, timeout=30) as r:
            items = json.loads(r.read())
    except urllib.error.URLError as e:
        print(f"[build_masters] Supabase list failed: {e} · skipping enrichment merge")
        return {}
    out: dict[str, dict] = {}
    for item in items:
        name = item.get("name", "")
        if not name.endswith(".json"):
            continue
        hotel_id = name[: -len(".json")]
        try:
            dreq = urllib.request.Request(
                f"{url}/storage/v1/object/{SUPABASE_BUCKET}/{ENRICHMENT_PREFIX}/{name}",
                headers={"Authorization": f"Bearer {key}", "apikey": key},
            )
            with urllib.request.urlopen(dreq, timeout=30) as r:
                out[hotel_id] = json.loads(r.read())
        except (urllib.error.URLError, json.JSONDecodeError):
            continue
    print(f"[build_masters] loaded {len(out)} Booking enrichment records from Supabase Storage")
    return out


def _round_int(v: Any) -> int | None:
    if v is None:
        return None
    try:
        return round(float(v))
    except (TypeError, ValueError):
        return None


def _yn(v: Any) -> str:
    return "Y" if v else "N"


def _meta_block(snapshot: dict, hotel_id_or_index: Any, source_kind: str = "costar") -> dict:
    """Common ingestion-meta block · same shape across all masters."""
    return {
        "canonical_id": str(hotel_id_or_index),
        "ingestion_id": snapshot.get("ingestion_batch_id", ""),
        "source_file": "snapshot.json",
        "source_kind": source_kind,
        "source_url": "",
        "ingested_at": snapshot.get("generated_at", BUILT_AT),
        "ingested_by": "cli:build_masters",
        "normalization_version": (snapshot.get("batch") or {}).get("normalization_version", NORMALIZATION_VERSION),
        "dedup_key": "",
        "review_required": "TRUE" if hotel_id_or_index else "FALSE",
        "review_reason": "",
        "ingestion_status": "ingested",
        "supersedes_id": "",
        "notes": "",
    }


def _market_row_to_pais(r: dict, snapshot: dict) -> dict:
    """Map snapshot market_snapshots row (granularity=country_listing) →
    COSTAR_MASTER_PAIS canonical row."""
    return {
        "country": r.get("country"),
        "country_name_display": r.get("country") or r.get("market_name"),
        "period_kind": "ltm",
        "period_start": "",
        "period_end": "",
        "currency": "EUR",
        "occupancy_pct": (r.get("occupancy_12m") or 0) * 100 if r.get("occupancy_12m") is not None else None,
        "adr": r.get("adr_12m"),
        "revpar": r.get("revpar_12m"),
        "supply_rooms": _round_int(r.get("supply_12m")),
        "demand_rooms": _round_int(r.get("demand_12m")),
        "revenue": _round_int(r.get("revenue_12m")),
        "supply_yoy_pct": (r.get("supply_yoy_12m") or 0) * 100 if r.get("supply_yoy_12m") is not None else None,
        "demand_yoy_pct": (r.get("demand_yoy_12m") or 0) * 100 if r.get("demand_yoy_12m") is not None else None,
        "occupancy_yoy_pp": (r.get("occupancy_yoy_12m") or 0) * 100 if r.get("occupancy_yoy_12m") is not None else None,
        "adr_yoy_pct": (r.get("adr_yoy_12m") or 0) * 100 if r.get("adr_yoy_12m") is not None else None,
        "revpar_yoy_pct": (r.get("revpar_yoy_12m") or 0) * 100 if r.get("revpar_yoy_12m") is not None else None,
        "hotel_count": None,
        "room_count_total": _round_int(r.get("rooms_inventory")),
        "pipeline_rooms": _round_int(r.get("rooms_under_construction")),
        "pipeline_hotels": None,
        **_meta_block(snapshot, r.get("country"), "costar"),
    }


def _market_row_to_mercado(r: dict, snapshot: dict) -> dict:
    return {
        "country": r.get("country"),
        "market_name": r.get("market_name"),
        "costar_market_code": "",
        "market_uid": "",
        "region": "",
        "period_kind": "ltm" if not r.get("period") else "monthly",
        "period_start": r.get("period") or "",
        "period_end": r.get("period") or "",
        "currency": "EUR",
        "occupancy_pct": (r.get("occupancy_12m") or 0) * 100 if r.get("occupancy_12m") is not None else None,
        "adr": r.get("adr_12m"),
        "revpar": r.get("revpar_12m"),
        "supply_rooms": _round_int(r.get("supply_12m")),
        "demand_rooms": _round_int(r.get("demand_12m")),
        "revenue": _round_int(r.get("revenue_12m")),
        "supply_yoy_pct": (r.get("supply_yoy_12m") or 0) * 100 if r.get("supply_yoy_12m") is not None else None,
        "demand_yoy_pct": (r.get("demand_yoy_12m") or 0) * 100 if r.get("demand_yoy_12m") is not None else None,
        "occupancy_yoy_pp": (r.get("occupancy_yoy_12m") or 0) * 100 if r.get("occupancy_yoy_12m") is not None else None,
        "adr_yoy_pct": (r.get("adr_yoy_12m") or 0) * 100 if r.get("adr_yoy_12m") is not None else None,
        "revpar_yoy_pct": (r.get("revpar_yoy_12m") or 0) * 100 if r.get("revpar_yoy_12m") is not None else None,
        "revpar_index_vs_country": None,
        "hotel_count": None,
        "room_count_total": _round_int(r.get("rooms_inventory")),
        "pipeline_rooms": _round_int(r.get("rooms_under_construction")),
        "pipeline_hotels": None,
        "seasonality_index": None,
        **_meta_block(snapshot, f"{r.get('country')}|{r.get('market_name')}|{r.get('period') or ''}", "costar"),
    }


def _market_row_to_submercado(r: dict, snapshot: dict) -> dict:
    return {
        "country": r.get("country"),
        "market_name": r.get("market_name") or "Madrid",  # Submarket parent
        "submarket_name": r.get("submarket_name"),
        "costar_submarket_code": "",
        "submarket_uid": "",
        "chain_scale": "",
        "segment_type": "",
        "period_kind": "ltm",
        "period_start": "",
        "period_end": "",
        "currency": "EUR",
        "occupancy_pct": (r.get("occupancy_12m") or 0) * 100 if r.get("occupancy_12m") is not None else None,
        "adr": r.get("adr_12m"),
        "revpar": r.get("revpar_12m"),
        "supply_rooms": _round_int(r.get("supply_12m")),
        "demand_rooms": _round_int(r.get("demand_12m")),
        "revenue": _round_int(r.get("revenue_12m")),
        "supply_yoy_pct": (r.get("supply_yoy_12m") or 0) * 100 if r.get("supply_yoy_12m") is not None else None,
        "demand_yoy_pct": (r.get("demand_yoy_12m") or 0) * 100 if r.get("demand_yoy_12m") is not None else None,
        "occupancy_yoy_pp": (r.get("occupancy_yoy_12m") or 0) * 100 if r.get("occupancy_yoy_12m") is not None else None,
        "adr_yoy_pct": (r.get("adr_yoy_12m") or 0) * 100 if r.get("adr_yoy_12m") is not None else None,
        "revpar_yoy_pct": (r.get("revpar_yoy_12m") or 0) * 100 if r.get("revpar_yoy_12m") is not None else None,
        "revpar_index_vs_market": None,
        "hotel_count": None,
        "room_count_total": _round_int(r.get("rooms_inventory")),
        "pipeline_rooms": _round_int(r.get("rooms_under_construction")),
        "pipeline_hotels": None,
        **_meta_block(snapshot, f"{r.get('submarket_name')}", "costar"),
    }


def _hotel_to_row(h: dict, enrichment: dict, snapshot: dict) -> dict:
    """Map snapshot hotel + Booking enrichment → COSTAR_MASTER_HOTELESperMARKET row."""
    e = enrichment.get(h.get("hotel_id"), {}) or {}
    p = e.get("profile") or {}
    meta = e.get("_enrichment_meta") or {}
    fnb = p.get("fnb") or {}
    gym = p.get("gym") or {}
    spa = p.get("spa") or {}
    pool = p.get("pool") or {}
    parking = p.get("parking") or {}
    meeting = p.get("meeting_rooms") or {}
    rooftop = p.get("rooftop") or {}
    hmeta = h.get("_meta") or {}
    needs_review = hmeta.get("needs_review") or []

    lat = h.get("latitude") if h.get("latitude") is not None else p.get("latitude")
    lng = h.get("longitude") if h.get("longitude") is not None else p.get("longitude")
    coords_source = (
        "CoStar" if h.get("latitude") is not None
        else "Booking" if p.get("latitude") is not None
        else ""
    )

    return {
        # Identification
        "country": h.get("country"),
        "market_name": h.get("market_name"),
        "submarket_name": h.get("submarket_name"),
        "hotel_id": h.get("hotel_id"),
        "hotel_id_synthetic": "TRUE" if h.get("hotel_id_synthetic") else "FALSE",
        "name": h.get("name"),
        "brand": h.get("brand"),
        "operator": h.get("operator"),
        "owner": h.get("owner"),
        # Property characteristics
        "chain_scale": h.get("chain_scale"),
        "category": h.get("category"),
        "segment_type": h.get("segment_type"),
        "rooms_count": h.get("rooms_count"),
        "year_opened": h.get("year_opened"),
        "year_last_renovated": h.get("year_last_renovated"),
        "total_floors": h.get("total_floors"),
        # Location
        "address_line": h.get("address_line"),
        "postal_code": h.get("postal_code"),
        "latitude": lat,
        "longitude": lng,
        "neighborhood": h.get("neighborhood"),
        # Facilities · amenities · scoring (CoStar)
        "facilities": ", ".join(h.get("facilities") or []),
        "amenities": ", ".join(h.get("amenities") or []),
        "meeting_space_sqm": _round_int(h.get("meeting_space_sqm")),
        "parking_spaces": h.get("parking_spaces"),
        "score_costar": h.get("score_costar"),
        "score_external": json.dumps(h.get("score_external") or {}) if h.get("score_external") else "",
        # v1.3 additions
        "floors_above_ground": h.get("floors_above_ground"),
        "floors_below_ground": h.get("floors_below_ground"),
        "gross_building_sqm": _round_int(h.get("gross_building_sqm")),
        "lot_size_sqm": _round_int(h.get("lot_size_sqm")),
        "typical_floor_sqm": _round_int(h.get("typical_floor_sqm")),
        "meeting_rooms_count": h.get("meeting_rooms_count"),
        "last_sale_date": h.get("last_sale_date"),
        "last_sale_price_eur": h.get("last_sale_price_eur"),
        "catastro_id": h.get("catastro_id"),
        # Booking enrichment
        "booking_hotel_id": meta.get("booking_hotel_id"),
        "booking_url": p.get("booking_url"),
        "review_score": p.get("review_score"),
        "review_count": p.get("review_count"),
        "location_score": p.get("location_score"),
        "comfort_score": p.get("comfort_score"),
        "cleanliness_score": p.get("cleanliness_score"),
        "staff_score": p.get("staff_score"),
        "value_score": p.get("value_score"),
        "facilities_score": p.get("facilities_score"),
        "has_bar": _yn((fnb.get("bars_count") or 0) > 0),
        "has_restaurant": _yn((fnb.get("restaurants_count") or 0) > 0),
        "has_rooftop": _yn(rooftop.get("has_rooftop")),
        "has_gym": _yn(gym.get("has_gym")),
        "has_spa": _yn(spa.get("has_spa")),
        "has_pool": _yn(pool.get("has_pool")),
        "has_parking": _yn(parking.get("has_parking")),
        "has_meeting": _yn((meeting.get("count") or 0) > 0),
        "booking_facilities_count": len(p.get("facilities_detailed") or []),
        "booking_room_types_count": len(p.get("room_types") or []),
        "check_in_time": p.get("check_in_time"),
        "check_out_time": p.get("check_out_time"),
        "pet_policy": p.get("pet_policy"),
        "cancellation_policy": p.get("cancellation_policy"),
        "smoking_policy": p.get("smoking_policy"),
        "coords_source": coords_source,
        "enrichment_sources": ", ".join(meta.get("enrichment_sources") or []),
        "enrichment_confidence": meta.get("enrichment_confidence"),
        "profile_completeness_score": meta.get("profile_completeness_score"),
        "last_scraped_at": meta.get("last_scraped_at"),
        # Commercial context
        "competitive_set_ids": ", ".join(h.get("competitive_set_ids") or []),
        "transactions_history_ref": h.get("transactions_history_ref"),
        "notes": h.get("notes"),
        # Audit meta
        **_meta_block(snapshot, h.get("hotel_id"), "costar+rapidapi_booking" if e else "costar"),
        "review_required": "TRUE" if needs_review else "FALSE",
        "review_reason": ", ".join(needs_review),
    }


def main():
    """Build all institutional masters · populated with snapshot data
    when snapshot.json exists. Behaviour:

      - snapshot present + Supabase reachable: full populate including
        Booking enrichment merge on HOTELESperMARKET
      - snapshot present + Supabase unreachable: CoStar fields only ·
        Booking enrichment columns empty
      - no snapshot: emit headers-only templates (legacy v1.2 behaviour)
    """
    snapshot: dict = {}
    if SNAPSHOT_PATH.exists():
        snapshot = json.loads(SNAPSHOT_PATH.read_text(encoding="utf-8"))
        print(f"[build_masters] snapshot loaded · hotels={len(snapshot.get('hotels') or [])} · "
              f"market_snapshots={len(snapshot.get('market_snapshots') or [])} · "
              f"market_timeseries={len(snapshot.get('market_timeseries') or [])}")
    else:
        print(f"[build_masters] no snapshot at {SNAPSHOT_PATH} · emitting headers-only templates")

    market_snapshots = snapshot.get("market_snapshots") or []
    market_timeseries = snapshot.get("market_timeseries") or []
    hotels = snapshot.get("hotels") or []

    # ── PAIS · country_listing rows from snapshot ──
    pais_rows = [
        _market_row_to_pais(r, snapshot)
        for r in market_snapshots if r.get("granularity") == "country_listing"
    ]
    build_workbook(
        dataset_label="COSTAR_MASTER_PAIS",
        domain_columns=COUNTRY_COLUMNS,
        data_sheet_title="COUNTRY",
        schema_doc="docs/intelligence/costar-country-schema.md",
        output_path=MASTER_DIR / "COSTAR_MASTER_PAIS.xlsx",
        data_rows=pais_rows,
    )

    # ── MERCADOS · market snapshots + time-series ──
    mercados_rows = [
        _market_row_to_mercado(r, snapshot)
        for r in market_snapshots if r.get("granularity") == "market"
    ] + [
        _market_row_to_mercado(r, snapshot) for r in market_timeseries
    ]
    build_workbook(
        dataset_label="COSTAR_MASTER_MERCADOS",
        domain_columns=MARKET_COLUMNS,
        data_sheet_title="MARKET",
        schema_doc="docs/intelligence/costar-market-schema.md",
        output_path=MASTER_DIR / "COSTAR_MASTER_MERCADOS.xlsx",
        data_rows=mercados_rows,
    )

    # ── SUBMERCADOS · submarket rows ──
    submercados_rows = [
        _market_row_to_submercado(r, snapshot)
        for r in market_snapshots if r.get("granularity") == "submarket"
    ]
    build_workbook(
        dataset_label="COSTAR_MASTER_SUBMERCADOS",
        domain_columns=SUBMARKET_COLUMNS,
        data_sheet_title="SUBMARKET",
        schema_doc="docs/intelligence/costar-submarket-schema.md",
        output_path=MASTER_DIR / "COSTAR_MASTER_SUBMERCADOS.xlsx",
        data_rows=submercados_rows,
    )

    # ── CLASS · chain-scale aggregates derived from hotel inventory ──
    class_rows = []
    by_class: dict[tuple, dict] = {}
    for h in hotels:
        scale = h.get("chain_scale")
        if not scale:
            continue
        key = (h.get("country") or "", h.get("market_name") or "", scale)
        d = by_class.setdefault(key, {"hotel_count": 0, "rooms_total": 0})
        d["hotel_count"] += 1
        d["rooms_total"] += int(h.get("rooms_count") or 0)
    for (country, market, scale), agg in sorted(by_class.items()):
        class_rows.append({
            "country": country,
            "market_name": market,
            "submarket_name": "",
            "chain_scale": scale,
            "class_label_display": scale.replace("_", " ").title(),
            "segment_type": "",
            "period_kind": "snapshot",
            "period_start": "",
            "period_end": "",
            "currency": "EUR",
            "occupancy_pct": None, "adr": None, "revpar": None,
            "supply_rooms": None, "demand_rooms": None, "revenue": None,
            "supply_yoy_pct": None, "demand_yoy_pct": None, "occupancy_yoy_pp": None,
            "adr_yoy_pct": None, "revpar_yoy_pct": None,
            "revpar_index_vs_country": None, "revpar_index_vs_market": None,
            "hotel_count": agg["hotel_count"],
            "room_count_total": agg["rooms_total"],
            "pipeline_rooms": None, "pipeline_hotels": None,
            **_meta_block(snapshot, f"{country}|{market}|{scale}", "derived"),
            "notes": "Derived from hotel inventory · CoStar doesn't ship class-level KPIs in this drop",
        })
    build_workbook(
        dataset_label="COSTAR_MASTER_CLASS",
        domain_columns=CLASS_COLUMNS,
        data_sheet_title="CLASS",
        schema_doc="docs/intelligence/costar-class-schema.md",
        output_path=MASTER_DIR / "COSTAR_MASTER_CLASS.xlsx",
        data_rows=class_rows,
    )

    # ── HOTELESperMARKET · 364 hotels + Booking enrichment merged ──
    enrichment = _load_enrichment_from_storage()
    hotel_rows = [_hotel_to_row(h, enrichment, snapshot) for h in hotels]
    # Rename to match workspace directory naming · the legacy
    # COSTAR_MASTER_HOTELES_POR_MERCADO.xlsx stays in MASTER/ for
    # backward compatibility but the canonical filename going forward
    # mirrors the INPUT directory (HOTELESperMARKET).
    build_workbook(
        dataset_label="COSTAR_MASTER_HOTELESperMARKET",
        domain_columns=HOTELS_BY_MARKET_COLUMNS,
        data_sheet_title="HOTELS",
        schema_doc="docs/intelligence/costar-hotels-by-market-schema.md",
        output_path=MASTER_DIR / "COSTAR_MASTER_HOTELESperMARKET.xlsx",
        data_rows=hotel_rows,
    )


if __name__ == "__main__":
    main()
