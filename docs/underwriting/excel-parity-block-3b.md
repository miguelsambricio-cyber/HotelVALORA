# Excel parity report · Block 3B

Generated 2026-05-18 · scenario `base` · Madrid Centro · 4* · 256 keys ·
exit Y7 · cap 6.25% · LTV 65% · CAPEX-LTC 80% · margin 1.25% over Euribor 2.75%.

Engine version `0.1.0-scaffold` · schema version `1.0.0`.

**Methodology**: per-invariant + per-flow validation via deterministic
engine execution (`scripts/engine-parity-check.mjs`). Tolerances per
`engine/_constants.ts` · ±1 € absolute · ±0.1% relative · ±0.05 ratio.

## Summary

**All hard invariants pass · 0 fail · 6 warnings (scenario-level, not engine-level)**

| Invariant | Status | Notes |
|---|:---:|---|
| I-1 · Balance Sheet balance (assets ≡ eq+debt) | ✅ PASS | All 11 periods · Δ = 0.00 € |
| I-2 · Cash bridge (BS Δcash ≡ CF Δ) | ✅ PASS | All 10 transitions · Δ = 0.00 € |
| I-3 · DSCR ≥ 1.0 post-opening | ⚠️ WARN | Y2-Y7 below 1.0 · scenario truth (under-sized CAPEX tranche) |
| I-4 · DTA non-negative + roll-forward | ✅ PASS | 11 periods · rollΔ = 0.00 € · post-exit absorbed by gain on sale |
| I-5 · Σ Y0 drawdowns ≡ Σ tranche principals | ✅ PASS | 62,598,646 € match |
| I-6 · Retained earnings continuity | ✅ PASS | No breaks |

| Module | Δ vs Excel | Status |
|---|---:|---|
| investment | 0 | ✅ |
| financing | 0 | ✅ |
| pnl | 0 | ✅ |
| dta | n/a (no Excel ref) | engine-only · validated via internal roll-forward |
| exit | n/a (no Excel ref) | engine-only · IRR/MOIC documented below |
| cash_flow | 0 | ✅ matches I-2 bridge |
| balance_sheet | 0 | ✅ matches I-1 |
| reconciliation | n/a | runs last · all hard invariants green |

## Fix shipped alongside Block 3B

`defaults.ts` had `notary_registry_pct: 0.02` (meant as 2%) and
`ajd_pct: 0.06` (meant as 6%) — but the Excel reference shows them as
0.02% and 0.06% (i.e. ×100 too large in the previous defaults).
Corrected to 0.0002 and 0.0006. Block 3A parity report acquisition
costs row now reproduces correctly.

## Module · dta (Spanish Ley IS)

DTA roll-forward (tax €) · driven by EBITDA-30% cap on Financial Expenses
with €1 M floor of deductibility:

| Year | Beg | Inc | Dec | End | Note |
|---:|---:|---:|---:|---:|---|
| Y0 | 0 | 0 | 0 | 0 | Closing year · no operations |
| Y1 | 0 | 235,161 | 0 | 235,161 | Cap = 30% × 5.21M = 1.56M < finexp 2.50M · 940,646 excess × 25% = 235,161 DTA accrued |
| Y2 | 235,161 | 206,211 | 0 | 441,373 | Further excess interest accumulates |
| Y3 | 441,373 | 127,375 | 0 | 568,748 | EBITDA growing reduces excess |
| Y4 | 568,748 | 49,589 | 0 | 618,338 | Near-cap |
| Y5 | 618,338 | 0 | 15,971 | 602,366 | EBITDA capacity opens · DTA starts unwinding |
| Y6 | 602,366 | 0 | 83,857 | 518,509 | More compensation as finexp drops |
| Y7 | 518,509 | 0 | 151,668 | 366,841 | Pre-exit balance · absorbed by sale gain |
| Y8-Y10 | 0 | 0 | 0 | 0 | Post-exit · operations ceased |

Roll-forward consistency: `dta_end[t] ≡ dta_beginning[t] + dta_increases[t] − dta_decreases[t]` · Δ = 0.00 every period ✅

