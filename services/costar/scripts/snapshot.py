"""Emit `services/costar/MASTER/snapshot.json` for the Node admin UI.

The XLSX masters are the canonical store, but the Node side of HotelVALORA
(`/user/admin/hotels`) needs a fast, schema-stable, no-Python-deps read
path. The snapshot is that bridge:

  - Re-emitted every successful `python ingest.py` run
  - Local-only (gitignored) — same posture as INPUT files
  - Schema-versioned so the Node reader can detect drift

Shape:

{
  "schema_version": "v1.2",
  "generated_at": "<ISO>",
  "ingestion_batch_id": "<batch>",
  "totals": { hotels, markets, compsets, transactions, reconciliation_queue },
  "markets": [ {country, market_name, submarkets[], hotel_count} ],
  "hotels": [ {canonical hotel row + _meta} ],
  "compsets": [ {compset_id, target_hotel_id, member_hotel_ids[], warnings[]} ],
  "transactions": [ {transaction_id, source, hotel_id|null, ...} ],
  "reconciliation_queue": [ {id, kind, hotel_id?, field?, detail} ]
}
"""

from __future__ import annotations

import json
from datetime import datetime, timezone
from pathlib import Path
from typing import Any


SNAPSHOT_SCHEMA_VERSION = "v1.7"  # +market_snapshots/timeseries + projects (Phase 2.3.d.6f · 2026-05-14)


def load_existing_snapshot(path: Path) -> dict[str, Any] | None:
    """Read the previous snapshot, or None if missing/malformed.

    Used by `ingest.py` as the stateful base before merging a new run.
    Without this, every ingest run would replace the previous snapshot
    wholesale — and a run with an empty INPUT folder would wipe the
    institutional history. The XLSX masters in MASTER/ remain the
    canonical store; this is the read-path persistence.
    """
    if not path.exists():
        return None
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        return None


def merge_by_id(
    current: list[dict[str, Any]],
    previous: list[dict[str, Any]],
    id_key: str,
) -> list[dict[str, Any]]:
    """Merge two lists of dicts by `id_key`. Current-run rows always win;
    rows present only in `previous` are carried forward unchanged.

    Used for the persistent entities (hotels, transactions,
    compset_membership). Synthetic compsets and the reconciliation queue
    are NOT merged — they are regenerated every run from the merged
    inventory.
    """
    current_ids = {row[id_key] for row in current if id_key in row}
    carried = [row for row in previous if row.get(id_key) and row[id_key] not in current_ids]
    return current + carried


def build_snapshot(
    *,
    ingestion_batch_id: str,
    hotels: list[dict[str, Any]],
    compsets: list[dict[str, Any]],
    transactions: list[dict[str, Any]],
    reconciliation_queue: list[dict[str, Any]],
    corrections_summary: dict[str, int] | None = None,
    batch_summary: dict[str, Any] | None = None,
    compset_performance: list[dict[str, Any]] | None = None,
    synthetic_compsets: list[dict[str, Any]] | None = None,
    market_snapshots: list[dict[str, Any]] | None = None,
    market_timeseries: list[dict[str, Any]] | None = None,
    projects: list[dict[str, Any]] | None = None,
) -> dict[str, Any]:
    """Assemble the snapshot dict. Caller writes it to disk.

    `corrections_summary` carries the post-run state of the
    Institutional Correction Consumer (see `corrections.py`):

        pending_before              — pending rows seen this run
        applied                     — corrections applied this run
        rejected                    — corrections rejected this run
        applied_total_in_master     — cumulative across all hotel rows
    """
    # Derive market summary
    markets: dict[tuple[str, str], dict[str, Any]] = {}
    for h in hotels:
        key = (h.get("country") or "", h.get("market_name") or "")
        m = markets.setdefault(
            key,
            {
                "country": key[0],
                "market_name": key[1],
                "submarkets": set(),
                "hotel_count": 0,
            },
        )
        m["hotel_count"] += 1
        sub = h.get("submarket_name")
        if sub:
            m["submarkets"].add(sub)

    market_rows = [
        {
            "country": m["country"],
            "market_name": m["market_name"],
            "submarkets": sorted(m["submarkets"]),
            "hotel_count": m["hotel_count"],
        }
        for m in markets.values()
    ]
    market_rows.sort(key=lambda r: (r["country"], r["market_name"]))

    return {
        "schema_version": SNAPSHOT_SCHEMA_VERSION,
        "generated_at": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "ingestion_batch_id": ingestion_batch_id,
        "totals": {
            "hotels": len(hotels),
            "markets": len(market_rows),
            # Membership ≠ performance: kept as separate counters so the
            # admin UI can distinguish operator-confirmed competitive sets
            # from time-series KPI aggregates.
            "compset_membership": len(compsets),
            "compset_performance": len(compset_performance or []),
            "synthetic_compsets": len(synthetic_compsets or []),
            # Legacy alias — pre-2026-05-14 readers expect `compsets`. Keep
            # for backward compatibility (= compset_membership today).
            "compsets": len(compsets),
            "transactions": len(transactions),
            "reconciliation_queue": len(reconciliation_queue),
            # Phase 2.3.d.6f · market data + projects
            "market_snapshots": len(market_snapshots or []),
            "market_timeseries": len(market_timeseries or []),
            "projects": len(projects or []),
        },
        "corrections": corrections_summary or {
            "pending_before": 0,
            "applied": 0,
            "rejected": 0,
            "applied_total_in_master": 0,
        },
        "batch": batch_summary or {},
        "markets": market_rows,
        "hotels": [_strip_private(h) for h in hotels],
        # Compset surface (Phase 2.3.d.6c · 2026-05-14)
        "compset_membership": compsets,
        "compset_performance": compset_performance or [],
        "synthetic_compsets": synthetic_compsets or [],
        # Legacy alias for the existing Node reader.
        "compsets": compsets,
        "transactions": transactions,
        "reconciliation_queue": reconciliation_queue,
        # Phase 2.3.d.6f · market data + projects (replace-per-run · the
        # CoStar export is the source of truth · no merge with previous)
        "market_snapshots": market_snapshots or [],
        "market_timeseries": market_timeseries or [],
        "projects": projects or [],
    }


def _strip_private(row: dict[str, Any]) -> dict[str, Any]:
    """Drop the in-pipeline-only `_match_*` helpers; keep `_meta`."""
    return {k: v for k, v in row.items() if not k.startswith("_match_")}


def write_snapshot(snapshot: dict[str, Any], dest: Path) -> None:
    dest.parent.mkdir(parents=True, exist_ok=True)
    dest.write_text(json.dumps(snapshot, indent=2, ensure_ascii=False), encoding="utf-8")
