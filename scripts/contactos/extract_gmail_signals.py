#!/usr/bin/env python3
"""
Build a Gmail signals JSONL snapshot from raw MCP search_threads dumps.

Workflow
--------
1. Claude (this session) makes mcp__claude_ai_Gmail__search_threads calls
   for each institutional label. Oversized responses are auto-saved by
   the MCP runtime to:
       %USERPROFILE%/.claude/projects/.../tool-results/mcp-claude_ai_Gmail-search_threads-*.txt

2. Each saved file is `cp`'d (or otherwise) to:
       CONTACTOS DATASITE/google-contacts/gmail-raw/<LABEL-NAME>.json

   The filename (without .json) IS the Gmail label this batch belongs to.
   Filenames may include dashes verbatim — e.g.
       INVERSOR-INTERESADO.json
       FINANCIADORES-INTERESADOS.json
       LOI---SEVILLA-NERVION.json

3. Run this script:
       python scripts/contactos/extract_gmail_signals.py

4. It reads every .json in gmail-raw/, walks the threads, extracts every
   message's sender + toRecipients + ccRecipients, filters out Mail-Daemon
   / postmaster / Datasite service notifications / our own emails, and
   aggregates per remote email address:
       - labels touched
       - first_email_date · last_email_date
       - inbound_count · outbound_count · thread_count
       - directionality

5. Writes one JSONL snapshot to:
       CONTACTOS DATASITE/incoming/gmail-signals/gmail-signals-<ts>.jsonl

   The Gmail signals handler (ingest_gmail.py) picks it up on the next
   pipeline run and merges into the canonical Master.

Privacy
-------
- Output lives under the gitignored CONTACTOS DATASITE/ tree
- Operator-owned email addresses (configured below) are NEVER emitted
- Mail-daemon / postmaster / out-of-office bots are filtered

Dependencies: stdlib only.
"""

from __future__ import annotations

import json
import re
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

REPO = Path(__file__).resolve().parent.parent.parent
ROOT = REPO / "CONTACTOS DATASITE"
RAW_DIR = ROOT / "google-contacts" / "gmail-raw"
OUT_DIR = ROOT / "incoming" / "gmail-signals"
OUT_DIR.mkdir(parents=True, exist_ok=True)
RAW_DIR.mkdir(parents=True, exist_ok=True)

# ── self / noise filters ────────────────────────────────────────────────────
# Operator's email identities · NEVER emit these as relationship signals.
SELF_EMAILS = {
    "miguel.sambricio@metcub.com",
    "miguel.sambricio@build3rent.com",
    "operaciones@metcub.com",
    "info@metcub.com",
    "expansion@build3rent.com",
    "info@build3rent.com",
}

# Senders / patterns to skip · auto-responders, system, marketing services
NOISE_PATTERNS: list[re.Pattern[str]] = [
    re.compile(r"^MAILER-DAEMON@", re.IGNORECASE),
    re.compile(r"^mailer-daemon@", re.IGNORECASE),
    re.compile(r"^postmaster@", re.IGNORECASE),
    re.compile(r"@cloud-security\.net$", re.IGNORECASE),
    re.compile(r"^service@datasite\.com$", re.IGNORECASE),
    re.compile(r"@invitations\.mailinblack\.com$", re.IGNORECASE),
    re.compile(r"^bounce@", re.IGNORECASE),
    re.compile(r"^no-?reply@", re.IGNORECASE),
    re.compile(r"^notifications?@", re.IGNORECASE),
    re.compile(r"^donotreply@", re.IGNORECASE),
]

# ── Bounce detection (Phase 2.B.2 · relationship quality intelligence) ──────
# When any of these signals appears as a message, the recipients of the
# IMMEDIATELY-PRECEDING outbound message in the same thread are flagged
# as bounced. We track:
#   - bounce_count       (number of bounces observed for this email)
#   - last_bounce_date   (most recent bounce date)
#   - bounce_reasons     (small list of snippet samples · audit trail)

