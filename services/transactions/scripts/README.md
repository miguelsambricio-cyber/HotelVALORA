# services/transactions/scripts — Data Ingestion Agent

Python pipeline that owns the operational ingestion of institutional transactions + projects into the canonical MASTER workbooks.

This is the **operator-side half** of the Data Ingestion Agent. The cloud-runtime half lives at `apps/web/src/lib/ai-agents/agents/data-ingestion.ts` and handles Supabase Storage uploads (Phase 5). Both halves share the same `ai_agent_runs` audit conventions and the same normalisation contract — the split exists because Vercel Functions cannot touch the local filesystem.

---

## Module map

| File | Role |
|---|---|
| `ingest.py` | CLI entry point — sweep INPUT_*, parse, normalise, dedup, route, archive, log |
| `build_masters.py` | Reproducible MASTER xlsx generator (re-run on schema bumps) |
| `normalization.py` | Field-by-field rules per `docs/intelligence/data-normalization-rules.md` |
| `dedup.py` | sha256 dedup_key + content_hash helpers |
| `master_io.py` | Read + append MASTER xlsx, write INGESTION_LOG |
| `staging_io.py` | Route failed + review rows, archive processed source files, write per-run jsonl |
| `source_readers.py` | Lenient XLSX + CSV readers with header alias folding |
| `tests/fixtures/` | Smoke-test fixtures (committed; the run state they produce is not) |
| `requirements.txt` | Pinned dependencies (openpyxl) |

## Installation

```bash
# From repo root
pip install -r services/transactions/scripts/requirements.txt
```

Python 3.10+ recommended (uses PEP 604 union types). Tested on 3.14.

## Usage

```bash
# Sweep INPUT_TRANSACCIONES/, write to HOTEL_TRANSACCIONES_MASTER.xlsx
python services/transactions/scripts/ingest.py --target transactions

# Same for projects
python services/transactions/scripts/ingest.py --target projects

# Both at once
python services/transactions/scripts/ingest.py --target both

# Validate without touching MASTER / staging / archive
python services/transactions/scripts/ingest.py --target transactions --dry-run --verbose

# Record a specific operator email on the run (default: $OPERATOR_EMAIL or miguel.sambricio@metcub.com)
python services/transactions/scripts/ingest.py --target transactions --operator-email you@example.com
```

## What the run does, step by step

1. Opens the matching MASTER workbook. If missing → exit 1 with a hint to run `build_masters.py`.
2. Loads existing canonical rows from MASTER as a `{dedup_key: row}` map for deduplication.
3. Lists every `*.xlsx` / `*.csv` in `INPUT_*` (excluding `old.*/`, dotfiles).
4. For each file:
   - Generates an `ingestion_id` (uuid).
   - Reads the file via `openpyxl` (xlsx) or `csv` (csv).
   - Folds raw column headers into canonical schema columns via `normalization.fold_header`.
   - For each row:
     - Apply normalisation rules. Collect review warnings + missing-required reasons.
     - Compute `dedup_key` + `content_hash`.
     - Route:
       - Missing required → `staging/failed/<ingestion_id>/`
       - Dedup match (same content) → silent skip, counted in `rows_skipped`
       - Dedup match (different content) → `staging/review/<ingestion_id>/` with both rows
       - Review warnings only → `staging/review/<ingestion_id>/`
       - Otherwise → buffered for MASTER append
5. After ALL files processed:
   - Single `wb.save()` on the MASTER (batch-in-memory pattern — atomic-ish via `.tmp` + rename).
   - Per-file: write `staging/failed/` + `staging/review/` jsonl + summary.json.
   - Per-file: append a row to MASTER's `INGESTION_LOG` sheet.
   - Per-file: write `logs/<YYYY-MM>/<ingestion_id>.jsonl` with the per-row trace.
   - Per-file: move the source file to `INPUT_*/old.*/<timestamp>_<short-id>_<filename>`.
6. Print run summary.

## Exit codes

| Code | Meaning |
|---|---|
| 0 | Success or partial success (some rows may have landed in staging) |
| 1 | Catastrophic failure (workspace unreachable, MASTER unsaveable, all rows failed) |
| 2 | Invalid CLI args (argparse) |

## Smoke test

A fixture at `tests/fixtures/smoke_transactions.csv` exercises the main paths:

