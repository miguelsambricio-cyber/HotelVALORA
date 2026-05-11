"""Route failed + review rows to `staging/<bucket>/<ingestion_id>/`.

`staging/failed/`  → rows that miss required columns or have unparseable schemas.
`staging/review/`  → rows that triggered range/enum/dedup-conflict warnings.

Each bucket holds a `rows.jsonl` (one JSON per line) + a `summary.json`. The
review queue is operator-readable; future admin UI consumes the same files.
"""

from __future__ import annotations

import json
from datetime import datetime, timezone
from pathlib import Path
from typing import Any


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="seconds")


def write_failed_rows(
    staging_root: Path,
    ingestion_id: str,
    source_file: str,
    failed: list[dict[str, Any]],
) -> Path | None:
    if not failed:
        return None
    folder = staging_root / "failed" / ingestion_id
    folder.mkdir(parents=True, exist_ok=True)
    jsonl = folder / "rows.jsonl"
    with jsonl.open("w", encoding="utf-8") as f:
        for r in failed:
            f.write(json.dumps(r, ensure_ascii=False, default=str) + "\n")
    (folder / "summary.json").write_text(
        json.dumps(
            {
                "ingestion_id": ingestion_id,
                "source_file": source_file,
                "rows": len(failed),
                "written_at": _now_iso(),
                "purpose": "These rows missed required columns or had unparseable schemas. Fix the source file and re-drop, OR add canonical_id manually and place in MASTER directly.",
            },
            indent=2,
            ensure_ascii=False,
        ),
        encoding="utf-8",
    )
    return folder


def write_review_rows(
    staging_root: Path,
    ingestion_id: str,
    source_file: str,
    review: list[dict[str, Any]],
) -> Path | None:
    if not review:
        return None
    folder = staging_root / "review" / ingestion_id
    folder.mkdir(parents=True, exist_ok=True)
    jsonl = folder / "rows.jsonl"
    with jsonl.open("w", encoding="utf-8") as f:
        for r in review:
            f.write(json.dumps(r, ensure_ascii=False, default=str) + "\n")
    (folder / "summary.json").write_text(
        json.dumps(
            {
                "ingestion_id": ingestion_id,
                "source_file": source_file,
                "rows": len(review),
                "written_at": _now_iso(),
                "purpose": "Rows triggered range/enum/dedup-conflict warnings. Operator: review row + reason, accept or reject. Accepted rows go to MASTER on the next ingestion.",
            },
            indent=2,
            ensure_ascii=False,
        ),
        encoding="utf-8",
    )
    return folder


def archive_source_file(
    src: Path,
    archive_dir: Path,
    ingestion_id: str,
) -> Path:
    """Move the source file into `old.*` with a timestamp prefix to avoid collisions."""
    archive_dir.mkdir(parents=True, exist_ok=True)
    ts = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
    short_id = ingestion_id.split("-")[0]
    dest_name = f"{ts}_{short_id}_{src.name}"
    dest = archive_dir / dest_name
    src.rename(dest)
    return dest


def write_run_log(
    logs_root: Path,
    ingestion_id: str,
    entries: list[dict[str, Any]],
) -> Path:
    """One jsonl per ingestion run, sliced by month."""
    yyyy_mm = datetime.now(timezone.utc).strftime("%Y-%m")
    folder = logs_root / yyyy_mm
    folder.mkdir(parents=True, exist_ok=True)
    path = folder / f"{ingestion_id}.jsonl"
    with path.open("w", encoding="utf-8") as f:
        for e in entries:
            f.write(json.dumps(e, ensure_ascii=False, default=str) + "\n")
    return path
