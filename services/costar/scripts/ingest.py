"""COSTAR v1.2 — Master Inventory Engine (CLI orchestrator).

End-to-end ingestion across the four COSTAR streams + cross-references
to the compset and transactions workspaces. One pass through every
INPUT folder builds:

  - canonical hotel inventory (Dataset B · the reference backbone)
  - compset linkage layer  (joins compset members → hotel_id)
  - transaction reconciliation (joins transactions → hotel_id)
  - reconciliation queue (missing fields · suspected duplicates ·
                          orphan compset refs · orphan transactions)
  - provenance per row (source file + ingestion_batch_id + confidence)

Outputs:

  services/costar/MASTER/snapshot.json
      Authoritative read path for /user/admin/hotels (Node side).
  services/costar/logs/<YYYY-MM>/<batch_id>.jsonl
      Per-run audit log (one JSON line per pipeline event).
  services/costar/staging/{failed,review}/<batch_id>/
      Operator triage when rows can't land cleanly.
  services/costar/HOTELESperMARKET/INPUT/<file>  → HOTELESperMARKET/OLD/<file>
      Processed files moved from INPUT → OLD after successful merge into
      the master. INPUT MUST only contain files pending ingestion. Failed
      ingests stay in INPUT for the operator to inspect.

Usage:
    python services/costar/scripts/ingest.py
    python services/costar/scripts/ingest.py --dry-run
    python services/costar/scripts/ingest.py --verbose

Exit codes:
    0  success or partial success (some files routed to staging)
    1  catastrophic failure (workspace missing, no readable files)
    2  invalid CLI args
"""

from __future__ import annotations

import argparse
import json
import sys
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

# Make sibling modules importable when invoked from any CWD
HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))

from dedup import (  # noqa: E402
    classify_hotel_row,
    compset_id,
    find_fuzzy_match,
    ingestion_batch_id,
    normalise_address,
    normalise_str_for_key,
    transaction_id,
)


def _rehydrate_match_fields(hotel: dict[str, Any]) -> dict[str, Any]:
    """Rebuild the in-pipeline-only `_match_*` helpers on a hotel row.

    Hotels persisted in `snapshot.json` have these fields stripped by
    `snapshot._strip_private`. After the stateful merge brings them back,
    fuzzy-match code needs them re-derived from the canonical columns.
    """
    if "_match_name" not in hotel:
        hotel["_match_name"] = normalise_str_for_key(hotel.get("name"))
    if "_match_address" not in hotel:
        hotel["_match_address"] = normalise_address(hotel.get("address_line"))
    return hotel
from normalization import (  # noqa: E402
    DEFAULT_COUNTRY,
    HOTEL_HEADER_ALIASES,
    MARKET_HEADER_ALIASES,
    NORMALIZATION_VERSION,
    PROJECT_HEADER_ALIASES,
    normalise_country,
    normalise_hotel_row,
    normalise_numeric,
)
from source_readers import (  # noqa: E402
    iter_input_files,
    read_rows_with_aliases,
)
from snapshot import (  # noqa: E402
    build_snapshot,
    load_existing_snapshot,
    merge_by_id,
    write_snapshot,
)
from corrections import apply_corrections  # noqa: E402
from compset_inference import infer_synthetic_compsets  # noqa: E402
from dedup_transactions import dedupe_transactions  # noqa: E402

# ── Workspace layout ────────────────────────────────────────────────────────
#
# Governance rule: every workspace has exactly ONE pair —
#   INPUT/  → files pending ingestion (operational queue)
#   OLD/    → files successfully merged into the master (audit trail)
#
# Successful ingest MOVES the file from INPUT to OLD. Failed ingest LEAVES
# the file in INPUT for the operator to inspect. The pre-2026-05-14
# `old.<workspace>/` naming is retired — operators may keep those legacy
# folders for historical audit but the pipeline only writes to OLD/.

WORKSPACE = HERE.parent  # services/costar
REPO_ROOT = WORKSPACE.parent.parent

INPUT_HOTELS = WORKSPACE / "HOTELESperMARKET" / "INPUT"
ARCHIVE_HOTELS = WORKSPACE / "HOTELESperMARKET" / "OLD"
INPUT_PAIS = WORKSPACE / "PAIS" / "INPUT"
ARCHIVE_PAIS = WORKSPACE / "PAIS" / "OLD"
INPUT_MERCADO = WORKSPACE / "MERCADO" / "INPUT"
ARCHIVE_MERCADO = WORKSPACE / "MERCADO" / "OLD"
INPUT_SUBMERCADO = WORKSPACE / "SUBMERCADO" / "INPUT"
ARCHIVE_SUBMERCADO = WORKSPACE / "SUBMERCADO" / "OLD"

COMPSET_WORKSPACE = REPO_ROOT / "services" / "compset"
COMPSET_INPUT = COMPSET_WORKSPACE / "INPUT"
ARCHIVE_COMPSET = COMPSET_WORKSPACE / "OLD"

