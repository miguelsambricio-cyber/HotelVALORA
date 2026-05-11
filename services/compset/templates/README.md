# Operator import templates — CompSet operational workspace

Reference contracts for what the CompSet Underwriting Agent will accept when Phase 2 wires the operational pipeline.

## What lives here

| File | Use |
|---|---|
| `compset_import_template.csv` | Subject + compset KPIs + MPI / ARI / RGI per period for a target hotel. Drop into `INPUT/`. |
| `hotel_positioning_import_template.csv` | Underwriting positioning snapshot for a target hotel — assumptions, valuation anchor, confidence. Drop into `INPUT/`. |

Unlike `services/costar/` (one INPUT folder per granularity), this workspace has a SINGLE `INPUT/` because:

- Both masters share the same operator (asset manager / underwriter / analyst)
- Both are triggered by the same deal context (one valuation produces one COMPSET refresh + one POSITIONING snapshot)
- The CompSet Underwriting Agent routes per-file based on header signature: a file with `mpi`/`ari`/`rgi` columns → COMPSET_MASTER; a file with `snapshot_kind`/`adr_assumption_eur` columns → HOTEL_POSITIONING_MASTER

## Contract

Each template carries **only the domain columns the operator can provide**. The ingestion-meta block (`canonical_id`, `ingestion_id`, `ingested_at`, `dedup_key`, …) is filled in by the agent — operators do not write those columns.

### Required columns vary per master

The full required-column list lives in:
- `docs/intelligence/compset-schema.md` — COMPSET_MASTER
- `docs/intelligence/hotel-positioning-schema.md` — HOTEL_POSITIONING_MASTER

Each schema doc matches the `DICTIONARY` sheet of its master workbook 1:1.

## Operator usage

1. Copy the relevant template, rename to something descriptive — e.g. `Ritz_Madrid_Compset_2026Q1.csv` or `Ritz_Madrid_Positioning_2026Q1.csv`.
2. Fill in rows. Keep the header row intact.
3. Drop into `services/compset/INPUT/`.
4. The CompSet Underwriting Agent picks it up on the next operator trigger or scheduled refresh. The agent decides which master receives the row by inspecting the column signature.

## Why CSV, not XLSX

CSVs survive `git diff` cleanly when an operator wants to version-control a particularly important positioning snapshot. The agent accepts both formats — XLSX is fine when CoStar ships its own workbooks.

## Future-safe

When the schema evolves (`normalization_version` bumps), the agent will rewrite these templates in-place with the new column set and bump a note here. The agent never silently drops columns.
