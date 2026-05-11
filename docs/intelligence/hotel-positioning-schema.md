# Hotel Positioning Schema

Full column reference for `services/compset/MASTER/HOTEL_POSITIONING_MASTER.xlsx` — per-hotel underwriting positioning snapshots, owned by the **CompSet Underwriting Agent**.

**Last refreshed:** 2026-05-11
**Normalization version:** v1.0 (compset workspace)

The DICTIONARY sheet of the workbook mirrors this document 1:1. When this document changes, regenerate the workbook (`python services/compset/scripts/build_masters.py`) and commit both.

---

## 1. What this dataset is

The CompSet Underwriting Agent reads market context (from `services/costar/`) + compset benchmarks (from `COMPSET_MASTER.xlsx`) and **derives** forward-looking underwriting assumptions for a specific hotel. Each row is one such derivation — a point-in-time snapshot of the agent's reasoning + recommendation.

The HOTEL_POSITIONING_MASTER is therefore **the agent's OUTPUT** (not its input). It is the artefact that flows into the Underwriting Engine + the Library report layer to anchor institutional valuations.

## 2. Domain columns (41)

### 2.1 · Identification + trigger

| Column | Type | Required | Notes |
|---|---|---|---|
| `hotel_uid` | uuid | | FK to `public.valuations` or future hotel master entity. |
| `hotel_name` | text | ✅ | Target hotel display name. |
| `snapshot_kind` | enum | ✅ | `underwriting_baseline` · `quarterly_refresh` · `valuation_update` · `manual` |
| `snapshot_at` | timestamp | ✅ | ISO-8601 UTC. When this positioning was generated. |
| `trigger` | text | | What triggered — `operator_request` / `scheduled_cron` / `deal_pipeline_event`. |

### 2.2 · Geographic + segment context

| Column | Type | Required | Notes |
|---|---|---|---|
| `country` | text | ✅ | ISO-3166-1 alpha-2. |
| `market_name` | text | | Parent market. |
| `submarket_name` | text | | Parent submarket. |
| `chain_scale` | enum | | Subject chain scale at snapshot time. |
| `hotel_segment` | enum | | Operator-tagged segment (luxury / boutique / resort / etc). |

### 2.3 · Source data window

| Column | Type | Required | Notes |
|---|---|---|---|
| `as_of_period_start` | date | ✅ | Start of the source data window — typically the most recent closed period. |
| `as_of_period_end` | date | ✅ | End of the source data window. |
| `as_of_period_kind` | enum | ✅ | `monthly` / `quarterly` / `ytd` / `ltm` / `annual` |

### 2.4 · Compset reference

| Column | Type | Required | Notes |
|---|---|---|---|
| `compset_uid` | uuid | | FK to `COMPSET_MASTER.compset_uid` when wired. |
| `compset_name` | text | | Operator-readable compset label. |
| `compset_size` | int | | Number of hotels in the compset used. |

### 2.5 · Currency

| Column | Type | Required | Notes |
|---|---|---|---|
| `currency` | text | ✅ | ISO-4217 — all monetary values in row are denominated here. |

### 2.6 · Subject vs compset benchmark

| Column | Type | Required | Notes |
|---|---|---|---|
| `subject_revpar` | numeric | | Subject RevPAR over as_of_period. |
| `compset_revpar` | numeric | | Compset RevPAR over as_of_period. |
| `revpar_premium_eur` | numeric | | Subject − compset RevPAR. |
| `subject_adr` | numeric | | Subject ADR over as_of_period. |
| `compset_adr` | numeric | | Compset ADR over as_of_period. |
| `adr_premium_eur` | numeric | | Subject − compset ADR. |
| `subject_occupancy_pct` | numeric | | Subject occupancy. |
| `compset_occupancy_pct` | numeric | | Compset occupancy. |
| `occupancy_premium_pp` | numeric | | Subject − compset occupancy in percentage points. |

### 2.7 · Performance indices

| Column | Type | Required | Notes |
|---|---|---|---|
| `mpi` | numeric | | Market Penetration Index over as_of_period. |
| `ari` | numeric | | Average Rate Index over as_of_period. |
| `rgi` | numeric | | RevPAR Generation Index over as_of_period. |

### 2.8 · Underwriting forward assumptions — the agent's deliverables

| Column | Type | Required | Notes |
|---|---|---|---|
| `adr_assumption_eur` | numeric | | Recommended underwriting ADR going forward. |
| `occupancy_assumption_pct` | numeric | | Recommended underwriting occupancy going forward. |
| `revpar_assumption_eur` | numeric | | Derived RevPAR assumption = adr × occupancy/100. |
| `room_revenue_assumption_eur` | numeric | | Annualised room revenue assumption. |
| `gop_per_key_assumption_eur` | numeric | | GOP-per-key assumption when derivable from operator + brand benchmarks. |

### 2.9 · Valuation anchor

| Column | Type | Required | Notes |
|---|---|---|---|
| `valuation_anchor_eur_per_key` | numeric | | Suggested per-key valuation anchor. |
| `cap_rate_assumption_pct` | numeric | | Cap rate used in valuation derivation. |
| `multiple_of_revenue_assumption` | numeric | | Alternative valuation multiple. |

### 2.10 · Confidence + reasoning

| Column | Type | Required | Notes |
|---|---|---|---|
| `confidence` | enum | | `low` / `medium` / `high` — agent's confidence in its assumptions. |
| `assumptions_basis` | text | | Operator-readable narrative of what data backed the assumption. |
| `risks` | text | | Operator-readable risk flags raised by the agent. |

### 2.11 · Linkage

