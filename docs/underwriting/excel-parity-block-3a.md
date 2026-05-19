# Excel parity report · Block 3A

> ⚠️ **STALE · ENGINE VERSION MISMATCH · 2026-05-19**
>
> **Status:** stale (numbers from `0.1.0-scaffold`)
> **Reason:** This parity report was generated against engine `0.1.0-scaffold`. The live engine is now `0.2.0` with material semantic changes:
> - **Project IRR** redefined to truly **unlevered · pre-tax** (no longer subtracts cash tax · uses gross exit price). See `docs/underwriting/irr-layer-separation.md`.
> - **DSCR** numerator changed from `ebitda_after_replacement` to `gross_operating_profit` (institutional hospitality basis). See changelog 2026-05-19.
> - **DYR** (debt yield) added as a new ratio.
> - **Upfront fee** (0.5% one-time Y1) added to portfolio debt service.
> - **Phase model** (acquisition vs operating) hides Y0 from operating tables.
> - Numerous override fields added: `cap_rate_entry_pct` · `exit_cap_rate_pct` · `senior_years` · `senior_margin_pct` · `senior_bullet_pct` · `senior_grace_periods` · `capex_*_pct` · etc.
>
> **Canonical replacement (when re-run):** parity report against `ENGINE_VERSION 0.2.0` (PENDING). Bump to `0.3.0` is planned once admin/financials cap-rate policy is consumed by the engine (see `docs/underwriting/cap-rate-policy-divergence.md`).
>
> **Do not rely** on the numbers in this report for current validation. The Excel-mapping discipline below (Excel range → engine module) is still useful as a structural reference for the next parity pass.

---

Generated 2026-05-18 · scenario `base` · Madrid Centro · 4* · 256 keys
· renovated · asking 82.3M · cap 6.25% · LTV 65% · margin 1.25% over
Euribor 2.75%.

Engine version `0.1.0-scaffold` · schema version `1.0.0`.