Accounting / Cash / Deferred tax separation:
- `dta.tax_payment` · cash tax (CF outflow)
- `dta.cit_pl` · accounting tax expense (P&L line = current − deferred-movement)
- `dta.dta_compensation` · informational · how much DTA used this year

## Module · exit (4-layer architecture)

### Layer 1 · Operational Exit
- Stabilized NOI = `pnl.ebitda_after_replacement[exit_year]` = **6,048,000 €** at Y7

### Layer 2 · Market Exit
- Exit cap rate = **6.25%** (operator override via `inputs.exit.cap_rate.manual_override_pct`)
- Exit price gross = 6,048,000 ÷ 6.25% = **96,768,000 €**
- Disposition fee = 1.5% × 96,768,000 = 1,451,520 €
- Exit price net of fees = **95,316,480 €**

### Layer 3 · Capital-Structure Exit
- Debt balance at end of Y7 (after scheduled payment) = 23,712,058 €
- Scheduled Y7 debt service = 7,688,825 €
- Total debt repayment at exit = scheduled + balance payoff = **31,400,881 €**

### Layer 4 · Equity Layer
- Equity investment at Y0 = 92,865,413 − 62,598,646 = **30,266,767 €**

**Project IRR = 6.49%** · **Equity IRR = 9.40%** · **MOIC = 1.672x**

| Period | Equity CF | Project CF |
|---:|---:|---:|
| Y0 | −30,266,767 | −92,865,413 |
| Y1 | 2,707,054 | 5,211,000 |
| Y2 | −3,388,044 | 5,597,000 |
| Y3 | −2,951,289 | 5,774,511 |
| Y4 | −2,549,320 | 5,917,236 |
| Y5 | −2,281,826 | 5,925,486 |
| Y6 | −1,988,757 | 5,959,311 |
| Y7 (exit) | 69,907,910 | 101,308,791 |

## Module · balance_sheet (first-class reconciliation layer)

Per-period balance verified to subEuro precision:

| Period | Assets (€) | Eq+Debt (€) | Δ |
|---:|---:|---:|---:|
| Y0 | 92,865,413 | 92,865,413 | 0.00 |
| Y1 | 91,796,784 | 91,796,784 | 0.00 |
| Y2 | 84,604,106 | 84,604,106 | 0.00 |
| Y3 | 77,769,347 | 77,769,347 | 0.00 |
| Y4 | 71,258,772 | 71,258,772 | 0.00 |
| Y5 | 64,950,129 | 64,950,129 | 0.00 |
| Y6 | 58,866,670 | 58,866,670 | 0.00 |
| Y7 (exit) | 59,455,728 | 59,455,728 | 0.00 |
| Y8 | 59,455,728 | 59,455,728 | 0.00 |
| Y9 | 59,455,728 | 59,455,728 | 0.00 |
| Y10 | 59,455,728 | 59,455,728 | 0.00 |

Exit-year treatment (Y7):
- Gain on sale = `exit_price_net_of_fees − book_value_pre_disposal` recognised in accounting NI
- DTA write-off = residual DTA absorbed by fiscal gain · BS DTA → 0
- Building + MEP → 0 (asset disposal)
- Debt → 0 (repaid in full)
- Cash carries the realisation proceeds (59,455,728 € steady-state post-exit)

Post-exit (Y8+):
- Operations stopped · all CF lines = 0
- BS holds the cash from realisation
- Reserves capture cumulative accounting NI (including the exit-year gain)
- BS continues to balance with steady-state cash = equity + 0 debt + 0 assets

## Module · cash_flow (direct method · 4 sections)

Cash bridge to BS verified to 0.00 € across all 10 transitions:

| Transition | BS Δcash | CF.change_in_cash_bs | diff |
|---|---:|---:|---:|
| Y0→Y1 | 2,707,054 | 2,707,054 | 0.00 |
| Y1→Y2 | −3,388,044 | −3,388,044 | 0.00 |
| Y2→Y3 | −2,951,289 | −2,951,289 | 0.00 |
| Y3→Y4 | −2,549,320 | −2,549,320 | 0.00 |
| Y4→Y5 | −2,281,826 | −2,281,826 | 0.00 |
| Y5→Y6 | −1,988,757 | −1,988,757 | 0.00 |
| Y6→Y7 (exit) | 69,907,910 | 69,907,910 | 0.00 |
| Y7→Y8 | 0 | 0 | 0.00 |
| Y8→Y9 | 0 | 0 | 0.00 |
| Y9→Y10 | 0 | 0 | 0.00 |