TRANSACTIONS_WORKSPACE = REPO_ROOT / "services" / "transactions"
TRANSACTIONS_INPUT = TRANSACTIONS_WORKSPACE / "INPUT_TRANSACCIONES"
ARCHIVE_TRANSACTIONS = TRANSACTIONS_WORKSPACE / "INPUT_TRANSACCIONES" / "OLD"
PROJECTS_INPUT = TRANSACTIONS_WORKSPACE / "INPUT_PROYECTOS"
ARCHIVE_PROJECTS = TRANSACTIONS_WORKSPACE / "INPUT_PROYECTOS" / "OLD"

# (workspace_path, archive_path) registry — single source of truth for the
# `archive_files()` step. Keep in sync with the INPUT_* / ARCHIVE_* constants.
ARCHIVE_REGISTRY: dict[Path, Path] = {
    INPUT_HOTELS: ARCHIVE_HOTELS,
    INPUT_PAIS: ARCHIVE_PAIS,
    INPUT_MERCADO: ARCHIVE_MERCADO,
    INPUT_SUBMERCADO: ARCHIVE_SUBMERCADO,
    COMPSET_INPUT: ARCHIVE_COMPSET,
    TRANSACTIONS_INPUT: ARCHIVE_TRANSACTIONS,
    PROJECTS_INPUT: ARCHIVE_PROJECTS,
}

MASTER_DIR = WORKSPACE / "MASTER"
SNAPSHOT_PATH = MASTER_DIR / "snapshot.json"
LOGS_DIR = WORKSPACE / "logs"
STAGING_DIR = WORKSPACE / "staging"


# ── Generic alias maps for the cross-workspace streams ──────────────────────

COMPSET_HEADER_ALIASES: dict[str, str] = {
    "target_hotel": "target_hotel_name", "target": "target_hotel_name",
    "target_hotel_id": "target_hotel_id",
    "member": "member_hotel_name", "compset_member": "member_hotel_name", "competitor": "member_hotel_name",
    "member_hotel_id": "member_hotel_id",
    "country": "country", "pais": "country",
    "market": "market_name", "mercado": "market_name",
}

TRANSACTION_HEADER_ALIASES: dict[str, str] = {
    "asset_name": "asset_name", "asset": "asset_name", "hotel": "asset_name", "hotel_name": "asset_name", "property": "asset_name", "nombre": "asset_name",
    # CoStar ES: "Nombre del edificio" → nombre_del_edificio
    "nombre_del_edificio": "asset_name", "edificio": "asset_name",
    "country": "country", "pais": "country",
    "market": "market_name", "mercado": "market_name",
    "submarket": "submarket_name", "submercado": "submarket_name",
    "ciudad": "city_es_costar",
    "closed_at": "closed_at", "close_date": "closed_at", "fecha_cierre": "closed_at",
    # CoStar ES transaction timing
    "fecha_de_la_transaccion": "closed_at", "fecha_de_transaccion": "closed_at",
    "fecha_de_la_operacion": "closed_at", "fecha_de_venta": "closed_at",
    "price_eur": "price_eur", "price": "price_eur", "valor": "price_eur", "deal_value": "price_eur",
    "precio": "price_eur", "precio_de_venta": "price_eur", "importe": "price_eur",
    "rooms": "rooms_count", "habitaciones": "rooms_count",
    "buyer": "buyer", "comprador": "buyer",
    "seller": "seller", "vendedor": "seller",
}


# ── Logging ─────────────────────────────────────────────────────────────────


class RunLogger:
    def __init__(self, batch_id: str, *, verbose: bool, dry_run: bool):
        self.batch_id = batch_id
        self.verbose = verbose
        self.dry_run = dry_run
        self.events: list[dict[str, Any]] = []

    def event(self, level: str, kind: str, **fields: Any) -> None:
        evt = {
            "ts": datetime.now(timezone.utc).isoformat(timespec="seconds"),
            "level": level,
            "kind": kind,
            **fields,
        }
        self.events.append(evt)
        if self.verbose or level in ("warn", "error"):
            print(f"[{level.upper()}] {kind} · {fields}")

    def flush(self) -> Path | None:
        if self.dry_run:
            return None
        month = datetime.now(timezone.utc).strftime("%Y-%m")
        out_dir = LOGS_DIR / month
        out_dir.mkdir(parents=True, exist_ok=True)
        log_path = out_dir / f"{self.batch_id}.jsonl"
        with log_path.open("w", encoding="utf-8") as f:
            for evt in self.events:
                f.write(json.dumps(evt, ensure_ascii=False) + "\n")
        return log_path


# ── Hotel inventory ingest ──────────────────────────────────────────────────