BOUNCE_SENDER_PATTERNS: list[re.Pattern[str]] = [
    re.compile(r"^MAILER-DAEMON@", re.IGNORECASE),
    re.compile(r"^mailer-daemon@", re.IGNORECASE),
    re.compile(r"^postmaster@", re.IGNORECASE),
    re.compile(r"@cloud-security\.net$", re.IGNORECASE),
]
BOUNCE_SUBJECT_PATTERNS: list[re.Pattern[str]] = [
    re.compile(r"undeliverable", re.IGNORECASE),
    re.compile(r"undelivered", re.IGNORECASE),
    re.compile(r"delivery status notification", re.IGNORECASE),
    re.compile(r"delivery has failed", re.IGNORECASE),
    re.compile(r"no se puede entregar", re.IGNORECASE),
    re.compile(r"mensaje no se ha podido", re.IGNORECASE),
    re.compile(r"returned to sender", re.IGNORECASE),
    re.compile(r"no se ha encontrado", re.IGNORECASE),
    re.compile(r"no se ha completado la entrega", re.IGNORECASE),
    re.compile(r"mail delivery failure", re.IGNORECASE),
    re.compile(r"recipient unknown", re.IGNORECASE),
]
BOUNCE_SNIPPET_PATTERNS: list[re.Pattern[str]] = [
    re.compile(r"couldn['’]?t be delivered", re.IGNORECASE),
    re.compile(r"could not be delivered", re.IGNORECASE),
    re.compile(r"mailbox unavailable", re.IGNORECASE),
    re.compile(r"address may be misspelled", re.IGNORECASE),
    re.compile(r"the address may not exist", re.IGNORECASE),
    re.compile(r"address (?:was )?not found", re.IGNORECASE),
    re.compile(r"recipient (?:was )?unknown", re.IGNORECASE),
    re.compile(r"no se ha entregado", re.IGNORECASE),
    re.compile(r"no se ha encontrado el dominio", re.IGNORECASE),
    re.compile(r"no se ha encontrado la direcci", re.IGNORECASE),
    re.compile(r"mensaje se ha bloqueado", re.IGNORECASE),
    re.compile(r"mensaje no se ha podido enviar", re.IGNORECASE),
    re.compile(r"550 5\.\d\.\d", re.IGNORECASE),
    re.compile(r"unknown user", re.IGNORECASE),
    re.compile(r"domain (?:not found|does not exist)", re.IGNORECASE),
    re.compile(r"esta cuenta de correo.*bloqueada", re.IGNORECASE),
    re.compile(r"account is no longer in use", re.IGNORECASE),
    re.compile(r"can no longer be reached", re.IGNORECASE),
    re.compile(r"no longer (?:works at|with) the company", re.IGNORECASE),
    re.compile(r"ya no trabaja", re.IGNORECASE),  # "X ya no trabaja en la compañía"
    re.compile(r"no longer working for", re.IGNORECASE),
]


def is_bounce_message(sender: str, subject: str, snippet: str) -> tuple[bool, str]:
    """Return (is_bounce, reason_label)."""
    if any(p.search(sender) for p in BOUNCE_SENDER_PATTERNS):
        return True, "bounce_sender"
    if any(p.search(subject) for p in BOUNCE_SUBJECT_PATTERNS):
        return True, "bounce_subject"
    if any(p.search(snippet) for p in BOUNCE_SNIPPET_PATTERNS):
        return True, "bounce_snippet"
    return False, ""

# Subject patterns that mark auto-replies · we still record the contact,
# but mark these messages as "automatic" (skip incrementing thread_count
# for direction-of-engagement). For v1 we just include them — the operator
# can decide later via the inferred stage.

EMAIL_RE = re.compile(r"^[A-Za-z0-9._%+\-]+@[A-Za-z0-9.\-]+\.[A-Za-z]{2,}$")


def normalize_email(value: Any) -> str:
    if not isinstance(value, str):
        return ""
    s = value.strip().lower()
    if "<" in s and ">" in s:
        # Strip "Name <email>" formatting
        m = re.search(r"<([^>]+)>", s)
        if m:
            s = m.group(1)
    if not EMAIL_RE.match(s):
        return ""
    return s


def is_self(email: str) -> bool:
    return email in SELF_EMAILS


def is_noise(email: str) -> bool:
    return any(p.search(email) for p in NOISE_PATTERNS)


