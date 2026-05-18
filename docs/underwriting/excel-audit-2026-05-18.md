# Excel → Engine audit · 2026-05-18

Mapping pass between the operator's underwriting Excel and the
TypeScript engine modules (`apps/web/src/lib/underwriting/engine/*`).
Used by Block 3 as the implementation blueprint — every Excel range
must land in exactly one engine module so reproducibility holds.

| Excel Range | Meaning | Engine Module | Type |
|---|---|---|---|
| `Inputs!B4:B9` | Asset basics · rooms · sqm · market · category · state | `inputs.asset` | input |
| `Inputs!B12:B16` | Acquisition · asking price · hotel value · cap rate · costs | `inputs.acquisition` | input |
| `Inputs!B20:B30` | CAPEX hard/soft cost drivers + contingency | `inputs.capex` | input |
| `Inputs!B34:M44` | P&L drivers · GOP + costs lines (Y0..Y10) | `inputs.pl_drivers` | input |
| `Inputs!B47:B48` | Depreciation lives (building / MEP) | `inputs.depreciation` | input |
| `Inputs!B51:B58` | Financing · LTV · years · grace · bullet · margin | `inputs.financing.tranches[*]` | input · DebtTranche |
| `Inputs!B62:B65` | Exit · cap rate · year · fee | `inputs.exit` | input |
| `Inputs!B68:B70` | Tax · CIT · EBITDA limit · finexp floor | `inputs.tax` | input |
| `Investment!B5:F40` | Acquisition + CAPEX breakdown · per-key / per-sqm | `investment.compute` | computed |
| `Investment!B45:B55` | Site acquisition totals + fees + contingency | `investment.compute` | computed |
| `Financing!B5:M30` | Per-tranche BoFY → payment → interest → principal → EoFY | `financing.compute` | computed |
| `Financing!B33:M40` | DSCR · ICR · LTV per period | `financing.compute` | computed |
| `P&L!B5:M30` | Hotel · F&B · Other · GOP · Costs · EBITDA · D&A · EBIT · FE · EBT · CIT · NI | `pnl.compute` | computed |
| `BS!B5:M30` | Assets + Equity + Debt per period | `balance_sheet.compute` | computed |
| `CF!B5:M40` | Operating · Investment · Financing · Equity · Net CF | `cash_flow.compute` | computed |
| `DTA!B5:M40` | EBITDA cap · 1M€ floor · DTA roll-forward · CIT calc | `dta.compute` | computed |
| `Exit!B5:M30` | Exit price · project CF · equity CF · IRR · MOIC | `exit.compute` | computed |
| `CapRate!B5:F40` | Dynamic Cap Rate market evidence + adjustments (Block 6) | `cap_rate.compute` | computed |

## Hardcoded constants flagged for review (Block 3)

| Excel cell | Value | Should be |
|---|---|---|
| `Inputs!B47` | 25 | input · already in `depreciation.building_years` |
| `Inputs!B48` | 7 | input · already in `depreciation.mep_years` |
| `Inputs!B68` | 25% | input · already in `tax.cit_rate_pct` |
| `Inputs!B69` | 30% | input · already in `tax.ebitda_limit_pct` (Ley IS) |
| `Inputs!B70` | 1,000,000 | input · already in `tax.finexp_floor_eur` |
| `Financing!E12` | 12 | constant · payments-per-year · move to `engine/_constants.ts` (Block 3) |
| `Exit!D5` | 7 | input · `exit.year` |

## Circular references (none)

The Excel model is acyclic once Investment → Financing → P&L → DTA → Exit
→ CF → BS is enforced. The engine DAG mirrors this and `topologicalOrder`
fails fast on any cycle introduced in future blocks.

## Block 3 implementation order

1. `investment.compute` — deterministic, no upstream computed deps
2. `financing.compute` — needs Investment totals for LTV-based principals
3. `pnl.compute` — needs Financing interest for Financial Expenses line
4. `dta.compute` — needs P&L EBITDA + Financial Expenses
5. `exit.compute` — needs P&L stabilised NOI + Financing EoFY at exit year
6. `cash_flow.compute` — last writer of cash · pulls from all of the above
7. `balance_sheet.compute` — derived from CF + P&L + Investment + Financing
8. `reconciliation.compute` — invariants on the assembled object
