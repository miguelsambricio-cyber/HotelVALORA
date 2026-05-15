"""
Shared blocklist loader for contactos pipeline scripts.

Two artefacts produced by build_bounce_blocklist.py:
  CONTACTOS DATASITE/master/blocklists/gmail-bounce-blocklist.txt   (emails)
  CONTACTOS DATASITE/master/blocklists/dead-domains-blocklist.txt   (domains)

Both pipelines (extract_gmail_signals.py · harvest_untagged.py) call
load_blocklists() and check is_blocked(email) to short-circuit.
"""
from __future__ import annotations

from pathlib import Path

REPO = Path(__file__).resolve().parent.parent.parent
ROOT = REPO / "CONTACTOS DATASITE"
BLOCKLIST_DIR = ROOT / "master" / "blocklists"
EMAIL_FILE = BLOCKLIST_DIR / "gmail-bounce-blocklist.txt"
DOMAIN_FILE = BLOCKLIST_DIR / "dead-domains-blocklist.txt"


def _read_lines(path: Path) -> list[str]:
    if not path.exists():
        return []
    out: list[str] = []
    with path.open("r", encoding="utf-8") as f:
        for line in f:
            s = line.strip()
            if not s or s.startswith("#"):
                continue
            # allow trailing inline comment after two spaces
            token = s.split("  ", 1)[0].strip()
            if token:
                out.append(token.lower())
    return out


def load_blocklists() -> tuple[set[str], set[str]]:
    """Return (blocked_emails, blocked_domains) · empty sets if files missing."""
    return set(_read_lines(EMAIL_FILE)), set(_read_lines(DOMAIN_FILE))


def is_blocked(email: str, blocked_emails: set[str], blocked_domains: set[str]) -> bool:
    if not email:
        return False
    em = email.strip().lower()
    if em in blocked_emails:
        return True
    if "@" in em:
        dom = em.split("@", 1)[1]
        if dom in blocked_domains:
            return True
    return False
