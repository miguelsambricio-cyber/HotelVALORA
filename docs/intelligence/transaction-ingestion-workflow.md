# Transaction & Projects Ingestion Workflow

End-to-end pipeline for landing institutional transaction + project records into the canonical MASTER datasets.

**Last refreshed:** 2026-05-11
**Status:** Phase 1 — directory + schema + workflow defined. Automation lands in Phase 2 of the Data Ingestion Agent.

---

## 1. The two pipelines

Transactions and projects flow through **two strictly separated** parallel pipelines that share infrastructure but never mix records.

```
                ┌────────────────────────┐         ┌────────────────────────┐
operator drop → │ INPUT_TRANSACCIONES/   │         │ INPUT_PROYECTOS/       │ ← operator drop
                └────────────┬───────────┘         └────────────┬───────────┘
                             │                                  │
                  Data Ingestion Agent reads, parses, validates, normalises
                             │                                  │
                ┌────────────▼──────────────┐    ┌──────────────▼─────────────┐
                │ staging/temp              │    │ staging/temp               │
                │ staging/review            │    │ staging/review             │
                │ staging/failed            │    │ staging/failed             │
                └────────────┬──────────────┘    └──────────────┬─────────────┘
                             │ valid rows                       │ valid rows
                             ▼                                  ▼
              MASTER/HOTEL_TRANSACCIONES_MASTER.xlsx   MASTER/HOTEL_PROYECTOS_MASTER.xlsx
                             │                                  │
                             └──────── INGESTION_LOG row written in each MASTER
                             ▼
                  source file moved to old.transacciones/ or old.proyectos/
                             ▼
              event emitted: `data_ingestion_staged` → QA / Monitoring sees it
```

The two pipelines never share a master sheet. The `category` enum, the `*_uid` primary key, and the canonical dedup key differ — collapsing them would make any future single-pipeline query ambiguous.

## 2. Lifecycle of a single import file

| Stage | Where | Who |
|---|---|---|
| 1. Operator drops `2026_Q1_CBRE_Iberia.xlsx` | `services/transactions/INPUT_TRANSACCIONES/` | operator |
| 2. Trigger Data Ingestion Agent | `POST /api/agents/data-ingestion` (Phase 2) | operator or scheduled cron |
| 3. Parse — read sheets, normalise column headers | `staging/temp/<ingestion_id>/raw.json` | agent |
| 4. Schema check — required columns + types | (in-memory) | agent |
| 5. Per-row normalisation — geography, dates, prices, entities | `staging/temp/<ingestion_id>/normalised.json` | agent |
| 6. Dedup pass — compute `dedup_key`, scan MASTER | (in-memory) | agent |
| 7. Validation pass — required-field check, sanity bounds | (in-memory) | agent |
| 8a. Route VALID rows → MASTER DATA sheet | `MASTER/HOTEL_TRANSACCIONES_MASTER.xlsx` | agent |
| 8b. Route REVIEW rows → manual queue | `staging/review/<ingestion_id>/` | agent |
| 8c. Route FAILED rows → failure archive | `staging/failed/<ingestion_id>/` | agent |
| 9. Write INGESTION_LOG row (one per file) | `MASTER` workbook INGESTION_LOG sheet | agent |
| 10. Move source file to archive | `INPUT_TRANSACCIONES/old.transacciones/` | agent |
| 11. Emit `data_ingestion_staged` event | `ai_events` | agent |
| 12. Operator reviews `staging/review/` queue | review UI (Phase 3) | operator |

After step 10, `INPUT_TRANSACCIONES/` should contain **only files still waiting to be processed**. If a file lingers there, it failed earlier in the pipeline — check `staging/failed/`.

## 3. Trigger surfaces

Phase 1 (today): manual. The operator opens a terminal, runs a still-TODO command. The schema + workspace are ready; the runtime hook is not.

Phase 2 trigger options once wired:

| Trigger | Surface | When to use |
|---|---|---|
| Manual API call | `POST /api/agents/data-ingestion` body=`{source_kind, bucket, storage_path, file_name, request_parse:true}` | One-off drops |
| Operator command | `python services/transactions/scripts/ingest_inbox.py` (planned) | Bulk-process the inbox |
| Scheduled cron | `0 7 * * *` UTC, sweeps inbox automatically | Daily batches |
| File-watcher | Local fsnotify on dev machines | Hands-off development |

