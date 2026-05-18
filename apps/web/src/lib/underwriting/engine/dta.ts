import type { EngineModule } from "./_types";
import type { DtaSchedule } from "../types";
import { zeroSeries } from "../temporal";
import { spanishFinexpDeductionCap } from "./formulas";

/**
 * Module · dta · Spanish Ley IS rigor.
 *
 * Layered tax model the operator wants kept ACCOUNTING-GRADE:
 *
 *   1. accounting tax (P&L line · current + deferred)
 *   2. cash tax       (what hits Cash Flow · 25% × fiscal EBT)
 *   3. deferred tax   (timing-difference flow · −Δ DTA)
 *
 * Spain (Ley IS art. 16): financial-expense deductibility cap per period is
 *   max( 30% × EBITDA , 1,000,000 € )
 * Excess interest above the cap is non-deductible NOW but stays available
 * for compensation in future periods when EBITDA capacity opens. The DTA
 * tracked here is in TAX EUROS (i.e., the non-deductible timing
 * difference × CIT rate).
 *
 * Conventions:
 *   · pnl.financial_expenses is stored NEGATIVE · `positive_finexp = −pnl.financial_expenses`
 *   · pnl.ebitda_after_replacement is POSITIVE
 *   · dta_increases / dta_decreases / dta_end / dta_beginning are in TAX €
 *   · cit_pl (accounting tax expense) can be NEGATIVE in years where DTA
 *     creation outweighs current tax (deferred tax benefit dominates)
 *   · tax_payment (cash) is ≥ 0 always
 *
 * Expiry: kept structurally ready · Spain has no expiry on these
 * carryforwards today · the field stays a no-op until policy changes.
 *
 * Block 3B leaves DTA decreases preferring DTA-from-prior-periods over
 * DTA-from-current-period (LIFO would also be defensible · Block 4
 * makes this configurable).
 */
