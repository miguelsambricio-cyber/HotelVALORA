# Data Normalization Rules

The canonicalisation contract every row meets before it lands in a MASTER workbook.

**Last refreshed:** 2026-05-11
**Applies to:** HOTEL_TRANSACCIONES_MASTER · HOTEL_PROYECTOS_MASTER
**Normalization version:** v1.0 (bump in `services/transactions/scripts/build_masters.py`)

---

## 1. The principle

Every operator drops files in their natural form: a CoStar export, a brokerage spreadsheet, a press-release scrape, a hand-curated CSV. The Data Ingestion Agent applies these rules **in order** to produce a row that is comparable, dedupable, and queryable against every other row in the corpus.

If a rule cannot be applied (ambiguous data, conflicting hints), the row routes to `staging/review/` with the failing rule named in `review_reason`.

## 2. Field-by-field rules

### 2.1 · Geography (`city` · `country` · `market` · `submarket`)

| Rule | Detail |
|---|---|
| `country` | ISO-3166-1 alpha-2 uppercase. `Spain` → `ES`. `United Kingdom` → `GB`. |
| `city` | Lowercase the input for normalisation, then title-case for display. `MADRID` → `Madrid`. Strip diacritics for the dedup key but preserve them in the display value. |
| `market` | From a curated lookup keyed on `(country, city)`. `(ES, Marbella)` → `Costa del Sol`. Missing lookups → null + `review_required=true / review_reason='market_lookup_missing'`. |
| `submarket` | Same lookup, finer grain. `(ES, Madrid, Salamanca)` → `Salamanca`. Null is acceptable. |
| `address` | Trim whitespace. Capitalise per locale (`calle de Recoletos 1` → `Calle de Recoletos 1`). No further parsing in v1.0. |
| `latitude` / `longitude` | Decimal degrees, WGS84. Sanity bounds: lat ∈ [-90, 90], lon ∈ [-180, 180]. Anything outside → null + review. |

### 2.2 · Dates (`closed_at` · `announced_at` · `groundbreaking` · `estimated_opening`)

| Rule | Detail |
|---|---|
| Format | ISO-8601 `YYYY-MM-DD`. Accept input in `DD/MM/YYYY`, `MM-DD-YYYY`, `YYYY/MM/DD` — try in that order, pick the first valid. |
| Year-only inputs | `2026` → `2026-01-01` + `review_required=true / review_reason='date_year_only'`. |
| Quarter inputs | `2026 Q1` → `2026-01-01` for Q1, `-04-01` for Q2, `-07-01` for Q3, `-10-01` for Q4 + review flag. |
| Sanity bounds | `closed_at` ∈ [2000-01-01, today + 2 years]. Outside → review. |
| `closed_at` after `announced_at` | If both present and `closed_at < announced_at` → review. |

### 2.3 · Prices (`price_eur` · `capex_eur`)

| Rule | Detail |
|---|---|
| Currency | All monetary values stored as EUR. Source-reported currency in `price_currency_original`. Convert at the announce-date rate from a static FX table (Phase 1: ECB end-of-day rates loaded by the agent). |
| Format | Integer or numeric without thousand separators. `"€425,000,000"` → `425000000`. |
| Magnitude check | Transactions: `price_eur` ∈ [100_000, 5_000_000_000]. Outside → review. Projects (`capex_eur`): ∈ [100_000, 3_000_000_000]. |
| Per-key derivation | `price_per_key_eur` = `price_eur / rooms` when both known. Stored even when the source provides its own — useful for cross-check during review. |
| Cap rate | Percentage points without the `%` sign. `5.4%` → `5.4`. Range [0.5, 25.0]. |

### 2.4 · Rooms, area, year

| Rule | Detail |
|---|---|
| `rooms` | Positive integer. `0` valid only for non-room projects (mixed-use components). |
| `gross_area_sqm` | Numeric ≥ 100. Inputs in `ft²` → multiply by 0.092903. |
| `year_built` / `year_renovated` | Integer in [1700, today.year + 5]. `year_renovated < year_built` → review. |
| `star_rating` | Integer in [1, 5]. |

### 2.5 · Categorisation (`category` · `hotel_segment` · `*_kind`)

Categorical values are matched **case-insensitive** against the controlled vocabulary in the master DICTIONARY. Unknown values:

- For required enums (`category`, `asset_type`) → route to `staging/failed/` with the failing column named
- For optional enums (`hotel_segment`, `*_kind`, `financing_type`) → null + `review_required=true / review_reason='enum_unknown:<col>'`

Spanish variants accepted in the input, normalised in the output:

| Spanish input | Canonical output |
|---|---|
| `adquisición` / `compra` | `acquisition` |
| `venta` | `sale` |
| `nueva apertura` / `nuevo hotel` | `development` |
| `cambio de operador` | `operator_change` |
| `flex living` / `coliving` | `flex_living` |
| `lujo` / `cinco estrellas` | `luxury` |

The mapping table lives in `services/transactions/scripts/build_masters.py` ↔ source for v1.0; future versions externalise it.

### 2.6 · Entities (`buyer_*` · `seller_*` · `developer_*` · `operator_*`)