All four route through the same `dataIngestionAgent` so audit + cost + approval gates behave identically.

## 4. Operator's role

The operator is responsible for:

- **What** to drop — sources, vintages, regions
- **Where** to drop — INPUT_TRANSACCIONES vs INPUT_PROYECTOS
- **When** to trigger — manual today, automated in Phase 2
- **Reviewing** the `staging/review/` queue — accept / reject borderline rows
- **Quality** — re-uploading corrected versions of files in `staging/failed/`

The operator is NOT responsible for:

- Writing rows into the MASTER directly (the agent does this)
- Filling in ingestion-meta columns (the agent fills these)
- Computing dedup keys (the agent computes these)
- Moving processed files (the agent moves these)

## 5. Failure modes + recovery

| Failure | Where it lands | Recovery |
|---|---|---|
| File not readable (corrupt, password-protected, unknown format) | `staging/failed/<ingestion_id>/error.json` | Operator re-saves and re-drops |
| Required column missing | `staging/failed/<ingestion_id>/error.json` with column name | Operator edits template, re-drops |
| Row fails validation (e.g. price_eur > 5e9, year_built < 1700) | `staging/review/<ingestion_id>/rows.jsonl` | Operator approves or rejects per row |
| Row duplicate (matches existing canonical_id by dedup_key, content differs) | `staging/review/` with both copies side-by-side | Operator chooses to supersede or skip |
| Row duplicate identical content | Silently skipped, counted in INGESTION_LOG.rows_skipped | None — agent decision recorded |
| Source file path collision in `old.*/` | Agent appends timestamp suffix | None — agent decision recorded |
| Ingestion run crashes mid-file | INGESTION_LOG row gets `outcome='crashed'`, partial rows in `staging/temp/` | Operator clears `staging/temp/<ingestion_id>/` and re-drops the source file |

## 6. Rollback policy

The MASTER is append-only. To "undo" an ingestion run:

1. Look up the INGESTION_LOG row's `ingestion_id`
2. Filter the DATA sheet by `ingestion_id`
3. For each row: insert a corrective row with `supersedes_id=<old canonical_id>` and `ingestion_status='superseded'`

There is no DELETE in the MASTER. The audit trail is preserved.

## 7. Cost + agent budget interaction

`ai_agents.config.daily_cost_usd_cap` for `data_ingestion` is $0.10 (Phase 2). Per-file parse is regex-only → $0 today; LLM-assisted enrichment (Phase 4) will exceed the cap on the first run, so caps will be raised in the migration that introduces it. The Data Ingestion Agent's runtime calls `budgetPreflight()` before every LLM step — refuses if the projected total would exceed the cap.

## 8. Auditability — what survives in git

Per the workspace `.gitignore`: the contract (directory structure + masters + templates + scripts) lives in git; the data + logs + staging artefacts stay local.

The auditable surface in git:

- `MASTER/*.xlsx` — both canonical workbooks
- `MASTER/<workbook>::INGESTION_LOG` — every ingestion run since the workspace was created
- `scripts/build_masters.py` — the schema generator
- `services/transactions/.gitignore` — the inclusion/exclusion contract

The auditable surface locally (not in git):

- `logs/<YYYY-MM>/<ingestion_id>.jsonl` — full per-row trace
- `INPUT_*/old.*/` — every raw source file ever processed
- `staging/{failed,review,temp}/` — operational artefacts

Operators are encouraged to back up `logs/` + `INPUT_*/old.*/` to a private bucket (Supabase Storage `excel-uploads` is the natural home; that wiring lands in Phase 2 too).

## 9. Future hooks

| Phase | Hook |
|---|---|
| 2 | Data Ingestion Agent fully wired through this workspace |
| 3 | `staging/review/` queue surfaces in `/dev/ai-ops` admin UI |
| 4 | LLM-assisted normalisation — entity resolution, geography enrichment, segment classification |
| 5 | XLSX masters mirrored into `public.hotel_transactions` + `public.hotel_projects` (Supabase becomes the runtime read path; XLSX stays as the human-editable canonical) |
| 6 | Underwriting Agent reads MASTER + market_news to seed valuations |
