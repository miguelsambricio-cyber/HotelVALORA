#!/usr/bin/env python3
"""
CONTACTOS DATASITE · Gmail signal merger.

Phase 2.B · third ingestion lane of the institutional relationship graph.

The Gmail Claude MCP doesn't expose Google's People API · the Outreach
labels under the operator's Gmail account ARE the deal-state signal.
Periodically, Claude (via MCP) extracts a structured snapshot of those
signals and writes it as a JSONL file into:

    CONTACTOS DATASITE/incoming/gmail-signals/

Each JSONL line is one "Gmail signal record" aggregating per-email-address
data across the operator's institutional labels. Schema:

    {
      "email": "investor@firm.com",
      "full_name": "Jane Doe",        # best-effort from From/To headers
      "company_hint": "Firm Capital", # parsed from headers when available
      "labels": ["INVERSOR INTERESADO", "FINANCIADORES SEGUIMIENTO"],
      "thread_count": 7,
      "last_email_date": "2026-04-22",
      "first_email_date": "2024-08-15",
      "directionality": "bidirectional",   # inbound | outbound | bidirectional
      "inbound_count": 3,
      "outbound_count": 4,
      "snapshot_source": "claude-mcp",
      "snapshot_taken_at": "2026-05-12T20:15:00Z"
    }

What this script does
---------------------
1. Reads all JSONL files in `incoming/gmail-signals/`
2. Builds a single email → signal map (aggregating across files when
   the same email appears in multiple snapshots · latest wins for state,
   thread_count summed)
3. Loads the canonical Master
4. For each Gmail signal:
     - find Master rows by email (primary or any secondary if stored)
     - populate the 6 Gmail-derived fields:
         · relationship_strength      (computed score 0–100)
         · last_email_date            (from signal)
         · active_threads             (thread_count)
         · gmail_labels               (semicolon-joined)
         · inferred_relationship_stage (canonical · derived from labels +
                                        existing Datasite pipeline_state)
         · email_directionality       (from signal)
     - record `gmail_signal_source` provenance
5. For Gmail signals that DON'T match any Master row · log to a separate
   report (`gmail-unmatched-emails_<batch>.csv`). DO NOT insert · personal
   relationships that aren't in the institutional graph are not promoted
   automatically.
6. Move each processed JSONL to `old/gmail-signals/` with structured name
7. Regenerate Summary

Dependencies: openpyxl + stdlib. Imports Master I/O from ingest.py.
"""

from __future__ import annotations

import csv
import json
import re
import shutil
import sys
from collections import defaultdict
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

try:
    sys.stdout.reconfigure(encoding="utf-8")
    sys.stderr.reconfigure(encoding="utf-8")
except (AttributeError, ValueError):
    pass

# Master I/O lives in ingest.py
sys.path.insert(0, str(Path(__file__).resolve().parent))
try:
    from ingest import (  # type: ignore[import-not-found]
        load_existing_master,
        write_master_workbook,
        build_summary,
        norm_email,
        norm_text,
    )
except ImportError as err:
    print(f"ERROR: cannot import from ingest.py · {err}", file=sys.stderr)
    sys.exit(2)


# ── paths ───────────────────────────────────────────────────────────────────

REPO = Path(__file__).resolve().parent.parent.parent
ROOT = REPO / "CONTACTOS DATASITE"
INCOMING = ROOT / "incoming" / "gmail-signals"
OLD = ROOT / "old" / "gmail-signals"
REPORTS = ROOT / "reports"

for d in (INCOMING, OLD, REPORTS):
    d.mkdir(parents=True, exist_ok=True)


# ── Gmail label → inferred relationship stage mapping ──────────────────────
# Operator's actual Gmail label taxonomy. Stages are ordered by precedence:
# the most advanced stage among an email's labels wins.

