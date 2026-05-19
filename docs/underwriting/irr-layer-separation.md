# Project + Equity IRR · Layer Separation

> 2026-05-19 · Engine version `0.2.0` · Schema version `1.1.0`

Institutional underwriting separates two economic layers when measuring return:

| Layer | Levered? | Tax? | What it answers |
|---|---|---|---|
| **Project** | Unlevered | Pre-tax | Is this asset operationally + market-priced attractive *regardless of structure*? |
| **Equity** | Levered | Post-tax | What does the LP take home, including tax shield from leverage? |

Mixing them produces nonsense numbers and breaks IC comparability across deals.

---

## Project Layer · UNLEVERED · PRE-TAX

**Purpose** — asset-level economics. Strips out the sponsor's financing decisions and the jurisdiction's tax regime so two hotels can be benchmarked apples-to-apples.

**Cash-flow construction** (`engine/exit.ts`):

```
Period 0          : −total_building_cost
Periods 1..exit   : EBITDA after Replacement
Period exit       : EBITDA + exit_price_gross
```

No cash tax, no debt service, no disposition fees, no debt payoff.

**IRR target band** — 6–10% on European 4* / 5* hospitality (varies with cap rate and hold period).

**When to compare** — across markets, across sponsors, across financing structures. This is the institutional "is the deal alive" number.

---

## Equity Layer · LEVERED · POST-TAX

**Purpose** — investor economics. What hits the LP's bank account after Hacienda and after debt is fully repaid.

**Cash-flow construction** (`engine/exit.ts`):

```
Period 0          : −equity_investment
Periods 1..exit   : EBITDA − cashTax − debtService
Period exit       : (exit_price × (1 − fee_pct)) − debt_balance_payoff
```

Captures the tax shield from interest deductibility (one of the primary economic benefits of leverage).

**IRR target band** — 12–20% levered on European 4* hospitality, depending on tier of operator and tightness of debt.

**When to compare** — fund-level returns, LP commitments, waterfall hurdles. Drives the promote feed in Block 9.

---

## Why this distinction matters

Before this refactor, `project_irr_pct` was computed using `EBITDA − cashTax` and the *net-of-fees* exit price. That made it neither truly pre-tax nor truly unlevered — the cash tax used was the LEVERED-engine tax (already benefits from the interest shield). The number drifted between two conventions and was misleading on IC decks.

Now:
- `project_irr_pct` is the clean unlevered pre-tax number. Comparable across the universe.
- `equity_irr_pct` is the clean levered post-tax number. Standard LP convention.

---

## Future-proof slots

`ExitMetrics` (in `lib/underwriting/types.ts`) carries four optional null slots ready for the next blocks:

| Field | Block | Definition |
|---|---|---|
| `project_irr_posttax_pct` | 10 | Unlevered NOPAT-based (no tax shield). For after-tax asset benchmarking. |
| `equity_irr_gross_pct` | 9 | Levered post-tax BEFORE promote split. |
| `lp_irr_pct` | 9 | LP slice of `equity_cash_flow` after promote waterfall. |
| `gp_irr_pct` | 9 | GP slice (catch-up + carry). |

The UI currently shows only `project_irr_pct` (Unlevered · pre-tax) and `equity_irr_pct` (Levered · post-tax). Adding the rest is a UI registry edit — no engine change needed.

---

## Parity impact vs prior engine (0.1.0)

Project IRR will **drift upward** vs the old engine on every scenario because:
- Cash tax is no longer subtracted from the unlevered numerator.
- Exit price is gross (not net of disposition fees).

Magnitude on base case (Madrid Centro 4* / 256 keys / 7y hold, 25% CIT):
- Old Project IRR (post-tax with net exit) ≈ 6.49%
- New Project IRR (pre-tax with gross exit) ≈ ~8.0–9.0% (recomputed value visible in live engine).

Equity IRR is **unchanged** in math — same `ebitda − cashTax − debtService` operating CF, same `exit_price_net_of_fees − debt_payoff` at exit. Only the label clarified to "Levered · post-tax".

Excel parity reports (`docs/underwriting/excel-parity-block-3a.md`, `-3b.md`) will need to be rerun against the new methodology before the next institutional release.

---

## Files touched

| File | Change |
|---|---|
| `engine/exit.ts` | Project CF now EBITDA-only + gross exit price. |
| `engine/formulas.ts` | New helpers `projectUnleveredPretaxOperatingCf`, `equityLeveredPosttaxOperatingCf`; both added to `FORMULAS` registry. |
| `types.ts` | `ExitMetrics` doc-commented + 4 future-proof IRR slots. |
| `versioning.ts` | Engine bumped to `0.2.0`, schema to `1.1.0`. |
| `executive-summary-section.tsx` | Subtítulo labels "Unlevered · pre-tax" / "Levered · post-tax". |
| `exit-section.tsx` | Same. |
| `underwriting-shell.tsx` (FloatingKpiStrip) | Same. |