| Column | Type | Required | Notes |
|---|---|---|---|
| `valuation_outcome_uid` | uuid | | FK to `public.valuations.id` when the snapshot was consumed by a valuation. Backfilled by the Underwriting Engine on consumption. |

## 3. Ingestion-meta columns (14)

Identical to all other masters. See `docs/intelligence/transaction-schema.md` §2 for the full reference.

## 4. Required-column gate

A row MUST have non-null: `hotel_name`, `snapshot_kind`, `snapshot_at`, `country`, `as_of_period_start`, `as_of_period_end`, `as_of_period_kind`, `currency`. Plus all required ingestion-meta.

KPI + assumption columns are intentionally NOT required as a class — a manual snapshot may carry only the assumption block; an `underwriting_baseline` snapshot will carry both. The agent never writes incomplete required-column rows into MASTER.

## 5. Dedup key

```
dedup_key = sha256(
  norm(hotel_name) | snapshot_kind | iso_timestamp(snapshot_at)
)
```

The granularity is **one snapshot per (hotel, kind, timestamp)**. Two `underwriting_baseline` snapshots for the same hotel one second apart are NOT duplicates by this key — they share `hotel_name` + `kind` but `snapshot_at` differs. In practice the agent always uses minute precision; identical-second snapshots are rejected as a defence against accidental re-runs.

When the dedup_key collides exactly (rare), the row goes to `staging/review/` with `review_reason='snapshot_collision'`.

## 6. Append-only + supersedence pattern

Same as all other masters: never overwrite. Corrections insert a new row with `supersedes_id = <old canonical_id>`. The old row flips to `ingestion_status='superseded'`. The full history of an asset's positioning evolution is preserved.

For HOTEL_POSITIONING specifically, this history is highly auditable: a deal team can trace the exact assumption set behind a valuation by following `valuation_outcome_uid` back to the snapshot, then the snapshot's `supersedes_id` chain back through the asset's positioning history.

## 7. Confidence scoring

The `confidence` enum is the agent's self-assessment. The decision rule (v1.0):

| Condition | Confidence |
|---|---|
| Compset has ≥ 4 quarters of stable composition + RGI std dev < 5 + active CoStar data ≤ 30d old | **high** |
| Compset has ≥ 2 quarters of stable composition + RGI std dev < 10 + active CoStar data ≤ 60d old | **medium** |
| Otherwise (recent composition change, limited history, stale data, missing assumptions) | **low** |

A `confidence=low` snapshot consumed by a live valuation triggers a CRITICAL escalation per `docs/agents/compset-underwriting-agent.md` §7. The agent does not block the valuation — but it forces the operator to make an explicit decision.

## 8. Assumptions basis narrative

`assumptions_basis` is operator-readable prose explaining what supported the assumption. Phase 1: templated narrative (e.g. "Subject's 2025 RGI of 120.8 has held above 110 for 8 consecutive quarters; ADR premium of €64 driven by location + Mandarin operator."). Phase 4: LLM-generated narrative grounded in market_news + pipeline context.

The prose is **always derived from structured fields visible in the same row** — no hallucinated context. Operators can verify each clause against the underlying columns + the COMPSET_MASTER row at `(target_hotel, compset, as_of_period_start)`.

## 9. Risks narrative

`risks` is operator-readable prose flagging:
- Pipeline pressure (rooms entering the submarket)
- Compset composition fragility (peer hotels rumoured to close, rebrand, or reposition)
- Operator change risk
- Macro risk (GDP slowdown, regulatory changes)

Like `assumptions_basis`, Phase 1 is templated; Phase 4 is LLM-generated grounded in cross-workspace context (`public.market_news` + `services/transactions/MASTER` pipeline rows).

## 10. Mapping to future `public.hotel_positioning_snapshots` (Phase 5)

When the corpus migrates to Postgres:

| MASTER column | `public.hotel_positioning_snapshots` |
|---|---|
| `hotel_uid` | FK to `public.valuations.id` (or future hotel master entity) |
| `hotel_name` | same (denormalised for stability across renames) |
| `snapshot_kind` · `snapshot_at` · `trigger` | same |
| `country` · `market_name` · `submarket_name` · `chain_scale` · `hotel_segment` | same |
| `as_of_period_start` · `as_of_period_end` · `as_of_period_kind` | same |
| `compset_uid` | FK to `public.compsets.id` (new reference table) |
| (subject + compset KPIs) | same |
| `mpi` · `ari` · `rgi` | same |
| (assumption block) | same |
| `valuation_anchor_eur_per_key` · `cap_rate_assumption_pct` · `multiple_of_revenue_assumption` | same |
| `confidence` · `assumptions_basis` · `risks` | same |
| `valuation_outcome_uid` | FK to `public.valuations.id` (back-reference) |
| ingestion-meta block | new columns added in the Phase 5 migration |

`public.hotel_positioning_snapshots` is a separate table from `public.compset_periods` — they have different shapes (positioning = derived assumptions, compset_periods = observed benchmark KPIs).

## 11. Integration with the report layer

The Library `/report/competitive-set` page reads from this master (via the Phase 5 Postgres mirror) to populate:

- The subject's projected ADR / occupancy / RevPAR (from the assumption block)
- The compset benchmark KPIs (joined from COMPSET_MASTER)
- The valuation anchor (per-key) + the assumptions basis narrative + the risk flags
- A confidence badge on the page header

Underwriting Engine reads it during valuation to:

- Seed the per-key valuation anchor
- Apply the cap rate assumption
- Cross-check against the multiple-of-revenue assumption
- Flag low-confidence inputs to the operator before publishing the valuation
