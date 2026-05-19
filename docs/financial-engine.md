# Financial Engine

> ⚠️ **DEPRECATED · 2026-05-19**
>
> **Status:** deprecated
> **Reason:** This file documents the Python financial engine (`services/financial_engine/` · NumPy/SciPy/Celery) which is no longer the live underwriting pipeline. The active engine is in TypeScript: `apps/web/src/lib/underwriting/engine/*` (modular orchestrator · per-module reconciliation · operator-driven scenario inputs).
> **Canonical replacement:** `docs/underwriting/dynamic-cap-rate-engine.md` · `docs/underwriting/temporal-model.md` · `docs/underwriting/irr-layer-separation.md` · `docs/underwriting/phase-model.md`.
> **Engine version mismatch:** Python engine is unversioned · the live TS engine ships as `ENGINE_VERSION 0.2.0` / `SCHEMA_VERSION 1.1.0`.
>
> Content below is preserved for git-history continuity. Do not rely on it for current implementation decisions.

---

**Location:** `services/financial_engine/`  
**Runtime:** Python, NumPy, SciPy  
**Invocation:** direct import by `app/services/valuation_service.py` or via Celery task

---

## Module Map

```
engine/
├── dcf/
│   ├── models.py        Pydantic I/O schemas: DCFInput, DCFResult, CashFlowYear, TerminalValue
│   ├── projections.py   Core DCF calculation
│   └── sensitivity.py   Grid: discount_rate × terminal_cap_rate → NPV
├── metrics/
│   ├── adr.py           ADR = Rooms Revenue / Rooms Sold
│   └── revpar.py        RevPAR = Occupancy × ADR
└── underwriting/
    ├── noi.py           NOI = Total Revenue − Total Operating Expenses
    └── metrics.py       IRR, equity multiple, DSCR
```

---

## DCF Inputs (`DCFInput`)

| Field | Default | Notes |
|---|---|---|
| `total_keys` | required | Room count |
| `projection_years` | 10 | |
| `discount_rate` | 0.10 | WACC / required return |
| `terminal_cap_rate` | 0.07 | Exit capitalisation rate |
| `stabilized_occupancy` | 0.70 | 0–1 |
| `stabilized_adr` | 150.0 | Average daily rate at stabilisation |
| `revenue_growth_rates` | [0.03] | Per-year growth vector |
| `noi_margin` | 0.35 | NOI / revenue |
| `capex_reserve_pct` | 0.04 | % of NOI |
| `management_fee_pct` | 0.03 | % of revenue |
| `franchise_fee_pct` | 0.05 | % of revenue |

Defaults configurable via env: `DEFAULT_DISCOUNT_RATE`, `DEFAULT_TERMINAL_CAP_RATE`, `DEFAULT_PROJECTION_YEARS`.

---

## DCF Calculation Logic

Implemented in `ValuationService._compute_dcf()` (`app/services/valuation_service.py`) and mirrored in `services/financial_engine/engine/dcf/projections.py`.

```
base_noi = keys × 365 × occupancy × ADR × noi_margin

for each year:
    noi_year   = base_noi × (1 + growth)^year
    capex      = noi_year × capex_reserve_pct
    FCF        = noi_year − capex
    PV(FCF)    = FCF / (1 + discount_rate)^year

terminal_noi = base_noi × (1 + growth)^(years+1)
TV           = terminal_noi / terminal_cap_rate
PV(TV)       = TV / (1 + discount_rate)^years

NPV = Σ PV(FCF) + PV(TV)
```

---

## DCF Output (`DCFResult`)

| Field | Description |
|---|---|
| `npv` | Net present value |
| `value_per_key` | NPV / total_keys |
| `implied_cap_rate` | Year-1 NOI / NPV |
| `cash_flows` | List of `CashFlowYear` objects |
| `terminal_value` | `TerminalValue` (terminal_noi, TV, PV_of_TV) |

Stored in `valuations.cash_flows` (JSONB) and `valuations.concluded_value`.

---

## Sensitivity Analysis

Grid of NPV values varying `discount_rate` and `terminal_cap_rate`:

```python
table[str(dr)][str(cr)] = npv   # for each (dr, cr) combination
```

Stored as JSONB in `valuations.sensitivity`. Exposed at `GET /valuations/dcf/{id}/sensitivity`.

---

## Key Metrics

### RevPAR
`RevPAR = Occupancy Rate × ADR`  
Measures revenue efficiency per available room. Independent of whether rooms are sold.

### ADR (Average Daily Rate)
`ADR = Rooms Revenue / Rooms Sold`  
Measures pricing power; excludes unsold rooms.

### NOI (Net Operating Income)
`NOI = Total Revenue − Total Operating Expenses`  
Excludes debt service, income taxes, and capital expenditures. Primary driver of cap rate valuation.

### DSCR (Debt Service Coverage Ratio)
`DSCR = NOI / Annual Debt Service`  
Values ≥ 1.25 considered healthy for hotel lending.
