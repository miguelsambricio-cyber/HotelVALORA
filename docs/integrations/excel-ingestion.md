# Integrations · Excel Ingestion

Operators commonly run hotel financial models in Excel. HotelVALORA ingests those workbooks into the canonical underwriting shape.

## Status today

- ✅ Parser + validator shipped in `services/data_pipeline/pipeline/excel/`
- ✅ `POST /api/v1/imports/excel` endpoint exists (`apps/api/app/api/v1/imports/excel.py`)
- ✅ CLI tool: `python -m pipeline.cli excel <file.xlsx>`
- ⏸ No frontend upload surface today

## Canonical workbook shape

The parser expects a specific set of sheets + cell anchors. Full reference: **`docs/imports.md`**. High-level:

| Sheet | Purpose | Required cells |
|---|---|---|
| Hotel | Asset metadata | A1 hotel name, B1 city, etc. |
| Rooms | Room mix + ADR | varies |
| P&L | TTM + 5-year forecast | A2:N50 (named range `pl_block`) |
| CAPEX | Renovation budget | named range `capex_lines` |
| Acquisition | Cost line items | named range `acq_costs` (5 lines) |

## Mappable line ids

Two taxonomies surface in the frontend already:

- **CAPEX** — `apps/web/src/lib/investment/capex.ts` (extracted from the Investment Requirements UI; ready to map to workbook line ids)
- **Acquisition Cost** — `apps/web/src/lib/investment/value-acquisition.ts` (5 canonical lines: Notary & Registry, AJD Stamp Duty, ITP Property Tax, Acquisition Fee, Key Money Operator)

Both taxonomies were designed Excel-mappable so the upload-and-pre-fill flow ships without re-mapping.

## Phase 3 surface — planned

- Settings → Imports → Upload workbook
- Real-time validation (parser errors surface immediately)
- Pre-fill flow: parsed workbook drops values into the Investment Requirements store
- "Save scenario" to attach the workbook to a saved valuation

## Cross-references

| Topic | Doc |
|---|---|
| Imports module map | `docs/imports.md` |
| Data pipeline | `docs/data-pipeline.md` |
| CAPEX taxonomy | `apps/web/src/lib/investment/capex.ts` |
| Acquisition cost taxonomy | `apps/web/src/lib/investment/value-acquisition.ts` |
| Investment Requirements UI | `docs/features/settings.md` |