def label_from_filename(path: Path) -> str:
    """Filename without .json IS the Gmail label tag."""
    return path.stem


def parse_date(value: Any) -> str:
    """Return YYYY-MM-DD (UTC) · empty string when unparseable."""
    if not isinstance(value, str):
        return ""
    try:
        # Gmail dates are "2022-10-07T11:48:00Z"
        if value.endswith("Z"):
            value = value[:-1] + "+00:00"
        d = datetime.fromisoformat(value)
        return d.date().isoformat()
    except ValueError:
        return ""


def process_one_file(path: Path, accumulator: dict[str, dict[str, Any]]) -> tuple[int, int]:
    """Mutates accumulator. Returns (threads_seen, signals_touched)."""
    label = label_from_filename(path)
    text = path.read_text(encoding="utf-8")
    try:
        data = json.loads(text)
    except json.JSONDecodeError as err:
        print(f"  ⚠ {path.name} · JSON parse failed · {err}")
        return 0, 0

    threads = data.get("threads") or []
    threads_seen = 0
    signals_touched = 0

    for thread in threads:
        threads_seen += 1
        thread_id = thread.get("id", "")
        # Per-thread tracking · we count a thread once per unique remote email
        # AND track the last outbound recipients so we can attribute bounces
        # to the correct address.
        prior_outbound_recipients: list[str] = []
        for msg in thread.get("messages") or []:
            date_str = parse_date(msg.get("date"))
            sender_raw = msg.get("sender") or ""
            sender = normalize_email(sender_raw)
            subject = msg.get("subject") or ""
            snippet = msg.get("snippet") or ""
            tos = [normalize_email(t) for t in (msg.get("toRecipients") or [])]
            ccs = [normalize_email(t) for t in (msg.get("ccRecipients") or [])]

            is_outbound = is_self(sender)

            # ── Bounce detection ──────────────────────────────────────────
            bounce_hit, bounce_reason_kind = is_bounce_message(sender_raw, subject, snippet)
            if bounce_hit and prior_outbound_recipients:
                # Attribute bounce to the recipients of the prior outbound
                bounce_targets: list[str] = []
                for r in prior_outbound_recipients:
                    if not r or is_self(r) or is_noise(r):
                        continue
                    bounce_targets.append(r)
                # Also try to extract failed addresses directly from snippet
                snippet_emails = re.findall(
                    r"[A-Za-z0-9._%+\-]+@[A-Za-z0-9.\-]+\.[A-Za-z]{2,}",
                    snippet,
                )
                for ext in snippet_emails:
                    em_norm = normalize_email(ext)
                    if em_norm and not is_self(em_norm) and not is_noise(em_norm):
                        if em_norm not in bounce_targets:
                            bounce_targets.append(em_norm)
                for em in bounce_targets:
                    slot = accumulator.get(em)
                    if slot is None:
                        # Even bounced-only addresses get tracked so they can
                        # be flagged for correction · NOT to make them active.
                        slot = {
                            "email": em,
                            "labels": set(),
                            "thread_ids": set(),
                            "first_email_date": date_str,
                            "last_email_date": "",  # no real interaction
                            "inbound_count": 0,
                            "outbound_count": 0,
                            "bounce_count": 0,
                            "last_bounce_date": "",
                            "bounce_reasons": [],
                        }
                        accumulator[em] = slot
                    slot.setdefault("bounce_count", 0)
                    slot["bounce_count"] += 1
                    slot.setdefault("bounce_reasons", [])
                    if len(slot["bounce_reasons"]) < 5:
                        # Truncate snippet to a small forensic sample
                        sample = (snippet or "").strip()[:160]
                        slot["bounce_reasons"].append(sample)
                    if date_str:
                        prior = slot.get("last_bounce_date") or ""
                        if not prior or date_str > prior:
                            slot["last_bounce_date"] = date_str
                # Bounce messages themselves don't change inbound/outbound counts
                # (they're from postmaster, not the human contact).
                continue

            # Determine the "remote" party emails on this message
            remote_emails: list[str] = []
            if is_outbound:
                # We sent it · the recipients are the remote party
                for r in tos + ccs:
                    if not r or is_self(r) or is_noise(r):
                        continue
                    remote_emails.append(r)
                # Track for next-message bounce attribution
                prior_outbound_recipients = list(remote_emails)
            else:
                # Someone else sent it · they are the remote party
                if sender and not is_self(sender) and not is_noise(sender):
                    remote_emails.append(sender)
                # Their To/Cc may also include other non-self contacts (group threads)
                for r in tos + ccs:
                    if not r or is_self(r) or is_noise(r):
                        continue
                    if r != sender:
                        remote_emails.append(r)
                prior_outbound_recipients = []  # reset · this isn't an outbound

            for em in remote_emails:
                signals_touched += 1
                slot = accumulator.get(em)
                if slot is None:
                    slot = {
                        "email": em,
                        "labels": set(),
                        "thread_ids": set(),
                        "first_email_date": date_str,
                        "last_email_date": date_str,
                        "inbound_count": 0,
                        "outbound_count": 0,
                        "bounce_count": 0,
                        "last_bounce_date": "",
                        "bounce_reasons": [],
                    }
                    accumulator[em] = slot
                slot["labels"].add(label)
                slot["thread_ids"].add(thread_id)
                if is_outbound:
                    slot["outbound_count"] += 1
                else:
                    slot["inbound_count"] += 1
                if date_str:
                    if not slot["first_email_date"] or date_str < slot["first_email_date"]:
                        slot["first_email_date"] = date_str
                    if not slot["last_email_date"] or date_str > slot["last_email_date"]:
                        slot["last_email_date"] = date_str

    return threads_seen, signals_touched


