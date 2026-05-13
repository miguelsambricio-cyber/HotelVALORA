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

from datetime import datetime, timezone
from pathlib import Path

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


def build_data_sheet(ws, title: str, domain_columns):
    ws.title = title
    columns = domain_columns + INGESTION_META_COLUMNS
    ws.append([name for (name, _t, _r, _n) in columns])
    style_header(ws)
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


def build_workbook(dataset_label: str, domain_columns, data_sheet_title: str, schema_doc: str, output_path: Path):
    wb = Workbook()
    build_data_sheet(wb.active, data_sheet_title, domain_columns)
    build_dictionary_sheet(wb, "DICTIONARY", domain_columns)
    build_ingestion_log_sheet(wb)
    build_sources_registry_sheet(wb)
    build_readme_sheet(wb, dataset_label, data_sheet_title.lower(), schema_doc)

    output_path.parent.mkdir(parents=True, exist_ok=True)
    wb.save(output_path)
    print(f"[build_masters] wrote {output_path.relative_to(ROOT.parent.parent)}")


def main():
    build_workbook(
        dataset_label="COSTAR_MASTER_PAIS",
        domain_columns=COUNTRY_COLUMNS,
        data_sheet_title="COUNTRY",
        schema_doc="docs/intelligence/costar-country-schema.md",
        output_path=MASTER_DIR / "COSTAR_MASTER_PAIS.xlsx",
    )
    build_workbook(
        dataset_label="COSTAR_MASTER_MERCADOS",
        domain_columns=MARKET_COLUMNS,
        data_sheet_title="MARKET",
        schema_doc="docs/intelligence/costar-market-schema.md",
        output_path=MASTER_DIR / "COSTAR_MASTER_MERCADOS.xlsx",
    )
    build_workbook(
        dataset_label="COSTAR_MASTER_SUBMERCADOS",
        domain_columns=SUBMARKET_COLUMNS,
        data_sheet_title="SUBMARKET",
        schema_doc="docs/intelligence/costar-submarket-schema.md",
        output_path=MASTER_DIR / "COSTAR_MASTER_SUBMERCADOS.xlsx",
    )
    # COSTAR_MASTER_CLASS retired in v1.2 — chain-scale is now an attribute
    # on each hotel record in HOTELESperMARKET, not a separate master.
    # The legacy COSTAR_MASTER_CLASS.xlsx stays in MASTER/ for archival.
    # See docs/intelligence/costar-class-schema.md for the deprecation note.
    build_workbook(
        dataset_label="COSTAR_MASTER_HOTELES_POR_MERCADO",
        domain_columns=HOTELS_BY_MARKET_COLUMNS,
        data_sheet_title="HOTELS",
        schema_doc="docs/intelligence/costar-hotels-by-market-schema.md",
        output_path=MASTER_DIR / "COSTAR_MASTER_HOTELES_POR_MERCADO.xlsx",
    )


if __name__ == "__main__":
    main()
