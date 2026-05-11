# Operator import templates — CoStar workspace

Reference contracts for what the Data Ingestion Agent will accept when Phase 2 lands.

## What lives here

| File | Use |
|---|---|
| `costar_pais_import_template.csv` | Minimal column set for a single-shot country drop into `PAIS/INPUT/` |
| `costar_mercado_import_template.csv` | Same for `MERCADO/INPUT/` |
| `costar_submercado_import_template.csv` | Same for `SUBMERCADO/INPUT/` |
| `costar_compset_import_template.csv` | Same for `COMPSET/INPUT/` |

## Contract

Each template carries **only the domain columns the operator can provide**. The ingestion-meta block (`canonical_id`, `ingestion_id`, `ingested_at`, `dedup_key`, …) is filled in by the Data Ingestion Agent — operators do not write those columns.

### Required columns vary per granularity

The full required-column list lives in:
- `docs/intelligence/costar-country-schema.md`
- `docs/intelligence/costar-market-schema.md`
- `docs/intelligence/costar-submarket-schema.md`
- `docs/intelligence/costar-compset-schema.md`

Each schema doc matches the `DICTIONARY` sheet of its master workbook 1:1.

## Operator usage

1. Copy the template, rename to something descriptive — e.g. `CoStar_ES_Madrid_2026Q1.csv` or `Compset_RitzMadrid_2026Q1.xlsx`.
2. Fill in rows. Keep the header row intact.
3. Drop into the matching `INPUT/` directory:
   - `PAIS/INPUT/` for country-level
   - `MERCADO/INPUT/` for market-level
   - `SUBMERCADO/INPUT/` for submarket-level
   - `COMPSET/INPUT/` for compset-level
4. The Data Ingestion Agent picks it up on the next manual trigger or scheduled run (Phase 2 wires the trigger; Phase 1 is design only).

## Why CSV, not XLSX

CSVs survive `git diff` cleanly when an operator wants to version-control a particularly important import. The agent will accept both formats — XLSX is fine when CoStar/STR ship their own workbooks (the typical case).

## Future-safe

When the schema evolves (`normalization_version` bumps), the agent will rewrite this template in-place with the new column set and bump a note here. The agent never silently drops columns.
