# CoStar Compset Schema

Full column reference for `services/costar/MASTER/COSTAR_MASTER_COMPSETS.xlsx` — the institutional benchmarking core.

**Last refreshed:** 2026-05-11
**Normalization version:** v1.0

The DICTIONARY sheet of the workbook mirrors this document 1:1. When this document changes, regenerate the workbook (`python services/costar/scripts/build_masters.py`) and commit both.

---

## 1. Why compsets matter

CoStar's signature institutional output is the **compset performance indices** — MPI, ARI, RGI — which benchmark a target hotel against a peer set of competitors over time. These three numbers tell an underwriter, lender, or asset manager whether a hotel is over- or under-performing its competitive context independent of the macro environment.

This master is the single most load-bearing dataset for HOTELVALORA underwriting after the transactions corpus. Every hotel report in the Library that claims a "RevPAR Generation Index of 110" sources that number from this workbook.

## 2. Domain columns (34)

### 2.1 · Compset identification

| Column | Type | Required | Notes |
|---|---|---|---|
| `compset_name` | text | ✅ | Operator-readable label — `Madrid 5* Luxury Center`. Display preserves diacritics. |
| `compset_uid` | uuid | | Resolved canonical compset id (Phase 4 entity resolver). |
| `costar_compset_code` | text | | CoStar code for the comp set when issued. |
| `target_hotel_name` | text | ✅ | The hotel being benchmarked. |
| `target_hotel_uid` | uuid | | Resolved canonical hotel id — FK to `public.valuations` or future entity table. |
| `compset_hotel_names` | text | | Comma-separated list of peers (display only — provenance). |
| `compset_size` | int | ✅ | Number of hotels in the compset. Range [3, 20]. |

### 2.2 · Geographic + segment context

| Column | Type | Required | Notes |
|---|---|---|---|
| `country` | text | ✅ | ISO-3166-1 alpha-2. |
| `market_name` | text | | Parent market. |
| `submarket_name` | text | | Parent submarket when applicable. |
| `chain_scale` | enum | | Subject's chain scale at reporting time. |

### 2.3 · Time

| Column | Type | Required | Notes |
|---|---|---|---|
| `period_kind` | enum | ✅ | `daily` · `weekly` · `monthly` · `quarterly` · `ytd` · `ltm` · `annual` |
| `period_start` | date | ✅ | ISO-8601 start. |
| `period_end` | date | ✅ | ISO-8601 end (inclusive). |
| `currency` | text | ✅ | ISO-4217. |

### 2.4 · Subject hotel KPIs

| Column | Type | Required | Notes |
|---|---|---|---|
| `subject_occupancy_pct` | numeric | | Subject occupancy %. Range [0, 100]. |
| `subject_adr` | numeric | | Subject ADR in row's currency. |
| `subject_revpar` | numeric | | Subject RevPAR in row's currency. |
| `subject_rooms_available` | numeric | | Subject room-nights available. |
| `subject_rooms_sold` | numeric | | Subject room-nights sold. |
| `subject_revenue` | numeric | | Subject accommodation revenue. |

### 2.5 · Compset (peer-set) KPIs

| Column | Type | Required | Notes |
|---|---|---|---|
| `compset_occupancy_pct` | numeric | | Compset average occupancy %. |
| `compset_adr` | numeric | | Compset average ADR. |
| `compset_revpar` | numeric | | Compset average RevPAR. |
| `compset_rooms_available` | numeric | | Compset total room-nights available. |
| `compset_rooms_sold` | numeric | | Compset total room-nights sold. |

### 2.6 · Performance indices — CoStar's signature outputs

| Column | Type | Required | Notes |
|---|---|---|---|
| `mpi` | numeric | | **Market Penetration Index** = (subject_occupancy / compset_occupancy) × 100. 100 = on par with compset. > 100 = subject outperforms on demand capture. |
| `ari` | numeric | | **Average Rate Index** = (subject_adr / compset_adr) × 100. 100 = on par. > 100 = subject commands a price premium. |
| `rgi` | numeric | | **RevPAR Generation Index** = (subject_revpar / compset_revpar) × 100. 100 = on par. The composite of MPI × ARI. |
| `mpi_yoy_pp` | numeric | | YoY change in MPI in pp of index (102.4 → 105.1 = +2.7 pp). |
| `ari_yoy_pp` | numeric | | YoY change in ARI. |
| `rgi_yoy_pp` | numeric | | YoY change in RGI. |
| `fair_share_pct` | numeric | | Subject's fair share of compset demand by room count (subject rooms / compset total rooms × 100). |
| `revpar_premium_eur` | numeric | | Subject RevPAR − compset RevPAR in the row's currency. Pre-computed for report convenience. |

