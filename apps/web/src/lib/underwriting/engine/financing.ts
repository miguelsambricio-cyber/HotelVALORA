import type { EngineModule } from "./_types";
import type { FinancingPortfolioSchedule } from "../financing-tranches";
import { zeroSeries } from "../temporal";

/**
 * Module · financing.
 * Per-tranche amortization + portfolio aggregation + DSCR/ICR/LTV.
 * BLOCK 3 fills · current returns contract-shaped zeros for every
 * tranche the operator has configured.
 */
export const financingModule: EngineModule<"financing"> = {
  key: "financing",
  dependsOn: ["investment"],
  compute({ inputs }): FinancingPortfolioSchedule {
    const periods = inputs.periods;
    const z = () => zeroSeries(periods);

    return {
      tranches: inputs.financing.tranches.map((t) => ({
        tranche_id: t.id,
        kind: t.kind,
        label: t.label,
        principal_amount: 0,
        bofy_balance: z(),
        payment: z(),
        interest_expense: z(),
        loan_principal: z(),
        bullet_principal: z(),
        drawdown: z(),
        eofy_balance: z(),
        effective_rate_pct: z(),
      })),
      total_principal: 0,
      total_drawdown: z(),
      total_interest_expense: z(),
      total_loan_principal: z(),
      total_bullet_principal: z(),
      total_payment: z(),
      total_bofy_balance: z(),
      total_eofy_balance: z(),
      dscr: z(),
      icr: z(),
      ltv_pct: z(),
      covenant_breaches: [],
    };
  },
};
