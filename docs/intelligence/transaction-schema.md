# Transaction Schema

Full column reference for `services/transactions/MASTER/HOTEL_TRANSACCIONES_MASTER.xlsx`.

**Last refreshed:** 2026-05-11
**Normalization version:** v1.0

The DICTIONARY sheet of the workbook mirrors this document 1:1. When this document changes, regenerate the workbook (`python services/transactions/scripts/build_masters.py`) and commit both.

---

## 1. Domain columns (45)

### 1.1 · Identification

| Column | Type | Required | Notes |
|---|---|---|---|
| `transaction_uid` | uuid | ✅ | Stable identifier of the deal. One per real-world transaction. Different from `canonical_id` — `transaction_uid` can recur across superseded rows. |
| `category` | enum | ✅ | `acquisition` · `sale` · `joint_venture` · `refinancing` · `distress` |
| `asset_type` | enum | ✅ | `single_property` · `portfolio` · `mixed_use` |
| `asset_name` | text | ✅ | Property name — e.g. `The Ritz-Carlton Madrid`. Display value preserved with diacritics. |
| `portfolio_name` | text | | Set when `asset_type='portfolio'`. |
| `portfolio_size_assets` | int | | Number of properties in the portfolio. |

### 1.2 · Geography

| Column | Type | Required | Notes |
|---|---|---|---|
| `city` | text | ✅ | City of the asset (portfolio HQ for portfolio deals). Title-cased display; diacritic-stripped for dedup. |
| `country` | text | ✅ | ISO-3166-1 alpha-2 uppercase. |
| `market` | text | | Coarse market label (`Costa del Sol`, `Baleares`). From lookup; null + review when missing. |
| `submarket` | text | | Finer label (`Marbella Golden Mile`). |
| `address` | text | | Street address when known. |
| `latitude` | numeric | | Decimal degrees, WGS84. Range [-90, 90]. |
| `longitude` | numeric | | Decimal degrees, WGS84. Range [-180, 180]. |

### 1.3 · Asset details

| Column | Type | Required | Notes |
|---|---|---|---|
| `rooms` | int | | Total rooms. Portfolio totals are summed. Range [1, 5000]. |
| `hotel_segment` | enum | | `luxury` · `upper_upscale` · `upscale` · `upper_midscale` · `midscale` · `economy` · `lifestyle` · `resort` · `boutique` · `mixed_use` · `serviced_apartments` · `unknown` |
| `star_rating` | int | | 1..5. |
| `year_built` | int | | Original construction year. Range [1700, current_year+5]. |
| `year_renovated` | int | | Most recent full refurb. Must be ≥ `year_built`. |
| `gross_area_sqm` | numeric | | Built area in m². Range [100, 500_000]. |

### 1.4 · Pricing

| Column | Type | Required | Notes |
|---|---|---|---|
| `price_eur` | numeric | ✅ | Total deal value in EUR. Non-EUR sources converted at announce-date ECB rate. Range [100_000, 5_000_000_000]. |
| `price_currency_original` | text | | ISO-4217 — `EUR` · `USD` · `GBP` · `CHF` — preserved when conversion happened. |
| `price_per_key_eur` | numeric | | Derived: `price_eur / rooms` when both known. Range [10_000, 5_000_000]. |
| `cap_rate` | numeric | | Percentage points (5.4 means 5.4 %). Range [0.5, 25.0]. |
| `gop_per_key_eur` | numeric | | Disclosed annual GOP per key. |
| `revpar_at_closing_eur` | numeric | | Trailing-12-month RevPAR at closing. |

### 1.5 · Timing

| Column | Type | Required | Notes |
|---|---|---|---|
| `closed_at` | date | | Closing date when public. ISO-8601 `YYYY-MM-DD`. |
| `announced_at` | date | | Announcement date. Fallback when `closed_at` unknown. |

**Required**: at least one of `closed_at` OR `announced_at` MUST be present.

### 1.6 · Parties

| Column | Type | Required | Notes |
|---|---|---|---|
| `buyer_name` | text | ✅ | Buyer entity. Legal-suffix normalised for dedup; display preserved. |
| `buyer_uid` | uuid | | Resolved canonical investor id from `public.investors`. Populated in Phase 2 by entity resolver. |
| `buyer_country` | text | | HQ country ISO-3166-1 alpha-2. |
| `buyer_kind` | enum | | `pe` · `reit` · `sovereign` · `family_office` · `private_owner` · `bank` · `operator_owned` · `hospitality_fund` · `asset_manager` · `developer` · `unknown` |
| `seller_name` | text | | Seller entity. Optional in some markets. |
| `seller_uid` | uuid | | Resolved canonical investor id. |
| `seller_country` | text | | HQ country. |
| `seller_kind` | enum | | Same vocabulary as `buyer_kind`. |
| `broker` | text | | Lead broker / advisor. |

