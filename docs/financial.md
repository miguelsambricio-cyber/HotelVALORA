# Financial

Business-level financial rules, metrics, and display conventions for the report module.  
For DCF engine internals (Python), see `docs/financial-engine.md`.

---

## Valuation Metrics (Executive Summary)

| Field | Type | Display format | Source |
|---|---|---|---|
| `gopMargin` | percentage | `72.5%` | Gross Operating Profit margin |
| `ebitdaAfterReplacement` | EUR millions | `€12.5M` | EBITDA net of FF&E reserve |
| `capRate` | percentage (2dp) | `6.25%` | Capitalization rate |
| `exitYear` | string | `"2028"` | Projected exit year |
| `scenario` | string | `"Base Case"` | Underwriting scenario label |
| `valuationRangeLow` | number | `€X.XM` | Low end of valuation band |
| `valuationRangeHigh` | number | `€X.XM` | High end of valuation band |
| `estimatedValue` | number | `€X.XM` | Point estimate |
| `perRoom` | number | `€XXXk` | Value per key |
| `perSqmHotel` | number | `€X,XXX/m²` | Hotel value per sqm |
| `perSqmResidential` | number | `€X,XXX/m²` | Residential comparable (muted) |
| `perSqmOffice` | number | `€X,XXX/m²` | Office comparable (muted) |

### Display rules
- Valuation range row: `bg-emerald-50/50`, `text-xl font-extrabold text-forest-900` — most prominent row.
- Residential/Office per-sqm rows: `muted` (italic, `text-slate-400`) — comparables, not primary values.
- Strong row separators after `ebitdaAfterReplacement`, `scenario`, `perSqmHotel`.

---

## Market Metrics (Market Overview)

| Field | Type | Display format |
|---|---|---|
| `adr` | number | `€185` |
| `occupancy` | percentage | `74.2%` |
| `revpar` | number | `€137` |

---

## Sparkline Series (TTM = Trailing Twelve Months)

| Series | Chart type | Color |
|---|---|---|
| `occupancyTTM` | Bar | Default (slate) |
| `adrTTM` | Line | `#005db7` (blue) |
| `revparTTM` | Area | `#0E4B31` (forest green) |

All series: `number[]` of 12 values (monthly).

---

## Formatters

All in `src/lib/report/executive-summary-data.ts`:

```ts
fmtMillionsEUR(n)         // n in millions → "€12.5M"
fmtThousandsEUR(n)        // n in thousands → "€125K"
fmtEURPerSqm(n)           // n EUR/m² → "€3,200/m²"
fmtPercent(n, decimals?)  // 0–100 → "72.5%" (default 1dp)
fmtADR(n)                 // → "€185"
fmtOccupancy(n)           // → "74.2%"
fmtRevPAR(n)              // → "€137"
```

---

## Locked Premium Sections

| Section | Tier | Locked rows |
|---|---|---|
| Valuation | PREMIUM | "P&L Premium", "Underwriting & IRR Equity" |
| Market | PRO | "Hotel & Market Overview", "Projects", "Transactions" |
| Asset | PREMIUM | "Hotel Personalizado", "CAPEX & Renders" |

---

## Data Source

Currently: `src/lib/report/executive-summary-data.ts` (mock).  
Production target: `GET /api/v1/reports/{id}` → typed `ExecutiveSummaryData`.
