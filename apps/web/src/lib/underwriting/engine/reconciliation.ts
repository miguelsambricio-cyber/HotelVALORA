import type { EngineModule } from "./_types";
import type { UnderwritingComputed } from "../types";
import { zeroSeries } from "../temporal";
import { TOLERANCE_EUR } from "./_constants";
import { dscr as dscrFormula, icr as icrFormula, ltv as ltvFormula } from "./formulas";

/**
 * Module · reconciliation · institutional invariants + tolerance-aware
 * warnings with explicit severity levels and metadata.
 *
 * Invariants (Block 3B hardening):
 *   I-1 · Balance Sheet      · total_assets ≡ total_eq_debt        (HARD)
 *   I-2 · Cash bridge        · BS.Δcash ≡ CF.change_in_cash_bs      (HARD)
 *   I-3 · DSCR coverage      · ≥ 1.0 every post-opening period      (WARN)
 *   I-4 · DTA non-negative   · dta_end ≥ 0                           (HARD)
 *   I-5 · Debt drawdown      · Σ Y0 drawdowns ≡ Σ tranche principals (HARD)
 *   I-6 · Retained earnings  · reserves[t] continuity                (HARD)
 *
 * Severity:
 *   · INFO  · informational note · no operator action expected
 *   · WARN  · acceptable drift / business risk · operator should review
 *   · FAIL  · invariant broken · investigate before shipping the model
 *
 * Side-effect of this module: DSCR / ICR / LTV are computed here from
 * pnl.ebitda_after_replacement + financing aggregates (financing.compute
 * leaves them as zero series · this is the post-pass that fills them
 * for the report rendering layer).
 *
 * Note: writing into prior.financing here mutates the prior slice in
 * place · safe because reconciliation runs LAST per the DAG.
 */

export type ReconciliationSeverity = "info" | "warn" | "fail";

export interface ReconciliationFinding {
  id: string;
  invariant: string;
  severity: ReconciliationSeverity;
  message: string;
  /** Period index where the issue surfaced (or undefined for global). */
  period_index?: number;
  expected?: number;
  actual?: number;
  delta?: number;
  tolerance?: number;
}