STAGE_PRECEDENCE: list[tuple[re.Pattern[str], str]] = [
    # Active LOIs are the highest signal · live deals
    (re.compile(r"^LOI\s*-\s*", re.IGNORECASE), "Active LOI"),
    (re.compile(r"^MoU\s*-\s*", re.IGNORECASE), "Active MoU"),
    # "INTERESADO" buckets · positive engagement
    (re.compile(r"INVERSOR\s+INTERESADO|INVERSOR\s+INTERESADOS", re.IGNORECASE), "Investor · Interested"),
    (re.compile(r"FINANCIADORES?\s+INTERESADOS?", re.IGNORECASE), "Lender · Interested"),
    (re.compile(r"CADENA\s+HOTEL\s+INTERESADA", re.IGNORECASE), "Hotel Chain · Interested"),
    (re.compile(r"PROMOTOR.*INTERESADO", re.IGNORECASE), "Developer · Interested"),
    # Seguimiento · active follow-up
    (re.compile(r"INVERSORES?\s+SEGUIMIENTO", re.IGNORECASE), "Investor · Follow-up"),
    (re.compile(r"FINANCIADORES?\s+SEGUIMIENTO", re.IGNORECASE), "Lender · Follow-up"),
    (re.compile(r"CADENA\s+HOTEL\s+SEGU", re.IGNORECASE), "Hotel Chain · Follow-up"),
    (re.compile(r"PROMOTOR.*SEGUIMIENTO", re.IGNORECASE), "Developer · Follow-up"),
    (re.compile(r"INTERMEDIARIO\s+SEGUIMIENTO", re.IGNORECASE), "Broker · Follow-up"),
    (re.compile(r"RONDA\s+INVERSORES", re.IGNORECASE), "Investor Round · Active"),
    # General buckets
    (re.compile(r"PROPIETARIO\s+HOTEL", re.IGNORECASE), "Hotel Owner · Contacted"),
    (re.compile(r"F&B\s+ARRENDATARIO|F&B", re.IGNORECASE), "F&B Operator · Engaged"),
    (re.compile(r"INTERMEDIARIO", re.IGNORECASE), "Broker · Contacted"),
    (re.compile(r"INVERSORES?\b(?!\s+(?:NO|RECHAZAD))", re.IGNORECASE), "Investor · Contacted"),
    (re.compile(r"FINANCIADORES?\b(?!\s+(?:NO|RECHAZAD))", re.IGNORECASE), "Lender · Contacted"),
    (re.compile(r"CADENAS?\s+HOTEL", re.IGNORECASE), "Hotel Chain · Contacted"),
    (re.compile(r"BRANDED\s+RESIDENCES", re.IGNORECASE), "Branded Residences · Engaged"),
    # Q&A · operator-side outreach
    (re.compile(r"Q&A\s+INVERSORES", re.IGNORECASE), "Investor Q&A · Active"),
    # "RECHAZADO" / "NO INTERESADO" buckets · negative signal
    (re.compile(r"RECHAZAD[OAS]+|NO\s+INTERESAD[OAS]+", re.IGNORECASE), "Declined"),
]


def infer_stage(labels: list[str]) -> str:
    """Highest-precedence stage among the given labels · empty when none match."""
    if not labels:
        return ""
    # Iterate STAGE_PRECEDENCE in declared order · first matching wins.
    # When multiple labels would match different stages, we still pick the
    # FIRST stage in the precedence list that ANY label triggers.
    for pattern, stage in STAGE_PRECEDENCE:
        if any(pattern.search(label) for label in labels):
            return stage
    return ""


def compute_relationship_strength(signal: dict[str, Any], master_row: dict[str, Any]) -> int:
    """0–100 deterministic score.

    Weighted heuristic:
      - email recency: +30 if < 30 days · +20 if < 90 days · +10 if < 180 days · +5 if < 365 days
      - thread volume: +min(active_threads, 10) * 3 → up to +30
      - directionality: +10 if bidirectional · +5 if outbound · +2 if inbound
      - label depth: +30 for "INTERESADO" · +20 for "SEGUIMIENTO" · +25 for LOI/MoU
                     -20 for "RECHAZADO" / "NO INTERESADO"
      - Datasite enrichment: +15 when pipeline_state is Investment Meetings / Bids / LOI
                              -10 when pipeline_state is Declined
      - Final score clamped to [0, 100]
    """
    score = 0

    # Recency
    last = signal.get("last_email_date", "")
    if last:
        try:
            d = datetime.fromisoformat(last) if "T" in last else datetime.strptime(last, "%Y-%m-%d")
            age_days = (datetime.utcnow() - d).days
            if age_days < 30:
                score += 30
            elif age_days < 90:
                score += 20
            elif age_days < 180:
                score += 10
            elif age_days < 365:
                score += 5
        except ValueError:
            pass

    # Volume
    threads = signal.get("thread_count", 0) or 0
    try:
        threads = int(threads)
    except (TypeError, ValueError):
        threads = 0
    score += min(threads, 10) * 3

    # Directionality
    direction = signal.get("directionality", "")
    if direction == "bidirectional":
        score += 10
    elif direction == "outbound":
        score += 5
    elif direction == "inbound":
        score += 2

    # Label depth
    labels = signal.get("labels", []) or []
    if any(re.search(r"INTERESAD[OA]", lbl, re.IGNORECASE) and not re.search(r"NO\s+INTERESAD", lbl, re.IGNORECASE) for lbl in labels):
        score += 30
    if any(re.search(r"SEGUIMIENTO", lbl, re.IGNORECASE) for lbl in labels):
        score += 20
    if any(re.search(r"^LOI|^MoU", lbl, re.IGNORECASE) for lbl in labels):
        score += 25
    if any(re.search(r"RECHAZAD|NO\s+INTERESAD", lbl, re.IGNORECASE) for lbl in labels):
        score -= 20

    # Datasite enrichment alignment
    pipeline = (master_row.get("pipeline_state") or "")
    latest = (master_row.get("latest_deal_stage") or "")
    if "Decline" in pipeline:
        score -= 10
    if any(s in latest for s in ("LOI", "Bid", "Investment Meeting")):
        score += 15

    return max(0, min(100, score))