def ingest_hotels(
    batch_id: str,
    logger: RunLogger,
) -> tuple[list[dict[str, Any]], list[dict[str, Any]], list[Path], list[Path]]:
    """Return (hotels, reconciliation_queue, processed_files, failed_files)."""
    hotels: list[dict[str, Any]] = []
    reconciliation: list[dict[str, Any]] = []
    processed: list[Path] = []
    failed: list[Path] = []

    files = list(iter_input_files(INPUT_HOTELS))
    if not files:
        logger.event("info", "hotels.no_input")
        return hotels, reconciliation, processed, failed

    seen_ids: dict[str, dict[str, Any]] = {}

    for path in files:
        try:
            raw_rows = read_rows_with_aliases(path, HOTEL_HEADER_ALIASES)
        except Exception as e:  # noqa: BLE001
            logger.event("error", "hotels.read_failed", file=str(path), err=str(e))
            failed.append(path)
            continue

        logger.event("info", "hotels.file_read", file=str(path.relative_to(REPO_ROOT)), rows=len(raw_rows))

        for raw in raw_rows:
            row, reasons = normalise_hotel_row(raw)
            if row is None:
                reconciliation.append({
                    "id": f"recon_{len(reconciliation):04d}",
                    "kind": "unrecoverable_row",
                    "source_file": str(path.relative_to(REPO_ROOT)),
                    "detail": "; ".join(reasons) or "missing primary key inputs",
                })
                continue

            # Fuzzy dedup against already-seen hotels in this batch
            existing, score = find_fuzzy_match(row, list(seen_ids.values()))
            if existing and existing["hotel_id"] != row["hotel_id"]:
                # Potential duplicate — flag for operator review but keep
                # the new row distinct so nothing is silently dropped.
                reconciliation.append({
                    "id": f"recon_{len(reconciliation):04d}",
                    "kind": "suspected_duplicate",
                    "hotel_id": row["hotel_id"],
                    "candidate_hotel_id": existing["hotel_id"],
                    "fuzzy_score": score,
                    "detail": f"'{row['name']}' may duplicate '{existing['name']}' (score {score})",
                })

            confidence, missing_reasons = classify_hotel_row(row)
            row["_meta"] = {
                "ingestion_batch_id": batch_id,
                "source_path": str(path.relative_to(REPO_ROOT)),
                "confidence": confidence,
                "needs_review": missing_reasons + reasons,
                "fuzzy_matched": False,
            }
            seen_ids[row["hotel_id"]] = row
            hotels.append(row)

            if confidence < 0.7:
                reconciliation.append({
                    "id": f"recon_{len(reconciliation):04d}",
                    "kind": "low_confidence",
                    "hotel_id": row["hotel_id"],
                    "name": row["name"],
                    "confidence": confidence,
                    "detail": "; ".join((missing_reasons + reasons)[:5]),
                })

        processed.append(path)

    return hotels, reconciliation, processed, failed


# ── Compset linkage ─────────────────────────────────────────────────────────


def ingest_compsets(
    batch_id: str,
    hotels_by_id: dict[str, dict[str, Any]],
    logger: RunLogger,
) -> tuple[list[dict[str, Any]], list[dict[str, Any]], list[Path], list[Path]]:
    """Build compset rows + reconciliation entries for orphan member refs.

    Returns (compsets, reconciliation_entries, processed_files, failed_files).
    `processed_files` is the subset of input files that read successfully —
    eligible for archival to ARCHIVE_COMPSET.
    """
    compsets: list[dict[str, Any]] = []
    extra_recon: list[dict[str, Any]] = []
    processed: list[Path] = []
    failed: list[Path] = []

    files = list(iter_input_files(COMPSET_INPUT))
    if not files:
        logger.event("info", "compset.no_input")
        return compsets, extra_recon, processed, failed

    # Group rows by target_hotel into a member graph
    by_target: dict[str, dict[str, Any]] = {}

    for path in files:
        try:
            rows = read_rows_with_aliases(path, COMPSET_HEADER_ALIASES)
        except Exception as e:  # noqa: BLE001
            logger.event("error", "compset.read_failed", file=str(path), err=str(e))
            failed.append(path)
            continue
        processed.append(path)

        for raw in rows:
            target_name = (raw.get("target_hotel_name") or "").strip()
            member_name = (raw.get("member_hotel_name") or "").strip()
            if not (target_name and member_name):
                continue

            country_norm, _ = normalise_country(raw.get("country"))
            country = country_norm or DEFAULT_COUNTRY
            market = (raw.get("market_name") or "").strip()

            target_id = _resolve_hotel_by_name(target_name, country, market, hotels_by_id)
            member_id = _resolve_hotel_by_name(member_name, country, market, hotels_by_id)

            if not target_id:
                extra_recon.append({
                    "id": f"recon_cs_target_{len(extra_recon):04d}",
                    "kind": "compset_orphan_target",
                    "detail": f"target hotel '{target_name}' not found in inventory",
                    "source_file": str(path.relative_to(REPO_ROOT)),
                })
                continue
            if not member_id:
                extra_recon.append({
                    "id": f"recon_cs_member_{len(extra_recon):04d}",
                    "kind": "compset_orphan_member",
                    "target_hotel_id": target_id,
                    "detail": f"member hotel '{member_name}' not found in inventory",
                    "source_file": str(path.relative_to(REPO_ROOT)),
                })
                continue

            graph = by_target.setdefault(target_id, {"members": set()})
            graph["members"].add(member_id)

    for target_id, info in by_target.items():
        member_ids = sorted(info["members"])
        cs_id = compset_id(target_id, member_ids)
        compsets.append({
            "compset_id": cs_id,
            "target_hotel_id": target_id,
            "member_hotel_ids": member_ids,
            "warnings": [],
            "_meta": {"ingestion_batch_id": batch_id},
        })
        # Reflect compset membership back onto each hotel row
        target_row = hotels_by_id.get(target_id)
        if target_row:
            target_row["competitive_set_ids"] = sorted(set(target_row.get("competitive_set_ids", []) + member_ids))

    return compsets, extra_recon, processed, failed