## 3. Why subject + compset + indices are all stored (redundancy on purpose)

Mathematically, `mpi = subject_occupancy_pct / compset_occupancy_pct × 100`. We could store only the subject + compset KPIs and compute indices at read-time. We store both because:

1. **CoStar's reported indices sometimes differ** from naive computation — they incorporate corrections, lookback restatements, and proprietary smoothing that we cannot replicate.
2. **Reports cite the index directly** — they cite the value CoStar published.
3. **Restatement detection** — comparing computed-vs-reported indices on the same row reveals when CoStar has reclassified a peer.

When source provides only subject + compset (no indices), the agent computes them and stamps `notes='auto_computed_indices=true'`. Operators can distinguish reported indices from computed ones.

## 4. Ingestion-meta columns (14)

Identical to all other masters. See `docs/intelligence/transaction-schema.md` §2.

## 5. Required-column gate

A row MUST have non-null: `compset_name`, `target_hotel_name`, `compset_size`, `country`, `period_kind`, `period_start`, `period_end`, `currency`. Plus all required ingestion-meta.

KPI columns are NOT required as a class — but rows lacking ALL subject KPIs AND ALL indices are unhelpful; the agent routes those to `staging/review/` with `review_reason='compset_kpis_absent'`.

## 6. Dedup key

```
dedup_key = sha256(
  norm(compset_name) | norm(target_hotel_name) |
  iso_date(period_start) | period_kind
)

norm(s) = lower(strip_diacritics(trim(s)))
```

Same (compset, target hotel, period) tuple = same canonical row. Compset re-composition (CoStar adds/removes a peer) does NOT change the dedup key but typically changes content_hash → routes to review.

## 7. Compset composition changes

CoStar occasionally adjusts peer-set membership (new hotel opens, an existing peer closes, operator reclassification). When this happens:

- The next ingested row has the same dedup_key but a different `compset_hotel_names` + likely shifted indices
- The agent flags `review_reason='compset_composition_change'`
- Operator decides: supersede the prior row (new composition is canonical going forward) OR insert as a parallel row with a modified `compset_name` to preserve historical comparability

This is the most consequential review decision in the workspace — a compset composition change resets the time-series for trend reporting. Don't blanket-supersede.

## 8. Mapping to future `public.compset_periods` (Phase 5)

When the corpus migrates to Postgres:

| MASTER column | `public.compset_periods` |
|---|---|
| `compset_uid` | FK to `public.compsets(id)` (new reference table) |
| `target_hotel_uid` | FK to `public.valuations(id)` (or future hotel master) |
| `compset_name` · `costar_compset_code` · `compset_hotel_names` · `compset_size` | same |
| `country` · `market_name` · `submarket_name` · `chain_scale` | same |
| `period_kind` · `period_start` · `period_end` · `currency` | same |
| (subject + compset KPIs) | same |
| `mpi` · `ari` · `rgi` | same |
| (YoY pp deltas) | computed at read-time from the canonical history |
| `fair_share_pct` · `revpar_premium_eur` | same |
| ingestion-meta block | new columns added |

`public.compset_periods` is a separate table from `public.market_periods` (the compset shape is different — subject + compset + indices vs single-entity aggregate).

## 9. Integration with the report layer

Library `/report/competitive-set` reads from this master (via Phase 5 Postgres mirror) to populate:

- Subject KPI cards
- Compset benchmarking table
- MPI / ARI / RGI trend charts
- Premium-vs-compset visualization

Underwriting Engine reads it during valuation to:

- Establish a baseline RevPAR premium for the asset
- Project forward indices under different operator + brand scenarios
- Flag stretched vs. under-leveraged subjects (rgi >> 110 or rgi << 90)
