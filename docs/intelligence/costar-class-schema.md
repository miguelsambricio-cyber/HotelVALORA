# CoStar Class Schema

Full column reference for `services/costar/MASTER/COSTAR_MASTER_CLASS.xlsx`.

**Last refreshed:** 2026-05-11
**Normalization version:** v1.1 (costar workspace — class added, compset moved to compset workspace)

The DICTIONARY sheet of the workbook mirrors this document 1:1. When this document changes, regenerate the workbook (`python services/costar/scripts/build_masters.py`) and commit both.

---

## 1. Why class is its own granularity

In v1.0 of the costar workspace, chain_scale was a column on the submarket master. That worked for fine-grained submarket-level breakdowns but didn't support the common operator question "How does the Spanish luxury segment as a whole compare to the Spanish midscale segment this quarter?"

In v1.1, class is its own master with TWO row variants:

1. **Country-level chain-scale aggregate** — `market_name=null`. One row per `(country, chain_scale, period)`. Example: (ES, luxury, 2026Q1).
2. **Market-level chain-scale aggregate** — `market_name` set. One row per `(country, market_name, chain_scale, period)`. Example: (ES, Madrid, luxury, 2026Q1).

Both variants are legitimate. The dedup key distinguishes them.

## 2. Domain columns (27)

### 2.1 · Identification

| Column | Type | Required | Notes |
|---|---|---|---|
| `country` | text | ✅ | ISO-3166-1 alpha-2 uppercase. |
| `market_name` | text | | Parent market — `null` = country-level class aggregate, `'Madrid'` = market-level. |
| `submarket_name` | text | | Parent submarket — typically `null` at this granularity. |
| `chain_scale` | enum | ✅ | `luxury` · `upper_upscale` · `upscale` · `upper_midscale` · `midscale` · `economy` · `independent` · `all_classes` (overall aggregate) |
| `class_label_display` | text | | Operator-facing label — `Luxury`, `Upper Upscale`, `Independent`. Preserves case + diacritics. |
| `segment_type` | enum | | `transient` · `group` · `contract` · `combined` — KPI breakdown by guest segment when reported. |

### 2.2 · Time

| Column | Type | Required | Notes |
|---|---|---|---|
| `period_kind` | enum | ✅ | `daily` · `weekly` · `monthly` · `quarterly` · `ytd` · `ltm` · `annual` |
| `period_start` | date | ✅ | ISO-8601 start. |
| `period_end` | date | ✅ | ISO-8601 end (inclusive). |
| `currency` | text | ✅ | ISO-4217. |

### 2.3 · Core KPIs

| Column | Type | Required | Notes |
|---|---|---|---|
| `occupancy_pct` | numeric | | Class occupancy %. Range [0, 100]. |
| `adr` | numeric | | ADR in row's currency. Range [10, 5000]. |
| `revpar` | numeric | | RevPAR in row's currency. Range [5, 5000]. |
| `supply_rooms` | numeric | | Room-nights available for this class within scope. |
| `demand_rooms` | numeric | | Room-nights sold. |
| `revenue` | numeric | | Period accommodation revenue. |

### 2.4 · YoY deltas

| Column | Type | Required | Notes |
|---|---|---|---|
| `supply_yoy_pct` | numeric | | YoY % change in supply. |
| `demand_yoy_pct` | numeric | | YoY % change in demand. |
| `occupancy_yoy_pp` | numeric | | YoY change in occupancy (pp). |
| `adr_yoy_pct` | numeric | | YoY % change in ADR. |
| `revpar_yoy_pct` | numeric | | YoY % change in RevPAR. |

### 2.5 · Positioning indicators

| Column | Type | Required | Notes |
|---|---|---|---|
| `revpar_index_vs_country` | numeric | | When `market_name=null`: ignored. When `market_name` set: this class's RevPAR vs national class RevPAR. |
| `revpar_index_vs_market` | numeric | | Class RevPAR as % of parent market overall RevPAR (the `market_name` row in COSTAR_MASTER_MERCADOS). Identifies which classes are punching above/below the market average. |

### 2.6 · Supply context

| Column | Type | Required | Notes |
|---|---|---|---|
| `hotel_count` | int | | Hotels in this class within scope. |
| `room_count_total` | int | | Snapshot room count at period start. |
| `pipeline_rooms` | int | | Pipeline rooms for this class. |
| `pipeline_hotels` | int | | Pipeline hotels for this class. |

## 3. Ingestion-meta columns (14)

Identical to all other masters. See `docs/intelligence/transaction-schema.md` §2.

## 4. Required-column gate

A row MUST have non-null: `country`, `chain_scale`, `period_kind`, `period_start`, `period_end`, `currency`. Plus all required ingestion-meta.

`market_name` is **optional** — its presence selects between country-level and market-level row variants. Both are valid.

## 5. Dedup key

```
dedup_key = sha256(
  country | norm(market_name || '') | norm(chain_scale) |
  iso_date(period_start) | period_kind
)

norm(s) = lower(strip_diacritics(trim(s)))
```

`market_name` is concatenated with empty string so that `null` and `''` collapse to the same dedup_key (country-level variant).

## 6. Hierarchy with the other costar masters

| Master | Anchors at | Class-level aggregation |
|---|---|---|
| `COSTAR_MASTER_PAIS` | country | Implicit — country aggregates all classes |
| `COSTAR_MASTER_MERCADOS` | market | Implicit — market aggregates all classes |
| `COSTAR_MASTER_SUBMERCADOS` | submarket | Implicit — submarket aggregates all classes within |
| `COSTAR_MASTER_CLASS` | (country [+market], chain_scale) | **Explicit** — one row per class |

Class rows do NOT aggregate up to country / market rows arithmetically — CoStar's reporting often has coverage gaps that make the sum of classes differ from the all-class total. Use the class master for class-level analysis, the country/market masters for headline numbers.

## 7. Use in underwriting

The CompSet Underwriting Agent reads CLASS rows to:

- Anchor the chain-scale context for a target hotel (e.g. "luxury Madrid is running 12% above national luxury this year")
- Detect class-level supply pressure (e.g. "luxury Madrid pipeline rooms up 14% — competitive intensity rising")
- Triangulate compset KPIs (a hotel's compset RevPAR should be coherent with its class's submarket RevPAR within ~10%)

## 8. Mapping to future `public.market_periods` (Phase 5)

| MASTER column | `public.market_periods` |
|---|---|
| `country` · `market_name` · `submarket_name` · `chain_scale` | same |
| `class_label_display` | same |
| `period_kind` · `period_start` · `period_end` · `currency` | same |
| (KPIs + YoY deltas + indices) | same |
| `hotel_count` · `room_count_total` · `pipeline_*` | same |
| ingestion-meta block | new columns added |
| `granularity` | `'class'` |

`public.market_periods` carries country / market / submarket / class rows via the `granularity` discriminator. Filtering by `granularity='class'` returns this dataset's contents post-migration.