def _resolve_hotel_by_name(
    name: str,
    country: str,
    market: str,
    hotels_by_id: dict[str, dict[str, Any]],
) -> str | None:
    target_match = {
        "_match_name": normalise_str_for_key(name),
        "_match_address": "",
    }
    pool = [h for h in hotels_by_id.values()
            if (not country or h["country"] == country)
            and (not market or h["market_name"].lower() == market.lower())]
    best, score = find_fuzzy_match(target_match, pool, threshold=90)
    return best["hotel_id"] if best else None


# ── Transactions linkage ────────────────────────────────────────────────────


def ingest_transactions(
    batch_id: str,
    hotels_by_id: dict[str, dict[str, Any]],
    logger: RunLogger,
) -> tuple[list[dict[str, Any]], list[dict[str, Any]], list[Path], list[Path]]:
    """Build transaction reconciliation layer.

    Reads both the COSTAR official export and the operator's private
    transactions file from `services/transactions/INPUT_TRANSACCIONES/`.
    Provenance (`source` = "costar" | "private") is preserved per row.
    Orphan transactions (no matching hotel in inventory) surface in the
    reconciliation queue.

    Returns (transactions, reconciliation_entries, processed_files, failed_files).
    """
    transactions: list[dict[str, Any]] = []
    extra_recon: list[dict[str, Any]] = []
    processed: list[Path] = []
    failed: list[Path] = []

    files = list(iter_input_files(TRANSACTIONS_INPUT))
    if not files:
        logger.event("info", "transactions.no_input")
        return transactions, extra_recon, processed, failed

    for path in files:
        # Classify the source by filename
        source = "costar" if "costar" in path.name.lower() else "private"

        try:
            rows = read_rows_with_aliases(path, TRANSACTION_HEADER_ALIASES)
        except Exception as e:  # noqa: BLE001
            logger.event("error", "transactions.read_failed", file=str(path), err=str(e))
            failed.append(path)
            continue
        processed.append(path)

        for raw in rows:
            asset_name = (raw.get("asset_name") or "").strip()
            if not asset_name:
                continue
            closed_at = str(raw.get("closed_at") or "").strip() or None
            price_eur, _ = normalise_numeric(raw.get("price_eur"))
            tx_id = transaction_id(source, asset_name, closed_at, price_eur)

            country_norm, _ = normalise_country(raw.get("country"))
            country = country_norm or DEFAULT_COUNTRY
            market = (raw.get("market_name") or "").strip() or (raw.get("city_es_costar") or "").strip()
            matched_hotel = _resolve_hotel_by_name(asset_name, country, market, hotels_by_id)

            tx_row = {
                "transaction_id": tx_id,
                "source": source,
                "hotel_id": matched_hotel,
                "asset_name": asset_name,
                "country": country or None,
                "market_name": market or None,
                "closed_at": closed_at,
                "price_eur": price_eur,
                "buyer": (raw.get("buyer") or None) or None,
                "seller": (raw.get("seller") or None) or None,
                "_meta": {
                    "ingestion_batch_id": batch_id,
                    "source_path": str(path.relative_to(REPO_ROOT)),
                },
            }
            transactions.append(tx_row)

            if matched_hotel is None:
                extra_recon.append({
                    "id": f"recon_tx_orphan_{len(extra_recon):04d}",
                    "kind": "transaction_orphan",
                    "transaction_id": tx_id,
                    "detail": f"transaction '{asset_name}' ({source}) has no matching hotel in inventory",
                    "source_file": str(path.relative_to(REPO_ROOT)),
                })
            else:
                hotel = hotels_by_id.get(matched_hotel)
                if hotel and hotel.get("transactions_history_ref") is None:
                    hotel["transactions_history_ref"] = tx_id

    return transactions, extra_recon, processed, failed


# ── Market-data ingest (Phase 2.3.d.6f · 2026-05-14) ────────────────────────
#
# CoStar market-data exports come in two shapes per granularity:
#   (a) GeographyList   — current-snapshot KPIs · one row per market or
#                          submarket · no `Periodo` column
#   (b) DataTable       — time-series · one row per (geography, period)
#
# Each stream lands in its own snapshot key so downstream report-engine
# code can pull the latest snapshot or the full time-series independently.


