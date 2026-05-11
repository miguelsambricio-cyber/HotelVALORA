"""Data Ingestion Agent — workspace operator CLI.

Sweeps `services/transactions/INPUT_TRANSACCIONES/` + `INPUT_PROYECTOS/`, parses
each XLSX/CSV the operator dropped, applies the normalisation rules, dedupes
against the canonical MASTER, routes results to MASTER / staging/review /
staging/failed, archives processed source files to `old.*/`, and records the
run in the workbook's `INGESTION_LOG` sheet + a per-run jsonl in `logs/`.

Usage:
    python services/transactions/scripts/ingest.py --target transactions
    python services/transactions/scripts/ingest.py --target projects --dry-run
    python services/transactions/scripts/ingest.py --target both --operator-email you@example.com

Exit codes:
    0  success or partial success
    1  catastrophic failure (workspace unreachable, MASTER unreadable, etc.)
    2  invalid CLI args
"""

from __future__ import annotations

import argparse
import json
import os
import sys
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

# Allow `python services/transactions/scripts/ingest.py` from any CWD.
HERE = Path(__file__).resolve().parent
WORKSPACE = HERE.parent  # services/transactions
REPO_ROOT = WORKSPACE.parent.parent
sys.path.insert(0, str(HERE))

from dedup import (  # noqa: E402
    content_hash,
    iso_date,
    project_dedup_key,
    transaction_dedup_key,
)
from master_io import (  # noqa: E402
    INGESTION_LOG_HEADERS,
    append_ingestion_log,
    append_master_rows,
    get_domain_columns,
    get_headers_for,
    get_normalization_version,
    load_existing_dedup_keys,
    mark_superseded,
    open_master,
    save_master,
)
from normalization import (  # noqa: E402
    normalise_project,
    normalise_transaction,
)
from source_readers import read_file  # noqa: E402
from staging_io import (  # noqa: E402
    archive_source_file,
    write_failed_rows,
    write_review_rows,
    write_run_log,
)


# ── Workspace constants ──────────────────────────────────────────────────────

INPUT_DIRS = {
    "transactions": WORKSPACE / "INPUT_TRANSACCIONES",
    "projects": WORKSPACE / "INPUT_PROYECTOS",
}
ARCHIVE_DIRS = {
    "transactions": WORKSPACE / "INPUT_TRANSACCIONES" / "old.transacciones",
    "projects": WORKSPACE / "INPUT_PROYECTOS" / "old.proyectos",
}
MASTER_PATHS = {
    "transactions": WORKSPACE / "MASTER" / "HOTEL_TRANSACCIONES_MASTER.xlsx",
    "projects": WORKSPACE / "MASTER" / "HOTEL_PROYECTOS_MASTER.xlsx",
}
STAGING_ROOT = WORKSPACE / "staging"
LOGS_ROOT = WORKSPACE / "logs"


# ── Logging primitives — single in-memory list flushed at run end ────────────


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="seconds")


class RunLogger:
    def __init__(self, ingestion_id: str, source_file: str):
        self.ingestion_id = ingestion_id
        self.source_file = source_file
        self.entries: list[dict[str, Any]] = []

    def log(self, level: str, msg: str, **fields: Any) -> None:
        self.entries.append(
            {
                "ts": _now_iso(),
                "level": level,
                "ingestion_id": self.ingestion_id,
                "source_file": self.source_file,
                "msg": msg,
                **fields,
            }
        )

    def info(self, msg: str, **f): self.log("info", msg, **f)
    def warn(self, msg: str, **f): self.log("warn", msg, **f)
    def error(self, msg: str, **f): self.log("error", msg, **f)


# ── Per-file pipeline ────────────────────────────────────────────────────────


def _dedup_key(target: str, row: dict[str, Any]) -> str:
    return transaction_dedup_key(row) if target == "transactions" else project_dedup_key(row)


def _normaliser(target: str):
    return normalise_transaction if target == "transactions" else normalise_project


