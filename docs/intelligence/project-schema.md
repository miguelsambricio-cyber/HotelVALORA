# Project Schema

Full column reference for `services/transactions/MASTER/HOTEL_PROYECTOS_MASTER.xlsx`.

**Last refreshed:** 2026-05-11
**Normalization version:** v1.0

The DICTIONARY sheet of the workbook mirrors this document 1:1. When this document changes, regenerate the workbook (`python services/transactions/scripts/build_masters.py`) and commit both.

---

## 1. Domain columns (36)

### 1.1 · Identification

| Column | Type | Required | Notes |
|---|---|---|---|
| `project_uid` | uuid | ✅ | Stable identifier of the project. Different from `canonical_id` — `project_uid` can recur across superseded rows. |
| `category` | enum | ✅ | `development` · `branded_residences` · `flex_living` · `pipeline_announcement` · `rebranding` · `operator_change` |
| `asset_type` | enum | ✅ | `new_build` · `conversion` · `refurb` · `extension` · `mixed_use` |
| `project_name` | text | ✅ | Project name — e.g. `The Madrid EDITION`. Display preserves diacritics. |

### 1.2 · Geography

| Column | Type | Required | Notes |
|---|---|---|---|
| `city` | text | ✅ | City of the project. Title-cased display; diacritic-stripped for dedup. |
| `country` | text | ✅ | ISO-3166-1 alpha-2 uppercase. |
| `market` | text | | Coarse market label. From lookup; null + review when missing. |
| `submarket` | text | | Finer label. |
| `address` | text | | Street address when known. |
| `latitude` | numeric | | Decimal degrees, WGS84. Range [-90, 90]. |
| `longitude` | numeric | | Decimal degrees, WGS84. Range [-180, 180]. |

### 1.3 · Project economics

| Column | Type | Required | Notes |
|---|---|---|---|
| `rooms` | int | | Planned room count. 0 valid for non-room mixed-use components. |
| `gross_area_sqm` | numeric | | Built area in m². Range [100, 500_000]. |
| `capex_eur` | numeric | | Total CAPEX in EUR. Non-EUR converted at announce-date rate. Range [100_000, 3_000_000_000]. |
| `capex_per_key_eur` | numeric | | Derived: `capex_eur / rooms` when both known. |

### 1.4 · Timeline

| Column | Type | Required | Notes |
|---|---|---|---|
| `estimated_opening` | date | | Operator-stated or analyst-derived. |
| `groundbreaking` | date | | Construction-start. |
| `announced_at` | date | ✅ | First public announcement date. ISO-8601 `YYYY-MM-DD`. |
| `project_stage` | enum | ✅ | `announced` · `permitting` · `under_construction` · `pre_opening` · `opened` · `cancelled` · `on_hold` |
| `permitting_status` | text | | Free-form notes on permits — license issued, planning approval. |

### 1.5 · Parties — developer + operator

| Column | Type | Required | Notes |
|---|---|---|---|
| `developer_name` | text | ✅ | Developer / promotor entity. |
| `developer_uid` | uuid | | Resolved canonical investor id from `public.investors`. Phase 2+. |
| `developer_country` | text | | HQ country ISO-3166-1 alpha-2. |
| `developer_kind` | enum | | Same vocabulary as transactions `buyer_kind`. |
| `operator_name` | text | | Operator / brand manager. |
| `operator_uid` | uuid | | Resolved canonical operator id from `public.operators`. Phase 2+. |
| `operator_kind` | enum | | `chain` · `independent` · `soft_brand` · `franchise` · `management_company` · `operator_owner` · `unknown` |
| `brand` | text | | Brand name when known. |

### 1.6 · Asset classification

| Column | Type | Required | Notes |
|---|---|---|---|
| `hotel_segment` | enum | | Same vocabulary as transactions `hotel_segment`. |
| `star_rating` | int | | 1..5 — projected. |

### 1.7 · Mixed-use + public-funding flags

| Column | Type | Required | Notes |
|---|---|---|---|
| `mixed_use_flag` | bool | | TRUE when project includes residential / retail / office components. |
| `mixed_use_components` | text | | Comma-separated tags — `residential, retail, office`. |
| `public_subsidy_flag` | bool | | TRUE when EU / state / municipal funds known to participate. |

### 1.8 · Provenance

| Column | Type | Required | Notes |
|---|---|---|---|
| `press_release_url` | url | | Developer or operator official release. https only. |
| `news_url` | url | | Primary news article. https only. |
| `linked_news_id` | uuid | | FK to `public.market_news` once the Intelligence Engine matches it (Phase 3+). |

## 2. Ingestion-meta columns (14)

Identical to the transaction schema — see `transaction-schema.md` §2 for the full reference. Same names, same types, same semantics.

## 3. Required-column gate

A row MUST have non-null values for: `category`, `asset_type`, `project_name`, `city`, `country`, `announced_at`, `project_stage`, `developer_name`. Plus all required ingestion-meta columns.

Any required column null → row routes to `staging/failed/` with the failing column named.

## 4. Dedup key (per normalisation rules §4.2)

```
dedup_key = sha256(
  lower(strip_diacritics(project_name)) + '|' +
  lower(strip_diacritics(city)) + '|' +
  iso_date(announced_at) + '|' +
  lower(strip_diacritics(developer_name))
)
```

Note the developer (not the operator) anchors the dedup. The same project can change operator over its lifetime — using `operator_name` would split a single project into multiple canonical rows.

## 5. Project-stage transitions

Operators expect to see a project move through stages over its lifecycle. Each transition is recorded as a **new canonical row** with `supersedes_id` pointing at the previous row. The DATA sheet preserves the full history:

```
2024-01-15: stage=announced              ingestion_status=ingested
2024-06-30: stage=permitting             supersedes_id=<2024-01-15 row>, ingestion_status=ingested
                                          → 2024-01-15 row flipped to ingestion_status=superseded
2025-02-10: stage=under_construction     supersedes_id=<2024-06-30 row>, ingestion_status=ingested
2027-09-15: stage=opened                 supersedes_id=<2025-02-10 row>, ingestion_status=ingested
```

The live corpus filters by `ingestion_status='ingested'`; the full timeline is queryable when needed.

When `project_stage='cancelled'` is reached, the row is the final supersedence — no further rows are appended for that project.

## 6. Cross-link to news

When the Intelligence Engine ingests a news article that mentions the project:

- The Engine emits a `news_ingested` event
- A future Phase 3+ resolver matches the article's title + entity mentions against the projects MASTER
- On match → `linked_news_id` populated on the project's current canonical row (in-place update, recorded in INGESTION_LOG)

This is the bridge between the operational MASTER and the live news corpus.

## 7. Mapping to `public.hotel_projects` (Phase 5+)

When the corpus migrates to Postgres:

| MASTER column | `public.hotel_projects` |
|---|---|
| `project_uid` | `id` (UUID primary key) |
| `project_name` | `project_name` |
| `category` | `category` (existing enum) |
| `city` · `country` · `market` · `submarket` | same |
| `rooms` · `capex_eur` · `estimated_opening` | same |
| `developer_uid` | FK to `public.investors(id)` |
| `operator_uid` | FK to `public.operators(id)` |
| `notes` | `notes` |
| (all other domain columns) | `meta` jsonb |
| ingestion-meta block | new columns added in the Phase 5 migration |
| `project_stage` history | new related table `hotel_project_stages` |

`public.hotel_projects` is read-only until that migration ships. Until then, the XLSX is the canonical.
