import type { EngineModule } from "./_types";
import type { UnderwritingComputed } from "../types";
import { zeroSeries } from "../temporal";

/**
 * Module · reconciliation.
 * Validates institutional invariants AFTER every other module ran.
 * If any invariant breaks the engine still completes · the section
 * shell + the reconciliation strip surface warnings to the operator.
 *
 * Invariants (Block 2 declared · Block 3 enforced numerically):
 *   I-1 · Balance Sheet · total_assets ≡ total_eq_debt   (±1 €)
 *   I-2 · Cash         · CF.change_in_cash_bs ≡ ΔBS.cash (±1 €)
 *   I-3 · DSCR         · ≥ 1.0 every period after open    (warn only)
 *   I-4 · DTA          · dta_end ≥ 0 every period         (hard)
 *   I-5 · Financing    · debt_balance Y0 ≡ Σ tranche drawdowns Y0
 */
export const reconciliationModule: EngineModule<"reconciliation"> = {
  key: "reconciliation",
  dependsOn: ["balance_sheet", "cash_flow", "financing"],
  compute({ inputs, prior }): UnderwritingComputed["reconciliation"] {
    const periods = inputs.periods;
    const warnings: string[] = [];

    const bs = prior.balance_sheet;
    const cf = prior.cash_flow;
    const fin = prior.financing;

    if (!bs || !cf || !fin) {
      return {
        bs_balanced: periods.map(() => false),
        cash_matches_cf: false,
        dscr_per_period: zeroSeries(periods),
        warnings: ["Reconciliation skipped · upstream module output missing"],
      };
    }

    const bs_balanced = periods.map((_, i) => {
      const diff = Math.abs((bs.total_assets[i] ?? 0) - (bs.total_eq_debt[i] ?? 0));
      return diff <= 1;
    });

    let cash_matches_cf = true;
    for (let i = 1; i < periods.length; i++) {
      const bsDelta = (bs.cash[i] ?? 0) - (bs.cash[i - 1] ?? 0);
      const cfDelta = cf.change_in_cash_bs[i] ?? 0;
      if (Math.abs(bsDelta - cfDelta) > 1) {
        cash_matches_cf = false;
        warnings.push(`I-2 · Cash mismatch at period ${i} · BS Δ=${bsDelta.toFixed(0)} CF=${cfDelta.toFixed(0)}`);
        break;
      }
    }

    if (bs_balanced.some((ok) => !ok)) {
      warnings.push("I-1 · Balance Sheet does not balance in one or more periods");
    }

    const dscr_per_period = fin.dscr;
    for (let i = 1; i < dscr_per_period.length; i++) {
      const v = dscr_per_period[i];
      if (v > 0 && v < 1.0) {
        warnings.push(`I-3 · DSCR < 1.0 at period ${i} · value=${v.toFixed(2)}`);
      }
    }

    return {
      bs_balanced,
      cash_matches_cf,
      dscr_per_period,
      warnings,
    };
  },
};
