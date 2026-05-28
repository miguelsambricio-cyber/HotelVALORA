# Database

**Engine:** PostgreSQL 16  
**ORM:** SQLAlchemy 2.0 (async)  
**Migrations:** Alembic (`apps/api/alembic/`)

## Schema Overview

```
users
hotel_assets ──────────┬── hotel_financials
                        ├── comparable_transactions
                        ├── financial_scenarios ──── dcf_model_outputs
                        └── valuations ──────────── underwritings
flex_living_assets ─────┘ (valuations.flex_asset_id)
markets
market_snapshots
```

## Tables

### `users`
Platform accounts. Role values: `analyst`, `manager`, `admin`.

| Column | Type | Notes |
|---|---|---|
| id | UUID PK | |
| email | VARCHAR(255) | Unique |
| full_name | VARCHAR(255) | |
| hashed_password | VARCHAR(255) | bcrypt |
| role | VARCHAR(50) | Default: `analyst` |
| is_active / is_superuser | BOOLEAN | |

---

### `hotel_assets`
Core hotel property registry.

| Column | Type | Notes |
|---|---|---|
| id | UUID PK | |
| asset_name, slug | VARCHAR | `slug` is unique |
| brand, chain_scale, operator, owner | VARCHAR | |
| city, country, submarket | VARCHAR | Default country: `ES` |
| latitude, longitude | NUMERIC(10,7) | |
| keys | INTEGER | Room count |
| star_rating | NUMERIC(2,1) | |
| status | VARCHAR(50) | Default: `operating` |
| meta | JSONB | Flexible extra fields |

---

### `hotel_financials`
Annual/periodic P&L per asset.

| Column | Type | Notes |
|---|---|---|
| asset_id | UUID FK | `hotel_assets.id` CASCADE |
| year, period | INTEGER / VARCHAR | Default period: `annual` |
| rooms_revenue, fb_revenue, total_revenue | NUMERIC(15,2) | |
| occupancy_rate | NUMERIC(5,4) | |
| adr, revpar | NUMERIC(10,2) | |
| ebitda, noi, noi_margin | NUMERIC | |

---

### `flex_living_assets`
Serviced apartments, co-living, and hybrid accommodation assets.

| Column | Type | Notes |
|---|---|---|
| total_units | INTEGER | |
| studio / 1-bed / 2-bed / 3+-bed units | INTEGER | Unit mix |
| avg_daily_rate, monthly_rental_rate | NUMERIC(10,2) | |
| mix_short_term_pct / mix_long_term_pct | NUMERIC(5,4) | |
| min_stay_days | INTEGER | |

---

### `markets`
Market master data by submarket.

| Column | Type | Notes |
|---|---|---|
| country, city, submarket | VARCHAR | |
| market_tier | VARCHAR(50) | |
| total_supply_keys, pipeline_keys | INTEGER | |
| costar_submarket_id | VARCHAR(100) | Unique |
| seasonality_index | NUMERIC(6,4) | |

---

### `market_snapshots`
Time-series market performance data.

| Column | Type | Notes |
|---|---|---|
| submarket, city, country | VARCHAR | |
| period_year, period_month, period_type | INTEGER / VARCHAR | |
| market_occupancy, market_adr, market_revpar | NUMERIC | |
| revpar_growth_yoy, adr_growth_yoy | NUMERIC(6,4) | |
| source | VARCHAR(100) | e.g. `costar` |

---

### `comparable_transactions`
Hotel investment transaction comps.

| Column | Type | Notes |
|---|---|---|
| asset_id | UUID FK | Nullable — `hotel_assets.id` SET NULL |
| transaction_date | VARCHAR(10) | ISO date |
| transaction_price, price_per_key | NUMERIC | |
| cap_rate | NUMERIC(6,4) | |
| buyer, seller, transaction_type | VARCHAR | |
| noi_at_sale, revpar_at_sale | NUMERIC | |
| source, source_id | VARCHAR | CoStar or manual |

---

### `financial_scenarios`
Investment scenarios per hotel asset.

| Column | Type | Notes |
|---|---|---|
| asset_id | UUID FK | `hotel_assets.id` CASCADE |
| holding_period | INTEGER | Years |
| exit_cap_rate, discount_rate | NUMERIC(6,4) | |
| acquisition_price, equity_investment | NUMERIC(18,2) | |
| currency | VARCHAR(3) | Default: `EUR` |
| status | VARCHAR(50) | Default: `draft` |

---

### `dcf_model_outputs`
Computed DCF results per scenario.

