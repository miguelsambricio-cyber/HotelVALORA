# services/costar/scripts — v1.2 ingestion engine

Reproducible Python toolchain owned by the **COSTAR & Hotel Reference Agent**.
v1.2 (2026-05-14) replaces the chain-scale `CLASS` master with the new
`HOTELES POR MERCADO` hotel-inventory pipeline and adds cross-references
to the compset and transactions workspaces.

## Quick start

```bash
python -m pip install -r services/costar/scripts/requirements.txt

# Full run — read every INPUT folder, build snapshot.json, archive sources
python services/costar/scripts/ingest.py

# Dry run — no snapshot, no archive
python services/costar/scripts/ingest.py --dry-run --verbose

# Run but keep source files in place (useful while iterating)
python services/costar/scripts/ingest.py --no-archive --verbose
```

The orchestrator writes:

| Path | Purpose |
|---|---|
| `services/costar/MASTER/snapshot.json` | Authoritative read path for `/user/admin/hotels` (Node side) |
| `services/costar/logs/<YYYY-MM>/<batch_id>.jsonl` | Per-run audit log (one JSON line per event) |
| `services/costar/corrections/<YYYY-MM>.jsonl` | Pending operator corrections (Node `submitHotelCorrection`) — consumed by `corrections.py` on next run |
| `services/costar/corrections-applied/<YYYY-MM>.jsonl` | Applied-correction audit trail — cumulative across runs |
| `services/costar/staging/{failed,review}/<batch_id>/` | Operator triage for unparseable / low-confidence rows (Phase 2.3.d.3) |

## Modules

| File | Role |
|---|---|
| `ingest.py` | CLI orchestrator — sweeps INPUTs, builds the snapshot, archives sources |
| `build_masters.py` | Generates the canonical XLSX masters (PAIS · MERCADO · SUBMERCADO · HOTELES POR MERCADO) |
| `dedup.py` | Stable IDs (`hotel_id`, `compset_id`, `transaction_id`, `ingestion_batch_id`), fuzzy matching, confidence scoring |
| `normalization.py` | Header alias maps + per-field normalisers (chain_scale, segment, facilities, country, year, numeric) |
| `source_readers.py` | XLSX/CSV reading + alias-folding |
| `snapshot.py` | Assemble + write `MASTER/snapshot.json` |
| `corrections.py` | **Phase 2.3.d.6** · Institutional Correction Consumer — drains pending corrections, validates them, applies as supersedes over the ingest values, preserves full provenance |

## Identity model

Four families of stable IDs ensure reconciliation across re-ingests:

- **`hotel_id`** — `costar_<PROPERTY_ID>` when the export carries it, otherwise `h_<sha256[:16]>(country|market|name)`. Synthetic IDs are flagged `hotel_id_synthetic = true`.
- **`compset_id`** — `cs_<sha256[:16]>(target_hotel_id|sorted_member_ids)`. Order-insensitive over members.
- **`transaction_id`** — `tx_<sha256[:16]>(source|asset_name|closed_at|price_eur)`. Stable across re-runs.
- **`ingestion_batch_id`** — fresh `batch_<uuid[:16]>` per pipeline run; written into every row's `_meta`.

## Reconciliation queue

Every row that needs operator attention surfaces in the queue. Kinds:

| Kind | When |
|---|---|
| `unrecoverable_row` | Missing primary-key inputs (country / market / name) |
| `suspected_duplicate` | Fuzzy match against another hotel in the same batch ≥ 88 |
| `low_confidence` | Confidence < 0.7 after missing-field + range checks |
| `compset_orphan_target` | Compset row references a target hotel not in inventory |
| `compset_orphan_member` | Compset member hotel not in inventory |
| `transaction_orphan` | Transaction asset can't be resolved to any hotel |

These land in `MASTER/snapshot.json#reconciliation_queue` for the
`/user/admin/hotels` UI to surface.

## Correction lifecycle (Phase 2.3.d.6)

Operator-submitted corrections complete a full institutional cycle:

```
[1] Operator clicks "Queue correction" in /user/admin/hotels/<id>
    ↓
[2] submitHotelCorrection() (Node server action) appends a row to
    services/costar/corrections/<YYYY-MM>.jsonl
        { status: "pending", correction_id, submitted_at, submitted_by,
          hotel_id, field, proposed_value, reason }
    ↓
[3] python services/costar/scripts/ingest.py — corrections.py module:
      • validates schema · operator id · timestamp · field allow-list ·
        hotel_id existence · proposed_value coercion + enum membership
      • applies valid corrections: mutates the hotel row, pushes a
        provenance entry to hotel._corrections, bumps confidence
      • rewrites the JSONL with status="applied" | "rejected" +
        full provenance (original_value, confidence_before/after,
        applied_at, applied_in_batch)
      • appends every applied row to corrections-applied/<YYYY-MM>.jsonl
    ↓
[4] snapshot.json includes a new `corrections` block with
    {pending_before, applied, rejected, applied_total_in_master}
    ↓
[5] /user/admin/hotels detail page shows the correction history
    inline, sorted most-recent first
```

Idempotency is built into the state machine: a second run sees
`status="applied"` and skips the row. Audit lives in the JSONL files
themselves AND in the appended `corrections-applied/` audit log.

### Validation rules (rejection reasons)

| Reason | When |
|---|---|
| `schema_invalid:missing_<key>` | Required JSONL field missing |
| `schema_invalid:bad_submitted_at` | `submitted_at` is not an ISO timestamp |
| `reason_too_short` | Operator's reason < 8 chars |
| `field_not_correctable` | Field not in `CORRECTABLE_FIELDS` |
| `hotel_id_not_in_inventory` | Hotel not produced by the current ingest pass |
| `proposed_value_unparseable` | Value didn't pass field coercer (int / year / float / text) |
| `proposed_value_out_of_enum` | Value not in canonical enum (`chain_scale`, `segment_type`) |

## How to extend

- **New CoStar export columns** → add an entry to the alias map in `normalization.py`
- **New facility code** → add to `_FACILITY_MAP` in `normalization.py`
- **Tighter dedup** → bump `DEFAULT_FUZZY_THRESHOLD` in `dedup.py`
- **New reconciliation signal** → emit a row from `ingest.py` with a new `kind`

## v1.1 → v1.2 migration

- `COSTAR_MASTER_CLASS.xlsx` is no longer regenerated. The file stays in `MASTER/` for archival.
- The `CLASS/` folder was renamed to `HOTELES POR MERCADO/` (legacy archive lives at `HOTELES POR MERCADO/old.class/`).
- `chain_scale` becomes an attribute on each hotel record in the new inventory rather than its own granularity.
- See `docs/intelligence/costar-hotels-by-market-schema.md` for the canonical column reference.
