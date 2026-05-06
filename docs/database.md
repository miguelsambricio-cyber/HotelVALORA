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
