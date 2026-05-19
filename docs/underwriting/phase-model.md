# Underwriting · Phase Model

> 2026-05-19 · Engine version `0.2.0` · Schema version `1.1.0`

Institutional underwriting separates the asset lifecycle into distinct **phases**. The frontend presentation logic mirrors that separation so the IC reader sees a coherent investment memorandum: **Initial Investment → Operating Hold → Exit**. Every schedule reads as Y1 → Y{exit}, with the deployment story told separately above the schedule (where applicable) in a dedicated `InitialInvestmentBlock`.

## Phase taxonomy

| Phase | Status | Definition |
|---|---|---|
| `acquisition` | **Live** | Capital deployment phase · CAPEX draw · equity injection · debt drawdown · acquisition fees · pre-opening. Operations not yet running. |
| `operating` | **Live** | Post-stabilization · hotel running · revenue + GOP + debt service + tax. |
| `stabilization` | Reserved | Ramp-up between opening and full stabilization (Y1 ADR build, occupancy ramp). Defaults to `operating` until block 4 lands. |
| `exit` | Reserved | The disposition year. Currently rendered as `operating` with the exit year limit; could carry distinct treatment if disposal accounting moves to its own phase. |

The phase lives on `Period.phase` (in `lib/underwriting/temporal.ts`). Adding new phases is a single-line union update — render layers default unknown phases to `operating`.

## Hybrid UX standard · two layers per section

**Operating schedules** (every YearGrid in the report) hide acquisition columns and read Y1..Y{exit}. **Capital-side sections** additionally render an `InitialInvestmentBlock` above the YearGrid that surfaces the Y0 deployment data the schedule no longer carries.

| Section | Operating schedule | Initial Investment block |
|---|---|---|
| 02 P&L | YearGrid Y1..Y{exit} | — (no Y0 activity) |
| 03 Balance Sheet | YearGrid Y1..Y{exit} | — (initial state captured in Investment hero) |
| 04 Cash Flow | YearGrid Y1..Y{exit} | **Sources & Uses block** · Acquisition · CAPEX · Contingency · Fees+Taxes (Uses) + Debt Drawn · Equity Drawn (Sources) |
| 05 DTA | YearGrid Y1..Y{exit} | — (no Y0 tax activity) |
| 06 Investment · D&A schedule | Plain table Y1..Y{exit} | **Total Investment hero relabeled** "Initial Investment" · already shows acquisition stack + CAPEX + transaction costs |
| 07 Financing · Portfolio schedule | YearGrid Y1..Y{exit} · Drawdown row removed | **Initial Investment · Funding block** · per-tranche principal + share of stack + effective rate |
| 08 Exit · Project + Equity CF | YearGrid Y1..Y{exit} | **Initial Investment · IRR seed block** · Project outflow (unlevered IRR seed) + Equity contributed (levered IRR seed) + Debt drawn |

### Where Y0 lives

- **Section 01 Executive Summary** — Total Investment · Equity Investment · % LTC · Dynamic Cap Rate · Exit Price tiles.
- **Section 04 Cash Flow** — InitialInvestmentBlock with full Sources & Uses + balance reconciliation.
- **Section 06 Investment** — Initial Investment hero (renamed from Total Investment) + headline tiles · Site Acquisition, CAPEX, Total Investment editable.
- **Section 07 Financing** — Initial Investment · Funding block + capital stack visualisation + per-tranche tiles + Aggregate LTV%.
- **Section 08 Exit** — Initial Investment · IRR seed block + Equity contributed / Net exit proceeds / Total distributions stat row + Entry/Hold/Exit valuation cards.

The capital story is **denser and richer** in the InitialInvestmentBlock pattern than a Y0 column would ever be. Sources & Uses, balance reconciliation, per-tranche detail, IRR seed clarity — all surface naturally.

## The `InitialInvestmentBlock` primitive

Lives at `components/underwriting/primitives/initial-investment-block.tsx`. Accepts:

```ts
interface InitialInvestmentBlockProps {
  title?: string;        // default "Initial Investment"
  subtitle?: string;     // mono caption on the right of the eyebrow
  uses: Item[];          // outflows · acquisition · CAPEX · fees
  sources: Item[];       // inflows · debt drawn · equity contributed
  showSubtotals?: boolean; // default true
}
```

Visual contract:
- White card · slate-200 border · `[#005db7]` eyebrow.
- Two-column responsive layout · stacks on mobile.
- Per-side subtotal + Sources − Uses reconciliation in the footer (when both sides present).
- Uses render in amber-700 · Sources in emerald-700 · institutional sign convention.
- Print-safe · `print:break-inside-avoid`.

### Engine intact

The phase filter is **purely presentational**. The engine continues to:
- Compute every period from index 0 onward (acquisition through exit).
- Drive `total_building_cost` at Y0 in `investment.ts`.
- Sign equity injection + debt drawdown at Y0 in `exit.ts` (`projectCf[0] = -total_building_cost`, `equityCf[0] = -equity_investment`).
- Reconcile balance sheet invariants at every period including acquisition.
- Maintain `phase` metadata on every Period so future construction / phased renovation layers can opt-in to dedicated views.

Reconciliation reports, IRR / MOIC calculations, parity checks against Excel — all unaffected.

## Implementation map

| File | Role |
|---|---|
| `lib/underwriting/temporal.ts` | `PeriodPhase` type · `Period.phase` field · `markAcquisitionPhase()` helper · YEARLY_PERIODS_Y0_Y10 tags Y0 as `acquisition`. |
| `components/underwriting/primitives/year-grid.tsx` | `YearGridKind` + Context (`useYearGridContext`) carrying `visibleIndices[] + phases[] + kind` to children. `excludeAcquisition` prop drops acquisition columns from the table. |
| `components/underwriting/primitives/year-row.tsx` | Maps values via `visibleIndices.map(i => values[i])`. |
| `components/underwriting/primitives/subtotal-row.tsx` | Same projection. |
| `components/underwriting/sections/pnl-section.tsx` | `kind="operating"` + `excludeAcquisition`. `cols` recomputed from operating-only count. |
| `components/underwriting/sections/balance-sheet-section.tsx` | Same. |
| `components/underwriting/sections/cash-flow-section.tsx` | Same. |
| `components/underwriting/sections/dta-section.tsx` | Same. |
| `components/underwriting/sections/financing-section.tsx` | Same. |
| `components/underwriting/sections/exit-section.tsx` | Same. |
| `components/underwriting/sections/investment-section.tsx` (D&A schedule) | Manual `visibleIndices` filter (plain HTML table — same logic as YearGrid). |

To convert a future schedule to the operating-only standard: add `kind="operating"` + `excludeAcquisition` to its YearGrid call, recompute `cols` from `periods.filter((p) => p.phase === "operating")`. Nothing else changes.

## Future-proofing

The architecture already supports:

- **Multi-period acquisitions** — `markAcquisitionPhase(periods, 2)` tags Y0 + Y1 as `acquisition`. Every schedule drops both columns; headline tiles can still surface the cumulative deployment.
- **Phased renovation / construction periods** — wrap monthly or quarterly axes with the same helper.
- **Staged openings** — overlay an additional `stabilization` phase (block 4); rendering rules default to `operating` until styling is added.
- **Delayed stabilization** — extend the acquisition stretch to N years; no presentation code change needed.
- **Dedicated capital deployment view** (future) — a `kind="capital"` view (e.g. tab "Deployment & Funding") could surface the hidden acquisition columns explicitly when the operator wants the technical timeline. The default IC memo stays operating-only.

## PDF / print discipline

Hiding the acquisition column across every schedule produces a coherent, dense landscape A4 memo:

- Every year-grid table reads Y1..Y{exit} — same start, same finish.
- Column widths breathe (`74% / N` where N is the visible count, typically 7).
- The IC reader's eye lands on Year 1 directly in every schedule · no detour through a column that's empty in P&L, dense in CF, and idle in BS.
- The capital story is delivered up-top in the headline tile rows · the schedules deliver the operating story.

The result: an underwriting memo that reads as a single institutional investment memorandum rather than seven schedules stitched together with inconsistent temporal models.