export const dtaModule: EngineModule<"dta"> = {
  key: "dta",
  dependsOn: ["pnl"],
  compute({ inputs, prior }): DtaSchedule {
    const periods = inputs.periods;
    const z = () => zeroSeries(periods);
    const pnl = prior.pnl;

    if (!pnl) {
      // Defensive · pnl is a hard dependency so this should never fire
      // in production runs · returns the contract shape.
      return emptySchedule(periods.length);
    }

    const citRatePctDecimal = inputs.tax.cit_rate_pct; // 0.25
    const ebitdaLimitPctDecimal = inputs.tax.ebitda_limit_pct; // 0.30
    const finexpFloorEur = inputs.tax.finexp_floor_eur; // 1,000,000

    const ebit = pnl.ebit.slice();
    const ebitda = pnl.ebitda_after_replacement.slice();
    const limitEbitda30Pct = z();
    const limitFinexpFloor = z();
    const finexpAfterLimits = z();
    const ebtAfterLimits = z();
    const dtaBeginning = z();
    const dtaIncreases = z();
    const dtaDecreases = z();
    const dtaEnd = z();
    const citPl = z();
    const dtaCompensation = z();
    const taxPayment = z();

    let runningDta = 0;

    for (let t = 0; t < periods.length; t++) {
      // Positive figures for the limit calculation.
      const positiveFinexp = Math.max(0, -pnl.financial_expenses[t]);
      const ebitdaPositive = Math.max(0, ebitda[t]);

      // Cap = max(30% × EBITDA, 1,000,000 €)  · formula registry.
      const cap = spanishFinexpDeductionCap(
        ebitdaPositive,
        ebitdaLimitPctDecimal * 100,
        finexpFloorEur,
      );
      const cap30 = ebitdaPositive * ebitdaLimitPctDecimal;

      limitEbitda30Pct[t] = cap30;
      limitFinexpFloor[t] = cap;

      // Non-deductible interest this period creates a DTA.
      const nonDeductibleTiming = Math.max(0, positiveFinexp - cap);
      // Spare capacity available to absorb prior-period DTA.
      const spareCapacityTiming = Math.max(0, cap - positiveFinexp);

      dtaBeginning[t] = runningDta;

      const dtaIncreaseTax = nonDeductibleTiming * citRatePctDecimal;
      // Compensation can never exceed opening DTA + this-period increase
      // (you can't release tax you don't have).
      const maxCompTax = Math.min(
        runningDta + dtaIncreaseTax,
        spareCapacityTiming * citRatePctDecimal,
      );
      const dtaDecreaseTax = Math.max(0, maxCompTax);

      dtaIncreases[t] = dtaIncreaseTax;
      dtaDecreases[t] = dtaDecreaseTax;
      runningDta = Math.max(0, runningDta + dtaIncreaseTax - dtaDecreaseTax);
      dtaEnd[t] = runningDta;

      // Deductible interest (in timing €).
      const deductibleFinexp = Math.min(positiveFinexp, cap) + dtaDecreaseTax / citRatePctDecimal;
      finexpAfterLimits[t] = deductibleFinexp;

      // Fiscal EBT · stored POSITIVE if profit, NEGATIVE if fiscal loss.
      // (NB: fiscal losses generate a separate Net-Operating-Loss DTA in
      // reality · Block 4 adds NOL-DTA · today fiscal losses do NOT
      // accrue tax savings here for prudence.)
      const fiscalEbt = ebit[t] - deductibleFinexp;
      ebtAfterLimits[t] = fiscalEbt;

      // Cash tax · 25% × positive fiscal EBT only.
      const cashTax = fiscalEbt > 0 ? fiscalEbt * citRatePctDecimal : 0;
      taxPayment[t] = cashTax;

      // Accounting (P&L) tax = current − deferred-tax-movement.
      // DTA movement = end − beginning (positive = asset created).
      // Deferred tax expense = −movement (asset created = benefit = negative expense).
      const dtaMovement = dtaEnd[t] - dtaBeginning[t];
      citPl[t] = cashTax - dtaMovement;
      dtaCompensation[t] = dtaDecreaseTax;
    }

    // ─── Post-exit silencing ──────────────────────────────────────
    // Asset is sold at exit · gain on sale absorbs the residual DTA
    // (fiscal compensation against the disposal gain). Subsequent
    // periods have no operations · keep DTA + tax lines flat at 0 so
    // the BS continues to balance for the post-realisation tail.
    const exitYear = inputs.exit.year;
    if (exitYear > 0) {
      for (let t = exitYear + 1; t < periods.length; t++) {
        limitEbitda30Pct[t] = 0;
        limitFinexpFloor[t] = 0;
        finexpAfterLimits[t] = 0;
        ebtAfterLimits[t] = 0;
        dtaBeginning[t] = 0;
        dtaIncreases[t] = 0;
        dtaDecreases[t] = 0;
        dtaEnd[t] = 0;
        citPl[t] = 0;
        dtaCompensation[t] = 0;
        taxPayment[t] = 0;
      }
    }

    return {
      ebit,
      ebitda,
      limit_ebitda_30pct: limitEbitda30Pct,
      limit_finexp_floor: limitFinexpFloor,
      financial_expenses_after_limits: finexpAfterLimits,
      ebt_after_limits: ebtAfterLimits,
      dta_beginning: dtaBeginning,
      dta_increases: dtaIncreases,
      dta_decreases: dtaDecreases,
      dta_end: dtaEnd,
      cit_pl: citPl,
      dta_compensation: dtaCompensation,
      tax_payment: taxPayment,
    };
  },
};

function emptySchedule(n: number): DtaSchedule {
  const z = () => new Array<number>(n).fill(0);
  return {
    ebit: z(),
    ebitda: z(),
    limit_ebitda_30pct: z(),
    limit_finexp_floor: z(),
    financial_expenses_after_limits: z(),
    ebt_after_limits: z(),
    dta_beginning: z(),
    dta_increases: z(),
    dta_decreases: z(),
    dta_end: z(),
    cit_pl: z(),
    dta_compensation: z(),
    tax_payment: z(),
  };
}