def _domain_for(target: str) -> list[str]:
    return get_domain_columns(target)


def process_file(
    target: str,
    file_path: Path,
    operator_email: str,
    existing_keys: dict[str, dict[str, Any]],
    dry_run: bool,
) -> dict[str, Any]:
    """Returns a per-file outcome dict + accumulated decisions for the orchestrator.

    The orchestrator collects new MASTER rows + superseded ids across all files
    and commits them in a single MASTER save at run end.
    """
    ingestion_id = str(uuid.uuid4())
    started_at = _now_iso()
    logger = RunLogger(ingestion_id, file_path.name)
    logger.info("file_opened", path=str(file_path.relative_to(REPO_ROOT)))

    try:
        rows_iter, unknown_headers = read_file(file_path, target)
    except Exception as e:  # noqa: BLE001
        logger.error("file_unreadable", error=str(e))
        return {
            "ingestion_id": ingestion_id,
            "source_file": file_path.name,
            "started_at": started_at,
            "completed_at": _now_iso(),
            "outcome": "failed",
            "error_message": str(e),
            "to_master": [],
            "to_superseded_ids": [],
            "review_rows": [],
            "failed_rows": [],
            "rows_seen": 0,
            "rows_inserted": 0,
            "rows_updated": 0,
            "rows_skipped": 0,
            "rows_flagged_review": 0,
            "rows_failed": 0,
            "logger": logger,
        }

    if unknown_headers:
        logger.warn("unknown_headers", headers=unknown_headers)

    normaliser = _normaliser(target)
    domain_cols = _domain_for(target)
    to_master: list[dict[str, Any]] = []
    superseded_ids: list[str] = []
    review_rows: list[dict[str, Any]] = []
    failed_rows: list[dict[str, Any]] = []
    rows_seen = rows_inserted = rows_updated = rows_skipped = 0

    # We need to update existing_keys across the file so two rows in the same
    # import that share a dedup_key are recognised on the second.
    seen_in_file_keys: dict[str, str] = {}  # dedup_key -> canonical_id (the first row's id)

    for row_idx, raw in rows_iter:
        rows_seen += 1
        try:
            normalised, review_reasons, missing = normaliser(raw)
        except Exception as e:  # noqa: BLE001
            logger.error("normaliser_exception", row=row_idx, error=str(e), raw=raw)
            failed_rows.append({"row": row_idx, "reason": f"normaliser_exception: {e}", "raw": raw})
            continue

        if missing:
            logger.warn("row_failed_required", row=row_idx, missing=missing)
            failed_rows.append({"row": row_idx, "reason": f"missing_required:{','.join(missing)}", "raw": raw, "normalised": normalised})
            continue

        canonical_id = str(uuid.uuid4())
        dk = _dedup_key(target, normalised)
        ch = content_hash(normalised, domain_cols)

        # Build the persisted row (domain + ingestion-meta)
        persisted: dict[str, Any] = {col: normalised.get(col) for col in domain_cols}
        persisted.update(
            canonical_id=canonical_id,
            ingestion_id=ingestion_id,
            source_file=file_path.name,
            source_kind=normalised.get("source_kind") or "manual",
            source_url=normalised.get("source_url"),
            ingested_at=started_at,
            ingested_by=operator_email,
            normalization_version=get_normalization_version(),
            dedup_key=dk,
            review_required=bool(review_reasons),
            review_reason=";".join(sorted(set(review_reasons))) if review_reasons else None,
            ingestion_status="under_review" if review_reasons else "ingested",
            supersedes_id=None,
            notes=normalised.get("notes"),
        )

        # Dedup vs MASTER + within-file
        existing = existing_keys.get(dk)
        seen_file_cid = seen_in_file_keys.get(dk)
        if existing or seen_file_cid:
            # Within-file second occurrence — silent skip with logging
            if seen_file_cid:
                logger.info("dedup_skip_within_file", row=row_idx, dedup_key=dk)
                rows_skipped += 1
                continue
            existing_ch = content_hash(existing, domain_cols)
            if existing_ch == ch:
                logger.info("dedup_skip_master_match", row=row_idx, dedup_key=dk)
                rows_skipped += 1
                continue
            # Same dedup key, different content -> route to REVIEW for human decision
            logger.warn("dedup_conflict_content_differs", row=row_idx, dedup_key=dk, existing_canonical_id=existing.get("canonical_id"))
            review_rows.append(
                {
                    "row": row_idx,
                    "reason": "dedup_conflict_content_differs",
                    "candidate": persisted,
                    "existing": existing,
                    "diff_hint": "Operator: compare candidate vs existing; if candidate wins, manually add to MASTER with supersedes_id pointing at existing.canonical_id",
                }
            )
            continue

        # New canonical row
        if review_reasons:
            review_rows.append(
                {
                    "row": row_idx,
                    "reason": "validation_warnings",
                    "warnings": review_reasons,
                    "candidate": persisted,
                    "diff_hint": "Operator: review warnings (range/enum/date), accept or correct + re-add to MASTER",
                }
            )
            rows_inserted += 0  # not yet — sits in review until accepted
            continue

        to_master.append(persisted)
        seen_in_file_keys[dk] = canonical_id
        existing_keys[dk] = persisted  # downstream rows in this file see it as "existing"
        rows_inserted += 1

    completed_at = _now_iso()
    rows_flagged_review = len(review_rows)
    rows_failed = len(failed_rows)
    if rows_failed and rows_inserted == 0:
        outcome = "failed"
    elif rows_failed or rows_flagged_review:
        outcome = "partial"
    else:
        outcome = "success"

    logger.info(
        "file_summary",
        rows_seen=rows_seen,
        rows_inserted=rows_inserted,
        rows_skipped=rows_skipped,
        rows_flagged_review=rows_flagged_review,
        rows_failed=rows_failed,
        outcome=outcome,
    )

    return {
        "ingestion_id": ingestion_id,
        "source_file": file_path.name,
        "source_kind": "manual",  # operator-driven trigger; per-row source_kind lives in the row itself
        "started_at": started_at,
        "completed_at": completed_at,
        "outcome": outcome,
        "to_master": to_master,
        "to_superseded_ids": superseded_ids,
        "review_rows": review_rows,
        "failed_rows": failed_rows,
        "rows_seen": rows_seen,
        "rows_inserted": rows_inserted,
        "rows_updated": rows_updated,
        "rows_skipped": rows_skipped,
        "rows_flagged_review": rows_flagged_review,
        "rows_failed": rows_failed,
        "logger": logger,
        "file_path": file_path,
    }