# ── snapshot reader ────────────────────────────────────────────────────────


def read_jsonl_snapshots(files: list[Path]) -> tuple[dict[str, dict[str, Any]], list[str]]:
    """Merge multiple JSONL snapshots into one email → signal map.

    When the same email appears in multiple snapshots:
      - labels: union (preserves multi-label coverage)
      - thread_count: max (don't double-count across overlapping snapshots)
      - first_email_date: min
      - last_email_date: max
      - inbound_count / outbound_count: max
      - directionality: re-derived from inbound/outbound max counts
      - snapshot_source: chain of unique sources

    Returns (signal_map, processed_filenames).
    """
    aggregated: dict[str, dict[str, Any]] = {}
    files_seen: list[str] = []
    for path in files:
        files_seen.append(path.name)
        with path.open("r", encoding="utf-8") as f:
            for line in f:
                line = line.strip()
                if not line:
                    continue
                try:
                    rec = json.loads(line)
                except json.JSONDecodeError:
                    continue
                email = norm_email(rec.get("email"))
                if not email:
                    continue
                cur = aggregated.get(email)
                if cur is None:
                    aggregated[email] = {
                        "email": email,
                        "full_name": norm_text(rec.get("full_name")),
                        "company_hint": norm_text(rec.get("company_hint")),
                        "labels": list(dict.fromkeys(rec.get("labels") or [])),
                        "thread_count": int(rec.get("thread_count") or 0),
                        "first_email_date": rec.get("first_email_date") or "",
                        "last_email_date": rec.get("last_email_date") or "",
                        "inbound_count": int(rec.get("inbound_count") or 0),
                        "outbound_count": int(rec.get("outbound_count") or 0),
                        "directionality": rec.get("directionality") or "",
                        "snapshot_source": path.name,
                    }
                else:
                    # Merge labels (preserve order via dict.fromkeys)
                    merged_labels = list(dict.fromkeys((cur["labels"] or []) + (rec.get("labels") or [])))
                    cur["labels"] = merged_labels
                    cur["thread_count"] = max(cur["thread_count"], int(rec.get("thread_count") or 0))
                    fd = rec.get("first_email_date") or ""
                    ld = rec.get("last_email_date") or ""
                    if fd and (not cur["first_email_date"] or fd < cur["first_email_date"]):
                        cur["first_email_date"] = fd
                    if ld and (not cur["last_email_date"] or ld > cur["last_email_date"]):
                        cur["last_email_date"] = ld
                    cur["inbound_count"] = max(cur["inbound_count"], int(rec.get("inbound_count") or 0))
                    cur["outbound_count"] = max(cur["outbound_count"], int(rec.get("outbound_count") or 0))
                    # Re-derive directionality from totals
                    if cur["inbound_count"] > 0 and cur["outbound_count"] > 0:
                        cur["directionality"] = "bidirectional"
                    elif cur["outbound_count"] > 0:
                        cur["directionality"] = "outbound"
                    elif cur["inbound_count"] > 0:
                        cur["directionality"] = "inbound"
                    # Chain sources
                    srcs = cur["snapshot_source"].split("; ")
                    if path.name not in srcs:
                        cur["snapshot_source"] = "; ".join(srcs + [path.name])
                    # Best non-empty full_name
                    if not cur["full_name"] and rec.get("full_name"):
                        cur["full_name"] = norm_text(rec.get("full_name"))
    return aggregated, files_seen


# ── Master apply ────────────────────────────────────────────────────────────


