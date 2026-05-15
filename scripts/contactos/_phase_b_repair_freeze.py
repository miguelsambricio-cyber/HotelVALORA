"""
Phase B-Repair freeze guard · 2026-05-15.

Aborts mutating scripts (classify_master, promote_to_supabase) at
import time when a sentinel file exists, preventing accidental
re-corruption while the offset-fix repair is in progress.

Background: Phase 2.B.3 --apply introduced a header/data column
misalignment in the Master xlsx (data shifted RIGHT by 1 vs header).
Until the repair is fully validated, downstream writers must NOT run
because they read by header name and would scramble more cells.

Lifecycle:
  1. Repair script creates the sentinel file at start of work.
  2. classify_master.py / promote_to_supabase.py abort if sentinel
     exists.
  3. Operator (or final validation step) deletes the sentinel after
     confirming Master alignment + replacement-trail integrity.

The sentinel path is kept under the master/ folder so it travels with
the data and can't be missed.
"""
from __future__ import annotations

import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent.parent
SENTINEL = ROOT / "CONTACTOS DATASITE" / "master" / ".phase_b_repair_in_progress.lock"


def abort_if_frozen(script_name: str) -> None:
    if not SENTINEL.exists():
        return
    body = SENTINEL.read_text(encoding="utf-8") if SENTINEL.is_file() else ""
    print("=" * 72, file=sys.stderr)
    print(f"FROZEN · {script_name} aborted by Phase B-Repair guard", file=sys.stderr)
    print("=" * 72, file=sys.stderr)
    print(f"Sentinel file present: {SENTINEL}", file=sys.stderr)
    if body:
        print("\nReason recorded in sentinel:\n", file=sys.stderr)
        print(body, file=sys.stderr)
    print("\nDelete the sentinel only after Phase B-Repair validation completes.", file=sys.stderr)
    print("See docs/changelog.md entry 'Phase 2.B.3-correction · 2026-05-15'.", file=sys.stderr)
    sys.exit(2)
