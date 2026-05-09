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

## Year 1 monthly expansion (Jan–Dec breakdown)

The Year 1 column is expandable — clicking the chevron `▸ Year 1` in the table header replaces the single column with 12 monthly sub-columns (Jan–Dec) inline within the same USALI table. The chevron flips to `▾` while expanded.

### Seasonality engine
Lives in `apps/web/src/lib/report/financials/seasonality.ts`. Exports:
- `SeasonalityProfile` — canonical contract: `occupancy[12]` + `adr[12]` multipliers + `source` identifier
- `MADRID_UPSCALE_SEASONALITY` — default profile (Q2/Q3 strong, Aug weak, Jan/Feb soft)
- `getSeasonalityProfile(market, hotelClass)` — lookup; v1 returns the Madrid default
- `expandYear1ToMonthly(assumptions, computed, profile)` — pure pipeline that produces `MonthlyYear1Breakdown`
- `adapterFromCoStarMonthlyRows(rows, source)` — adapter stub for future Excel ingestion

### Mathematical guarantees
Sum of monthly values = annual Year-1 value, **exactly**:
- Variable lines (revenue, mgmt fee, FF&E, dept variable portion): ratio × monthly base, sums to ratio × annual
- Inflated lines (Admin / S&M / Property maint / Utilities / Property tax): annual amount distributed pro-rata by days
- Hybrid departmental fixed-payroll portion: same pro-rata by days

EBITDA % margin per month varies (low-occupancy months bear the same fixed costs but lower revenue → lower margin; peak months → higher margin).

### Future CoStar Excel ingestion
The architecture is preparation-complete:
1. UI consumes `SeasonalityProfile` — agnostic to source
2. `getSeasonalityProfile(market, class)` is the swap point
3. `adapterFromCoStarMonthlyRows` (or future `adapterFromCompSetExcel`) maps raw Excel → profile
4. UI never sees Excel format directly

Replace `getSeasonalityProfile` body with a CoStar query/Excel adapter call when the dataset ships — every consumer (P&L expansion, future IRR sensitivity, year-1 stress tests) auto-inherits.

### Print behaviour
The expansion state is preserved across print — if the analyst left Year 1 expanded before exporting PDF, the 12 month columns appear in the PDF; otherwise the Year 1 column stays collapsed. No automatic collapse-for-print. With 18 columns the table may overflow A4 portrait — that's an acceptable analyst trade-off given the manual choice.

---

## 5-Year P&L Forecast scenario model (`/report/financials/pl`)

Three underwriting scenario presets drive the entire 5-year forecast. Each preset is a complete (occupancy pp-deltas + ADR YoY growth) tuple per year. Active scenario lives on `PLAssumptions.activeScenario`; switching it re-projects every downstream metric in a single `computePL(a)` pass.

| Scenario | UI label | Y2 Occ Δ | Y3 Occ Δ | Y4 Occ Δ | Y5 Occ Δ | Y2 ADR | Y3 ADR | Y4 ADR | Y5 ADR |
|---|---|---|---|---|---|---|---|---|---|
| `downside` | Down | +1.0pp | +1.0pp | +0.5pp | +0.5pp | +1.5% | +2.0% | +2.0% | +2.5% |
| `base`     | Base | +3.0pp | +2.0pp | +1.0pp | 0pp | +3.6% | +2.9% | +1.5% | +2.4% |
| `upside`   | Up   | +3.0pp | +2.0pp | +1.0pp | 0pp | +5.0% | +4.5% | +4.0% | +3.5% |

Base preset is calibrated to the Stitch reference. Year 1 occupancy + ADR live on `PLAssumptions.occupancyYear1` / `adrYear1` so the analyst can rebase the starting point without touching the scenario shape.

### Variable vs inflated cost lines (operating leverage)

Departmental expenses, mgmt fee and FF&E reserve scale with revenue (ratio × revenue, ratio held constant). Undistributed lines + property tax & insurance are FIXED costs that inflate from their Year-1 base by `expenseInflation` rates compounded across years. When scenario RevPAR growth (5-9%) outpaces inflation (2.5-3.5%), EBITDA margin expands year over year — the operating leverage that institutional underwriting expects.

| Line | Behaviour | Driver |
|---|---|---|
| Departmental Rooms / F&B / Other | Hybrid 70/30 | 70% ratio × dept revenue + 30% Y1 base × `payroll` infl compound |
| Mgmt fee | Variable | ratio × total revenue |
| FF&E reserve | Variable | ratio × total revenue |
| Admin & General | Inflated | Y1 base × (1 + `other` infl)^year |
| Sales & Marketing | Inflated | Y1 base × (1 + `other` infl)^year |
| Property & Maint. | Inflated | Y1 base × (1 + `other` infl)^year |
| Utilities | Inflated | Y1 base × (1 + `utilities` infl)^year |
| Property tax & insurance | Inflated | Y1 base × (1 + `other` infl)^year |

**Payroll inflation now drives the model**: the 30% fixed-payroll share of departmental expenses inflates from the Year-1 base by the `payroll` rate compounded each year. This produces the small late-cycle margin compression that institutional underwriters expect — when revenue growth slows below payroll inflation in the late years, the fixed payroll share starts dragging on margin.

`DEPT_PAYROLL_FIXED_SHARE = 0.3` is hard-coded in `calculations.ts` (institutional default for full-service hotels). Future enhancement: expose per-department on `PLAssumptions` for chain-specific calibration.

`SCENARIO_PRESETS` is exported from `lib/report/financials/assumptions.ts`. Future CoStar ingestion will replace the hand-tuned defaults with country/market/class-keyed rows.

### EBITDA Stabilized card
The big-number metric is the Year-3 EBITDA % margin from `computed.results.ebitdaMargin[2]`. It auto-tracks any edit to assumptions or scenario rates — the analyst doesn't type a target.

### Tier permissions
- **FREE**: no access (page-level gate). FREE is Executive Summary only.
- **PRO**: full table + cards visible, all inputs render `readOnly` (including the 3 scenario rates).
- **PREMIUM**: editable.

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
