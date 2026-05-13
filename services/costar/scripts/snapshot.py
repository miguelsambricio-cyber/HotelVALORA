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


SNAPSHOT_SCHEMA_VERSION = "v1.2"


def build_snapshot(
    *,
    ingestion_batch_id: str,
    hotels: list[dict[str, Any]],
    compsets: list[dict[str, Any]],
    transactions: list[dict[str, Any]],
    reconciliation_queue: list[dict[str, Any]],
) -> dict[str, Any]:
    """Assemble the snapshot dict. Caller writes it to disk."""
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
            "compsets": len(compsets),
            "transactions": len(transactions),
            "reconciliation_queue": len(reconciliation_queue),
        },
        "markets": market_rows,
        "hotels": [_strip_private(h) for h in hotels],
        "compsets": compsets,
        "transactions": transactions,
        "reconciliation_queue": reconciliation_queue,
    }


def _strip_private(row: dict[str, Any]) -> dict[str, Any]:
    """Drop the in-pipeline-only `_match_*` helpers; keep `_meta`."""
    return {k: v for k, v in row.items() if not k.startswith("_match_")}


def write_snapshot(snapshot: dict[str, Any], dest: Path) -> None:
    dest.parent.mkdir(parents=True, exist_ok=True)
    dest.write_text(json.dumps(snapshot, indent=2, ensure_ascii=False), encoding="utf-8")
