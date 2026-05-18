# Section 6 · Investment Memorandum view

Decision · 2026-05-18 · operator-approved.

Section 6 of `/report/financials/underwriting` is NOT a flat investment
inputs table. It is the institutional underwriting narrative — the
piece a HotelVALORA client takes into an acquisition committee,
sends to a lender, or attaches to an investment memorandum.

## Detail layout (4 ordered blocks)

| Block | Title | What it shows |
|---|---|---|
| A | Site Acquisition | Pricing (Asking · Hotel Value · €/key · €/m²) + Dynamic Cap Rate rationale stack + Acquisition costs itemised |
| B | CAPEX Breakdown | Hard cost · Soft cost · Project costs · per-line (Total € · % CAPEX · €/key · €/m² · €/int. m²) + CAPEX phases banner |
| C | Total Investment | Hero (Total · €/key · €/m²) + composition breakdown + Stabilised yield progression Y1..Y5 |
| D | D&A schedule | Building useful life · MEP useful life · combined D&A per period |

## Cap-rate rationale stack

Always 5 narrative layers + optional residual closure:

1. **Base Market Yield** — median observed yield in scope (Madrid Centro etc.)
2. **Category adjustment** — 3* / 4* / 5* premium or discount
3. **Size adjustment** — 200+ keys (institutional scale) · 100–199 (mid-tier) · <100 (narrower buyer pool)
4. **Renovation state** — Renovated / Reposition / Newly built
5. **Scenario** — Conservative / Base / Optimistic
6. **Closure to operator override** — residual reconciling to the operator-locked rate (only when the dynamic stack ≠ override)

Each layer ships with `{ label, delta_pct, rationale }` so the
operator can defend the recommendation in committee.

Block 6 replaces the placeholder layers with the live
MarketEvidence + AdjustmentLogic + ConfidenceEngine outputs.

## CAPEX itemisation (Excel parity)

Every CAPEX line carries:

- `total_eur` · raw spend
- `pct_of_total` · share of total CAPEX (subgroup) for benchmarking
- `per_room_eur` · institutional comparison unit
- `per_sqm_eur` · institutional comparison unit (gross)
- `per_intervention_sqm_eur` · gut-renovation benchmark
- `assumption` · the underwriting driver (e.g. "11.250 €/key", "2%")

Lines (engine-emitted, mirrors Excel):

- **Hard cost** — Structure · Asset content · MEP · Exterior & others
- **Soft cost** — Licensing · Technical Consultant · Development fees · Pre-Opening · FF&E · OS&E · Insurance (Seguro de Obra)
- **Project costs** — Contingency · (Block 3+ adds Insurance development as separate line when split)

## CAPEX phases · future-proof

`InvestmentBreakdown.capex_phases: CapexPhase[]` ships ready for:

- `initial_renovation` (MVP single phase)
- `refurbishment_wave` (Year 5+ FF&E rotation)
- `expansion` (extra keys / wing add)
- `esg_retrofit` (BREEAM / LEED upgrade)
- `tenant_improvement` (operator-side fitout allowance)
- `operator_contribution` (key money offset)
- `fitout` · `contingency` · `insurance`

Each phase has `funded_by` (developer · operator · tenant · esg_grant
· insurance_claim) + `start_period_index` + `drawdown_periods` so
Block 3 can phase drawdowns into the Cash Flow statement.

## Stabilised yield progression

5 mini bars · Y1..Y5 · `NOI ÷ total_investment` per period. Block 2
seeds a deterministic ramp (4.0% → 6.6%) so the UI renders; Block 3
wires the live PnL EBITDA-after-replacement.

## Print discipline

- Landscape (inherited from `ReportShell printOrientation="landscape"`)
- Each block has `print:break-inside-avoid`
- Edit controls (none in MVP; Block 6 adds Cap Rate override card) sit
  inside the summary panel and carry `print:hidden`
- Rationale layers, breakdown tables, totals, and yield progression
  all render with dark→light theme inversion (`print:text-slate-900`,
  `print:bg-white`, `print:border-slate-300`, `print:bg-emerald-50`
  for the highlight bands)

## Type contracts touched

- `InvestmentBreakdown` gains `asking_price`, `hotel_value`,
  `capex_phases: CapexPhase[]`, `stabilized_yield_progression: PeriodSeries`
- `BreakdownLine` gains optional `assumption: string` (driver hint)
- New types: `CapexBucketKind`, `CapexFundedBy`, `CapexPhase`
- `DynamicCapRateResult.adjustments` now seeded with the 5-layer
  narrative stack so the UI has content pre-Block 6