def directionality(inbound: int, outbound: int) -> str:
    if inbound > 0 and outbound > 0:
        return "bidirectional"
    if outbound > 0:
        return "outbound"
    if inbound > 0:
        return "inbound"
    return ""


def main() -> int:
    files = sorted([p for p in RAW_DIR.iterdir() if p.is_file() and p.suffix.lower() == ".json"])
    print(f"→ Gmail signals extractor · {len(files)} raw file(s) in {RAW_DIR}")
    if not files:
        print("  drop label-tagged JSON files into gmail-raw/ first")
        return 0

    accumulator: dict[str, dict[str, Any]] = {}
    total_threads = 0
    total_signals = 0
    for path in files:
        threads_seen, signals_touched = process_one_file(path, accumulator)
        total_threads += threads_seen
        total_signals += signals_touched
        print(f"  · {path.name:<45} threads={threads_seen} signals={signals_touched}")

    print(f"\n  total · {total_threads} threads · {total_signals} raw signals · {len(accumulator)} unique remote emails")

    # Emit JSONL
    ts = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
    out_path = OUT_DIR / f"gmail-signals-{ts}.jsonl"
    written = 0
    bounced = 0
    with out_path.open("w", encoding="utf-8") as f:
        for email, slot in sorted(accumulator.items()):
            bcount = int(slot.get("bounce_count", 0) or 0)
            if bcount > 0:
                bounced += 1
            record = {
                "email": email,
                "full_name": "",                  # search_threads doesn't include display name
                "company_hint": email.split("@")[-1] if "@" in email else "",
                "labels": sorted(slot["labels"]),
                "thread_count": len(slot["thread_ids"]),
                "first_email_date": slot["first_email_date"],
                "last_email_date": slot["last_email_date"],
                "inbound_count": slot["inbound_count"],
                "outbound_count": slot["outbound_count"],
                "directionality": directionality(slot["inbound_count"], slot["outbound_count"]),
                # Phase 2.B.2 · bounce intelligence
                "bounce_count": bcount,
                "last_bounce_date": slot.get("last_bounce_date", ""),
                "bounce_reasons": slot.get("bounce_reasons", []),
                "snapshot_source": "claude-mcp",
                "snapshot_taken_at": datetime.now(timezone.utc).replace(microsecond=0).isoformat(),
            }
            f.write(json.dumps(record, ensure_ascii=False) + "\n")
            written += 1

    print(f"\n✓ wrote {written} signal record(s) to {out_path}")
    print(f"  · bounce-flagged emails: {bounced}")
    print(f"  next step · run pipeline.py to merge into Master")
    return 0


if __name__ == "__main__":
    sys.exit(main())
