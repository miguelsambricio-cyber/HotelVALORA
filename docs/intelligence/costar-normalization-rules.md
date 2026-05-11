# CoStar Normalization Rules

The canonicalisation contract every row meets before it lands in a CoStar MASTER workbook.

**Last refreshed:** 2026-05-11
**Applies to:** COSTAR_MASTER_PAIS · COSTAR_MASTER_MERCADOS · COSTAR_MASTER_SUBMERCADOS · COSTAR_MASTER_CLASS
**Normalization version:** v1.1 (bump in `services/costar/scripts/build_masters.py`)

CompSet normalization rules now live in `docs/intelligence/compset-normalization-rules.md` (forthcoming with Phase 2.4) since compset workflows moved to the operational workspace at `services/compset/`. See `docs/architecture/market-vs-underwriting-separation.md`.

---

## 1. The principle

CoStar / STR / Kalibri exports arrive in heterogeneous shapes — different sheet layouts, different column names per period, different currencies, different period notations. The Data Ingestion Agent applies the rules below **in order** to produce a row that is comparable, dedupable, and queryable against every other row in the corpus.

If a rule cannot be applied (ambiguous data, conflicting hints), the row routes to `staging/review/` with the failing rule named in `review_reason`.

## 2. Field-by-field rules

### 2.1 · Geography (`country` · `market_name` · `submarket_name`)

| Rule | Detail |
|---|---|
| `country` | ISO-3166-1 alpha-2 uppercase. `Spain` / `España` → `ES`. CoStar codes (`ESP`) accepted, mapped via lookup. |
| `country_name_display` | Operator-facing form preserved (`España`). |
| `market_name` | Display preserved with diacritics; diacritic-stripped + lowercased version used for dedup. CoStar market codes accepted and stored in `costar_market_code` alongside the canonical name. |
| `submarket_name` | Same posture as `market_name`. Synonyms folded (`Centro Madrid` ↔ `Madrid Centro`) via a curated lookup. Missing lookup → null + `review_required=true / review_reason='submarket_lookup_missing'`. |

### 2.2 · Time periods (`period_start` · `period_end` · `period_kind`)

`period_kind` is the **mandatory** companion to the period range. CoStar exports often use different conventions in different sheets; the agent normalises:

| Input form | Canonical `period_kind` | `period_start` / `period_end` |
|---|---|---|
| `2026-01-15` (single day) | `daily` | both = `2026-01-15` |
| `Week 3 of 2026` / `2026-W03` | `weekly` | start = Monday of W03, end = Sunday of W03 |
| `Jan 2026` / `2026-01` | `monthly` | start = `2026-01-01`, end = `2026-01-31` |
| `Q1 2026` / `2026Q1` | `quarterly` | start = `2026-01-01`, end = `2026-03-31` |
| `YTD as of 2026-03-31` | `ytd` | start = `2026-01-01`, end = `2026-03-31` |
| `LTM ending 2026-03-31` | `ltm` | start = `2025-04-01`, end = `2026-03-31` |
| `Year 2026` / `Annual 2026` | `annual` | start = `2026-01-01`, end = `2026-12-31` |

Mixed period kinds within a single import file is allowed (CoStar often delivers monthly + YTD in adjacent sheets). Each row carries its own `period_kind`.

Sanity bounds: `period_start ≥ 2000-01-01`, `period_end ≤ today + 1 year` (some reports project 12 months ahead). Outside → review.

### 2.3 · Currency + monetary KPIs (`currency` · `adr` · `revpar` · `revenue`)

| Rule | Detail |
|---|---|
| `currency` | ISO-4217 — `EUR` is canonical for Spain/EU rows. CoStar sometimes ships USD even for EU markets. |
| Non-EUR rows | Phase 1: refuse silent conversion. Route to `staging/review/` with `review_reason='non_eur_currency:<ccy>'`. Phase 4: agent applies ECB rate at period midpoint. |
| Format | Numeric without thousand separators. `"€128.50"` → `128.50`. Symbols stripped: `€`, `$`, `£`, `¥`. |
| Magnitude check | `adr` ∈ [10, 5000] per night. `revpar` ∈ [5, 5000]. `revenue` no upper bound (large markets can clear billions). Outside → review. |
| Implicit unit | All monetary columns within a row are in the row's `currency`. The agent does NOT convert silently — preserves provenance. |