### 1.7 · Operator + brand

| Column | Type | Required | Notes |
|---|---|---|---|
| `operator_at_closing` | text | | Operator running the hotel at closing. |
| `operator_post_closing` | text | | Operator post-closing if known. |
| `brand_at_closing` | text | | Brand pre-closing. |
| `brand_post_closing` | text | | Brand post-closing — set when reflagged. |

### 1.8 · Deal structure

| Column | Type | Required | Notes |
|---|---|---|---|
| `financing_type` | enum | | `equity` · `senior_loan` · `mezzanine` · `cmbs` · `mixed` · `unknown` |
| `disclosed_terms` | enum | | `full` · `partial` · `nondisclosed` |

### 1.9 · Provenance

| Column | Type | Required | Notes |
|---|---|---|---|
| `press_release_url` | url | | Buyer or seller official release. https only. |
| `news_url` | url | | Primary news article. https only. |
| `linked_news_id` | uuid | | FK to `public.market_news` once the Intelligence Engine matches it (Phase 3+). |

## 2. Ingestion-meta columns (14) — shared across MASTERs

| Column | Type | Required | Notes |
|---|---|---|---|
| `canonical_id` | uuid | ✅ | Primary key in the MASTER. Generated on first insertion. Stable across edits. |
| `ingestion_id` | text | ✅ | FK to `INGESTION_LOG` sheet — the ingestion run that landed this row. |
| `source_file` | text | ✅ | Original filename verbatim. |
| `source_kind` | enum | ✅ | `costar` · `brokerage` · `curated` · `news_extract` · `manual` · `press_release` |
| `source_url` | url | | Public URL when applicable. |
| `ingested_at` | timestamp | ✅ | ISO-8601 UTC. Auto-stamped. |
| `ingested_by` | email | ✅ | Operator email. |
| `normalization_version` | text | ✅ | Schema/rules version applied — today `v1.0`. |
| `dedup_key` | text | ✅ | sha256 of canonicalised dedup fields (see normalisation rules §4.1). |
| `review_required` | bool | ✅ | true when validation flagged something. |
| `review_reason` | text | | Short label — `missing_country` · `duplicate_candidate` · `ambiguous_price` · `enum_unknown:<col>` · `date_year_only` · `out_of_range:<col>`. |
| `ingestion_status` | enum | ✅ | `ingested` · `under_review` · `superseded` · `rejected` |
| `supersedes_id` | uuid | | When this row corrects/replaces a previously canonical row. |
| `notes` | text | | Free-form operator notes. |

## 3. Required-column gate

A row MUST have non-null values for: `category`, `asset_type`, `asset_name`, `city`, `country`, `price_eur`, `buyer_name`, AND at least one of `closed_at`/`announced_at`. Plus all ingestion-meta columns marked required.

Any required column null → row routes to `staging/failed/` with the failing column named. The agent never writes incomplete required-column rows into MASTER.

## 4. Dedup key (per normalisation rules §4.1)

```
dedup_key = sha256(
  lower(strip_diacritics(asset_name)) + '|' +
  lower(strip_diacritics(city)) + '|' +
  iso_date(closed_at OR announced_at) + '|' +
  str(round(price_eur))
)
```

## 5. Mapping to `public.hotel_transactions` (Phase 5+)

When the corpus migrates to Postgres:

| MASTER column | `public.hotel_transactions` |
|---|---|
| `transaction_uid` | `id` (UUID primary key) |
| `asset_name` | `asset_name` |
| `category` | `category` (existing enum) |
| `city` · `country` · `market` · `submarket` | same |
| `rooms` · `price_eur` · `price_per_key_eur` · `cap_rate` | same |
| `closed_at` · `announced_at` | same |
| `buyer_uid` · `seller_uid` | FK to `public.investors(id)` |
| `notes` | `notes` |
| (all other domain columns) | `meta` jsonb |
| ingestion-meta block | new columns added in the Phase 5 migration |

`public.hotel_transactions` is read-only until that migration ships. Until then, the XLSX is the canonical.
