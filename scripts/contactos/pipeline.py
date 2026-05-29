#!/usr/bin/env python3
"""
CONTACTOS DATASITE · institutional relationship pipeline · single entry point.

Operator workflow (per Phase 2.B spec)
-------------------------------------
1. Drop a file in `CONTACTOS DATASITE/incoming/` (or a subfolder):

   incoming/                          ← Datasite Full Report .xlsm here
   incoming/google-contacts/          ← Google Contacts .csv here
   incoming/gmail-signals/            ← Gmail signal snapshots .jsonl here

2. Run:
       python scripts/contactos/pipeline.py

3. The pipeline:
   a. Detects each file by its subfolder
   b. Dispatches to the appropriate handler:
        - Datasite handler (ingest.py)
        - Google Contacts handler (ingest_google.py · now auto-merges into Master)
        - Gmail signals handler (ingest_gmail.py)
   c. Each handler updates the canonical Master at
      `CONTACTOS DATASITE/master/metcub-contacts-master.xlsx`
   d. Each processed file moves to `old/` with structured naming:
        <source-type>-<original-stem>-<batch_id>.<ext>
      e.g.:
        datasite-20260512_METCUB_Full_Report-20260512T201500Z.xlsm
        google-contacts-mis_contactos-20260512T201500Z.csv
        gmail-signals-snapshot-20260512T201500Z.jsonl
   e. Final pass: regenerate Summary against the consolidated Master

4. To check pending work, the operator just looks at `incoming/`. Empty
   subfolders = nothing to process.

This is the same operational pattern used by the transactions pipeline:
incoming = live queue · old = processed history · master = canonical
institutional dataset.

Re-running with empty `incoming/` is a no-op (the individual handlers
short-circuit when their input directory is empty).

Dependencies: only the three handler scripts (ingest.py · ingest_google.py
· ingest_gmail.py) which all live in this directory.
"""

from __future__ import annotations

import re
import shutil
import subprocess
import sys
from datetime import datetime, timezone
from pathlib import Path

# Windows console UTF-8
try:
    sys.stdout.reconfigure(encoding="utf-8")
    sys.stderr.reconfigure(encoding="utf-8")
except (AttributeError, ValueError):
    pass

REPO = Path(__file__).resolve().parent.parent.parent
ROOT = REPO / "CONTACTOS DATASITE"
INCOMING_ROOT = ROOT / "incoming"
OLD_ROOT = ROOT / "old"
SCRIPTS_DIR = Path(__file__).resolve().parent

for d in (INCOMING_ROOT, OLD_ROOT,
          INCOMING_ROOT / "google-contacts",
          INCOMING_ROOT / "gmail-signals",
          INCOMING_ROOT / "consolidated",
          OLD_ROOT / "google-contacts",
          OLD_ROOT / "gmail-signals",
          OLD_ROOT / "consolidated"):
    d.mkdir(parents=True, exist_ok=True)


SOURCE_TYPES = {
    "datasite": {
        "incoming_subdir": "",                # files in incoming root
        "old_subdir": "",
        "extensions": (".xlsm", ".xlsx"),
        "script": SCRIPTS_DIR / "ingest.py",
        "label": "Datasite Outreach Full Report",
    },
    "google-contacts": {
        "incoming_subdir": "google-contacts",
        "old_subdir": "google-contacts",
        "extensions": (".csv",),
        "script": SCRIPTS_DIR / "ingest_google.py",
        "label": "Google Contacts CSV",
    },
    "gmail-signals": {
        "incoming_subdir": "gmail-signals",
        "old_subdir": "gmail-signals",
        "extensions": (".jsonl", ".json"),
        "script": SCRIPTS_DIR / "ingest_gmail.py",
        "label": "Gmail signal snapshot",
    },
    "consolidated": {
        "incoming_subdir": "consolidated",
        "old_subdir": "consolidated",
        "extensions": (".xlsx",),
        "script": SCRIPTS_DIR / "ingest_consolidated.py",
        "label": "Consolidated Outlook/LinkedIn/PSTs export",
    },
}


def list_pending() -> dict[str, list[Path]]:
    """Return per-source-type the files currently sitting in incoming/."""
    pending: dict[str, list[Path]] = {}
    for source_type, cfg in SOURCE_TYPES.items():
        subdir = INCOMING_ROOT / cfg["incoming_subdir"] if cfg["incoming_subdir"] else INCOMING_ROOT
        if not subdir.exists():
            pending[source_type] = []
            continue
        files = []
        for p in subdir.iterdir():
            if not p.is_file():
                continue
            if p.suffix.lower() not in cfg["extensions"]:
                continue
            files.append(p)
        pending[source_type] = sorted(files, key=lambda p: p.stat().st_mtime)
    return pending


