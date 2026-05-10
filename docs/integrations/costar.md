# Integrations · CoStar

CoStar is the canonical hotel-transaction + asset database HotelVALORA pulls from when an operator imports historical comparables.

## Status today

- ✅ Parser + normaliser shipped in `services/data_pipeline/pipeline/costar/`
- ✅ `POST /api/v1/imports/costar` endpoint exists (`apps/api/app/api/v1/imports/costar.py`)
- ⏸ No frontend surface today — admin CLI / Postman only
- ⏸ No live API integration — operators upload CoStar exports manually

## File flow

```
CoStar export (CSV/XLSX)
   │
   ▼
services/data_pipeline/pipeline/costar/normalizer.py
   ├─ Column mapping (raw CoStar → canonical Hotel asset shape)
   ├─ Multilingual cleaning (lib/cleaning/multilingual.py)
   └─ Dedup key generation (lib/cleaning/names.py — hotel_dedup_key)
   │
   ▼
Staging tables (apps/api/alembic/versions/0001-0005)
   │
   ▼
Merge engine review queue (/(dashboard)/review)
```

## Phase 3 planned work

- Surface CoStar import in the Settings shell (Settings → Imports → CoStar)
- Drag-and-drop CoStar export upload → background Celery worker → staging table
- Real-time progress + summary card
- Auto-route low-confidence matches to the review queue

## Phase 5 + (future)

- Live CoStar API integration (`api.costar.com` — credential bring-your-own)
- Webhook for daily comp-set deltas

## Cross-references

| Topic | Doc |
|---|---|
| Data pipeline ETL | `docs/data-pipeline.md` |
| Imports CLI | `docs/imports.md` |
| Multilingual normalisation | `docs/normalization.md` |
| Merge engine + review | `docs/merge-engine.md` |
