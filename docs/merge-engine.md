# Merge Engine

Duplicate hotel detection, similarity scoring, and human review queue.  
**Implementation:** `app/services/dedup_service.py`, `app/api/v1/dedup/router.py`  
**Table:** `merge_recommendations` (migration `0004`)

---

## Algorithm

```
1. Load all active HotelAsset rows, grouped by normalised city
2. Score every unique pair within each city (weighted composite)
3. Run false-positive signals on each pair
4. Classify into recommendation tier
5. Upsert into merge_recommendations
   — skip pairs with status accepted or dismissed (human decisions are final)
   — update pending_review pairs only if score changed ≥ 0.01
```

---

## Scoring (5 components)

| Component | Weight | Method |
|---|---|---|
| `name_exact` | 35% | Normalised name cores identical → 1.0, else 0.0 |
| `name_fuzzy` | 30% | Jaccard token-overlap on normalised names |
| `city` | 20% | Normalised city strings equal → 1.0, else 0.0 |
| `operator` | 10% | Normalised operators equal → 1.0, else 0.0 (skipped if either null) |
| `address` | 5% | Jaccard token-overlap (skipped if either null) |

Missing components (null data) have their weight **redistributed proportionally** to present components so the final score is always 0–1.

**Canonical pair ordering:** `asset_a_id < asset_b_id` (UUID string order) ensures the `UniqueConstraint(asset_a_id, asset_b_id)` fires correctly regardless of scan order.

---

## False-Positive Signals

Detected after scoring; can block `auto_merge` tier:

| Signal | Condition |
|---|---|
| `disambiguation_token` | One name has `II`, `North`, `South`, `New`, `Old`, `Annex`, `Airport`, etc. |
| `star_rating_gap` | Difference ≥ 2 stars (when both present) |
| `room_count_ratio` | `max(keys) / min(keys) ≥ 2.5` (when both present) |
| `operator_mismatch` | Both have operators and they differ after normalisation |
| `chain_scale_mismatch` | Different chain scale segments (when both present) |
| `geographic_distance` | Haversine distance > 2 km (when both have lat/lon) |

Each signal has a `severity` (1–3) and `detail` string. Any signal with `severity ≥ 2` blocks `auto_merge`.

---

## Recommendation Tiers

| Tier | Score | Conditions |
|---|---|---|
| `auto_merge` | ≥ 0.92 | No high-severity FP signal; `confidence_label = HIGH` |
| `needs_review` | ≥ 0.80 | No blocking signal |
| `likely_duplicate` | ≥ 0.65 | — |
| *(not saved)* | < 0.65 | Pair discarded |

---

## Status Lifecycle

```
pending_review  →  accepted   (human accepted the merge)
                →  dismissed  (human dismissed as false positive)
                →  expired    (future: asset deleted or scan determined no longer relevant)
```

Human decisions (`accepted` / `dismissed`) are **never overwritten** by subsequent scans.

---

## Asset Snapshots

`asset_a_snapshot` and `asset_b_snapshot` are JSONB columns containing a denormalised copy of the asset at scan time. This lets the review UI render without additional queries.

Fields: `id`, `asset_name`, `city`, `operator`, `brand`, `star_rating`, `keys`, `chain_scale`, `address`, `submarket`, `status`.

---

## Score Breakdown

`score_breakdown` (JSONB) stores per-component detail:

```json
{
  "name_exact":  { "score": 1.0, "weight": 0.35, "detail": "Exact match" },
  "name_fuzzy":  { "score": 0.80, "weight": 0.30, "detail": "Jaccard 0.80" },
  "city":        { "score": 1.0, "weight": 0.20, "detail": "barcelona == barcelona" },
  "operator":    { "score": null, "weight": 0.10, "detail": "skipped: no operator data" },
  "address":     { "score": 0.60, "weight": 0.05, "detail": "Jaccard 0.60" }
}
```

---

## API Routes

```
GET  /dedup/summary                    counts by tier + status
POST /dedup/scan?city=Barcelona        run scan (city optional)
GET  /dedup/recommendations            filters: status, recommendation, confidence_label, limit, offset
GET  /dedup/recommendations/{id}       full detail + score_breakdown + rationale
POST /dedup/recommendations/{id}/accept    { notes? }
POST /dedup/recommendations/{id}/dismiss   { notes? }
```

`ScanResult` response: `{ assets_scanned, pairs_evaluated, new_recommendations, updated_recommendations, skipped_human_reviewed, total_pending }`.

---

## Inline Normalisation

`dedup_service.py` is fully self-contained — no dependency on `services/data_pipeline`. It inlines:
- `_key()` — NFKD + strip combining chars
- `_normalize()` — full multilingual pipeline (char map, prefix/suffix strip, stopwords)
- `_jaccard()` — token-set overlap ratio
- `_haversine_km()` — great-circle distance

See `docs/normalization.md` for the normalisation pipeline detail.

---

## Review UI

`apps/web/src/components/review/merge-queue.tsx`:
- Filter pills: all / auto_merge / needs_review / likely_duplicate
- "Run Scan" button → `POST /dedup/scan`
- Paginated table; click row → `DetailDialog`
- `DetailDialog`: rationale, side-by-side `AssetCard`, `BreakdownTable`, FP signals, notes textarea, Accept / Dismiss buttons
- Score visualised by `ScoreBar` (emerald ≥85%, amber ≥65%, rose)
