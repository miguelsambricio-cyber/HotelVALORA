# Underwriting · Temporal model

Decision · 2026-05-18 · operator-approved.

The engine no longer hardcodes 11 yearly columns. Every schedule
carries an explicit `periods: Period[]` axis. Components render N
columns regardless of granularity.

## Period axes by layer

| Layer | MVP granularity | Future granularity | Why |
|---|---|---|---|
| Reporting (P&L · BS · CF · DTA · Exit · Investment · Financing summary) | yearly · 11 periods (Y0..Y10) | yearly + monthly toggle | Investment committee reads yearly · operators inspect monthly when tuning |
| Operations (RevPAR · ADR · Occupancy · departmental drivers) | yearly | monthly (12 × 10 = 120 periods) | STR/CoStar imports are monthly · monthly captures seasonality |
| Financing (debt service · covenants · refinance events) | yearly | monthly | Covenants test trailing-12-month metrics · refinance events land mid-year |
| Taxes (CIT · DTA · Ley IS) | yearly | yearly (always) | Spanish IS is an annual filing · monthly tax has no semantic meaning |

## Period interface

```ts
interface Period {
  id: string;        // stable id · "y0", "y3q2", "y1m05"
  kind: "year" | "quarter" | "month";
  index: number;     // sequential 0-based
  label: string;     // "Year 0", "Y3 Q2", "Y1 Mar"
  start_date?: string; // ISO · set when real calendar dates land
  end_date?: string;
}
```

## Convention

- `Period.index === 0` is the **closing year (Year 0)** · transaction
  close · all CAPEX + debt drawn + equity injected · operations not
  yet running.
- Operating periods aggregate up to reporting periods via a
  PeriodAggregator (Block 3+).
- Financing covenants test against trailing-12-month reporting series
  even when granularity differs.

## Constants

- `YEARLY_PERIODS_Y0_Y10` · MVP default · always year 0..10.
- `monthlyPeriods(yearCount)` · ready helper · not used MVP.
- `quarterlyPeriods(yearCount)` · ready helper · not used MVP.

## Renderer contract

- `<YearGrid periods={periods} …>` accepts any periods[] · derives
  column count from `.length`.
- `<DivisionRow columnCount={1 + periods.length} …>` · stretches to
  the grid · sections compute `cols` once.
- Cells format via `PeriodSeries` (`number[]` aligned to periods[]).

## What still hardcodes 11

Nothing in the engine or primitives. Sections compute period count
from `bundle.computed.periods.length`. Block 4+ will surface the
monthly/quarterly toggle in the UI; the data layer is already ready.