| Column | Type | Notes |
|---|---|---|
| scenario_id | UUID FK | `financial_scenarios.id` CASCADE |
| irr, npv, equity_multiple | NUMERIC | |
| terminal_value, stabilized_noi | NUMERIC | |
| cash_on_cash_return, dscr | NUMERIC | |
| cash_flows | JSONB | Year-by-year FCF array |
| sensitivity | JSONB | Grid by cap rate / discount rate |
| version | INTEGER | Increments on recalc |

---

### `valuations`
Final concluded valuations (DCF, sales comp, income approach).

| Column | Type | Notes |
|---|---|---|
| hotel_id / flex_asset_id | UUID FK | Nullable — asset link |
| created_by_id | UUID FK | `users.id` SET NULL |
| valuation_type | VARCHAR(50) | e.g. `dcf`, `sales_comp` |
| concluded_value, value_per_key | NUMERIC | |
| implied_cap_rate | NUMERIC(6,4) | |
| assumptions, cash_flows, sensitivity | JSONB | |

---

### `underwritings`
Detailed underwriting model linked to a valuation.

| Column | Type | Notes |
|---|---|---|
| valuation_id | UUID FK | `valuations.id` CASCADE, unique |
| projection_years | INTEGER | Default: 10 |
| stabilized_occupancy, adr, revpar | NUMERIC | |
| cap_rate_entry / exit, discount_rate | NUMERIC(6,4) | |
| ltv_ratio, dscr, irr, equity_multiple | NUMERIC | |
| detail | JSONB | Full model detail |

## Conventions

- All PKs are UUID generated at the application layer.
- All tables carry `created_at` / `updated_at` (timezone-aware, server default `now()`).
- Flexible fields stored as JSONB (`meta`, `assumptions`, `cash_flows`, `sensitivity`, `detail`).
- Indexes on all FK columns, cities, submarkets, and external IDs.

---

## Supabase (Next.js side)

The frontend reads/writes to a separate Postgres hosted by Supabase
(`twebgqutuqgonabvhzjk` · eu-central · PG 17). Migrations live in
`docs/database/migrations/` (0001–0030). The FastAPI/Alembic database
above is independent and not used by the report module.

### `hotel_canonical` (migration 0024 · evolved in 0029)
Single source of truth per physical hotel. Identity, classification, geo,
amenities, provenance.

| Column | Type | Notes |
|---|---|---|
| id | UUID PK | gen_random_uuid() · this is the `canonical_id` |
| **slug** | text UNIQUE NOT NULL | URL-safe identity · added in 0029 · backfilled from `canonical_name` with operator-curated overrides for 14 Madrid hotels |
| canonical_name | text NOT NULL | |
| market_id / submarket_id | UUID FK | → `public.market` · `public.submarket` (Madrid: 1 market · 20 submarkets) |
| operator_id | UUID FK | → `public.operators` |
| chain_scale / segment | enum `hotel_segment` | luxury · upper_upscale · … |
| country_code | char(2) NOT NULL | ISO-3166-1 |
| **costar_property_id** | text | UNIQUE partial index `where not null` (migration 0028) |
| booking_hotel_id · google_place_id · tripadvisor_id · wikidata_qid | text | All partial UNIQUE |

### `hotel_report` (migration 0030 — NEW)
Live report sessions · the URL identity for `/report/[reportId]/<section>`.
Separate from `hotel_report_library` (catalog · 1:1 per hotel).

| Column | Type | Notes |
|---|---|---|
| id | UUID PK | `gen_random_uuid()` · this is the `report_id` |
| canonical_id | UUID FK | → `hotel_canonical(id)` cascade |
| report_date | date NOT NULL | Default `current_date` · operator can override |
| tier_snapshot | text | tier at creation (free/pro/premium) |
| input_params | jsonb | Trace: e.g. `{ legacy_input: "bless-hotel-madrid", section: "executive-summary" }` |
| owner_user_id | UUID FK | → `auth.users(id)` · null in showcase mode |
| created_at / last_viewed_at | timestamptz | Audit · last_viewed_at touched on each render |

**A2 dedup**: unique index on `(canonical_id, COALESCE(owner_user_id, '0000…'::uuid), report_date)` —
one row per hotel+owner+day. Reopening reuses the row.

**RLS**: public read · public insert · public update (showcase mode). Tightens
to `owner_user_id = auth.uid()` when auth flips on.

### `hotel_name_alias` (migration 0032 — NEW · rebrand policy Layer B)
Historical / alternative names + URL slugs that resolve to the canonical
building. Consulted by `resolveCanonicalIdAny()` as a fallback after the
primary `hotel_canonical.slug` lookup misses.