def apply_signals_to_master(signals: dict[str, dict[str, Any]],
                            batch_id: str) -> tuple[int, int, list[dict[str, str]]]:
    """Populate the 6 Gmail fields on Master rows · returns (matched, unmatched, unmatched_rows)."""
    master_rows, contacts_rows, companies_rows, activities_rows = load_existing_master()
    by_email: dict[str, int] = {}
    for i, row in enumerate(master_rows):
        em = norm_email(row.get("email"))
        if em:
            by_email[em] = i

    matched = 0
    unmatched_rows: list[dict[str, str]] = []

    for email, signal in signals.items():
        idx = by_email.get(email)
        if idx is None:
            unmatched_rows.append({
                "email": email,
                "full_name": signal.get("full_name", ""),
                "company_hint": signal.get("company_hint", ""),
                "labels": "; ".join(signal.get("labels", [])),
                "thread_count": str(signal.get("thread_count", 0)),
                "last_email_date": signal.get("last_email_date", ""),
                "directionality": signal.get("directionality", ""),
                "snapshot_source": signal.get("snapshot_source", ""),
                "reason": "no Master row matches this email · could be a personal contact or a new institutional name to onboard",
            })
            continue
        row = master_rows[idx]
        labels = signal.get("labels", []) or []
        row["last_email_date"] = signal.get("last_email_date", "")
        row["active_threads"] = signal.get("thread_count", 0)
        row["gmail_labels"] = "; ".join(labels)
        row["inferred_relationship_stage"] = infer_stage(labels)
        row["email_directionality"] = signal.get("directionality", "")
        row["gmail_signal_source"] = signal.get("snapshot_source", "")
        row["relationship_strength"] = compute_relationship_strength(signal, row)
        row["last_seen_batch_id"] = batch_id
        row["last_updated_at"] = datetime.now(timezone.utc).replace(microsecond=0).isoformat()
        matched += 1

    summary = build_summary(master_rows, companies_rows, activities_rows, batch_id)
    write_master_workbook(master_rows, contacts_rows, companies_rows, activities_rows, summary)

    return matched, len(unmatched_rows), unmatched_rows


# ── file archival ──────────────────────────────────────────────────────────


def move_to_old(src: Path, batch_id: str) -> Path:
    dest = OLD / src.name
    if dest.exists():
        stem = dest.stem
        dest = OLD / f"{stem}.{batch_id}{src.suffix}"
    shutil.move(str(src), str(dest))
    return dest


def now_iso() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat()


# ── main ────────────────────────────────────────────────────────────────────


def main() -> int:
    incoming_files = sorted(
        [p for p in INCOMING.iterdir() if p.is_file() and p.suffix.lower() in (".jsonl", ".json")],
        key=lambda p: p.stat().st_mtime,
    )
    print(f"→ Gmail signals · {len(incoming_files)} snapshot(s) in incoming/gmail-signals/")
    if not incoming_files:
        print("  nothing to do · ask Claude to extract Gmail signals (or drop a JSONL snapshot manually)")
        return 0

    batch_id = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
    signals, files_seen = read_jsonl_snapshots(incoming_files)
    print(f"  parsed {len(signals)} unique email signal(s) across {len(files_seen)} snapshot file(s)")

    matched, unmatched_count, unmatched_rows = apply_signals_to_master(signals, batch_id)
    print(f"  master · matched={matched} · unmatched={unmatched_count}")

    # Reports
    if unmatched_rows:
        unmatched_csv = REPORTS / f"gmail-unmatched-emails_{batch_id}.csv"
        with unmatched_csv.open("w", encoding="utf-8", newline="") as f:
            w = csv.DictWriter(f, fieldnames=[
                "email", "full_name", "company_hint", "labels", "thread_count",
                "last_email_date", "directionality", "snapshot_source", "reason",
            ])
            w.writeheader()
            for r in unmatched_rows:
                w.writerow(r)
        print(f"  unmatched report → {unmatched_csv.name}")

    log_path = REPORTS / "gmail-ingestion-log.jsonl"
    with log_path.open("a", encoding="utf-8") as f:
        f.write(json.dumps({
            "batch_id": batch_id,
            "snapshot_files": files_seen,
            "unique_emails_in_signals": len(signals),
            "master_matched": matched,
            "master_unmatched": unmatched_count,
            "completed_at": now_iso(),
        }, ensure_ascii=False) + "\n")

    for src in incoming_files:
        dest = move_to_old(src, batch_id)
        print(f"  moved {src.name} → old/gmail-signals/{dest.name}")

    print(f"\n✓ Gmail signals applied to Master · batch_id={batch_id}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
