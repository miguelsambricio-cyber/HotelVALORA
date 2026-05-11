# CoStar Ingestion Workflow

End-to-end pipeline for landing CoStar / STR / curated hospitality market datasets into the four canonical MASTER workbooks of `services/costar/`.

**Last refreshed:** 2026-05-11
**Status:** Phase 1 — directory + schemas + workflow defined. Automation lands in Phase 2.3.d of the Data Ingestion Agent.

---

## 1. The four parallel pipelines

Country / market / submarket / class flow through four strictly separated parallel pipelines. They share infrastructure (ingestion-meta block, SOURCES_REGISTRY, audit-chain unification) but never share a DATA sheet.

```
operator drop →  PAIS/INPUT/         MERCADO/INPUT/        SUBMERCADO/INPUT/      CLASS/INPUT/
                       │                    │                     │                     │
                  CoStar Market Data Agent reads, parses, validates, normalises
                       │                    │                     │                     │
        staging/temp/<id>        staging/temp/<id>      staging/temp/<id>      staging/temp/<id>
                       │                    │                     │                     │
                       ▼                    ▼                     ▼                     ▼
       COSTAR_MASTER_PAIS    COSTAR_MASTER_MERCADOS   COSTAR_MASTER_SUBMERCADOS    COSTAR_MASTER_CLASS
                       │                    │                     │                     │
                       └─ source file → old.pais/ · old.mercado/ · old.submercado/ · old.class/
                       └─ INGESTION_LOG row in each workbook
                       └─ jsonl in logs/<YYYY-MM>/<id>.jsonl
                       └─ event emitted (kind=custom, payload.kind=costar_ingestion_staged)
                       └─ POST to /api/agents/data-ingestion-summary (audit-chain unification)
```

Compset workflows live in `services/compset/` and are owned by the CompSet Underwriting Agent — different agent, different operational rhythm. See `docs/architecture/market-vs-underwriting-separation.md`.

Why four pipelines, not one merged pipeline:

- Different schemas (country has macro context columns, class has explicit chain_scale, market has revpar_index_vs_country, submarket has its own indices)
- Different dedup keys (period × granularity)
- Different aggregation logic (a submarket aggregates upward to the market; a class is an explicit chain-scale aggregate)
- Different operator cadences (country quarterly, class monthly)

## 2. Lifecycle of a single import file

| Stage | Where | Who |
|---|---|---|
| 1. Operator drops `CoStar_ES_Madrid_2026Q1.xlsx` | `services/costar/MERCADO/INPUT/` | operator |
| 2. Trigger Data Ingestion Agent | `python services/costar/scripts/ingest.py --target mercado` (Phase 2.3.d) | operator or scheduled cron |
| 3. Parse — read sheets, normalise column headers | `staging/temp/<ingestion_id>/raw.json` | agent |
| 4. Schema check — required columns + types | (in-memory) | agent |
| 5. Per-row normalisation — geography, dates, currency, KPI bounds | `staging/temp/<ingestion_id>/normalised.json` | agent |
| 6. Dedup pass — compute `dedup_key`, scan MASTER | (in-memory) | agent |
| 7. Validation pass — required fields + sanity bounds | (in-memory) | agent |
| 8a. Route VALID rows → COSTAR_MASTER_MERCADOS DATA sheet | `MASTER/COSTAR_MASTER_MERCADOS.xlsx` | agent |
| 8b. Route REVIEW rows → manual queue | `staging/review/<ingestion_id>/` | agent |
| 8c. Route FAILED rows → failure archive | `staging/failed/<ingestion_id>/` | agent |
| 9. Write INGESTION_LOG row | the matching MASTER workbook | agent |
| 10. Move source file to archive | `MERCADO/old.mercado/<ts>_<short-id>_<name>` | agent |
| 11. Emit `custom` event with `payload.kind=costar_ingestion_staged` | `ai_events` | agent |
| 12. POST audit summary to `/api/agents/data-ingestion-summary` | cloud | agent |
| 13. Operator reviews `staging/review/` queue | review UI (Phase 3) | operator |

After step 10, each `<GRANULARITY>/INPUT/` should contain **only files still waiting to be processed**.

## 3. Trigger surfaces (Phase 2.3.d)

| Trigger | Surface | When to use |
|---|---|---|
| Manual CLI | `python services/costar/scripts/ingest.py --target {pais\|mercado\|submercado\|compset\|all}` | One-off drops |
| Manual API call | `POST /api/agents/data-ingestion` body with target + source_kind | Web UI uploads (Phase 5) |
| Scheduled cron | `0 8 * * 1` UTC (Monday mornings — CoStar weekly cadence) | Weekly batches |
| File-watcher | Local fsnotify on dev machines | Hands-off development |

