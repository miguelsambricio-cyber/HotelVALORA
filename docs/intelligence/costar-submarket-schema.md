# CoStar Submarket Schema

Full column reference for `services/costar/MASTER/COSTAR_MASTER_SUBMERCADOS.xlsx`.

**Last refreshed:** 2026-05-11
**Normalization version:** v1.0

The DICTIONARY sheet of the workbook mirrors this document 1:1. When this document changes, regenerate the workbook (`python services/costar/scripts/build_masters.py`) and commit both.

---

## 1. Domain columns (27)

### 1.1 · Identification + time

| Column | Type | Required | Notes |
|---|---|---|---|
| `country` | text | ✅ | ISO-3166-1 alpha-2. |
| `market_name` | text | ✅ | Parent market — `Madrid`. |
| `submarket_name` | text | ✅ | Submarket — `Salamanca`, `Madrid Centro`, `Aeropuerto`. |
| `costar_submarket_code` | text | | CoStar / STR submarket code when available — `ES_MAD_SAL`. |
| `submarket_uid` | uuid | | Resolved canonical submarket id (Phase 4 entity resolver). |
| `chain_scale` | enum | | `luxury` · `upper_upscale` · `upscale` · `upper_midscale` · `midscale` · `economy` · `independent` · `all` (when the row aggregates the submarket overall) |
| `segment_type` | enum | | `transient` · `group` · `contract` · `combined` — KPI breakdown by guest segment when CoStar provides it. |
| `period_kind` | enum | ✅ | `daily` · `weekly` · `monthly` · `quarterly` · `ytd` · `ltm` · `annual` |
| `period_start` | date | ✅ | ISO-8601 start. |
| `period_end` | date | ✅ | ISO-8601 end (inclusive). |
| `currency` | text | ✅ | ISO-4217. |

### 1.2 · Core KPIs

| Column | Type | Required | Notes |
|---|---|---|---|
| `occupancy_pct` | numeric | | Submarket occupancy. Range [0, 100]. |
| `adr` | numeric | | ADR in row's currency. Range [10, 5000]. |
| `revpar` | numeric | | RevPAR in row's currency. Range [5, 5000]. |
| `supply_rooms` | numeric | | Room-nights available. |
| `demand_rooms` | numeric | | Room-nights sold. |
| `revenue` | numeric | | Period accommodation revenue. |

### 1.3 · YoY deltas

| Column | Type | Required | Notes |
|---|---|---|---|
| `supply_yoy_pct` | numeric | | YoY % change in supply. |
| `demand_yoy_pct` | numeric | | YoY % change in demand. |
| `occupancy_yoy_pp` | numeric | | YoY change in occupancy (pp). |
| `adr_yoy_pct` | numeric | | YoY % change in ADR. |
| `revpar_yoy_pct` | numeric | | YoY % change in RevPAR. |

### 1.4 · Positioning + supply

| Column | Type | Required | Notes |
|---|---|---|---|
| `revpar_index_vs_market` | numeric | | Submarket RevPAR as % of parent market RevPAR. 100 = on par with market. Top-end neighborhoods often run 150+. |
| `hotel_count` | int | | Hotels in submarket in scope. |
| `room_count_total` | int | | Snapshot at period start. |
| `pipeline_rooms` | int | | Submarket pipeline rooms. |
| `pipeline_hotels` | int | | Submarket pipeline hotels. |

## 2. Why `chain_scale` is on the submarket master

CoStar typically reports submarket KPIs broken down by chain scale (luxury submarkets behave very differently from midscale submarkets even in the same geography). The `chain_scale` column lets the corpus carry both the aggregate (`chain_scale='all'`) and the segmented versions for the same (country, market, submarket, period).

Per the dedup key, two rows differ on `chain_scale` are NOT duplicates. A submarket can therefore appear up to 8× per period — once for each chain_scale value plus the overall aggregate.

## 3. Why `segment_type` is here too

When CoStar provides transient-vs-group breakdowns at the submarket level, those rows arrive with `segment_type` set. The agent does NOT enforce that subsets sum to the `combined` row — operators may receive partial segmentation when CoStar's coverage is incomplete.

## 4. Ingestion-meta columns (14)

Identical to all other masters. See `docs/intelligence/transaction-schema.md` §2.

## 5. Required-column gate

A row MUST have non-null: `country`, `market_name`, `submarket_name`, `period_kind`, `period_start`, `period_end`, `currency`. Plus all required ingestion-meta.

`chain_scale` is **optional** — when omitted, the row represents the overall submarket aggregate and is dedup-equivalent to a row with `chain_scale='all'` (the agent canonicalises null → `'all'` for the dedup_key only; the stored value remains null).

## 6. Dedup key

```
dedup_key = sha256(
  country | norm(market_name) | norm(submarket_name) |
  norm(chain_scale || 'all') | iso_date(period_start) | period_kind
)
```

## 7. Mapping to future `public.market_periods` (Phase 5)

| MASTER column | `public.market_periods` |
|---|---|
| `submarket_uid` | FK to `public.submarkets(id)` (new reference table) |
| `country` · `market_name` · `submarket_name` · `costar_submarket_code` | same |
| `chain_scale` · `segment_type` | same |
| `period_kind` · `period_start` · `period_end` | same |
| `currency` | same |
| (KPIs) | same |
| (YoY deltas) | computed at read-time |
| `revpar_index_vs_market` | same |
| ingestion-meta block | new columns added |
| `granularity` | `'submarket'` |
