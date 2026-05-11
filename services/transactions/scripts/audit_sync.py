"""Audit-chain unification — POST per-file run summaries to the cloud endpoint.

The local CLI is authoritative for the MASTER + staging + logs. The cloud is
a downstream mirror that exposes ai_agent_runs as the unified audit lens
across the operator-side (this CLI) and the cloud-side (apps/web TS agent)
halves of the Data Ingestion Agent.

Soft-fail philosophy: a network/auth failure prints a warning + a recovery
hint, but never rolls back the local run. The MASTER + INGESTION_LOG row +
per-run jsonl in `logs/` remain the canonical record. Re-sync is operator-
initiated.

Env vars (or CLI overrides):
    INGESTION_AUDIT_URL    default https://hotelvalora.com/api/agents/data-ingestion-summary
    INGESTION_AUDIT_TOKEN  required when --audit is enabled (default behaviour)
"""

from __future__ import annotations

import json
import os
import socket
import ssl
import urllib.error
import urllib.request
from typing import Any

DEFAULT_AUDIT_URL = "https://hotelvalora.com/api/agents/data-ingestion-summary"
DEFAULT_TIMEOUT_S = 12

# ---------------------------------------------------------------------------
# Payload construction
# ---------------------------------------------------------------------------


def build_file_outcome(
    *,
    python_ingestion_id: str,
    target: str,
    source_file: str,
    started_at: str,
    completed_at: str,
    outcome: str,
    operator_email: str,
    normalization_version: str,
    rows_seen: int,
    rows_inserted: int,
    rows_skipped: int,
    rows_flagged_review: int,
    rows_failed: int,
    review_reasons: list[str],
    failed_reasons: list[str],
    error_message: str | None = None,
    rows_updated: int = 0,
) -> dict[str, Any]:
    """Build one element of `python_ingestion_runs`. Pure function — easy to test."""
    return {
        "python_ingestion_id": python_ingestion_id,
        "target": target,
        "source_file": source_file,
        "started_at": started_at,
        "completed_at": completed_at,
        "outcome": outcome,
        "operator_email": operator_email,
        "normalization_version": normalization_version,
        "rows_seen": int(rows_seen),
        "rows_inserted": int(rows_inserted),
        "rows_updated": int(rows_updated),
        "rows_skipped": int(rows_skipped),
        "rows_flagged_review": int(rows_flagged_review),
        "rows_failed": int(rows_failed),
        "review_reasons": list(review_reasons or []),
        "failed_reasons": list(failed_reasons or []),
        **({"error_message": error_message} if error_message else {}),
    }


# ---------------------------------------------------------------------------
# Transport — urllib only (no extra dependency on the operator's machine)
# ---------------------------------------------------------------------------


class AuditSyncError(Exception):
    """Raised when the cloud refuses the payload. Always soft-handled by the caller."""


def _resolve_endpoint(audit_url: str | None) -> str:
    return audit_url or os.environ.get("INGESTION_AUDIT_URL") or DEFAULT_AUDIT_URL


def _resolve_token(audit_token: str | None) -> str | None:
    return audit_token or os.environ.get("INGESTION_AUDIT_TOKEN")


def _post_json(url: str, token: str, body: dict[str, Any], timeout_s: int) -> dict[str, Any]:
    raw = json.dumps(body).encode("utf-8")
    req = urllib.request.Request(
        url,
        data=raw,
        method="POST",
        headers={
            "content-type": "application/json",
            "authorization": f"Bearer {token}",
            "accept": "application/json",
            "user-agent": "HotelVALORA-Ingest-CLI/0.1",
        },
    )
    ctx = ssl.create_default_context()
    with urllib.request.urlopen(req, timeout=timeout_s, context=ctx) as resp:
        payload = resp.read()
        text = payload.decode("utf-8", errors="replace")
        try:
            return json.loads(text)
        except json.JSONDecodeError as e:
            raise AuditSyncError(f"non_json_response: {text[:200]}") from e


def sync_outcomes(
    outcomes: list[dict[str, Any]],
    *,
    audit_url: str | None = None,
    audit_token: str | None = None,
    timeout_s: int = DEFAULT_TIMEOUT_S,
) -> dict[str, Any]:
    """Send a batch of file outcomes. Returns the cloud's parsed response.

    Raises AuditSyncError on network / auth / payload failure. The CLI catches
    this and prints a hint without rolling back the local commit.
    """
    if not outcomes:
        return {"ok": True, "cloud_runs": [], "failures": [], "note": "no_outcomes"}
    url = _resolve_endpoint(audit_url)
    token = _resolve_token(audit_token)
    if not token:
        raise AuditSyncError(
            "INGESTION_AUDIT_TOKEN not set. Either:\n"
            "  1. export INGESTION_AUDIT_TOKEN=<token>  (Vercel: same value as the deployed env var)\n"
            "  2. Pass --audit-token=<token> on the CLI\n"
            "  3. Pass --no-audit to skip the unification step entirely."
        )

    body = {"python_ingestion_runs": outcomes}
    last_err: Exception | None = None
    for attempt in (1, 2):
        try:
            response = _post_json(url, token, body, timeout_s)
            return response
        except urllib.error.HTTPError as e:
            # Read body for diagnostic; do not retry on 4xx
            try:
                detail = e.read().decode("utf-8", errors="replace")
            except Exception:  # noqa: BLE001
                detail = ""
            if 400 <= e.code < 500:
                raise AuditSyncError(f"http_{e.code}: {detail[:300]}") from e
            last_err = AuditSyncError(f"http_{e.code}: {detail[:300]}")
        except (urllib.error.URLError, socket.timeout, ConnectionError) as e:
            last_err = AuditSyncError(f"network: {e}")
        except AuditSyncError as e:
            last_err = e
        # only retry once
        if attempt == 1:
            continue
    assert last_err is not None
    raise last_err


# ---------------------------------------------------------------------------
# Pretty-printing helper
# ---------------------------------------------------------------------------


def format_response(response: dict[str, Any]) -> str:
    receipts = response.get("cloud_runs") or []
    failures = response.get("failures") or []
    lines = []
    if receipts:
        lines.append(f"  cloud runs: {len(receipts)}")
        for r in receipts:
            short_python = (r.get("python_ingestion_id") or "")[:8]
            short_cloud = (r.get("ai_agent_run_id") or "")[:8]
            lines.append(f"    python={short_python} -> ai_agent_run={short_cloud}")
    if failures:
        lines.append(f"  failures: {len(failures)}")
        for f in failures:
            short = (f.get("python_ingestion_id") or "")[:8]
            lines.append(f"    {short}: {f.get('error', '')[:120]}")
    return "\n".join(lines) if lines else "  (no receipts)"