All four route through the same agent so audit + cost + approval gates behave identically. Compset-level ingestions are higher cadence than country/market because operators receive monthly per-asset reports.

## 4. Operator's role

**Responsible for:**
- Which workbook to drop a file into (granularity must match)
- What time period each file covers (the `period_start` / `period_end` columns must be present and accurate)
- Currency consistency within a file (mixed-currency exports fail the gate)
- Reviewing `staging/review/` for borderline cases
- Re-uploading corrected versions of files in `staging/failed/`

**NOT responsible for:**
- Writing rows into MASTER directly (the agent does)
- Filling ingestion-meta columns
- Computing dedup keys
- Moving processed files
- Resolving CoStar codes to canonical UIDs (Phase 4 — entity resolver)

## 5. Failure modes + recovery

| Failure | Where it lands | Recovery |
|---|---|---|
| File not readable | `staging/failed/<ingestion_id>/error.json` | Operator re-saves and re-drops |
| Wrong granularity (e.g. compset file dropped into PAIS/) | Detected via required-column gate; routes to `staging/failed/` with `granularity_mismatch` reason | Operator moves the file to the correct INPUT folder |
| Required column missing | `staging/failed/<ingestion_id>/error.json` with column name | Operator edits template, re-drops |
| FX conversion needed (non-EUR row) | `staging/review/<ingestion_id>/rows.jsonl` | Phase 1: operator decides; Phase 4: agent applies ECB rate at period midpoint |
| Period overlap with existing canonical row (same granularity, same entity, same period) | `staging/review/` with both rows side-by-side | Operator chooses to supersede or skip |
| Identical content re-ingested | Silently skipped, counted in INGESTION_LOG.rows_skipped | Agent decision recorded |
| Source file path collision in `old.*` | Agent appends timestamp suffix | None — agent decision recorded |
| Ingestion run crashes mid-file | INGESTION_LOG row `outcome='crashed'`, partial rows in `staging/temp/` | Operator clears `staging/temp/<ingestion_id>/` and re-drops |

## 6. Rollback policy

The MASTER is append-only. To "undo" an ingestion run:

1. Look up the INGESTION_LOG row's `ingestion_id`
2. Filter the DATA sheet by `ingestion_id`
3. For each row: insert a corrective row with `supersedes_id=<old canonical_id>` and `ingestion_status='superseded'`

The old row's `ingestion_status` is auto-flipped to `'superseded'` (the single in-place update permitted; recorded in the run's INGESTION_LOG entry).

There is no DELETE in the MASTER. The audit trail is preserved.

## 7. Cost + agent budget interaction

The Data Ingestion Agent's daily cost cap (`ai_agents.config.daily_cost_usd_cap = $0.10` per Phase 2 baseline) is shared across both workspaces it supervises (`transactions/` + `costar/`). Phase 2.3.d activation may raise the cap when LLM-assisted normalisation lands.

## 8. Auditability — what survives in git

Per the workspace `.gitignore`: the contract (directory structure + masters + templates + scripts) lives in git; the data + logs + staging artefacts stay local.

| In git | Locally only |
|---|---|
| `MASTER/*.xlsx` (4 workbooks) | `<GRANULARITY>/INPUT/` |
| `MASTER/<workbook>::INGESTION_LOG` | `<GRANULARITY>/old.<granularity>/` |
| `scripts/build_masters.py` | `staging/{failed,review,temp}/` |
| `services/costar/.gitignore` | `logs/<YYYY-MM>/<id>.jsonl` |

Operators are encouraged to back up `logs/` + `<GRANULARITY>/old.<granularity>/` to a private bucket (Supabase Storage `excel-uploads` is the natural home; that wiring lands in Phase 2.3.d alongside the parser).

`public.ai_agent_runs` becomes the single audit lens once Phase 2.3.d wires the audit-sync POST — same pattern as the `transactions/` workspace shipped in Phase 2.3.c.

## 9. Future hooks

| Phase | Hook |
|---|---|
| 2.3.d | Data Ingestion Agent fully wired through this workspace (parser + CLI + audit-sync) |
| 3 | `staging/review/` queue surfaces in `/dev/ai-ops` admin UI alongside `transactions/` reviews |
| 4 | LLM-assisted normalisation — CoStar code resolution, submarket disambiguation, FX conversion |
| 5 | XLSX masters mirrored into Supabase tables (`public.market_periods`, `public.compset_periods`) |
| 6 | Underwriting Engine reads MASTER for valuation context |
| 7 | Market Intelligence Agent cross-joins this workspace with `public.market_news` for AI-driven positioning narratives |
