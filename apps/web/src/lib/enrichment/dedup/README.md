# Dedup Module

Institutional duplicate-detection engine for the canonical hotel pipeline.

**Strategic role:** dedup quality is one of three pillars of HotelVALORA's hotel intelligence moat (the others are confidence scoring and canonicalization). A weak dedup engine yields a junk database regardless of source quality. This module is intentionally over-engineered for the surface area it covers.

## Architecture

Two layers — matching the institutional pattern in `apps/api/app/services/dedup_service.py`:

1. **Blocking layer (O(N))**: `blockKey()` groups phonetically-similar names in the same market without N×N comparison cost. Two rows with different block keys are never compared.
2. **Composite scoring layer**: per-pair `compositeScore()` with the weighted rubric **35 / 30 / 20 / 10 / 5** — name_exact, name_fuzzy, geo, operator, room_count.

Tier thresholds (from architecture doc §4.2, preserved verbatim):

| Composite | Tier | Action |
|---|---|---|
| ≥ 0.92 | `auto_merge` | Engine collapses pair; writer accepts |
| ≥ 0.80 | `needs_review` | Pair surfaces in `hotel_duplicate_candidate` |
| ≥ 0.65 | `likely_duplicate` | Pair recorded; lower-priority queue |
| < 0.65 | `no_match` | Discarded |

## Institutional overrides

The engine enforces two hard overrides beyond raw scoring:

1. **Apartment-block flooding (sidecar §7.2 mitigation #1):** `auto_merge` is downgraded to `needs_review` whenever either side has `accommodationType ∈ {apartment, aparthotel}`. Curator decides; no silent merge.
2. **Identity match:** identical `booking_hotel_id` forces `auto_merge` regardless of composite score — same upstream record cannot be two canonical rows.

## File layout

```
dedup/
  string-similarity.ts   normalize · soundex · jaro · jaro-winkler (pure)
  scoring.ts             block-key · haversine · geoProximityScore ·
                         nameExact · nameFuzzy · operatorMatch ·
                         roomCountMatch · compositeScore
  engine.ts              evaluateCandidate(candidate, knownRows)
  index.ts               barrel
  README.md              this file
```

## Behaviour notes

- `normalizeForMatching` is locale-blind by design — Spanish, English,
  French, Portuguese names are normalized identically. Stopwords are
  stripped only inside `normalizeForBlocking` (used for the block_key
  soundex input), not inside the matching window.
- `jaroWinklerSimilarity` uses the standard 0.7 boost gate and 0.1
  prefix scale. We do **not** tune these per-publisher — calibration
  drift across sources would defeat the institutional invariant.
- `haversineMeters` is the canonical formula; precision adequate for
  hotel proximity (< 5km error at city scale).
- All scoring functions are **deterministic and side-effect free**.
  Tests can be written by asserting against fixed inputs.

## What this module does NOT do

- It does not write to the database. Persistence lives in the writer
  layer (Phase 3+).
- It does not fetch known rows. The orchestrator (or whoever calls
  `evaluateCandidate`) is responsible for loading the block-key
  neighborhood from `hotel_canonical`.
- It does not maintain cross-publisher aliases. The `hotel_aliases`
  table (existing in `apps/api`) handles those; this engine consumes
  any aliases already merged into canonical.