def _read_market_rows(
    path: Path,
    *,
    default_country: str,
    granularity: str,
    batch_id: str,
    logger: RunLogger,
) -> tuple[list[dict[str, Any]], bool]:
    """Read a CoStar market-data XLSX. Returns (rows, read_ok)."""
    try:
        raw_rows = read_rows_with_aliases(path, MARKET_HEADER_ALIASES)
    except Exception as e:  # noqa: BLE001
        logger.event("error", "market.read_failed", file=str(path), granularity=granularity, err=str(e))
        return [], False

    out: list[dict[str, Any]] = []
    for raw in raw_rows:
        market = (raw.get("market_name") or "").strip() or None
        submarket = (raw.get("submarket_name") or "").strip() or None
        period = (str(raw.get("period") or "").strip()) or None
        # Numeric fields — pass through `normalise_numeric` for forgiveness
        def num(k: str) -> float | None:
            v, _ = normalise_numeric(raw.get(k))
            return v
        # Skip rows that have neither market/submarket nor period — they're
        # blank lines or schema artefacts at the bottom of the export.
        if not (market or submarket or period):
            continue
        out.append({
            "country": default_country,
            "market_name": market,
            "submarket_name": submarket,
            "period": period,
            "granularity": granularity,
            "rooms_inventory": num("rooms_inventory"),
            "rooms_under_construction": num("rooms_under_construction"),
            "rooms_delivered_12m": num("rooms_delivered_12m"),
            "occupancy_12m": num("occupancy_12m"),
            "occupancy_yoy_12m": num("occupancy_yoy_12m"),
            "adr_12m": num("adr_12m"),
            "adr_yoy_12m": num("adr_yoy_12m"),
            "revpar_12m": num("revpar_12m"),
            "revpar_yoy_12m": num("revpar_yoy_12m"),
            "supply_12m": num("supply_12m"),
            "supply_yoy_12m": num("supply_yoy_12m"),
            "demand_12m": num("demand_12m"),
            "demand_yoy_12m": num("demand_yoy_12m"),
            "revenue_12m": num("revenue_12m"),
            "revenue_yoy_12m": num("revenue_yoy_12m"),
            "_meta": {
                "ingestion_batch_id": batch_id,
                "source_path": str(path.relative_to(REPO_ROOT)),
                "granularity": granularity,
            },
        })
    logger.event("info", "market.file_read", file=str(path.relative_to(REPO_ROOT)), granularity=granularity, rows=len(out))
    return out, True


def ingest_market_data(batch_id: str, logger: RunLogger) -> tuple[
    list[dict[str, Any]],  # snapshots (geo lists · current KPIs)
    list[dict[str, Any]],  # timeseries (DataTable · per-period KPIs)
    list[Path],            # processed files (eligible for archive)
    list[Path],            # failed files
]:
    """Ingest PAIS / MERCADO / SUBMERCADO INPUT folders.

    Files whose name contains "DataTable" are treated as time-series;
    everything else lands in the current-snapshot list. Granularity is
    derived from the parent INPUT folder.
    """
    snapshots: list[dict[str, Any]] = []
    timeseries: list[dict[str, Any]] = []
    processed: list[Path] = []
    failed: list[Path] = []

    streams = [
        (INPUT_PAIS, "country_listing"),
        (INPUT_MERCADO, "market"),
        (INPUT_SUBMERCADO, "submarket"),
    ]
    for input_root, granularity in streams:
        files = list(iter_input_files(input_root))
        if not files:
            logger.event("info", f"market.no_input.{granularity}")
            continue
        for path in files:
            rows, ok = _read_market_rows(
                path,
                default_country=DEFAULT_COUNTRY,
                granularity=granularity,
                batch_id=batch_id,
                logger=logger,
            )
            if not ok:
                failed.append(path)
                continue
            # Time-series files (CoStar DataTable export) have a "Periodo"
            # column → those rows go to the timeseries bucket; the rest
            # are current-snapshot listings.
            is_timeseries = "datatable" in path.name.lower() or any(r.get("period") for r in rows)
            if is_timeseries:
                timeseries.extend(rows)
            else:
                snapshots.extend(rows)
            processed.append(path)

    return snapshots, timeseries, processed, failed


# ── Projects ingest (CoStar hotel pipeline export) ──────────────────────────


def ingest_projects(batch_id: str, logger: RunLogger) -> tuple[
    list[dict[str, Any]],  # project rows
    list[Path],            # processed
    list[Path],            # failed
]:
    """Read `services/transactions/INPUT_PROYECTOS/*.xlsx` as the hotel
    pipeline · english headers · 1 row per planned/under-construction
    property."""
    projects: list[dict[str, Any]] = []
    processed: list[Path] = []
    failed: list[Path] = []

    files = list(iter_input_files(PROJECTS_INPUT))
    if not files:
        logger.event("info", "projects.no_input")
        return projects, processed, failed

    for path in files:
        try:
            raw_rows = read_rows_with_aliases(path, PROJECT_HEADER_ALIASES)
        except Exception as e:  # noqa: BLE001
            logger.event("error", "projects.read_failed", file=str(path), err=str(e))
            failed.append(path)
            continue

        for raw in raw_rows:
            name = (raw.get("project_name") or "").strip()
            if not name:
                continue
            country_norm, _ = normalise_country(raw.get("country"))
            rooms, _ = normalise_numeric(raw.get("rooms_count"), kind="integer")
            stars, _ = normalise_numeric(raw.get("stars"), kind="integer")
            projects.append({
                "project_id": f"proj_{name.replace(' ', '_').lower()[:32]}_{batch_id[-6:]}",
                "project_name": name,
                "city": (raw.get("city") or None) or None,
                "country": country_norm or DEFAULT_COUNTRY,
                "state_province": (raw.get("state_province") or None) or None,
                "phase": (raw.get("phase") or None) or None,
                "status": (raw.get("status") or None) or None,
                "opening_date": (str(raw.get("opening_date") or "").strip()) or None,
                "construction_type": (raw.get("construction_type") or None) or None,
                "stars": stars,
                "rooms_count": rooms,
                "street": (raw.get("street") or None) or None,
                "postal_code": (raw.get("postal_code") or None) or None,
                "_meta": {
                    "ingestion_batch_id": batch_id,
                    "source_path": str(path.relative_to(REPO_ROOT)),
                },
            })
        processed.append(path)
        logger.event("info", "projects.file_read", file=str(path.relative_to(REPO_ROOT)), rows=len(raw_rows))

    return projects, processed, failed