export const reconciliationModule: EngineModule<"reconciliation"> = {
  key: "reconciliation",
  dependsOn: ["balance_sheet", "cash_flow", "financing"],
  compute({ inputs, prior }): UnderwritingComputed["reconciliation"] {
    const periods = inputs.periods;
    const n = periods.length;
    const findings: ReconciliationFinding[] = [];

    const bs = prior.balance_sheet;
    const cf = prior.cash_flow;
    const fin = prior.financing;
    const pnl = prior.pnl;
    const dta = prior.dta;
    const investment = prior.investment;

    if (!bs || !cf || !fin || !pnl) {
      return {
        bs_balanced: periods.map(() => false),
        cash_matches_cf: false,
        dscr_per_period: zeroSeries(periods),
        warnings: ["Reconciliation skipped · upstream module output missing"],
      };
    }

    // ─── I-1 · Balance sheet balance ─────────────────────────────
    const bsBalanced = new Array<boolean>(n).fill(true);
    for (let t = 0; t < n; t++) {
      const lhs = bs.total_assets[t] ?? 0;
      const rhs = bs.total_eq_debt[t] ?? 0;
      const delta = Math.abs(lhs - rhs);
      if (delta > TOLERANCE_EUR) {
        bsBalanced[t] = false;
        findings.push({
          id: `I1.bs.${t}`,
          invariant: "I-1 · Balance Sheet balance",
          severity: "fail",
          message: `Balance Sheet does not balance at period ${t} · |Δ| = ${delta.toFixed(0)} € exceeds ±${TOLERANCE_EUR} € tolerance`,
          period_index: t,
          expected: lhs,
          actual: rhs,
          delta: lhs - rhs,
          tolerance: TOLERANCE_EUR,
        });
      }
    }

    // ─── I-2 · Cash bridge (BS Δcash == CF.change_in_cash_bs) ───
    let cashMatches = true;
    for (let t = 1; t < n; t++) {
      const bsDelta = (bs.cash[t] ?? 0) - (bs.cash[t - 1] ?? 0);
      const cfDelta = cf.change_in_cash_bs[t] ?? 0;
      const delta = Math.abs(bsDelta - cfDelta);
      if (delta > TOLERANCE_EUR) {
        cashMatches = false;
        findings.push({
          id: `I2.cash.${t}`,
          invariant: "I-2 · Cash bridge",
          severity: "fail",
          message: `Cash bridge break at period ${t} · BS Δcash = ${bsDelta.toFixed(0)} € · CF Δ = ${cfDelta.toFixed(0)} €`,
          period_index: t,
          expected: bsDelta,
          actual: cfDelta,
          delta: bsDelta - cfDelta,
          tolerance: TOLERANCE_EUR,
        });
        break;
      }
    }

    // ─── DSCR / ICR / LTV / DYR · post-pass fill ────────────────
    // DSCR convention (2026-05-19): institutional hospitality lenders test
    // GROSS OPERATING PROFIT against debt service · not EBITDA-after-FF&E
    // (which is too noisy with operator-discretionary reserves).
    const dscrSeries = zeroSeries(periods);
    const icrSeries = zeroSeries(periods);
    const ltvSeries = zeroSeries(periods);
    const dyrSeries = zeroSeries(periods);
    const assetValueBase = investment?.total_building_cost ?? 0;
    for (let t = 0; t < n; t++) {
      const gop = pnl.gross_operating_profit[t] ?? 0;
      const interest = fin.total_interest_expense[t] ?? 0;
      const principal = (fin.total_loan_principal[t] ?? 0) + (fin.total_bullet_principal[t] ?? 0);
      const debtService = interest + principal;
      const eofyBalance = fin.total_eofy_balance[t] ?? 0;
      dscrSeries[t] = dscrFormula(gop, debtService);
      icrSeries[t] = icrFormula(gop, interest);
      ltvSeries[t] = ltvFormula(eofyBalance, assetValueBase);
      dyrSeries[t] = eofyBalance > 0 ? gop / eofyBalance : 0;
    }
    // Patch financing aggregates so Section 7 renders ratios.
    fin.dscr = dscrSeries;
    fin.icr = icrSeries;
    fin.ltv_pct = ltvSeries;
    fin.debt_yield_pct = dyrSeries;

    // ─── I-3 · DSCR ≥ 1.0 between opening and exit ──────────────
    // Skip post-exit periods · no debt service after asset disposal.
    const exitYearForDscr = inputs.exit.year;
    const dscrCheckEnd = exitYearForDscr > 0 ? Math.min(n, exitYearForDscr + 1) : n;
    for (let t = 2; t < dscrCheckEnd; t++) {
      const v = dscrSeries[t];
      if (v > 0 && v < 1.0) {
        findings.push({
          id: `I3.dscr.${t}`,
          invariant: "I-3 · DSCR coverage",
          severity: "warn",
          message: `DSCR < 1.0 at period ${t} · value ${v.toFixed(2)}`,
          period_index: t,
          actual: v,
          expected: 1.0,
          delta: v - 1.0,
        });
      }
    }

    // ─── I-4 · DTA non-negative ─────────────────────────────────
    if (dta) {
      for (let t = 0; t < n; t++) {
        const v = dta.dta_end[t] ?? 0;
        if (v < -TOLERANCE_EUR) {
          findings.push({
            id: `I4.dta.${t}`,
            invariant: "I-4 · DTA non-negative",
            severity: "fail",
            message: `DTA ended negative at period ${t} · ${v.toFixed(0)} €`,
            period_index: t,
            actual: v,
            expected: 0,
            delta: v,
            tolerance: TOLERANCE_EUR,
          });
        }
      }
    }

    // ─── I-5 · Debt drawdown matches tranche principal ──────────
    {
      const drawdownY0 = fin.total_drawdown[0] ?? 0;
      const principalSum = fin.total_principal;
      const delta = Math.abs(drawdownY0 - principalSum);
      if (delta > TOLERANCE_EUR) {
        findings.push({
          id: "I5.drawdown",
          invariant: "I-5 · Debt drawdown == Σ tranche principal",
          severity: "fail",
          message: `Σ Y0 drawdowns (${drawdownY0.toFixed(0)} €) ≠ Σ tranche principals (${principalSum.toFixed(0)} €)`,
          expected: principalSum,
          actual: drawdownY0,
          delta: drawdownY0 - principalSum,
          tolerance: TOLERANCE_EUR,
        });
      }
    }

    // ─── I-6 · Retained earnings continuity ─────────────────────
    for (let t = 1; t < n; t++) {
      const reservesNow = bs.reserves[t] ?? 0;
      const reservesPrev = (bs.reserves[t - 1] ?? 0) + (bs.net_income_period[t - 1] ?? 0);
      const delta = Math.abs(reservesNow - reservesPrev);
      if (delta > TOLERANCE_EUR) {
        findings.push({
          id: `I6.reserves.${t}`,
          invariant: "I-6 · Retained earnings continuity",
          severity: "fail",
          message: `Reserves[${t}] discontinuity · expected ${reservesPrev.toFixed(0)} · got ${reservesNow.toFixed(0)} · Δ ${delta.toFixed(0)}`,
          period_index: t,
          expected: reservesPrev,
          actual: reservesNow,
          delta: reservesNow - reservesPrev,
          tolerance: TOLERANCE_EUR,
        });
        break;
      }
    }

    return {
      bs_balanced: bsBalanced,
      cash_matches_cf: cashMatches,
      dscr_per_period: dscrSeries,
      warnings: findings.map(formatFinding),
    };
  },
};

function formatFinding(f: ReconciliationFinding): string {
  const sev = f.severity === "fail" ? "❌" : f.severity === "warn" ? "⚠️" : "ℹ️";
  return `${sev} ${f.invariant} · ${f.message}`;
}