| Step | Rule |
|---|---|
| 1. Normalise name | Trim, strip legal-suffix noise (`S.A.`, `Inc.`, `Ltd.`, `LLC`, `Holdings`) for the dedup key. Preserve full name in display. |
| 2. Country | ISO-3166-1 alpha-2 — same rule as the asset country. |
| 3. Kind | Controlled enum — `pe`, `reit`, `sovereign`, `family_office`, `private_owner`, `bank`, `operator_owned`, `hospitality_fund`, `asset_manager`, `developer`, `unknown`. |
| 4. UID resolution | Phase 1: null. Phase 2: fuzzy-match against `public.investors` / `public.operators`; populate UID when match confidence > 0.85. |
| 5. Two entities, one row | When buyer == seller (JV / refinance of same entity) → emit a `review` flag rather than silently accepting. |

### 2.7 · URLs (`source_url` · `press_release_url` · `news_url`)

| Rule | Detail |
|---|---|
| Scheme | `https://` only. `http://` → upgrade to `https://`. Other schemes → null. |
| Tracking params | Strip the same list as the Intelligence Engine canonicaliser: `utm_*`, `_hs*`, `mc_*`, `gclid`, `fbclid`, `ref`, `ref_src`, `yclid`, `msclkid`, `icid`, `cmpid`. |
| Fragment | Strip `#anchor`. |
| Validation | URL must parse (have host + path) — invalid → null + `review_required=true / review_reason='invalid_url'`. |

## 3. Required-column gates

A row landing in MASTER MUST have non-null values for:

### Transactions
- `category`
- `asset_type`
- `asset_name`
- `city`
- `country`
- `price_eur` (in EUR after conversion)
- `buyer_name`
- (one of) `closed_at` OR `announced_at`

### Projects
- `category`
- `asset_type`
- `project_name`
- `city`
- `country`
- `announced_at`
- `project_stage`
- `developer_name`

Any required column null → row routes to `staging/failed/<ingestion_id>/`. The agent never writes incomplete required-column rows into MASTER.

## 4. Dedup keys

### 4.1 · Transactions
```
dedup_key = sha256(
  lower(strip_diacritics(asset_name)) + '|' +
  lower(strip_diacritics(city)) + '|' +
  iso_date(closed_at OR announced_at) + '|' +
  str(round(price_eur))
)
```

### 4.2 · Projects
```
dedup_key = sha256(
  lower(strip_diacritics(project_name)) + '|' +
  lower(strip_diacritics(city)) + '|' +
  iso_date(announced_at) + '|' +
  lower(strip_diacritics(developer_name))
)
```

### 4.3 · Resolution rules

| Match against MASTER | Behaviour |
|---|---|
| No match | Insert as new canonical row |
| Match + same `content_hash` | Silent skip — count in `rows_skipped` |
| Match + different `content_hash` | Route to `staging/review/` with both rows side-by-side |

`content_hash` is sha256 of the concatenated domain columns (skipping nulls). It catches the case where the dedup key matches but the source has updated the price, rooms, or operator.

## 5. Source-tier precedence (when reviewing duplicates)

When the reviewer must choose between two competing rows:

1. **Tier A** (`costar`, `curated`) wins over Tier B (`brokerage`, `press_release`) wins over Tier C (`news_extract`, `manual`)
2. Within the same tier, the more recent `ingested_at` wins
3. Tie-break: the row with fewer null domain columns wins

The reviewer can override the recommendation. The operator's decision is recorded in `notes` + `ingestion_status`.

## 6. Sanity ranges — the "is this real?" filter

| Field | Range | Outside → |
|---|---|---|
| `price_eur` | 100k – 5 B | review |
| `rooms` | 1 – 5000 | review (1 valid for ultra-boutique, 5000+ for mega-resorts is suspicious) |
| `cap_rate` | 0.5 – 25.0 | review |
| `price_per_key_eur` | 10k – 5 M | review (anything outside is a unit error somewhere) |
| `gross_area_sqm` | 100 – 500_000 | review |
| `latitude` | [-90, 90] | null + review |
| `longitude` | [-180, 180] | null + review |
| `year_built` | [1700, today+5] | null + review |
| `star_rating` | [1, 5] | null + review |

The rule is: if it's outside the range, **the agent doesn't decide for the operator**. The row reaches `staging/review/` with the failing range flagged.

## 7. Versioning

The contract above is `v1.0`. Every rule lives in `services/transactions/scripts/build_masters.py` constants + this document. Bump both when:

- **Minor bump (`v1.0 → v1.1`)**: rule clarification, new optional rule, new accepted variant
- **Major bump (`v1.0 → v2.0`)**: required column added, range tightened, dedup-key changes

Operators are notified of major bumps via a `system_alert` Resend escalation from QA / Monitoring.

## 8. What this is NOT

- ❌ This is NOT a data cleaning crew. The operator is responsible for the *substance* of what they drop.
- ❌ This is NOT a fuzzy-match heuristic. v1.0 uses literal string matches + a controlled vocabulary; ML-assisted entity resolution lands in Phase 4.
- ❌ This is NOT a one-time clean-up. Every import re-applies the rules; the rules are the corpus's invariant.

The rules are the contract between the operator and the dataset. Keep them small, explicit, and bumped only when the corpus has earned the change.
