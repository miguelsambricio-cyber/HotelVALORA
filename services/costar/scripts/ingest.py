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
  services/costar/HOTELES POR MERCADO/INPUT/.../  → old.class/.../
      Processed files archived after success.

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
from normalization import (  # noqa: E402
    HOTEL_HEADER_ALIASES,
    NORMALIZATION_VERSION,
    normalise_country,
    normalise_hotel_row,
    normalise_numeric,
)
from source_readers import (  # noqa: E402
    iter_input_files,
    read_rows_with_aliases,
)
from snapshot import build_snapshot, write_snapshot  # noqa: E402

# ── Workspace layout ────────────────────────────────────────────────────────

WORKSPACE = HERE.parent  # services/costar
REPO_ROOT = WORKSPACE.parent.parent

INPUT_HOTELS = WORKSPACE / "HOTELES POR MERCADO" / "INPUT"
ARCHIVE_HOTELS = WORKSPACE / "HOTELES POR MERCADO" / "old.class"
INPUT_PAIS = WORKSPACE / "PAIS" / "INPUT"
INPUT_MERCADO = WORKSPACE / "MERCADO" / "INPUT"
INPUT_SUBMERCADO = WORKSPACE / "SUBMERCADO" / "INPUT"

COMPSET_WORKSPACE = REPO_ROOT / "services" / "compset"
COMPSET_INPUT = COMPSET_WORKSPACE / "INPUT"

TRANSACTIONS_WORKSPACE = REPO_ROOT / "services" / "transactions"
TRANSACTIONS_INPUT = TRANSACTIONS_WORKSPACE / "INPUT_TRANSACCIONES"

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
    "country": "country", "pais": "country",
    "market": "market_name", "mercado": "market_name",
    "closed_at": "closed_at", "close_date": "closed_at", "fecha_cierre": "closed_at",
    "price_eur": "price_eur", "price": "price_eur", "valor": "price_eur", "deal_value": "price_eur",
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
) -> tuple[list[dict[str, Any]], list[dict[str, Any]]]:
    """Build compset rows + reconciliation entries for orphan member refs."""
    compsets: list[dict[str, Any]] = []
    extra_recon: list[dict[str, Any]] = []

    files = list(iter_input_files(COMPSET_INPUT))
    if not files:
        logger.event("info", "compset.no_input")
        return compsets, extra_recon

    # Group rows by target_hotel into a member graph
    by_target: dict[str, dict[str, Any]] = {}

    for path in files:
        try:
            rows = read_rows_with_aliases(path, COMPSET_HEADER_ALIASES)
        except Exception as e:  # noqa: BLE001
            logger.event("error", "compset.read_failed", file=str(path), err=str(e))
            continue

        for raw in rows:
            target_name = (raw.get("target_hotel_name") or "").strip()
            member_name = (raw.get("member_hotel_name") or "").strip()
            if not (target_name and member_name):
                continue

            country_norm, _ = normalise_country(raw.get("country"))
            country = country_norm or ""
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

    return compsets, extra_recon


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
) -> tuple[list[dict[str, Any]], list[dict[str, Any]]]:
    """Build transaction reconciliation layer.

    Reads both the COSTAR official export and the operator's private
    transactions file from `services/transactions/INPUT_TRANSACCIONES/`.
    Provenance (`source` = "costar" | "private") is preserved per row.
    Orphan transactions (no matching hotel in inventory) surface in the
    reconciliation queue.
    """
    transactions: list[dict[str, Any]] = []
    extra_recon: list[dict[str, Any]] = []

    files = list(iter_input_files(TRANSACTIONS_INPUT))
    if not files:
        logger.event("info", "transactions.no_input")
        return transactions, extra_recon

    for path in files:
        # Classify the source by filename
        source = "costar" if "costar" in path.name.lower() else "private"

        try:
            rows = read_rows_with_aliases(path, TRANSACTION_HEADER_ALIASES)
        except Exception as e:  # noqa: BLE001
            logger.event("error", "transactions.read_failed", file=str(path), err=str(e))
            continue

        for raw in rows:
            asset_name = (raw.get("asset_name") or "").strip()
            if not asset_name:
                continue
            closed_at = str(raw.get("closed_at") or "").strip() or None
            price_eur, _ = normalise_numeric(raw.get("price_eur"))
            tx_id = transaction_id(source, asset_name, closed_at, price_eur)

            country_norm, _ = normalise_country(raw.get("country"))
            country = country_norm or ""
            market = (raw.get("market_name") or "").strip()
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

    return transactions, extra_recon


# ── Archive ─────────────────────────────────────────────────────────────────


def archive_files(files: list[Path], logger: RunLogger, *, dry_run: bool) -> None:
    """Move processed source files into their workspace's `old.*/` archive."""
    if dry_run:
        for f in files:
            logger.event("info", "archive.skipped_dry_run", file=str(f.relative_to(REPO_ROOT)))
        return
    for f in files:
        # Choose the archive root based on the file's location
        if INPUT_HOTELS in f.parents:
            archive_root = ARCHIVE_HOTELS
        elif COMPSET_INPUT in f.parents:
            archive_root = COMPSET_WORKSPACE / "OLD"
        elif TRANSACTIONS_INPUT in f.parents:
            archive_root = TRANSACTIONS_WORKSPACE / "INPUT_TRANSACCIONES" / "old.transacciones"
        else:
            logger.event("warn", "archive.unknown_root", file=str(f.relative_to(REPO_ROOT)))
            continue
        archive_root.mkdir(parents=True, exist_ok=True)
        target = archive_root / f"{datetime.now(timezone.utc).strftime('%Y%m%dT%H%M%S')}_{f.name}"
        try:
            f.rename(target)
            logger.event("info", "archive.moved", file=str(f.relative_to(REPO_ROOT)), to=str(target.relative_to(REPO_ROOT)))
        except OSError as e:
            logger.event("error", "archive.failed", file=str(f.relative_to(REPO_ROOT)), err=str(e))


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
    hotels_by_id = {h["hotel_id"]: h for h in hotels}

    compsets, recon_compset = ingest_compsets(batch_id, hotels_by_id, logger)
    recon.extend(recon_compset)

    transactions, recon_tx = ingest_transactions(batch_id, hotels_by_id, logger)
    recon.extend(recon_tx)

    snapshot = build_snapshot(
        ingestion_batch_id=batch_id,
        hotels=hotels,
        compsets=compsets,
        transactions=transactions,
        reconciliation_queue=recon,
    )

    if args.dry_run:
        logger.event("info", "snapshot.skipped_dry_run", totals=snapshot["totals"])
    else:
        write_snapshot(snapshot, SNAPSHOT_PATH)
        logger.event("info", "snapshot.written", path=str(SNAPSHOT_PATH.relative_to(REPO_ROOT)), totals=snapshot["totals"])

    if not args.no_archive and not args.dry_run:
        archive_files(processed_hotels, logger, dry_run=args.dry_run)

    log_path = logger.flush()
    if log_path:
        print(f"✓ run log → {log_path.relative_to(REPO_ROOT)}")

    print(json.dumps(snapshot["totals"], indent=2))
    return 0


if __name__ == "__main__":
    sys.exit(main())
