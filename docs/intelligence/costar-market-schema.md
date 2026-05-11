# CoStar Market Schema

Full column reference for `services/costar/MASTER/COSTAR_MASTER_MERCADOS.xlsx`.

**Last refreshed:** 2026-05-11
**Normalization version:** v1.0

The DICTIONARY sheet of the workbook mirrors this document 1:1. When this document changes, regenerate the workbook (`python services/costar/scripts/build_masters.py`) and commit both.

---

## 1. Domain columns (26)

### 1.1 · Identification + time

| Column | Type | Required | Notes |
|---|---|---|---|
| `country` | text | ✅ | ISO-3166-1 alpha-2 uppercase. |
| `market_name` | text | ✅ | Canonical market name — `Madrid`, `Costa del Sol`, `Baleares`. Display preserves diacritics; diacritic-stripped for dedup. |
| `costar_market_code` | text | | CoStar / STR market code when available — preserves cross-product joinability (`ES_MAD`, `ES_CDS`). |
| `market_uid` | uuid | | Resolved canonical market id — populated by future entity resolver (Phase 4). |
| `region` | text | | Region or autonomous community — `Comunidad de Madrid`, `Andalucía`. |
| `period_kind` | enum | ✅ | `daily` · `weekly` · `monthly` · `quarterly` · `ytd` · `ltm` · `annual` |
| `period_start` | date | ✅ | ISO-8601 start. |
| `period_end` | date | ✅ | ISO-8601 end (inclusive). |
| `currency` | text | ✅ | ISO-4217. |

### 1.2 · Core KPIs

| Column | Type | Required | Notes |
|---|---|---|---|
| `occupancy_pct` | numeric | | Market occupancy. Range [0, 100]. |
| `adr` | numeric | | ADR in row's currency. Range [10, 5000]. |
| `revpar` | numeric | | RevPAR in row's currency. Range [5, 5000]. |
| `supply_rooms` | numeric | | Total room-nights available in the period. |
| `demand_rooms` | numeric | | Total room-nights sold. |
| `revenue` | numeric | | Total accommodation revenue. |

### 1.3 · YoY deltas

| Column | Type | Required | Notes |
|---|---|---|---|
| `supply_yoy_pct` | numeric | | YoY % change in supply. |
| `demand_yoy_pct` | numeric | | YoY % change in demand. |
| `occupancy_yoy_pp` | numeric | | YoY change in occupancy in percentage points. |
| `adr_yoy_pct` | numeric | | YoY % change in ADR. |
| `revpar_yoy_pct` | numeric | | YoY % change in RevPAR. |

### 1.4 · Positioning + context

| Column | Type | Required | Notes |
|---|---|---|---|
| `revpar_index_vs_country` | numeric | | Market RevPAR as % of national RevPAR. 100 = on par with country average. The market-vs-country positioning indicator. |
| `hotel_count` | int | | Hotels in market in scope. |
| `room_count_total` | int | | Snapshot at period start. |
| `pipeline_rooms` | int | | Pipeline rooms in this market. |
| `pipeline_hotels` | int | | Pipeline hotels in this market. |
| `seasonality_index` | numeric | | Period RevPAR ÷ annual average RevPAR. Helps interpret sub-annual rows — values > 1 = high season, < 1 = low season. |

## 2. Ingestion-meta columns (14)

Identical to all other masters. See `docs/intelligence/transaction-schema.md` §2.

## 3. Required-column gate

A row MUST have non-null: `country`, `market_name`, `period_kind`, `period_start`, `period_end`, `currency`. Plus all required ingestion-meta.

## 4. Dedup key

```
dedup_key = sha256( country | norm(market_name) | iso_date(period_start) | period_kind )

norm(s) = lower(strip_diacritics(trim(s)))
```

Same (country, market_name, period_start, period_kind) tuple = same canonical row.

## 5. Cross-market hierarchy

Market rows aggregate from the submarkets in the same `(country, market_name)`. The agent does NOT enforce this aggregation arithmetically (CoStar's market-level numbers sometimes differ from sum-of-submarkets due to non-disclosed coverage gaps). If you want a verifiable aggregate, query the submarket master and sum yourself; for headline reporting use the market master.

## 6. Mapping to future `public.market_periods` (Phase 5)

| MASTER column | `public.market_periods` |
|---|---|
| `market_uid` | FK to `public.markets(id)` (new reference table) |
| `country` · `market_name` · `costar_market_code` · `region` | same |
| `period_kind` · `period_start` · `period_end` | same |
| `currency` | same |
| `occupancy_pct` · `adr` · `revpar` · `supply_rooms` · `demand_rooms` · `revenue` | same |
| (YoY deltas) | computed at read-time from the canonical history |
| `revpar_index_vs_country` · `seasonality_index` | same (derived) |
| `hotel_count` · `room_count_total` · `pipeline_*` | same |
| ingestion-meta block | new columns added in the Phase 5 migration |
| `granularity` | `'market'` |