# ── Archive ─────────────────────────────────────────────────────────────────


def _resolve_archive_root(file_path: Path) -> Path | None:
    """Look up the destination OLD/ folder for a source file via
    `ARCHIVE_REGISTRY`. Returns `None` for files outside any known
    INPUT root — they are skipped with a warning rather than moved
    somewhere unsafe."""
    for input_root, archive_root in ARCHIVE_REGISTRY.items():
        try:
            if input_root in file_path.parents:
                return archive_root
        except ValueError:
            continue
    return None


def _move_to_archive(source: Path, archive_root: Path, logger: RunLogger) -> bool:
    """Move `source` into `archive_root`.

    Governance rule: preserve original filename. Only if the destination
    already exists, insert a timestamp before the extension so the
    historical artefact isn't overwritten.

    Falls back to `shutil.move` when `Path.rename` raises (cross-volume
    moves on Windows, file held open by Excel, etc.). On hard failure
    the source stays in INPUT — caller treats that as `archive_failed`
    in the batch summary.
    """
    import shutil
    archive_root.mkdir(parents=True, exist_ok=True)
    target = archive_root / source.name
    if target.exists():
        ts = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%S")
        target = archive_root / f"{source.stem}.{ts}{source.suffix}"
        # If somehow the timestamp collides too (sub-second double-run),
        # add a small counter.
        counter = 1
        while target.exists():
            target = archive_root / f"{source.stem}.{ts}.{counter}{source.suffix}"
            counter += 1

    try:
        source.rename(target)
        return True
    except OSError:
        try:
            shutil.move(str(source), str(target))
            return True
        except OSError as e2:
            logger.event(
                "error",
                "archive.move_failed",
                file=str(source.relative_to(REPO_ROOT)),
                target=str(target.relative_to(REPO_ROOT)),
                err=str(e2),
                hint="file may be open in Excel or held by another process — close it and re-run",
            )
            return False


def archive_files(files: list[Path], logger: RunLogger, *, dry_run: bool) -> dict[str, int]:
    """Move every successfully-processed source file from INPUT → OLD.

    Returns a counters dict suitable for inclusion in the batch summary:

        {archived, archive_failed, unknown_root, skipped_dry_run}

    Failure modes are explicit by design — the user mandate is that
    INPUT must only contain files pending ingestion. A locked-file
    archive failure must NOT be silent.
    """
    counters = {"archived": 0, "archive_failed": 0, "unknown_root": 0, "skipped_dry_run": 0}

    if dry_run:
        for f in files:
            logger.event("info", "archive.skipped_dry_run", file=str(f.relative_to(REPO_ROOT)))
            counters["skipped_dry_run"] += 1
        return counters

    for f in files:
        archive_root = _resolve_archive_root(f)
        if archive_root is None:
            logger.event("warn", "archive.unknown_root", file=str(f.relative_to(REPO_ROOT)))
            counters["unknown_root"] += 1
            continue

        if _move_to_archive(f, archive_root, logger):
            counters["archived"] += 1
            logger.event(
                "info",
                "archive.moved",
                file=str(f.relative_to(REPO_ROOT)),
                to=str(archive_root.relative_to(REPO_ROOT)),
            )
        else:
            counters["archive_failed"] += 1

    return counters


