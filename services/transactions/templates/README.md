# Operator import templates

Reference contracts for what the Data Ingestion Agent will accept once Phase 2 lands.

## What lives here

| File | Use |
|---|---|
| `transaction_import_template.csv` | Minimal column set for a single-shot transaction drop into `INPUT_TRANSACCIONES/` |
| `project_import_template.csv` | Same for `INPUT_PROYECTOS/` |

## Contract

Both templates carry **only the domain columns the operator can provide**. The ingestion-meta block (`canonical_id`, `ingestion_id`, `ingested_at`, `dedup_key`, …) is filled in by the Data Ingestion Agent — operators do not write those columns.

### Required columns vary by file

The full required-column list lives in:
- `docs/intelligence/transaction-schema.md` (the canonical reference)
- `docs/intelligence/project-schema.md`

Both schema docs match the `DICTIONARY` sheet of the master workbooks 1:1.

## Operator usage

1. Copy the template, rename to something descriptive — e.g. `2026_Q1_CBRE_Iberia.csv` or `Marriott_pipeline_ES_2026Q2.xlsx`.
2. Fill in rows. Keep the header row intact.
3. Drop into `services/transactions/INPUT_TRANSACCIONES/` or `services/transactions/INPUT_PROYECTOS/` as appropriate.
4. The Data Ingestion Agent picks it up on the next manual trigger or scheduled run (Phase 2 wires the trigger; Phase 1 is design only).

## Why CSV, not XLSX

CSVs survive `git diff` cleanly when an operator wants to version-control a particularly important import. The agent accepts both formats — XLSX is fine when source providers (CoStar, brokers) ship their own workbooks.

## Future-safe

When the schema evolves (`normalization_version` bumps), the agent rewrites this template in-place with the new column set and bumps a note here. The agent never silently drops columns.
