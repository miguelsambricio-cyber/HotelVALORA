# Financial Engine

**Location:** `services/financial_engine/`  
**Runtime:** Python, NumPy, SciPy  
**Invocation:** Direct import or via Celery task from the API

## Modules

```
engine/
├── dcf/
│   ├── models.py        # Pydantic I/O schemas
│   ├── projections.py   # Core DCF calculation
│   └── sensitivity.py   # Sensitivity grid
├── metrics/
│   ├── adr.py           # Average Daily Rate
│   └── revpar.py        # Revenue Per Available Room
└── underwriting/
    ├── noi.py           # Net Operating Income
    └── metrics.py       # Return metrics (IRR, equity multiple, DSCR)
```

## DCF Engine

### Inputs (`DCFInput`)

| Field | Type | Description |
|---|---|---|
| total_keys | int | Number of hotel rooms |
| projection_years | int | Default: 10 |
| discount_rate | float | WACC / required return |
| terminal_cap_rate | float | Exit capitalization rate |
| stabilized_occupancy | float | Stabilized occupancy (0–1) |
| stabilized_adr | float | Average daily rate at stabilization |
| revenue_growth_rates | list[float] | Per-year growth vector |
| expense_ratio | float | Total expenses / revenue. Default: 0.65 |
| capex_reserve_pct | float | Default: 0.04 |
| management_fee_pct | float | Default: 0.03 |
| franchise_fee_pct | float | Default: 0.05 |

### Outputs (`DCFResult`)

| Field | Description |
|---|---|
| npv | Net present value of all cash flows + terminal |
| value_per_key | NPV / total_keys |
| implied_cap_rate | Year 1 NOI / NPV |
| cash_flows | List of `CashFlowYear` objects |
| terminal_value | `TerminalValue` (terminal NOI, TV, PV of TV) |

### Calculation Logic

1. **Base revenue** = `total_keys × 365 × stabilized_occupancy × stabilized_adr`
2. **Per year**: apply cumulative growth, deduct expenses (ratio + mgmt + franchise), deduct capex reserve → Free Cash Flow
3. **Discount** each FCF at the given `discount_rate`
4. **Terminal value** = Year N+1 NOI / `terminal_cap_rate`, discounted back to present
5. **NPV** = sum of PV(FCF) + PV(Terminal Value)

### Sensitivity Analysis

The engine generates a grid varying `discount_rate` and `terminal_cap_rate` to produce NPV and value-per-key at each combination. Stored as JSONB in `dcf_model_outputs.sensitivity`.

## Key Metrics

### RevPAR
`RevPAR = Occupancy × ADR`  
Measures revenue efficiency per available room, independent of occupancy.

### ADR (Average Daily Rate)
`ADR = Rooms Revenue / Rooms Sold`  
Measures pricing power; excludes unsold rooms.

### NOI (Net Operating Income)
`NOI = Total Revenue − Total Operating Expenses`  
Excludes debt service, taxes, and capital expenditures.  
NOI margin is the primary driver of cap rate valuation.

## Default Assumptions

| Parameter | Default |
|---|---|
| Discount rate | 10% |
| Terminal cap rate | 7% |
| Projection years | 10 |
| Currency | USD |

Defaults are configurable via environment variables (`DEFAULT_DISCOUNT_RATE`, `DEFAULT_TERMINAL_CAP_RATE`, `DEFAULT_PROJECTION_YEARS`).