### 2.4 · Occupancy + indices (`occupancy_pct` · `mpi` · `ari` · `rgi`)

| Field | Rule |
|---|---|
| `occupancy_pct` | Percentage 0..100. `0.71` → `71.0` (defensive — some CoStar exports decimal-encode). Out of [0, 100] → review. |
| `mpi`, `ari`, `rgi` | Index where 100 = on par with compset. Range [10, 500]. Outside → review. The agent does NOT recompute these from subject_* and compset_* fields when both are present — CoStar's reported value wins (sometimes incorporates corrections we can't replicate). |
| YoY deltas in pp | `occupancy_yoy_pp` is in percentage points (`+2.3` = up 2.3 pp), NOT percent. Same for `mpi_yoy_pp` / `ari_yoy_pp` / `rgi_yoy_pp`. |
| YoY deltas in % | `adr_yoy_pct`, `revpar_yoy_pct`, etc. are percentage changes (`+5.0` = up 5%). Range [-100, 500]. Outside → review. |

### 2.5 · Counts + supply (`hotel_count` · `room_count_total` · `supply_rooms` · `demand_rooms`)

| Field | Rule |
|---|---|
| `hotel_count` | Positive integer. Range [1, 100_000]. |
| `room_count_total` | Snapshot count at period start. Range [1, 10_000_000]. |
| `supply_rooms` | Room-nights available in the period. ≥ `room_count_total × period_days × 0.95` (allows some downtime). |
| `demand_rooms` | Room-nights sold ≤ `supply_rooms`. |
| Implicit check | If `occupancy_pct` provided and `supply_rooms` + `demand_rooms` provided: `|occupancy_pct − (demand/supply × 100)| ≤ 1.0`. Failure → review (likely period-mismatch). |

### 2.6 · Categorical fields (`chain_scale` · `segment_type` · `period_kind`)

Case-insensitive match against the controlled vocabulary in DICTIONARY:

```
chain_scale  ∈  luxury | upper_upscale | upscale | upper_midscale | midscale | economy | independent | all
segment_type ∈  transient | group | contract | combined
period_kind  ∈  daily | weekly | monthly | quarterly | ytd | ltm | annual
```

Spanish synonyms folded:

| Spanish input | Canonical |
|---|---|
| `lujo` / `cinco estrellas` | `luxury` |
| `mensual` | `monthly` |
| `trimestral` | `quarterly` |
| `anual` | `annual` |
| `transitorio` | `transient` |
| `grupo` / `grupos` | `group` |

Unknown values → null + `review_required=true / review_reason='enum_unknown:<col>'`. Phase 4 LLM-categoriser resolves ambiguous cases.

### 2.7 · Class-specific (`chain_scale` · `class_label_display` · `market_name` optional)

| Field | Rule |
|---|---|
| `chain_scale` | Required. Folded against `{luxury, upper_upscale, upscale, upper_midscale, midscale, economy, independent, all_classes}`. Spanish synonyms (`lujo` → `luxury`, etc.) accepted. |
| `class_label_display` | Optional. Operator-facing label preserved verbatim. |
| `market_name` | Optional. `null` → country-level class aggregate; non-null → market-level. Both legitimate; dedup_key distinguishes via `market_name || ''`. |
| `revpar_index_vs_country` | Numeric. Ignored when `market_name=null` (country-level row IS the national class average). Validated [10, 500] otherwise. |
| `revpar_index_vs_market` | Numeric. Range [10, 500]. The market-overall RevPAR baseline lives on the parent MERCADOS row at the same `(country, market_name, period_start)`. |

## 3. Required-column gates

A row landing in MASTER MUST have non-null values for:

### Country (PAIS)
- `country`, `period_kind`, `period_start`, `period_end`, `currency`