# ── Per-target orchestration ─────────────────────────────────────────────────


def list_input_files(target: str) -> list[Path]:
    inbox = INPUT_DIRS[target]
    if not inbox.exists():
        return []
    out: list[Path] = []
    for entry in sorted(inbox.iterdir()):
        if not entry.is_file():
            continue
        if entry.name.startswith("."):
            continue
        if entry.suffix.lower() not in (".xlsx", ".xlsm", ".csv", ".tsv", ".txt"):
            continue
        out.append(entry)
    return out


def run_target(target: str, operator_email: str, dry_run: bool, verbose: bool) -> int:
    files = list_input_files(target)
    label = target.upper()
    if not files:
        print(f"[ingest:{label}] inbox empty - nothing to do.")
        return 0

    master_path = MASTER_PATHS[target]
    try:
        wb = open_master(master_path)
    except FileNotFoundError as e:
        print(f"[ingest:{label}] FATAL: {e}", file=sys.stderr)
        return 1

    existing_keys = load_existing_dedup_keys(wb, target)
    print(f"[ingest:{label}] MASTER has {len(existing_keys)} canonical (ingested) rows.")
    print(f"[ingest:{label}] inbox: {len(files)} file(s) -> {[f.name for f in files]}")

    all_outcomes: list[dict[str, Any]] = []
    for fpath in files:
        print(f"[ingest:{label}] processing {fpath.name}")
        outcome = process_file(target, fpath, operator_email, existing_keys, dry_run)
        all_outcomes.append(outcome)
        if verbose:
            for entry in outcome["logger"].entries:
                print("  ", json.dumps({k: v for k, v in entry.items() if k != "raw"}, default=str))

    # ── Commit phase — all-or-nothing master + per-file staging + per-file archive
    total_to_master = sum(len(o["to_master"]) for o in all_outcomes)
    total_review = sum(o["rows_flagged_review"] for o in all_outcomes)
    total_failed = sum(o["rows_failed"] for o in all_outcomes)

    if dry_run:
        print(f"[ingest:{label}] DRY-RUN -- would write {total_to_master} rows to MASTER, "
              f"{total_review} to review, {total_failed} to failed.")
        return 0

    # Append MASTER rows from every successful file
    appended = 0
    for o in all_outcomes:
        appended += append_master_rows(wb, target, o["to_master"])
        if o["to_superseded_ids"]:
            mark_superseded(wb, target, o["to_superseded_ids"])
        append_ingestion_log(
            wb,
            {h: o.get(h) for h in INGESTION_LOG_HEADERS}
            | {"operator_email": operator_email, "normalization_version": get_normalization_version()},
        )

    try:
        save_master(wb, master_path)
        print(f"[ingest:{label}] MASTER saved · +{appended} rows.")
    except Exception as e:  # noqa: BLE001
        print(f"[ingest:{label}] FATAL: could not save MASTER: {e}", file=sys.stderr)
        return 1

    # ── Per-file staging + archiving — happens AFTER MASTER save succeeds
    for o in all_outcomes:
        write_failed_rows(STAGING_ROOT, o["ingestion_id"], o["source_file"], o["failed_rows"])
        write_review_rows(STAGING_ROOT, o["ingestion_id"], o["source_file"], o["review_rows"])
        write_run_log(LOGS_ROOT, o["ingestion_id"], o["logger"].entries)
        archived = archive_source_file(
            o["file_path"],
            ARCHIVE_DIRS[target],
            o["ingestion_id"],
        )
        print(f"[ingest:{label}] archived {o['source_file']} -> {archived.relative_to(WORKSPACE)}")

    # Final summary
    print(
        f"[ingest:{label}] DONE: "
        f"{len(files)} file(s) · "
        f"{sum(o['rows_seen'] for o in all_outcomes)} rows seen · "
        f"{appended} ingested · "
        f"{total_review} review · "
        f"{total_failed} failed"
    )

    # Exit code: 1 only if zero rows ingested AND any failures (catastrophic)
    if appended == 0 and total_failed > 0 and total_review == 0:
        return 1
    return 0


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(
        description="HOTELVALORA — Data Ingestion Agent (workspace)",
        epilog="See services/transactions/README.md for the full operator workflow.",
    )
    parser.add_argument(
        "--target",
        choices=("transactions", "projects", "both"),
        required=True,
        help="Which inbox to sweep.",
    )
    parser.add_argument(
        "--operator-email",
        default=os.environ.get("OPERATOR_EMAIL", "miguel.sambricio@metcub.com"),
        help="Recorded in ai_agent_runs equivalent + MASTER.ingested_by. Default: $OPERATOR_EMAIL or fallback.",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Read + parse + validate but do not touch MASTER, staging, or archive.",
    )
    parser.add_argument(
        "--verbose",
        action="store_true",
        help="Print per-row log entries to stdout.",
    )
    args = parser.parse_args(argv)

    targets = ("transactions", "projects") if args.target == "both" else (args.target,)
    code = 0
    for t in targets:
        rc = run_target(t, args.operator_email, args.dry_run, args.verbose)
        if rc != 0:
            code = rc
    return code


if __name__ == "__main__":
    sys.exit(main())
