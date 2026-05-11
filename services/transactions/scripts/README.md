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

# Validate without touching MASTER / staging / archive (skips audit-sync too)
python services/transactions/scripts/ingest.py --target transactions --dry-run --verbose

# Record a specific operator email on the run (default: $OPERATOR_EMAIL or miguel.sambricio@metcub.com)
python services/transactions/scripts/ingest.py --target transactions --operator-email you@example.com

# Skip the cloud audit-sync step (local run remains authoritative)
python services/transactions/scripts/ingest.py --target transactions --no-audit

# Override audit endpoint or token (prefer env vars over CLI flags for tokens)
python services/transactions/scripts/ingest.py --target transactions \
   --audit-url https://staging.hotelvalora.com/api/agents/data-ingestion-summary \
   --audit-token "$(op read 'op://HOTELVALORA/ingestion-audit/token')"
```

### Required env vars

| Var | Required when | Purpose |
|---|---|---|
| `OPERATOR_EMAIL` | optional | Recorded as `ingested_by` in MASTER + `ai_agent_runs.input.operator_email` |
| `INGESTION_AUDIT_TOKEN` | audit-sync enabled (default) | Bearer secret that authenticates the CLI against `/api/agents/data-ingestion-summary`. **Same value** as the Vercel project env var. |
| `INGESTION_AUDIT_URL` | optional | Override the default `https://hotelvalora.com/api/agents/data-ingestion-summary`. |

If `INGESTION_AUDIT_TOKEN` is not set and `--no-audit` is not passed, the CLI completes the local run, prints a soft-fail message, and exits 0. The MASTER is the source of truth; the cloud is a downstream mirror.

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

## Audit chain unification (live)

After every successful run, the CLI POSTs a per-file summary batch to `/api/agents/data-ingestion-summary` on the cloud. The handler writes one `ai_agent_runs` row per file with `metadata.python_ingestion_id` carrying the CLI's ingestion_id, emits a `data_ingestion_staged` event so QA / Monitoring can react, and returns the cross-reference IDs back to the CLI.

The DB is the **single audit lens** across both halves of the Data Ingestion Agent:

| Surface | Records local runs | Records cloud runs | Records cross-references |
|---|---|---|---|
| MASTER `INGESTION_LOG` sheet | ✅ | — | python_ingestion_id only |
| `services/transactions/logs/<YYYY-MM>/<id>.jsonl` | ✅ | — | python_ingestion_id only |
| `public.ai_agent_runs` | ✅ via audit-sync | ✅ direct | metadata.python_ingestion_id ↔ id |
| `public.ai_events` (kind=`custom`, payload.kind=`data_ingestion_staged`) | ✅ via audit-sync | ✅ direct | run_id + python_ingestion_id |

If the cloud is unreachable (offline operator, deployment in flight, token wrong), the CLI prints a soft-fail message and exits 0. The local files remain authoritative. To re-sync, set the token and re-run — but note that re-running will reprocess any files still in `INPUT_*` (it does NOT re-sync historical runs from the local jsonl; that's a manual one-off if it ever becomes necessary).

## Configuring the Vercel side

Set `INGESTION_AUDIT_TOKEN` (a random 32+ char string) on Vercel:

```bash
echo "$(openssl rand -hex 32)" | vercel env add INGESTION_AUDIT_TOKEN production
# Then locally:
export INGESTION_AUDIT_TOKEN="<paste same value>"
```

The same value works for `preview` + `development` Vercel envs if you want preview deploys to accept ingestion sync.
