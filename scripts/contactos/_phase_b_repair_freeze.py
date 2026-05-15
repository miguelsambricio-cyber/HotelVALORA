"""
Contacts pipeline freeze guard · originated 2026-05-15 (Phase B-Repair).

Aborts mutating scripts (classify_master, promote_to_supabase) at
import time when a sentinel file exists, preventing accidental
propagation while a multi-step pipeline operation is in progress.

Sentinel content protocol (all lines stripped + skipped if empty):
  - Free-form prose (printed back to stderr as the abort reason).
  - Optional `BLOCK: <script_name>` lines · if any present, ONLY
    those scripts are blocked · others pass through.
  - No BLOCK: lines → block ALL scripts (default fail-closed).

This lets you, e.g., freeze promote_to_supabase.py while running
classify_master.py mid-pipeline (Phase B classifier v2 in progress).

Lifecycle:
  1. A pipeline operation creates the sentinel with a reason and
     optional BLOCK: filter.
  2. Each downstream mutating script calls abort_if_frozen() at
     import time.
  3. Operator deletes the sentinel after validating the operation.

The sentinel path is kept under the master/ folder so it travels with
the data and can't be missed.
"""
from __future__ import annotations

import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent.parent
SENTINEL = ROOT / "CONTACTOS DATASITE" / "master" / ".phase_b_repair_in_progress.lock"


def _parse_block_list(body: str) -> list[str]:
    """Extract `BLOCK: <name>` lines from sentinel body. Empty → block all."""
    out: list[str] = []
    for raw in body.splitlines():
        line = raw.strip()
        if line.upper().startswith("BLOCK:"):
            name = line.split(":", 1)[1].strip()
            if name:
                out.append(name)
    return out


def abort_if_frozen(script_name: str) -> None:
    if not SENTINEL.exists():
        return
    body = SENTINEL.read_text(encoding="utf-8") if SENTINEL.is_file() else ""
    block_list = _parse_block_list(body)
    if block_list and script_name not in block_list:
        # Selective freeze · this script is permitted through
        return
    # Block (either explicit BLOCK: <script> or default-deny when no filter)
    print("=" * 72, file=sys.stderr)
    print(f"FROZEN · {script_name} aborted by contacts pipeline freeze", file=sys.stderr)
    print("=" * 72, file=sys.stderr)
    print(f"Sentinel file present: {SENTINEL}", file=sys.stderr)
    if body:
        print("\nReason recorded in sentinel:\n", file=sys.stderr)
        print(body, file=sys.stderr)
    if block_list:
        print(f"\nThis script is in the explicit block list: {block_list}", file=sys.stderr)
    else:
        print("\nNo selective filter present · default-deny in effect.", file=sys.stderr)
    print("\nDelete the sentinel only after the in-progress operation has been validated.", file=sys.stderr)
    print("See docs/changelog.md entry 'Phase 2.B.3-correction · 2026-05-15'.", file=sys.stderr)
    sys.exit(2)
