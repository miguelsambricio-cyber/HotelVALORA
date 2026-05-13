"""Phase 2.3.d.6 · Correction Consumer + Institutional Validation Layer.

Operator-submitted corrections land in
`services/costar/corrections/<YYYY-MM>.jsonl` via the Node admin UI
(`submitHotelCorrection` server action). Each `ingest.py` run is the
consumer: read every pending correction, validate it, apply valid ones
as supersedes over the freshly ingested hotel record, and rewrite the
JSONL with the new state. Re-applying is impossible because the JSONL
itself carries the `applied` / `rejected` status — the second run sees
the resolved state and skips it.

State machine:

    pending --validate--> applied   (mutates hotel · pushes _corrections)
            --validate--> rejected  (rejection_reason recorded inline)

Provenance on every applied correction:

    correction_id          (already on the pending row)
    submitted_at           (ditto)
    submitted_by           (ditto)
    field                  (ditto)
    proposed_value         (ditto · becomes the new canonical value)
    reason                 (ditto)
    original_value         (the value the ingest pipeline produced before the override)
    confidence_before      (the hotel's confidence before applying)
    applied_at             (timestamp of this ingest run)
    applied_in_batch       (this run's ingestion_batch_id)

The full row is also appended to
`services/costar/corrections-applied/<YYYY-MM>.jsonl` for the audit trail.

Validation rules:

    schema_invalid                — required fields missing on the JSONL row
    hotel_id_not_in_inventory     — hotel was not produced by this ingest pass
    field_not_correctable         — field is not in CORRECTABLE_FIELDS
    proposed_value_unparseable    — proposed_value didn't pass the field validator
    proposed_value_out_of_enum    — proposed_value not in the canonical enum
    reason_too_short              — reason < 8 chars (already enforced server-side)
"""

from __future__ import annotations

import json
import re
import tempfile
import unicodedata
from datetime import datetime, timezone
from pathlib import Path
from typing import Any


# Fields the operator may correct. Matches the `CORRECTABLE_FIELDS`
# constant in `apps/web/src/app/user/admin/hotels/[hotelId]/page.tsx`.
CORRECTABLE_FIELDS: tuple[str, ...] = (
    "name",
    "brand",
    "operator",
    "owner",
    "chain_scale",
    "category",
    "segment_type",
    "rooms_count",
    "year_opened",
    "year_last_renovated",
    "address_line",
    "neighborhood",
    "score_costar",
)

# Required keys on every pending correction JSONL row.
REQUIRED_KEYS: tuple[str, ...] = (
    "correction_id",
    "submitted_at",
    "submitted_by",
    "hotel_id",
    "field",
    "proposed_value",
    "reason",
    "status",
)


# ── Field validators ────────────────────────────────────────────────────────

_CHAIN_SCALE_ENUM = {
    "luxury", "upper_upscale", "upscale", "upper_midscale",
    "midscale", "economy", "independent",
}
_SEGMENT_ENUM = {"business", "leisure", "extended_stay", "resort", "convention"}


def _strip_diacritics(s: str) -> str:
    nkfd = unicodedata.normalize("NFKD", s)
    return "".join(c for c in nkfd if not unicodedata.combining(c)).strip()


def _normalise_enum_key(value: Any) -> str:
    return re.sub(r"[^a-z0-9]+", "_", _strip_diacritics(str(value)).lower()).strip("_")


def _coerce_int(raw: Any) -> tuple[int | None, str | None]:
    if raw in (None, ""):
        return None, None
    s = str(raw).strip().replace(",", ".")
    s = re.sub(r"[^\d.\-]", "", s)
    if not s:
        return None, "proposed_value_unparseable"
    try:
        return int(round(float(s))), None
    except ValueError:
        return None, "proposed_value_unparseable"


def _coerce_float(raw: Any) -> tuple[float | None, str | None]:
    if raw in (None, ""):
        return None, None
    s = str(raw).strip().replace(",", ".")
    s = re.sub(r"[^\d.\-]", "", s)
    if not s:
        return None, "proposed_value_unparseable"
    try:
        return float(s), None
    except ValueError:
        return None, "proposed_value_unparseable"


def _coerce_text(raw: Any) -> tuple[str | None, str | None]:
    if raw in (None, ""):
        return None, None
    return str(raw).strip(), None


def _coerce_year(raw: Any) -> tuple[int | None, str | None]:
    if raw in (None, ""):
        return None, None
    m = re.search(r"(19|20)\d{2}", str(raw))
    if not m:
        return None, "proposed_value_unparseable"
    return int(m.group(0)), None