## Module · financing (DSCR / ICR / LTV)

Computed post-pass in reconciliation (NOI from PnL + debt aggregates):

| Year | DSCR | ICR | LTV |
|---:|---:|---:|---:|
| Y1 | 2.08 | 2.08 | 67.4% |
| Y2 | 0.62 ⚠️ | 2.24 | 60.4% |
| Y3 | 0.66 ⚠️ | 2.58 | 53.4% |
| Y4 | 0.70 ⚠️ | 3.00 | 46.5% |
| Y5 | 0.73 ⚠️ | 3.46 | 39.5% |
| Y6 | 0.76 ⚠️ | 4.10 | 32.5% |
| Y7 | 0.79 ⚠️ | 5.01 | 25.5% |

**Note**: DSCR < 1.0 in Y2-Y7 is a SCENARIO finding, not an engine bug.
The CAPEX tranche (80% LTC over 6 years) plus the asset tranche
amortization (75% over 8 years) creates ~8M €/year debt service vs
~5.5-6M €/year EBITDA. In practice the lender would size differently
(50-60% LTC over 10+ years) to enforce DSCR ≥ 1.20x covenant.

Engine correctly surfaces this via reconciliation warnings (severity `warn`)
without blocking the render. Operator can iterate scenario inputs and
re-evaluate.

## IRR engine (deterministic + edge-case-safe)

Hardened in Block 3B:
- Validates ≥1 positive AND ≥1 negative flow (else NaN · undefined)
- Coarse rate grid scan (−95% to +1,000% in 5% steps) to bracket the root
- Newton-Raphson from bracket midpoint · 60 iterations max
- Bisection fallback when NR diverges or exits bracket · ≤200 iterations
- Tolerance 1e-9 (rate units) · returns NaN only when mathematically undefined

Verified: project IRR converges to 6.49% · equity IRR converges to 9.40%
in <10 NR iterations · MOIC = 1.672x.

## Reconciliation hardening

6 invariants, severity-graded (info / warn / fail), tolerance-aware:

```
I-1 · BS balance               · HARD (fail · ±1 €)
I-2 · Cash bridge              · HARD (fail · ±1 €)
I-3 · DSCR ≥ 1.0 pre-exit      · SOFT (warn · per-period)
I-4 · DTA ≥ 0                  · HARD (fail · ±1 €)
I-5 · Σ Y0 drawdowns ≡ Σ princ · HARD (fail · ±1 €)
I-6 · Reserves continuity      · HARD (fail · ±1 €)
```

Each finding carries `id`, `invariant`, `severity`, `message`,
`period_index`, `expected`, `actual`, `delta`, `tolerance` for
downstream UI surfaces and audit logs.

DSCR/ICR/LTV computed in this module (post-pass) from PnL EBITDA +
financing aggregates · patched back into `prior.financing` so Section 7
renders coverage ratios without a separate fetch.

## Cap Rate Engine hooks (Block 6 prep)

Exit module exposes:
- `stabilized_noi` (Y7 EBITDA after replacement) · ready for Cap Rate
  Engine ConfidenceEngine sizing
- `exit_cap_rate_pct` · sourced via `cap_rate.exit.used_pct` · operator
  override layer already in place
- `debt_repayment_at_exit` · ready for refinance-vs-sell scenario fork
- `equity_cash_flow` / `project_cash_flow` series · ready for waterfall
  decomposition (Block 9 · LP/GP tranches + hurdles)

Cap rate adjustment stack (Block 6 IP):
- `cap_rate.entry.dynamic.adjustments` · already exposing the 5-layer
  narrative (base market yield + category + size + state + scenario)
- `cap_rate.exit.dynamic.adjustments` · same shape for exit yield
- MarketEvidence + ConfidenceEngine remain Block 6 deliverables