| Row | Scenario | Routes to |
|---|---|---|
| 2 | Clean Ritz acquisition | MASTER |
| 3 | Exact duplicate of row 2 (same dedup_key + content_hash) | silently skipped |
| 4 | Same Ritz hotel, different price (~€430M vs €425M) → different dedup_key | MASTER (NEW canonical, NOT a duplicate) |
| 5 | Hotel Wellington — clean sale | MASTER |
| 6 | Sunset Beach portfolio JV — uses announced_at not closed_at | MASTER |
| 7 | Edinburgh hotel priced in GBP | `staging/review/` (non-EUR currency) |
| 8 | Mystery hotel with €42 500 price | `staging/review/` (out-of-range) |
| 9 | Missing asset_name | `staging/failed/` |
| 10 | Westin Palace — clean acquisition | MASTER |

To reproduce:

```bash
cp services/transactions/scripts/tests/fixtures/smoke_transactions.csv \
   services/transactions/INPUT_TRANSACCIONES/smoke_test.csv

python services/transactions/scripts/ingest.py --target transactions --verbose

# Inspect:
ls services/transactions/INPUT_TRANSACCIONES/old.transacciones/
ls services/transactions/staging/failed/
ls services/transactions/staging/review/
ls services/transactions/logs/$(date +%Y-%m)/
python3 -c "from openpyxl import load_workbook; \
  wb=load_workbook('services/transactions/MASTER/HOTEL_TRANSACCIONES_MASTER.xlsx'); \
  print('rows:', wb['TRANSACTIONS'].max_row, 'log rows:', wb['INGESTION_LOG'].max_row)"

# Reset (optional, before committing):
python services/transactions/scripts/build_masters.py
rm -rf services/transactions/staging/failed/* services/transactions/staging/review/* \
       services/transactions/logs/2026-* \
       services/transactions/INPUT_TRANSACCIONES/old.transacciones/2026*
```

The expected run produces **5 ingested · 1 skipped · 2 review · 1 failed** from 9 data rows.

## Architectural notes

### Batch-in-memory MASTER writes

Each MASTER xlsx is opened once, accumulates all new rows in memory, and is saved once at the end of the run. If the process crashes mid-run, the MASTER on disk is unchanged — safe to retry by re-dropping the source file.

The save is atomic-ish: written to `MASTER.xlsx.tmp`, then renamed to `MASTER.xlsx`. `Path.rename()` is atomic on POSIX; on Windows it's best-effort but rarely interrupted in practice.

### Per-file isolation

Each file gets its own `ingestion_id`. If one file fails catastrophically (unreadable, schema-broken), the remaining files in the inbox still process. The failed file's `INGESTION_LOG` row records `outcome='failed'` with the error message; the file stays in `INPUT_*` (not archived) so the operator can fix and retry.

### Source archive timestamp prefix

Files moved to `old.*` are renamed `<YYYYMMDDTHHMMSSZ>_<short-ingestion-id>_<originalname>`. The prefix avoids collisions if the same filename is re-ingested and creates a natural chronological sort order.

### Append-only contract

The pipeline never DELETEs or UPDATEs canonical rows. The single in-place update allowed is flipping `ingestion_status='superseded'` on a row whose `canonical_id` appears in a later row's `supersedes_id`. This is recorded in the run's INGESTION_LOG.

### Phase 5 evolution

When the masters migrate to Supabase tables, this pipeline becomes the operator-side adapter:

- `master_io.py` swaps its `openpyxl.append` calls for `supabase.from('hotel_transactions').insert()` while keeping the same dedup + routing logic.
- The cloud-runtime half (`apps/web/src/lib/ai-agents/agents/data-ingestion.ts`) gains parity, and operators can choose CLI vs web UI per import.
- The XLSX masters become a read-only mirror.

That refactor is mechanical, not architectural. The pipeline shape stays.

## Audit chain unification (future)

Today: per-file `ingestion_id` lives in the MASTER's INGESTION_LOG + the per-run jsonl. The TS Data Ingestion Agent in `apps/web` writes to `ai_agent_runs` for its (different) trigger paths. Phase 4 unifies them: this CLI POSTs a run summary to `/api/agents/data-ingestion-summary` on completion → cloud writes a matching `ai_agent_runs` row stamped with the Python `ingestion_id`. The DB becomes the single audit lens; the XLSX `INGESTION_LOG` becomes a per-master snapshot.

Until then, the two halves share normalisation rules + schema documents but record their runs independently.