**Methodology**: each check compares an Excel reference figure
(from the operator's underwriting workbook) against the engine output
produced by running `runEngine(SCENARIO_BASE.inputs)`.
Tolerances: ±1 € absolute (eur), ±0.1% absolute (pct), ±0.05 (ratio).
"drift" = within 5× tolerance · "fail" = beyond 5× tolerance.

## Summary

**Total checks**: 30 · ✅ 30 match · ⚠️ 0 drift · ❌ 0 fail

| Module | ✅ Match | ⚠️ Drift | ❌ Fail | Notes |
|---|---:|---:|---:|---|
| investment | 18 | 0 | 0 | All Excel formulas reconciled (exterior basis = MEP + FF&E + OS&E; TC base = HARD + PRE + FF&E + OS&E; contingency base excludes insurance) |
| financing | 6 | 0 | 0 | Per-tranche schedules deterministic; DSCR/ICR/LTV intentionally zero (Block 3B fills) |
| pnl | 6 | 0 | 0 | GOP / costs passthrough from inputs (€ × 1000 expansion); D&A matches Excel exactly |

## Module · investment

| Check | Kind | Excel | Engine | Δ | Status |
|---|---|---:|---:|---:|---|
| Asking Price | eur | 82,300,000 | 82,300,000 | 0 | ✅ match |
| Hotel Value (appraised) | eur | 83,383,058 | 83,383,058 | 0 | ✅ match |
| Notary & Registry (0.02% × asking) | eur | 16,460 | 16,460 | 0 | ✅ match |
| AJD (0.06% × asking) | eur | 49,380 | 49,380 | 0 | ✅ match |
| ITP / Acq fee / Key money | eur | 0 | 0 | 0 | ✅ match |
| Acquisition costs total | eur | 65,840 | 65,840 | 0 | ✅ match |
| Site Acquisition total | eur | 82,365,840 | 82,365,840 | 0 | ✅ match |
| MEP (11,250 × 256) | eur | 2,880,000 | 2,880,000 | 0 | ✅ match |
| Exterior (2% × (MEP+FF&E+OS&E)) | eur | 185,600 | 185,600 | 0 | ✅ match |
| Hard Cost total | eur | 3,065,600 | 3,065,600 | 0 | ✅ match |
| Licensing (2% × HARD) | eur | 61,312 | 61,312 | 0 | ✅ match |
| Technical Consultant (4% × (HARD+PRE+FF&E+OS&E)) | eur | 378,624 | 378,624 | 0 | ✅ match |
| FF&E (23,500 × 256) | eur | 6,016,000 | 6,016,000 | 0 | ✅ match |
| OS&E (1,500 × 256) | eur | 384,000 | 384,000 | 0 | ✅ match |
| Insurance dev. (0.12% × asking) | eur | 98,760 | 98,760 | 0 | ✅ match |
| Contingency (5% × (HARD + SOFT pre)) | eur | 495,277 | 495,277 | 0 | ✅ match |
| CAPEX total | eur | 10,499,573 | 10,499,573 | 0 | ✅ match |
| Total Building Cost | eur | 92,865,413 | 92,865,413 | 0 | ✅ match |

### Formula clarifications (Block 3A reverse-engineering)

Three Excel formulas were not obvious from cell labels alone — they
are now centralised in `engine/investment.ts` and the tolerance
matches Excel exactly:

- **Exterior** = `exterior_pct × (MEP + FF&E + OS&E)`. We initially
  tried `exterior_pct × asking_price` (delta 1,460,400 €, ~787%) before
  reverse-engineering the asset-content basis.
- **TC + Dev fee** share base = `HARD + PRE + FF&E + OS&E`. Licensing
  uses HARD only.
- **Contingency** base = `HARD + SOFT_pre_contingency_and_insurance`
  (excludes insurance + contingency itself · circular avoidance).

## Module · financing

Senior Secured tranche · 65% × hotel_value = **54,198,988** principal ·
10 years · grace 1 · bullet 25% · floating Euribor 12m (2.75%) + margin
(1.25%) = **4.00% effective**.

| Check | Kind | Excel | Engine | Δ | Status |
|---|---|---:|---:|---:|---|
| Senior · principal at origination | eur | 54,198,988 | 54,198,988 | 0 | ✅ match |
| Senior · bullet at maturity (25%) | eur | 13,549,747 | 13,549,747 | 0 | ✅ match |
| Senior · annual amort Y2-Y9 (40.6M ÷ 8) | eur | 5,081,155 | 5,081,155 | 0 | ✅ match |
| Senior · interest Y1 (BoFY × 4%) | eur | 2,167,960 | 2,167,960 | 0 | ✅ match |
| CAPEX · principal (80% × 10.5M) | eur | 8,399,658 | 8,399,658 | 0 | ✅ match |
| CAPEX · annual amort Y2-Y7 (8.4M ÷ 6) | eur | 1,399,943 | 1,399,943 | 0 | ✅ match |

### Per-period schedule (engine outputs · € rounded)

**Senior Secured** · drawdown Y0 = 54,198,988

| Period | BoFY | Interest | Loan principal | Bullet | EoFY |
|---:|---:|---:|---:|---:|---:|
| Y0 | 0 | 0 | 0 | 0 | 54,198,988 |
| Y1 | 54,198,988 | 2,167,960 | 0 | 0 | 54,198,988 |
| Y2 | 54,198,988 | 2,167,960 | 5,081,155 | 0 | 49,117,833 |
| Y3 | 49,117,833 | 1,964,713 | 5,081,155 | 0 | 44,036,678 |
| Y4 | 44,036,678 | 1,761,467 | 5,081,155 | 0 | 38,955,523 |
| Y5 | 38,955,523 | 1,558,221 | 5,081,155 | 0 | 33,874,368 |
| Y6 | 33,874,368 | 1,354,975 | 5,081,155 | 0 | 28,793,213 |
| Y7 | 28,793,213 | 1,151,729 | 5,081,155 | 0 | 23,712,058 |
| Y8 | 23,712,058 | 948,482 | 5,081,155 | 0 | 18,630,903 |
| Y9 | 18,630,903 | 745,236 | 5,081,155 | 0 | 13,549,748 |
| Y10 | 13,549,748 | 541,990 | 0 | 13,549,747 | 1 |

> Y10 EoFY rounds to 1 € due to euro rounding of the bullet amount.
> Acceptable under ±1 € tolerance. Block 3B reconciliation will absorb
> rounding residuals into the bullet payment.

**Senior CAPEX** · drawdown Y0 = 8,399,658

| Period | BoFY | Interest | Loan principal | EoFY |
|---:|---:|---:|---:|---:|
| Y0 | 0 | 0 | 0 | 8,399,658 |
| Y1 | 8,399,658 | 335,986 | 0 | 8,399,658 |
| Y2 | 8,399,658 | 335,986 | 1,399,943 | 6,999,715 |
| Y3 | 6,999,715 | 279,989 | 1,399,943 | 5,599,772 |
| Y4 | 5,599,772 | 223,991 | 1,399,943 | 4,199,829 |
| Y5 | 4,199,829 | 167,993 | 1,399,943 | 2,799,886 |
| Y6 | 2,799,886 | 111,995 | 1,399,943 | 1,399,943 |
| Y7 | 1,399,943 | 55,998 | 1,399,943 | 0 |
| Y8-Y10 | 0 | 0 | 0 | 0 |

**Portfolio aggregate interest**

| Period | Senior | CAPEX | Total |
|---:|---:|---:|---:|
| Y1 | 2,167,960 | 335,986 | 2,503,946 |
| Y5 | 1,558,221 | 167,993 | 1,726,214 |
| Y7 | 1,151,729 | 55,998 | 1,207,727 |
| Y10 | 541,990 | 0 | 541,990 |

### DSCR / ICR / LTV (Block 3B)

Held at zero series intentionally — they require `pnl.ebitda_after_replacement`
to be reconciled first. Reconciliation module will compute them post-pass
and surface DSCR < 1.0 warnings in Section 7.

## Module · pnl

GOP and cost lines pass through from `inputs.pl_drivers` (multiplied
×1000 in `defaults.ts` to convert k€ Excel notation to actual €).

| Check (Year 1) | Kind | Excel | Engine | Δ | Status |
|---|---|---:|---:|---:|---|
| GOP · Hotel | eur | 4,891,000 | 4,891,000 | 0 | ✅ match |
| GOP · F&B | eur | 1,374,000 | 1,374,000 | 0 | ✅ match |
| GOP · Other | eur | 418,000 | 418,000 | 0 | ✅ match |
| Total costs · Y1 | eur | −1,472,000 | −1,472,000 | 0 | ✅ match |
| EBITDA after Replacement · Y1 | eur | 5,211,000 | 5,211,000 | 0 | ✅ match |
| D&A · Building annual (89.985M ÷ 25) | eur | 3,599,417 | 3,599,417 | 0 | ✅ match |
| D&A · MEP annual (2.88M ÷ 7) | eur | 411,429 | 411,429 | 0 | ✅ match |

### Full P&L · year by year (engine outputs · € thousands rounded)

| Concept | Y1 | Y2 | Y3 | Y4 | Y5 | Y6 | Y7 |
|---|---:|---:|---:|---:|---:|---:|---:|
| GOP | 6,683 | 7,131 | 7,363 | 7,578 | 7,618 | 7,690 | 7,763 |
| Total costs | −1,472 | −1,534 | −1,579 | −1,621 | −1,651 | −1,682 | −1,715 |
| **EBITDA after Replacement** | **5,211** | **5,597** | **5,784** | **5,957** | **5,967** | **6,008** | **6,048** |
| D&A | −4,011 | −4,011 | −4,011 | −4,011 | −4,011 | −4,011 | −4,011 |
| **EBIT** | **1,200** | **1,586** | **1,773** | **1,946** | **1,956** | **1,997** | **2,037** |
| Financial Expenses | −2,504 | −2,504 | −2,245 | −1,985 | −1,726 | −1,467 | −1,208 |
| **EBT** | **−1,304** | **−918** | **−472** | **−39** | **230** | **530** | **829** |
| CIT (25% gross · Ley IS limits in Block 4) | 0 | 0 | 0 | 0 | 57 | 133 | 207 |
| **Net Income** | **−1,304** | **−918** | **−472** | **−39** | **173** | **397** | **622** |

### Observations

1. EBT turns positive in Year 5 — earlier years generate the DTA
   asset that Block 4 (`dta.compute`) will track. Today CIT = 0
   whenever EBT ≤ 0, but the Ley IS 30%-of-EBITDA limit on Financial
   Expenses is NOT yet applied — that lands in Block 4.
2. Financial Expenses fall as the asset tranche amortizes (4,036,678 €
   of principal repaid by Y4) but the bullet 13.5M € at Y10 will spike
   the equity outflow — visible once `cash_flow.compute` ships.
3. D&A is constant 4,011k€/year for Y1-Y7. From Y8 onwards MEP D&A
   stops (411k€/year drops out as the 7-year useful life expires).

## Block 3B prerequisites

Before wiring `dta.compute` / `exit.compute` / `cash_flow.compute` /
`balance_sheet.compute`:

1. The 3 modules above are now Excel-parity-validated · safe to depend on.
2. Reconciliation module needs to compute DSCR/ICR/LTV from
   pnl.ebitda_after_replacement + financing aggregates.
3. The Section 6 stabilised yield placeholder ramp should be replaced
   with `pnl.ebitda_after_replacement[t] / investment.total_building_cost`
   when CF lands (avoid premature wiring before BS reconciles).

## Reconciliation discipline

Invariants checked per render (defined in `engine/reconciliation.ts`):

- **I-1 · Balance Sheet** · `total_assets ≡ total_eq_debt` (±1 €) ·
  pending Block 3B
- **I-2 · Cash** · `ΔBS.cash ≡ CF.change_in_cash_bs` (±1 €) ·
  pending Block 3B
- **I-3 · DSCR** · ≥ 1.0 every period after open · warn-only ·
  pending DSCR computation
- **I-4 · DTA** · `dta_end ≥ 0` every period · hard · Block 4
- **I-5 · Financing** · `Σ tranche drawdowns Y0 ≡ debt_balance Y0` ·
  hard · already enforced by the financing module (single drawdown
  per tranche at origination)

## Formula isolation audit

No formula duplication detected in Block 3A modules. All cross-cutting
math (DSCR / ICR / LTV / IRR / MOIC / Spanish Ley IS finexp cap /
SL depreciation / per-key / per-sqm) lives in `engine/formulas.ts`
and is imported by name.