def slugify(name: str, max_len: int = 60) -> str:
    """Filesystem-safe identifier · drops non-alphanum, collapses underscores."""
    base = re.sub(r"[^A-Za-z0-9]+", "_", name)
    base = re.sub(r"_+", "_", base).strip("_")
    return base[:max_len] or "file"


def structured_name(source_type: str, original_name: str, batch_id: str) -> str:
    """
    <source-type>-<slugified-original-stem>-<batch_id>.<original-ext>
    Examples:
      datasite-20260512_METCUB_Full_Report-20260512T201500Z.xlsm
      google-contacts-mis_contactos-20260512T201500Z.csv
      gmail-signals-snapshot-20260512T201500Z.jsonl
    """
    p = Path(original_name)
    stem_slug = slugify(p.stem)
    return f"{source_type}-{stem_slug}-{batch_id}{p.suffix.lower()}"


def move_to_old(src: Path, source_type: str, batch_id: str) -> Path:
    """Archive a processed input with structured naming."""
    cfg = SOURCE_TYPES[source_type]
    old_subdir = OLD_ROOT / cfg["old_subdir"] if cfg["old_subdir"] else OLD_ROOT
    old_subdir.mkdir(parents=True, exist_ok=True)
    new_name = structured_name(source_type, src.name, batch_id)
    dest = old_subdir / new_name
    # On collision (unlikely with batch_id but defensive) append a counter
    if dest.exists():
        i = 2
        while True:
            candidate = old_subdir / f"{dest.stem}.{i}{dest.suffix}"
            if not candidate.exists():
                dest = candidate
                break
            i += 1
    shutil.move(str(src), str(dest))
    return dest


def run_handler(source_type: str) -> int:
    """Invoke the handler script. Returns the subprocess exit code."""
    cfg = SOURCE_TYPES[source_type]
    if not cfg["script"].exists():
        print(f"  ⚠ {source_type} handler script not found at {cfg['script']} · skipping")
        return 0
    print(f"\n→ running {source_type} handler · {cfg['script'].name}")
    proc = subprocess.run(
        [sys.executable, str(cfg["script"])],
        cwd=str(REPO),
        # Don't capture stdout · let the handler print directly
        check=False,
    )
    if proc.returncode != 0:
        print(f"  ✗ {source_type} handler exited with code {proc.returncode}")
    return proc.returncode


def main() -> int:
    pending = list_pending()
    total = sum(len(v) for v in pending.values())
    print(f"→ CONTACTOS pipeline · {total} pending file(s) across {sum(1 for v in pending.values() if v)} source(s)")
    for source_type, files in pending.items():
        if not files:
            continue
        cfg = SOURCE_TYPES[source_type]
        print(f"  · {source_type:<18} ({cfg['label']}) → {len(files)} file(s)")

    if total == 0:
        print("  nothing pending · drop a file into incoming/ to trigger a run")
        return 0

    # Capture filenames BEFORE handler runs · each handler moves its own files
    # to old/ as a side-effect, but we re-archive with structured names here
    # in case a handler doesn't (Gmail handler doesn't always move).
    rc_total = 0
    batch_id = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")

    for source_type, files in pending.items():
        if not files:
            continue
        # Record original names so we can structured-rename after handler runs
        original_paths = [(p.name, p) for p in files]

        rc = run_handler(source_type)
        rc_total += abs(rc)

        # After the handler runs, walk old/<subdir>/ for any of our originals
        # that the handler moved but didn't structured-rename · rename them.
        # Files that were structured-renamed already (or that the handler left
        # somewhere else) are not re-touched.
        cfg = SOURCE_TYPES[source_type]
        old_subdir = OLD_ROOT / cfg["old_subdir"] if cfg["old_subdir"] else OLD_ROOT
        for orig_name, _orig_path in original_paths:
            # Look for the original filename verbatim in old/<subdir>/
            candidate = old_subdir / orig_name
            if candidate.exists():
                new_name = structured_name(source_type, orig_name, batch_id)
                dest = old_subdir / new_name
                if dest.exists():
                    # Already renamed in a prior pass or handler did it
                    continue
                candidate.rename(dest)
                print(f"  ↻ archived as {new_name}")

        # Also handle the case where a handler did NOT move (e.g. errored) ·
        # leave the original file where it is so the operator can retry.

    print(f"\n✓ pipeline done · batch_id={batch_id} · handler exits sum={rc_total}")
    return 0 if rc_total == 0 else 1


if __name__ == "__main__":
    sys.exit(main())
