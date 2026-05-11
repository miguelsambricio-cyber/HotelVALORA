# News Data Schema

Reference for the hospitality intelligence tables. Source of truth: [`docs/database/migrations/0006_hospitality_intelligence_schema.sql`](../database/migrations/0006_hospitality_intelligence_schema.sql).

**Last refreshed:** 2026-05-11

---

## 1. Enums

| Enum | Values |
|---|---|
| `news_category` | `acquisition` · `sale` · `joint_venture` · `development` · `refinancing` · `rebranding` · `operator_change` · `branded_residences` · `flex_living` · `pipeline_announcement` · `distress` · `investment` · `other` |
| `hotel_segment` | `luxury` · `upper_upscale` · `upscale` · `upper_midscale` · `midscale` · `economy` · `lifestyle` · `resort` · `boutique` · `mixed_use` · `serviced_apartments` · `unknown` |
| `entity_role` | `buyer` · `seller` · `investor` · `operator` · `broker` · `lender` · `developer` · `previous_operator` · `new_operator` · `partner` · `mentioned` |
| `ingestion_source_kind` | `rss` · `scrape` · `api` · `manual` |
| `ingestion_status` | `queued` · `running` · `success` · `partial` · `failed` |

## 2. `sources`

Registry of news outlets the cron reads from. Adding a new source = single insert.

| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `name` | text | "Hosteltur" |
| `slug` | text unique | "hosteltur" — stable identifier for code references |
| `base_url` | text | publisher root URL |
| `ingestion_kind` | enum | rss / scrape / api / manual |
| `rss_url` | text? | when ingestion_kind = rss |
| `api_endpoint` | text? | when ingestion_kind = api |
| `scrape_selector` | jsonb? | CSS / XPath selectors when ingestion_kind = scrape |
| `region` | text | ISO 3166-1 alpha-2 or "EU" / "GLOBAL" |
| `language` | text | ISO 639-1 (default 'en') |
| `reliability_score` | numeric(3,2) | 0..1 — tier gating + tie-breaking |
| `enabled` | boolean | cron skips disabled sources |
| `schedule_hint` | text? | informational ("daily", "hourly") |
| `last_ingested_at` | timestamptz? | most recent successful run |
| `notes` | text? | human-readable context |
| `meta` | jsonb? | API auth headers, scrape config, etc. |
| `created_at` / `updated_at` | timestamptz | auto-managed via trigger |

**Seeded sources:** hosteltur, alimarket, expansion, hospitalitynet, hotelnewsnow, costar-news, thp-news, hvs, skift-hospitality, reuters-hospitality.

## 3. `investors`

External institutional investor / family office / fund entities. Distinct from `public.organizations` (which are HotelVALORA tenants).

| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `name` | text | "Blackstone Real Estate Partners" |
| `slug` | text unique | "blackstone-rep" |
| `kind` | text check | pe / reit / sovereign / family_office / private_owner / bank / operator_owned / hospitality_fund / asset_manager / developer / unknown |
| `hq_country` | text? | ISO 3166-1 alpha-2 |
| `aum_eur` | numeric(18,2)? | AUM where publicly known |
| `website` | text? | |
| `notes` | text? | |
| `meta` | jsonb? | additional facts (parent fund, founding year, …) |
| `created_at` / `updated_at` | timestamptz | |

## 4. `operators`

Hotel operator / brand / management company entities. `parent_id` supports brand-within-chain hierarchies.

| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `name` | text | "EDITION Hotels" |
| `slug` | text unique | "edition-hotels" |
| `kind` | text check | chain / independent / soft_brand / franchise / management_company / operator_owner / unknown |
| `hq_country` | text? | |
| `parent_id` | uuid FK → operators(id) | "EDITION Hotels" → "Marriott International" |
| `website` | text? | |
| `notes` | text? | |
| `meta` | jsonb? | brand portfolio, room-count footprint, … |

## 5. `market_news` (the canonical corpus)

One row per unique URL. Re-ingestion of the same URL increments `occurrences` and bumps `last_seen_at`.

| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `source_id` | uuid FK → sources(id) | |
| `title` | text | |
| `summary` | text? | |
| `body` | text? | extracted article body (may be null if only metadata available) |
| `url` | text | original URL as fetched |
| `canonical_url` | text | normalised form — used for `url_hash` |
| `url_hash` | text **unique** | sha256(canonical_url) — primary dedup key |
| `content_hash` | text? | sha256(title + summary) — detects content updates |
| `category` | enum | `news_category` (default `other`) |
| `hotel_segment` | enum? | `hotel_segment` if extractable |
| `country` | text? | ISO 3166-1 alpha-2 |
| `region` | text? | "EU" / "LATAM" / "GLOBAL" |
| `city` / `market` / `submarket` | text? | progressively narrower geography |
| `language` | text | ISO 639-1 (default 'en') |
| `published_at` | timestamptz? | from source feed |
| `first_seen_at` | timestamptz | when we ingested the first time |
| `last_seen_at` | timestamptz | bumped on every re-ingestion |
| `occurrences` | int | count of times this URL has been seen |
| `raw_meta` | jsonb? | original feed/scrape payload — never modified post-insert |
| `enriched_meta` | jsonb? | AI / post-processing output (Phase 4+) |

**Indexes**: `source_id`, `category`, `country`, `city`, `published_at desc`, `first_seen_at desc`.

## 6. `hotel_transactions`

Structured transaction events extracted from news. One news article ⇒ 0..N transaction rows.

| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `news_id` | uuid? FK → market_news(id) | source story |
| `category` | enum | one of acquisition / sale / joint_venture / refinancing / distress |
| `asset_name` | text? | "The Ritz-Carlton Madrid" |
| `city` / `country` / `market` / `submarket` | text? | |
| `rooms` | int? | check (rooms > 0) |
| `price_eur` | numeric(18,2)? | total deal value in EUR |
| `price_per_key_eur` | numeric(14,2)? | derived if rooms + price both known |
| `cap_rate` | numeric(5,2)? | percentage points (5.4 = 5.4%) |
| `closed_at` / `announced_at` | date? | |
| `buyer_id` / `seller_id` | uuid? FK → investors(id) | |
| `notes` | text? | |
| `meta` | jsonb? | |

## 7. `hotel_projects`

Structured project / pipeline events: developments, branded residences, flex-living, openings, refurbs.

| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `news_id` | uuid? FK → market_news(id) | |
| `category` | enum | development / branded_residences / flex_living / pipeline_announcement / rebranding / operator_change |
| `project_name` | text? | "The Madrid EDITION" |
| `city` / `country` / `market` / `submarket` | text? | |
| `rooms` | int? | check (rooms >= 0) — 0 valid for non-room projects |
| `estimated_opening` | date? | |
| `developer_id` | uuid? FK → investors(id) | |
| `operator_id` | uuid? FK → operators(id) | |
| `capex_eur` | numeric(18,2)? | |
| `notes` | text? | |
| `meta` | jsonb? | |

## 8. `news_entities` (polymorphic link table)

Links news articles to investors / operators / hotels / markets.

| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `news_id` | uuid FK → market_news(id) | |
| `entity_kind` | text check | `investor` / `operator` / `hotel` / `market` |
| `entity_id` | uuid? | references investors/operators/valuations/markets when known |
| `raw_mention` | text? | the literal string the extractor saw (useful pre-resolution) |
| `role` | enum | `entity_role` |
| `confidence` | numeric(3,2)? | 0..1 from extractor (regex = 1.0, LLM = variable) |

**Unique:** `(news_id, entity_kind, entity_id, role)` — same entity in same role only once per article.

## 9. `news_tags`

Free-form taxonomy.

| Column | Type | Notes |
|---|---|---|
| `news_id` | uuid FK → market_news(id) | |
| `tag` | text | lowercase, ascii — `"luxury"`, `"madrid-centro"`, `"trophy-asset"` |

Composite primary key `(news_id, tag)`.

## 10. `news_ingestion_runs`

Per-run audit log. One row per (source × daily firing).

| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `source_id` | uuid? FK → sources(id) | |
| `run_started_at` | timestamptz | |
| `run_completed_at` | timestamptz? | |
| `status` | enum | queued / running / success / partial / failed |
| `items_seen` / `_inserted` / `_updated` / `_skipped` | int | counters |
| `error_message` | text? | populated on failure |
| `metadata` | jsonb? | timing breakdown, response sizes, etc. |

**RLS:** enabled but no policies — internal-only by design (service-role writes + reads).

## 11. RLS posture summary

| Table | anon SELECT | authenticated SELECT | service-role |
|---|---|---|---|
| sources | enabled = true | ✅ | full |
| investors | ✅ | ✅ | full |
| operators | ✅ | ✅ | full |
| market_news | ✅ | ✅ | full |
| hotel_transactions | ✅ | ✅ | full |
| hotel_projects | ✅ | ✅ | full |
| news_entities | ✅ | ✅ | full |
| news_tags | ✅ | ✅ | full |
| news_ingestion_runs | ❌ | ❌ | full |

Writes are service-role only across the board — no client path inserts intelligence data. The corpus is tamper-proof.

## 12. Deduplication hash design

### URL canonicalisation
1. Lowercase scheme + host (`HTTP://WWW.Hosteltur.com/X` → `http://www.hosteltur.com/x`)
2. Remove tracking params: `utm_*`, `gclid`, `fbclid`, `ref`, `_hsenc`, `_hsmi`
3. Strip trailing slash
4. Strip URL fragment (`#anchor`)

### `url_hash`
```
url_hash = sha256(canonical_url).hexdigest()
```

### `content_hash`
```
content_hash = sha256(title.trim() + "\n" + summary.trim()).hexdigest()
```

Compared on each ingestion to detect publisher edits. When `url_hash` matches but `content_hash` differs, we update `body` + bump `last_seen_at` + add a row to `news_ingestion_runs.metadata.content_updates[]`.

## 13. Indexes summary

| Table | Index |
|---|---|
| `sources` | `enabled`, `region` |
| `investors` | `kind`, `hq_country` |
| `operators` | `parent_id`, `kind` |
| `market_news` | `source_id`, `category`, `country`, `city`, `published_at desc`, `first_seen_at desc` |
| `hotel_transactions` | `country`, `city`, `closed_at desc`, `buyer_id`, `seller_id` |
| `hotel_projects` | `country`, `city`, `estimated_opening`, `developer_id`, `operator_id` |
| `news_entities` | `news_id`, `(entity_kind, entity_id)` |
| `news_tags` | `tag` |
| `news_ingestion_runs` | `(source_id, run_started_at desc)`, `status` |

## 14. Forward-compat planning

When Phase 4 adds AI enrichment, no schema migration is required:

- Summary text → `market_news.enriched_meta.summary_en` / `summary_es`
- Sentiment → `market_news.enriched_meta.sentiment` (-1..1)
- Confidence per category → `market_news.enriched_meta.category_confidence`
- Embeddings → new column `embedding vector(1536)` (requires `pgvector` extension — separate migration)
- Opportunity score → `market_news.enriched_meta.opportunity_score`

Per-row jsonb keeps the schema stable while AI capabilities iterate.