def _coerce_chain_scale(raw: Any) -> tuple[str | None, str | None]:
    if raw in (None, ""):
        return None, None
    key = _normalise_enum_key(raw)
    if key in _CHAIN_SCALE_ENUM:
        return key, None
    return None, "proposed_value_out_of_enum"


def _coerce_segment(raw: Any) -> tuple[str | None, str | None]:
    if raw in (None, ""):
        return None, None
    key = _normalise_enum_key(raw)
    if key in _SEGMENT_ENUM:
        return key, None
    return None, "proposed_value_out_of_enum"


FIELD_COERCERS = {
    "name": _coerce_text,
    "brand": _coerce_text,
    "operator": _coerce_text,
    "owner": _coerce_text,
    "chain_scale": _coerce_chain_scale,
    "category": _coerce_text,
    "segment_type": _coerce_segment,
    "rooms_count": _coerce_int,
    "year_opened": _coerce_year,
    "year_last_renovated": _coerce_year,
    "address_line": _coerce_text,
    "neighborhood": _coerce_text,
    "score_costar": _coerce_float,
}


# ── JSONL I/O ───────────────────────────────────────────────────────────────


def _read_jsonl(path: Path) -> list[dict[str, Any]]:
    rows: list[dict[str, Any]] = []
    with path.open("r", encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if not line:
                continue
            try:
                rows.append(json.loads(line))
            except json.JSONDecodeError:
                # Skip corrupted lines — operator can fix manually
                continue
    return rows


def _atomic_write_jsonl(path: Path, rows: list[dict[str, Any]]) -> None:
    """Write rows to `path` atomically (temp file + rename)."""
    path.parent.mkdir(parents=True, exist_ok=True)
    with tempfile.NamedTemporaryFile(
        mode="w",
        encoding="utf-8",
        dir=str(path.parent),
        delete=False,
        suffix=".tmp",
    ) as tmp:
        for row in rows:
            tmp.write(json.dumps(row, ensure_ascii=False) + "\n")
        tmp_path = Path(tmp.name)
    tmp_path.replace(path)


def _append_jsonl(path: Path, row: dict[str, Any]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("a", encoding="utf-8") as f:
        f.write(json.dumps(row, ensure_ascii=False) + "\n")


# ── Validation ──────────────────────────────────────────────────────────────


def _validate_schema(row: dict[str, Any]) -> str | None:
    for k in REQUIRED_KEYS:
        if k not in row:
            return f"schema_invalid:missing_{k}"
    if not isinstance(row.get("reason"), str) or len(row["reason"].strip()) < 8:
        return "reason_too_short"
    try:
        datetime.fromisoformat(str(row["submitted_at"]).replace("Z", "+00:00"))
    except ValueError:
        return "schema_invalid:bad_submitted_at"
    if row["field"] not in CORRECTABLE_FIELDS:
        return "field_not_correctable"
    return None


# ── Apply pipeline ──────────────────────────────────────────────────────────


def collect_correction_files(workspace: Path) -> list[Path]:
    """All `<YYYY-MM>.jsonl` files under `services/costar/corrections/`."""
    base = workspace / "corrections"
    if not base.exists():
        return []
    return sorted(p for p in base.glob("*.jsonl") if p.is_file())


def apply_corrections(
    *,
    workspace: Path,
    hotels_by_id: dict[str, dict[str, Any]],
    batch_id: str,
    logger_event,  # callable: (level, kind, **fields) → None
) -> dict[str, int]:
    """Drain every pending correction across the corrections/ files.

    Mutates `hotels_by_id` in place — applied corrections override the
    canonical ingest values and push a provenance entry to the hotel's
    `_corrections` array.

    Returns a summary {pending_before, applied, rejected,
    applied_total_in_master} suitable for the snapshot's
    `corrections` block.
    """
    files = collect_correction_files(workspace)
    if not files:
        logger_event("info", "corrections.no_files")
        return {
            "pending_before": 0,
            "applied": 0,
            "rejected": 0,
            "applied_total_in_master": 0,
        }

    audit_dir = workspace / "corrections-applied"
    audit_path = audit_dir / f"{datetime.now(timezone.utc).strftime('%Y-%m')}.jsonl"

    pending_before = 0
    applied = 0
    rejected = 0

    for jsonl_path in files:
        rows = _read_jsonl(jsonl_path)
        if not rows:
            continue

        changed = False
        for row in rows:
            if row.get("status") != "pending":
                continue
            pending_before += 1

            # 1. Schema + field allow-list
            err = _validate_schema(row)
            if err:
                _reject(row, err, batch_id)
                rejected += 1
                changed = True
                logger_event("warn", "corrections.rejected", correction_id=row.get("correction_id"), reason=err)
                continue

            # 2. Hotel must exist in the current ingest pass
            hotel = hotels_by_id.get(row["hotel_id"])
            if hotel is None:
                _reject(row, "hotel_id_not_in_inventory", batch_id)
                rejected += 1
                changed = True
                logger_event("warn", "corrections.orphan", correction_id=row["correction_id"], hotel_id=row["hotel_id"])
                continue

            # 3. Field coercion
            coercer = FIELD_COERCERS[row["field"]]
            coerced, coerce_err = coercer(row.get("proposed_value"))
            if coerce_err:
                _reject(row, coerce_err, batch_id)
                rejected += 1
                changed = True
                logger_event("warn", "corrections.coerce_failed", correction_id=row["correction_id"], field=row["field"], reason=coerce_err)
                continue

            # 4. Apply — capture provenance BEFORE mutating
            original = hotel.get(row["field"])
            conf_before = (hotel.get("_meta") or {}).get("confidence")
            hotel[row["field"]] = coerced
            _push_correction_provenance(hotel, row, original, coerced, conf_before, batch_id)
            _bump_confidence(hotel)

            # 5. Mark applied
            now_iso = datetime.now(timezone.utc).isoformat(timespec="seconds")
            row["status"] = "applied"
            row["applied_at"] = now_iso
            row["applied_in_batch"] = batch_id
            row["original_value"] = original
            row["confidence_before"] = conf_before
            row["confidence_after"] = (hotel.get("_meta") or {}).get("confidence")
            row["source_dataset"] = "hotels_by_market"
            _append_jsonl(audit_path, row)
            applied += 1
            changed = True
            logger_event("info", "corrections.applied", correction_id=row["correction_id"], hotel_id=row["hotel_id"], field=row["field"])

        if changed:
            _atomic_write_jsonl(jsonl_path, rows)

    # Total applied across the master = the union of all _corrections arrays
    applied_total = sum(len(h.get("_corrections", [])) for h in hotels_by_id.values())

    return {
        "pending_before": pending_before,
        "applied": applied,
        "rejected": rejected,
        "applied_total_in_master": applied_total,
    }


def _reject(row: dict[str, Any], reason: str, batch_id: str) -> None:
    row["status"] = "rejected"
    row["rejected_at"] = datetime.now(timezone.utc).isoformat(timespec="seconds")
    row["rejected_in_batch"] = batch_id
    row["rejection_reason"] = reason


def _push_correction_provenance(
    hotel: dict[str, Any],
    correction_row: dict[str, Any],
    original_value: Any,
    corrected_value: Any,
    confidence_before: float | None,
    batch_id: str,
) -> None:
    """Append the audit entry to `hotel['_corrections']`."""
    entry = {
        "correction_id": correction_row["correction_id"],
        "applied_at": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "applied_in_batch": batch_id,
        "submitted_at": correction_row["submitted_at"],
        "submitted_by": correction_row["submitted_by"],
        "field": correction_row["field"],
        "original_value": original_value,
        "corrected_value": corrected_value,
        "reason": correction_row["reason"],
        "confidence_before": confidence_before,
    }
    hotel.setdefault("_corrections", []).append(entry)


def _bump_confidence(hotel: dict[str, Any]) -> None:
    """An applied correction implies operator review. Drop the
    `needs_review` reason for the corrected field if it was flagged,
    and clamp confidence upward toward 1.0.

    We don't push past 0.95 because the row still came from the
    underlying ingest pass — an operator confirming one field doesn't
    vouch for the rest of the record.
    """
    meta = hotel.setdefault("_meta", {"confidence": 1.0, "needs_review": []})
    if "needs_review" not in meta:
        meta["needs_review"] = []
    last = (hotel.get("_corrections") or [None])[-1]
    if last and isinstance(meta["needs_review"], list):
        field = last["field"]
        prefix = f"missing_required:{field}"
        prefix2 = f"missing_recommended:{field}"
        meta["needs_review"] = [
            r for r in meta["needs_review"]
            if not (r == prefix or r == prefix2)
        ]
    current = float(meta.get("confidence") or 0.0)
    meta["confidence"] = round(min(0.95, current + 0.05), 3)