### Market (MERCADOS)
- `country`, `market_name`, `period_kind`, `period_start`, `period_end`, `currency`

### Submarket (SUBMERCADOS)
- `country`, `market_name`, `submarket_name`, `period_kind`, `period_start`, `period_end`, `currency`

### Class (CLASS)
- `country`, `chain_scale`, `period_kind`, `period_start`, `period_end`, `currency` (note: `market_name` optional)

KPI columns (occupancy / adr / revpar) are intentionally NOT required — a CoStar export may legitimately ship a row with only supply + demand + revenue, expecting the consumer to derive the rest.

Any required column null → row routes to `staging/failed/<ingestion_id>/`. The agent never writes incomplete required-column rows into MASTER.

## 4. Dedup keys

Per `costar-master-dataset-architecture.md` §7:

```
country:    sha256( country | iso_date(period_start) | period_kind )
market:     sha256( country | norm(market_name) | iso_date(period_start) | period_kind )
submarket:  sha256( country | norm(market_name) | norm(submarket_name) | iso_date(period_start) | period_kind )
class:      sha256( country | norm(market_name || '') | norm(chain_scale) | iso_date(period_start) | period_kind )

norm(s) = lower(strip_diacritics(trim(s)))
```

### Resolution rules

| Match against MASTER | Behaviour |
|---|---|
| No match | Insert as new canonical row |
| Match + same `content_hash` | Silent skip — count in `rows_skipped` |
| Match + different `content_hash` | Route to `staging/review/` with both rows side-by-side |

`content_hash` is sha256 of the concatenated domain columns (skipping nulls). For CoStar, the most common cause of different content_hash on a matched dedup_key is a **STR / CoStar monthly restatement** — operators expect this and the review workflow surfaces it explicitly with `review_reason='restatement_candidate'`.

## 5b · Compset normalization rules

Now live in the compset workspace. See `services/compset/MASTER/COMPSET_MASTER.xlsx` and the forthcoming `docs/intelligence/compset-normalization-rules.md` (Phase 2.4). The compset dedup key and field rules are unchanged from this document's previous v1.0 — only the home has moved.

## 5. Source-tier precedence

Same as `data-normalization-rules.md` §5 — but the costar vocab differs:

1. **Tier A** (`costar`, `str`, `curated`) wins over Tier B (`kalibri`) wins over Tier C (`manual`)
2. Within the same tier, the more recent `ingested_at` wins
3. Tie-break: the row with fewer null domain columns wins

## 6. Sanity ranges

| Field | Range | Outside → |
|---|---|---|
| `occupancy_pct` | [0, 100] | review |
| `adr` | [10, 5000] | review |
| `revpar` | [5, 5000] | review |
| `hotel_count` | [1, 100_000] | review |
| `room_count_total` | [1, 10_000_000] | review |
| `cap_rate`-style indices (`mpi`, `ari`, `rgi`) | [10, 500] | review |
| `compset_size` | [3, 20] | review |
| YoY pp deltas | [-50, 50] | review |
| YoY % deltas | [-100, 500] | review |

## 7. Versioning

This contract is `v1.0`. Every rule lives in `services/costar/scripts/build_masters.py` constants + this document. Bump both when:

- **Minor (`v1.0 → v1.1`)**: rule clarification, new optional rule, new accepted variant
- **Major (`v1.0 → v2.0`)**: required column added, range tightened, dedup-key changes, unit changes

Operators are notified of major bumps via a `system_alert` Resend escalation from QA / Monitoring.

## 8. What this is NOT

- ❌ NOT a data cleaning crew — operators are responsible for the *substance* of what they drop.
- ❌ NOT a fuzzy-match heuristic — v1.0 uses literal string matches + a controlled vocabulary; ML-assisted entity resolution lands in Phase 4.
- ❌ NOT an alternative to the operator's CoStar/STR subscription — the corpus AUGMENTS those products with cross-source consistency and HOTELVALORA-specific enrichment.

The rules are the contract between the operator and the dataset. Small, explicit, bumped only when the corpus has earned the change.