| Column | Type | Notes |
|---|---|---|
| id | UUID PK | gen_random_uuid() |
| canonical_id | UUID FK | → `hotel_canonical(id)` cascade |
| alias_name | text NOT NULL | Historical commercial name (e.g. "AC Hotel Cuzco by Marriott") |
| alias_slug | text | URL-safe legacy slug (e.g. "ac-cuzco") · null when name-only |
| valid_from / valid_to | date | Period the alias was the active commercial identity · valid_to NULL means alias is currently accepted (no rebrand yet) |
| source | text NOT NULL | `manual_curated` · `costar_historical` · `wikidata` · `registry_legacy` · `detected` |
| notes | text | Operator audit note |

**Unique**: `(canonical_id, alias_name)`. **Indexes**: `alias_slug` (partial), `lower(alias_name)`, `canonical_id`. **RLS**: public read · service-role writes only.

### `hotel_canonical_history` (migration 0032 — NEW · rebrand policy Layer C)
Append-only timeline of building identities. The row with `valid_to IS NULL` is the current identity (kept in sync with `hotel_canonical` by operator workflow). Lets us audit "what was this building called in 2015?" without destroying current state.

| Column | Type | Notes |
|---|---|---|
| id | UUID PK | gen_random_uuid() |
| canonical_id | UUID FK | → `hotel_canonical(id)` cascade |
| canonical_name · brand · brand_family · chain_scale | snapshot fields | Identity at that point in time |
| valid_from | date NOT NULL | When this identity activated |
| valid_to | date | When it ended · NULL = current |
| rebrand_reason | text | e.g. `marriott_brand_swap_2018` · `marriott_luxury_collection_swap_2020` |
| source_record_id | UUID FK | Optional · ties to `hotel_source_record` if a CoStar payload provoked the change |

**Indexes**: `(canonical_id, valid_from)`, partial `(canonical_id) WHERE valid_to IS NULL`. **RLS**: public read.

### `dup_tier_enum` (extended in 0032)
Added value `same_building_rebrand` · used by `hotel_duplicate_candidate.tier` when the Capa A same-building detector surfaces a geo-based rebrand candidate (parallel to the existing name-based `auto_merge` / `needs_review` / `likely_duplicate`).

### Rebrand policy · how the 3 layers work together

| Layer | Component | When it runs |
|---|---|---|
| **A** | `apps/web/src/lib/enrichment/dedup/same-building-detector.ts` | At enrichment time when CoStar mundial brings a new candidate · pure TS function `detectSameBuilding(candidate, neighbors)` returns geo-first matches (haversine ≤30m + postal + rooms ±20%) |
| **B** | `hotel_name_alias` | Always · `resolveCanonicalIdAny()` consults `alias_slug` after the primary slug lookup misses |
| **C** | `hotel_canonical_history` | When an operator confirms a rebrand · write old + new identity rows |

Seeded rebrands (migration 0033): `ac-cuzco` → The Westin Madrid Cuzco · The Westin Palace Madrid → The Palace, a Luxury Collection Hotel, Madrid (slug `westin-palace`).

### Other Supabase tables (already documented inline in their migrations)
`hotel_report_library` · `hotel_source_record` · `hotel_field_provenance` ·
`hotel_enrichment_run` · `hotel_duplicate_candidate` · `hotel_enrichment_job` ·
`hotel_enrichment_dlq` · `rate_limit_state` · `market` · `submarket` ·
`operators` · `valuations` · `top_promote_reports` · `favorite_reports` ·
`subscription_products` · `campaigns` · `contact_invitations` · …

---

## P&L USALI templates (migration 0035 — NEW · Supabase migration FASE 1)

Single source of truth for the USALI percentages that the report engine and the admin financials panel consume. Replaces the hardcoded `PNL_FORECAST_5Y` array (in `apps/web/src/lib/admin/financials/defaults.ts`) and removes the localStorage-only persistence of operator edits.

### Enums

- `pnl_data_source` — `costar_real` · `costar_submarket_aggregate` · `costar_national` · `hardcoded_default` · `derived_mvp_rule` · `pending_costar`
- `pnl_segmentation_type` — `hotel` · `apartahotel` · `hostel`

### `pnl_template`
Canonical USALI percentages per `(country × market × submarket × class × segmentation_type)`. Written by `services/costar/scripts/build_financials_master.py` (FASE 2 wiring pending). CoStar-English keys (e.g. `Madrid Centre`, `Upper Upscale`); display-language translation lives in the UI layer (`pnl-i18n.ts`, FASE 3).

