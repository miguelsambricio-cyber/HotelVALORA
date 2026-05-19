# Underwriting

> ⚠️ **DEPRECATED · 2026-05-19**
>
> **Status:** deprecated
> **Reason:** This file documents the Python FastAPI backend (`apps/api/app/services/valuation_service.py`) that has been superseded by the TypeScript engine in `apps/web/src/lib/underwriting/`. The Python valuation service is frozen and not part of the live underwriting pipeline.
> **Canonical replacement:** `docs/underwriting/*` (TS engine architecture · dynamic cap rate · IRR layer separation · phase model · temporal model · divergence docs).
> **Engine version mismatch:** This doc has no concept of the current TS engine versions (`ENGINE_VERSION 0.2.0` / `SCHEMA_VERSION 1.1.0`).
>
> Content below is preserved for git-history continuity and reference to the legacy backend valuation schema. Do not rely on it for current implementation decisions.

---

Hotel investment underwriting models built on top of DCF valuations.  
**Service:** `app/services/valuation_service.py`  
**Routes:** `app/api/v1/valuations/underwriting.py`, `app/api/v1/valuations/dcf.py`  
**Models:** `app/models/valuation.py` — `Valuation`, `Underwriting`

---

## Valuation Model (`valuations` table)

| Column | Type | Notes |
|---|---|---|
| `hotel_id` / `flex_asset_id` | UUID FK | Nullable — one or the other |
| `created_by_id` | UUID FK → users | SET NULL on delete |
| `name` | VARCHAR | Analyst label |
| `valuation_type` | VARCHAR(50) | `dcf` \| `sales_comp` \| `income` |
| `effective_date` | DATE | As-of date |
| `currency` | VARCHAR(3) | Default: `EUR` |
| `concluded_value` | NUMERIC | Computed by DCF engine |
| `value_per_key` | NUMERIC | concluded_value / total_keys |
| `implied_cap_rate` | NUMERIC(6,4) | Year-1 NOI / concluded_value |
| `assumptions` | JSONB | Input parameters (see DCF Inputs) |
| `cash_flows` | JSONB | Year-by-year FCF array |
| `sensitivity` | JSONB | Grid by discount_rate × terminal_cap_rate |
| `notes` | TEXT | Analyst notes |

---

## Underwriting Model (`underwritings` table)

One-to-one with a `Valuation` (`valuation_id` is unique).

| Column | Type | Notes |
|---|---|---|
| `projection_years` | INTEGER | Default: 10 |
| `stabilized_occupancy` | NUMERIC | 0–1 |
| `stabilized_adr` | NUMERIC | Daily rate |
| `stabilized_revpar` | NUMERIC | Computed from occupancy × ADR |
| `cap_rate_entry` | NUMERIC(6,4) | Going-in cap rate |
| `cap_rate_exit` | NUMERIC(6,4) | Terminal cap rate |
| `discount_rate` | NUMERIC(6,4) | WACC |
| `ltv_ratio` | NUMERIC(6,4) | Loan-to-value |
| `dscr` | NUMERIC | Debt service coverage ratio |
| `irr` | NUMERIC | Internal rate of return |
| `equity_multiple` | NUMERIC | Total equity / invested equity |
| `detail` | JSONB | Full model detail (year-by-year, assumptions) |

---

## Workflow

```
POST /valuations/dcf
  └── ValuationService.create_valuation(payload)
        creates Valuation row with assumptions JSONB
  └── ValuationService.run_dcf(valuation_id)
        computes cash_flows + NPV → stores in valuations.cash_flows + concluded_value

POST /valuations/underwriting/{valuation_id}
  └── ValuationService.create_underwriting(valuation_id, payload)
        creates Underwriting linked to Valuation

GET /valuations/dcf/{id}/sensitivity
  └── ValuationService.sensitivity_table(id, discount_rates, exit_cap_rates)
        iterates grid → stores in valuations.sensitivity → returns table
```

---

## DCF Assumptions (`assumptions` JSONB)

Keys stored in the JSONB column (subset of `DCFInput`):

```json
{
  "total_keys": 200,
  "projection_years": 10,
  "discount_rate": 0.10,
  "terminal_cap_rate": 0.07,
  "stabilized_occupancy": 0.72,
  "stabilized_adr": 220.0,
  "revenue_growth_rates": [0.03],
  "noi_margin": 0.35,
  "capex_reserve_pct": 0.04
}
```

---

## Cash Flow Output (per year)

```json
{
  "year": 1,
  "noi": 5420000.00,
  "capex_reserve": 216800.00,
  "free_cash_flow": 5203200.00,
  "discount_factor": 0.909091,
  "pv": 4730181.82
}
```

Terminal year appended:
```json
{
  "year": "Terminal (Y10)",
  "terminal_noi": 7280000.00,
  "terminal_value": 104000000.00,
  "pv": 40129815.33
}
```

---

## Sensitivity Table Structure

```json
{
  "0.08": { "0.06": 142000000, "0.07": 128000000, "0.08": 116000000 },
  "0.10": { "0.06": 118000000, "0.07": 107000000, "0.08":  97000000 },
  "0.12": { "0.06":  99000000, "0.07":  90000000, "0.08":  82000000 }
}
```

Outer key = discount_rate, inner key = terminal_cap_rate, value = NPV.
