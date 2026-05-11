# CoStar Country Schema

Full column reference for `services/costar/MASTER/COSTAR_MASTER_PAIS.xlsx`.

**Last refreshed:** 2026-05-11
**Normalization version:** v1.0

The DICTIONARY sheet of the workbook mirrors this document 1:1. When this document changes, regenerate the workbook (`python services/costar/scripts/build_masters.py`) and commit both.

---

## 1. Domain columns (25)

### 1.1 · Identification + time

| Column | Type | Required | Notes |
|---|---|---|---|
| `country` | text | ✅ | ISO-3166-1 alpha-2 uppercase — `ES`, `PT`, `GB`, `FR`. Anchors the row to a nation. |
| `country_name_display` | text | | Display form preserved with diacritics — `España`, `Spain`. |
| `period_kind` | enum | ✅ | `daily` · `weekly` · `monthly` · `quarterly` · `ytd` · `ltm` · `annual` |
| `period_start` | date | ✅ | ISO-8601 `YYYY-MM-DD`. Start of the reporting window. |
| `period_end` | date | ✅ | ISO-8601 `YYYY-MM-DD`. End of the reporting window (inclusive). |
| `currency` | text | ✅ | ISO-4217 — `EUR` canonical. All monetary KPIs in this row are denominated here. |

### 1.2 · Core KPIs

| Column | Type | Required | Notes |
|---|---|---|---|
| `occupancy_pct` | numeric | | Country-level occupancy. Range [0, 100]. |
| `adr` | numeric | | Average Daily Rate in row's currency. Range [10, 5000]. |
| `revpar` | numeric | | Revenue Per Available Room in row's currency. Range [5, 5000]. |
| `supply_rooms` | numeric | | Total room-nights available in the period. |
| `demand_rooms` | numeric | | Total room-nights sold. ≤ supply_rooms. |
| `revenue` | numeric | | Total accommodation revenue. |

### 1.3 · YoY deltas

| Column | Type | Required | Notes |
|---|---|---|---|
| `supply_yoy_pct` | numeric | | YoY % change in supply. |
| `demand_yoy_pct` | numeric | | YoY % change in demand. |
| `occupancy_yoy_pp` | numeric | | YoY change in occupancy in percentage points. |
| `adr_yoy_pct` | numeric | | YoY % change in ADR. |
| `revpar_yoy_pct` | numeric | | YoY % change in RevPAR. |

### 1.4 · Supply context

| Column | Type | Required | Notes |
|---|---|---|---|
| `hotel_count` | int | | Hotels in scope for the period. |
| `room_count_total` | int | | Snapshot room count at period start. |
| `pipeline_rooms` | int | | Rooms in pipeline (planned + under construction + pre-opening). |
| `pipeline_hotels` | int | | Hotels in pipeline. |

### 1.5 · Macro context (optional but valued)

| Column | Type | Required | Notes |
|---|---|---|---|
| `tourism_arrivals` | numeric | | Inbound international tourist arrivals — when reported by the source. |
| `tourism_arrivals_yoy_pct` | numeric | | YoY % change in international tourist arrivals. |
| `gdp_growth_pct` | numeric | | GDP growth for the period. |
| `inflation_rate_pct` | numeric | | CPI inflation rate. |

These macro columns enable the Underwriting Engine to defend valuations against bigger-picture moves without requiring a separate Eurostat / WTO integration.

## 2. Ingestion-meta columns (14)

Identical to all other masters. See `docs/intelligence/transaction-schema.md` §2 for the full reference. Same names, types, semantics.

## 3. Required-column gate

A row MUST have non-null values for: `country`, `period_kind`, `period_start`, `period_end`, `currency`. Plus all required ingestion-meta columns.

KPI columns are NOT required — a CoStar export may legitimately ship a country row with only macro context columns.

Any required column null → row routes to `staging/failed/`.

## 4. Dedup key

```
dedup_key = sha256( country | iso_date(period_start) | period_kind )
```

Same (country, period_start, period_kind) tuple = same canonical row. Restatements supersede via `supersedes_id`.

## 5. Mapping to future `public.market_periods` (Phase 5)

When the corpus migrates to Postgres:

| MASTER column | `public.market_periods` |
|---|---|
| `country` | `country` |
| `period_kind` | `period_kind` (new enum) |
| `period_start` / `period_end` | same |
| `currency` | `currency` |
| `occupancy_pct` · `adr` · `revpar` · `supply_rooms` · `demand_rooms` · `revenue` | same |
| (YoY deltas) | computed at read-time from the canonical history |
| `hotel_count` · `room_count_total` · `pipeline_*` | same |
| (macro context) | `meta` jsonb |
| ingestion-meta block | new columns added in the Phase 5 migration |
| `granularity` | `'country'` (discriminator across country/market/submarket) |

`public.market_periods` is read-only until that migration ships. Until then, the XLSX is the canonical.