# ── CLI ─────────────────────────────────────────────────────────────────────


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="COSTAR v1.2 ingestion engine")
    parser.add_argument("--dry-run", action="store_true", help="Read + classify but do not archive or write snapshot")
    parser.add_argument("--verbose", action="store_true", help="Echo every pipeline event to stdout")
    parser.add_argument("--no-archive", action="store_true", help="Skip the INPUT → OLD move (snapshot still emitted)")
    args = parser.parse_args(argv)

    if not WORKSPACE.is_dir():
        print(f"✗ services/costar/ not found at {WORKSPACE}", file=sys.stderr)
        return 1

    batch_id = ingestion_batch_id()
    logger = RunLogger(batch_id, verbose=args.verbose, dry_run=args.dry_run)
    logger.event("info", "run.started", batch_id=batch_id, normalization=NORMALIZATION_VERSION, dry_run=args.dry_run)

    hotels, recon, processed_hotels, failed_hotels = ingest_hotels(batch_id, logger)

    # Phase 2.3.d.6d · stateful merge — the snapshot persists across runs.
    # Read the previous snapshot and carry forward any hotel / transaction /
    # compset_membership row whose stable ID is not present in this run.
    # Current-run rows always win on overlap. Synthetic compsets and the
    # reconciliation queue are NOT merged — they are regenerated every run
    # from the merged inventory.
    previous = load_existing_snapshot(SNAPSHOT_PATH)
    if previous:
        prev_hotels = previous.get("hotels", [])
        prev_txs = previous.get("transactions", [])
        prev_compsets = previous.get("compset_membership") or previous.get("compsets") or []
        carried_hotels_count = max(0, len(prev_hotels) - sum(1 for h in prev_hotels if h.get("hotel_id") in {x["hotel_id"] for x in hotels}))
        logger.event(
            "info",
            "snapshot.stateful_merge",
            previous_hotels=len(prev_hotels),
            previous_transactions=len(prev_txs),
            previous_compset_membership=len(prev_compsets),
            this_run_hotels=len(hotels),
            carried_hotels=carried_hotels_count,
        )
        hotels = merge_by_id(hotels, prev_hotels, "hotel_id")
    # Hotels carried in from the snapshot lost their `_match_*` helpers
    # during `_strip_private` at write time. Re-derive them so the
    # downstream fuzzy matchers (transactions linkage, compset
    # cross-reference) can score against them.
    for h in hotels:
        _rehydrate_match_fields(h)
    hotels_by_id = {h["hotel_id"]: h for h in hotels}

    compsets, recon_compset, processed_compset, failed_compset = ingest_compsets(batch_id, hotels_by_id, logger)
    recon.extend(recon_compset)
    if previous:
        compsets = merge_by_id(compsets, previous.get("compset_membership") or previous.get("compsets") or [], "compset_id")

    transactions, recon_tx, processed_tx, failed_tx = ingest_transactions(batch_id, hotels_by_id, logger)
    recon.extend(recon_tx)
    if previous:
        transactions = merge_by_id(transactions, previous.get("transactions", []), "transaction_id")

    # Phase 3.f.next 4 · Transaction dedup. News-sourced rows often
    # surface the same deal multiple times with slightly different
    # prices. Group by (asset, year-month) · pick the modal price ·
    # tag the rest as duplicates (kept in snapshot for audit; the web
    # UI filters them from comparables).
    transactions, dup_count = dedupe_transactions(transactions)
    logger.event(
        "info",
        "transactions.dedup",
        duplicates_marked=dup_count,
        canonical_rows=len([t for t in transactions if not t.get("is_duplicate")]),
        total_rows=len(transactions),
    )

    # Phase 2.3.d.6f · market-data + projects streams
    market_snapshots, market_timeseries, processed_market, failed_market = ingest_market_data(batch_id, logger)
    projects, processed_projects, failed_projects = ingest_projects(batch_id, logger)

    # Safety · carry forward market data from previous snapshot when the
    # current run captured 0 rows (operator forgot to drop files into
    # INPUT). Otherwise the snapshot would lose data the user paid for.
    if previous:
        if len(market_snapshots) == 0:
            prev_ms = previous.get("market_snapshots", [])
            if len(prev_ms) > 0:
                market_snapshots = prev_ms
                logger.event("info", "market.snapshots.carried_from_previous", count=len(prev_ms))
        if len(market_timeseries) == 0:
            prev_mt = previous.get("market_timeseries", [])
            if len(prev_mt) > 0:
                market_timeseries = prev_mt
                logger.event("info", "market.timeseries.carried_from_previous", count=len(prev_mt))
        if len(projects) == 0:
            prev_pj = previous.get("projects", [])
            if len(prev_pj) > 0:
                projects = prev_pj
                logger.event("info", "projects.carried_from_previous", count=len(prev_pj))

    # Phase 2.3.d.6c · Synthetic compset inference — generates a top-4
    # compset per hotel when the operator-confirmed membership isn't
    # available yet (PDF 3.1 not parsed). Every synthetic compset is
    # tagged `provenance: "synthetic_inference"`; real memberships
    # replace synthetic ones keyed by target_hotel_id when they land.
    synthetic_compsets = infer_synthetic_compsets(hotels, batch_id=batch_id) if hotels else []
    logger.event(
        "info",
        "compset.synthetic_inference",
        target_count=len(synthetic_compsets),
        algorithm="v1",
    )

    # Compset performance time-series (e.g. services/compset/INPUT/3.2)
    # has a fundamentally different shape (period · KPIs over time, not
    # membership list). Its dedicated ingestion path is deferred to
    # Phase 2.3.d.8 — for now we ship the placeholder.
    compset_performance: list[dict[str, Any]] = []

    # Phase 2.3.d.6 — apply pending operator corrections (overrides over
    # the canonical ingest values). Mutates hotels_by_id in place. The
    # consumer rewrites the JSONL with applied/rejected state so the next
    # run skips them.
    corrections_summary = apply_corrections(
        workspace=WORKSPACE,
        hotels_by_id=hotels_by_id,
        batch_id=batch_id,
        logger_event=logger.event,
    )
    logger.event("info", "corrections.summary", **corrections_summary)

    # Aggregate per-source-kind counts for the batch summary
    duplicate_recon = sum(1 for r in recon if r.get("kind") == "suspected_duplicate")
    all_processed_files = (
        processed_hotels + processed_compset + processed_tx
        + processed_market + processed_projects
    )
    all_failed_files = (
        failed_hotels + failed_compset + failed_tx
        + failed_market + failed_projects
    )

    batch_summary = {
        "batch_id": batch_id,
        "normalization_version": NORMALIZATION_VERSION,
        "files": {
            "processed": len(all_processed_files),
            "failed": len(all_failed_files),
            "archived": 0,            # populated by archive_files()
            "archive_failed": 0,      # populated by archive_files()
            "unknown_root": 0,        # populated by archive_files()
            "skipped_dry_run": 0,     # populated by archive_files()
        },
        "rows": {
            "hotels_ingested": len(hotels),
            "compsets_built": len(compsets),
            "transactions_linked": len(transactions),
            "market_snapshots": len(market_snapshots),
            "market_timeseries": len(market_timeseries),
            "projects": len(projects),
            "reconciliation_required": len(recon),
            "duplicate_suspected": duplicate_recon,
        },
        "corrections": corrections_summary,
        "per_stream": {
            "hotels": {"processed": len(processed_hotels), "failed": len(failed_hotels)},
            "compset": {"processed": len(processed_compset), "failed": len(failed_compset)},
            "transactions": {"processed": len(processed_tx), "failed": len(failed_tx)},
            "market_data": {"processed": len(processed_market), "failed": len(failed_market)},
            "projects": {"processed": len(processed_projects), "failed": len(failed_projects)},
        },
    }

    snapshot = build_snapshot(
        ingestion_batch_id=batch_id,
        hotels=hotels,
        compsets=compsets,
        compset_performance=compset_performance,
        synthetic_compsets=synthetic_compsets,
        transactions=transactions,
        reconciliation_queue=recon,
        corrections_summary=corrections_summary,
        batch_summary=batch_summary,
        market_snapshots=market_snapshots,
        market_timeseries=market_timeseries,
        projects=projects,
    )

    # Archive successful files BEFORE writing the snapshot so the
    # snapshot reflects the final operational state. archive_files()
    # handles --dry-run internally (returns counters with skipped_dry_run).
    if args.no_archive:
        logger.event("info", "archive.disabled_by_flag")
    else:
        archive_counters = archive_files(
            all_processed_files,
            logger,
            dry_run=args.dry_run,
        )
        batch_summary["files"].update(archive_counters)
        logger.event("info", "archive.summary", **archive_counters)

    # Re-snapshot so the persisted batch_summary reflects archive outcomes.
    snapshot = build_snapshot(
        ingestion_batch_id=batch_id,
        hotels=hotels,
        compsets=compsets,
        compset_performance=compset_performance,
        synthetic_compsets=synthetic_compsets,
        transactions=transactions,
        reconciliation_queue=recon,
        corrections_summary=corrections_summary,
        batch_summary=batch_summary,
        market_snapshots=market_snapshots,
        market_timeseries=market_timeseries,
        projects=projects,
    )

    if args.dry_run:
        logger.event("info", "snapshot.skipped_dry_run", totals=snapshot["totals"])
    else:
        write_snapshot(snapshot, SNAPSHOT_PATH)
        logger.event(
            "info",
            "snapshot.written",
            path=str(SNAPSHOT_PATH.relative_to(REPO_ROOT)),
            totals=snapshot["totals"],
        )
        # Regenerate institutional XLSX masters · populated review surface
        # for the administrator. Reads snapshot.json + Supabase manual_
        # enrichment/* so the Booking-merged HOTELESperMARKET stays in
        # sync with every ingest run.
        try:
            from build_masters import main as build_masters_main
            build_masters_main()
            logger.event("info", "masters.rebuilt")
        except Exception as e:  # noqa: BLE001
            logger.event("warn", "masters.rebuild_failed", err=str(e))

    log_path = logger.flush()
    if log_path:
        print(f"[OK] run log -> {log_path.relative_to(REPO_ROOT)}")

    # Executive summary to stdout (the line a human reads first)
    print()
    print(f"BATCH {batch_id}")
    print(f"  files       processed={batch_summary['files']['processed']} "
          f"archived={batch_summary['files']['archived']} "
          f"archive_failed={batch_summary['files']['archive_failed']} "
          f"failed={batch_summary['files']['failed']}")
    print(f"  rows        hotels={batch_summary['rows']['hotels_ingested']} "
          f"compsets={batch_summary['rows']['compsets_built']} "
          f"transactions={batch_summary['rows']['transactions_linked']}")
    print(f"  recon       total={batch_summary['rows']['reconciliation_required']} "
          f"duplicate_suspected={batch_summary['rows']['duplicate_suspected']}")
    print(f"  corrections applied={corrections_summary['applied']} "
          f"rejected={corrections_summary['rejected']} "
          f"pending_before={corrections_summary['pending_before']}")
    if batch_summary["files"]["archive_failed"] > 0:
        print()
        print("[WARN] Some files could not be moved INPUT -> OLD. They remain in INPUT.")
        print("       Most likely cause on Windows: the file is open in Excel.")
        print("       Close it and re-run; ingestion is idempotent.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