| Column group | Columns |
|---|---|
| Identification | `country char(2)` · `market text` · `submarket text` · `class text` · `segmentation_type pnl_segmentation_type` |
| Revenue mix (% total revenue) | `rooms_revenue_pct` · `fb_food_pct` · `fb_beverage_pct` · `meeting_events_pct` · `spa_wellness_pct` · `parking_other_pct` |
| Departmental (% own dept rev) | `expenses_rooms_pct` · `expenses_fb_pct` · `other_departments_pct` |
| Undistributed (% total rev) | `admin_general_pct` · `it_telecom_pct`* · `sales_marketing_pct` · `operations_maintenance_pct` · `utilities_pct` |
| Results (informational) | `gop_pct` · `management_fees_pct` · `rent_pct`* · `property_taxes_pct` · `insurance_pct` · `ebitda_pct` · `staff_cost_memo_pct` |
| Provenance | `data_source` · `last_imported_at` · `imported_from` · `notes` |
| Audit | `created_at` · `updated_at` (trigger-maintained) |

*`it_telecom_pct` and `rent_pct` are EXCLUDED from the HotelVALORA EBITDA calculation. Stored for CoStar parity and informational display only. See `VALUATION_METHODOLOGY.md` annex "Modelo HotelVALORA de EBITDA".

**Unique**: `(country, market, submarket, class, segmentation_type)` with `NULLS NOT DISTINCT` (PG15+) so country-only placeholder rows don't collapse. **Indexes**: `(country, market, submarket)` geo · `(data_source)` · `(class, segmentation_type)`. **RLS**: public read (anon report rendering needs it) · service-role writes only.

### `pnl_template_override`
Operator-curated edits layered on top of `pnl_template`. Written via server action gated by `requireOperator()` · the panel never connects directly. NOT touched by the importer when refreshing `pnl_template` from CoStar/Excel — operator corrections survive data refreshes.

| Column | Type | Notes |
|---|---|---|
| id | UUID PK | gen_random_uuid() |
| template_id | UUID FK | → `pnl_template(id)` cascade |
| line_item | text NOT NULL | One of the 21 percentage column names · enforced via CHECK constraint |
| override_value | numeric(5,2) NOT NULL | Replaces the template value at that line |
| operator_email | text NOT NULL | Audit trail · who edited |
| operator_reason | text | Free-text justification (optional) |
| created_at · updated_at | timestamptz | trigger-maintained |

**Unique**: `(template_id, line_item)`. **Indexes**: `template_id`, `operator_email`. **RLS**: enabled with NO policies → no anon/authenticated access; `service_role` only (bypasses RLS by default).

### `pnl_template_effective` (view)
Merges `pnl_template` with `pnl_template_override` via per-line `COALESCE` (override wins). Exposes 21 effective percentage columns plus `overridden_lines text[]` for audit transparency. Runs with `security_invoker=false` so the anon report path sees merged values while `pnl_template_override` itself remains inaccessible to anon (no operator_email leakage).

Implementation: single `LATERAL JOIN` per row with `FILTER (WHERE line_item = ...)` aggregation pivoting the override rows into 21 nullable columns. Type-safe, one scan per template row, planner-friendly.

### Methodology decisions baked into the schema

- **HotelVALORA EBITDA pre-alquiler** (annex in `VALUATION_METHODOLOGY.md`): the schema stores all CoStar lines including `it_telecom_pct` + `rent_pct`. The engine (FASE 4) computes `EBITDA = GOP − management_fees − property_taxes − insurance` and silently skips IT/Telecom + Rent. Column comments in BD make this explicit.
- **`derived_mvp_rule` data_source**: apartahotel and hostel rows are generated by the importer using documented sector rules (management fees 20% apartahotel / 12% hostel; the full derived-rule tables are in the methodology annex). The enum carries the marker so audit + UI banners can disclose the derivation honestly.

### Phased migration plan (this is FASE 1 of 5)

| Phase | What | When |
|---|---|---|
| **1** ✅ | Schema + view + RLS (this migration) | 2026-05-28 |
| 2 | Importer Excel → Supabase (modifies `build_financials_master.py`) | TBD |
| 3 | Panel admin reads/writes Supabase (drops localStorage; adds `pnl-i18n.ts` display layer) | TBD |
| 4 | Engine reads `pnl_template_effective` with hierarchical fallback + HotelVALORA EBITDA flip | TBD |
| 5 | Verification + delta capture | TBD |
