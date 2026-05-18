import type { EngineModule } from "./_types";
import type {
  DebtTranche,
  FinancingPortfolioSchedule,
  TrancheSchedule,
} from "../financing-tranches";
import type { UnderwritingInputs } from "../types";
import type { Period, PeriodSeries } from "../temporal";
import { addSeries, zeroSeries } from "../temporal";

/**
 * Module · financing.
 *
 * Per-tranche amortization + portfolio aggregation. Determines:
 *   · drawdown timing (origination period)
 *   · effective rate (fixed · or floating with floor/cap)
 *   · scheduled principal (straight-line · bullet · interest-only ·
 *     custom-series)
 *   · interest expense (BoFY balance × effective rate)
 *   · BoFY / EoFY balances · payment = interest + principal + bullet
 *
 * Convention (validated against operator Excel, Madrid Centro example):
 *   · Drawdown at `origination_period_index` (typically Y0 · closing year)
 *   · Grace periods after drawdown: no principal, only interest
 *   · Straight-line amortization spreads principal over
 *       (amortization.years − grace_periods) periods after grace
 *   · Bullet schedules: straight-line for the non-bullet share over
 *       (amortization.years − grace_periods − 1) periods, then bullet
 *       at maturity period
 *
 * DSCR / ICR / LTV remain zero-shaped in Block 3A · they require NOI
 * (PnL) and asset value · the reconciliation pass (Block 3B) fills them.
 */
export const financingModule: EngineModule<"financing"> = {
  key: "financing",
  dependsOn: ["investment"],
  compute({ inputs, prior }): FinancingPortfolioSchedule {
    const periods = inputs.periods;
    const z = () => zeroSeries(periods);

    // Resolve principals using the investment totals from upstream module.
    const investment = prior.investment;
    const totalCapexCost = investment?.capex_total ?? 0;
    const totalProjectCost = investment?.total_building_cost ?? 0;

    const schedules: TrancheSchedule[] = inputs.financing.tranches.map((t) =>
      buildTrancheSchedule(t, periods, inputs, totalCapexCost, totalProjectCost),
    );

    // Portfolio aggregates · element-wise sums.
    const totalPrincipal = schedules.reduce((acc, s) => acc + s.principal_amount, 0);
    const totalDrawdown = schedules.reduce<PeriodSeries>((acc, s) => addSeries(acc, s.drawdown), z());
    const totalInterest = schedules.reduce<PeriodSeries>((acc, s) => addSeries(acc, s.interest_expense), z());
    const totalLoanPrincipal = schedules.reduce<PeriodSeries>((acc, s) => addSeries(acc, s.loan_principal), z());
    const totalBulletPrincipal = schedules.reduce<PeriodSeries>((acc, s) => addSeries(acc, s.bullet_principal), z());
    const totalPayment = schedules.reduce<PeriodSeries>((acc, s) => addSeries(acc, s.payment), z());
    const totalBofy = schedules.reduce<PeriodSeries>((acc, s) => addSeries(acc, s.bofy_balance), z());
    const totalEofy = schedules.reduce<PeriodSeries>((acc, s) => addSeries(acc, s.eofy_balance), z());

    return {
      tranches: schedules,
      total_principal: totalPrincipal,
      total_drawdown: totalDrawdown,
      total_interest_expense: totalInterest,
      total_loan_principal: totalLoanPrincipal,
      total_bullet_principal: totalBulletPrincipal,
      total_payment: totalPayment,
      total_bofy_balance: totalBofy,
      total_eofy_balance: totalEofy,
      dscr: z(), // Block 3B fills via pnl.ebitda_after_replacement
      icr: z(),
      ltv_pct: z(),
      covenant_breaches: [],
    };
  },
};

// ─── Tranche builder ─────────────────────────────────────────────────

function buildTrancheSchedule(
  t: DebtTranche,
  periods: Period[],
  inputs: UnderwritingInputs,
  capexBase: number,
  projectBase: number,
): TrancheSchedule {
  const n = periods.length;
  const drawdown = new Array<number>(n).fill(0);
  const interestExpense = new Array<number>(n).fill(0);
  const loanPrincipal = new Array<number>(n).fill(0);
  const bulletPrincipal = new Array<number>(n).fill(0);
  const bofyBalance = new Array<number>(n).fill(0);
  const eofyBalance = new Array<number>(n).fill(0);
  const effectiveRatePct = new Array<number>(n).fill(0);

  const principal = resolvePrincipal(t, inputs, capexBase, projectBase);
  const origin = clampIndex(t.origination_period_index, n);

  // ─── Effective-rate series per period ────────────────────────────
  for (let i = 0; i < n; i++) {
    effectiveRatePct[i] = resolveEffectiveRatePct(t, inputs);
  }

  if (principal <= 0) {
    return baseSchedule(t, principal, drawdown, interestExpense, loanPrincipal, bulletPrincipal, bofyBalance, eofyBalance, effectiveRatePct);
  }

  // Drawdown at origination period.
  drawdown[origin] = principal;

  // ─── Principal schedule ─────────────────────────────────────────
  // Build raw principal series across periods · respects grace + kind.
  const principalSeries = buildPrincipalSeries(t, principal, origin, n);
  for (let i = 0; i < n; i++) {
    loanPrincipal[i] = principalSeries.loan[i];
    bulletPrincipal[i] = principalSeries.bullet[i];
  }

  // ─── Roll forward balances + interest ─────────────────────────────
  // Convention: BoFY balance at period i = EoFY[i-1]. At origination
  // period, drawdown lands first → BoFY of origination = 0, EoFY = principal.
  let runningBalance = 0;
  for (let i = 0; i < n; i++) {
    if (i < origin) {
      bofyBalance[i] = 0;
      eofyBalance[i] = 0;
      continue;
    }
    if (i === origin) {
      bofyBalance[i] = 0;
      runningBalance += drawdown[i];
      eofyBalance[i] = runningBalance;
      continue;
    }
    bofyBalance[i] = runningBalance;
    const interest = bofyBalance[i] * (effectiveRatePct[i] / 100);
    interestExpense[i] = interest;
    const principalThisPeriod = loanPrincipal[i] + bulletPrincipal[i];
    runningBalance = Math.max(0, runningBalance - principalThisPeriod);
    eofyBalance[i] = runningBalance;
  }

  const payment = new Array<number>(n).fill(0);
  for (let i = 0; i < n; i++) {
    payment[i] = interestExpense[i] + loanPrincipal[i] + bulletPrincipal[i];
  }

  return baseSchedule(t, principal, drawdown, interestExpense, loanPrincipal, bulletPrincipal, bofyBalance, eofyBalance, effectiveRatePct, payment);
}

function baseSchedule(
  t: DebtTranche,
  principal: number,
  drawdown: number[],
  interestExpense: number[],
  loanPrincipal: number[],
  bulletPrincipal: number[],
  bofyBalance: number[],
  eofyBalance: number[],
  effectiveRatePct: number[],
  payment?: number[],
): TrancheSchedule {
  return {
    tranche_id: t.id,
    kind: t.kind,
    label: t.label,
    principal_amount: principal,
    bofy_balance: bofyBalance,
    payment: payment ?? new Array<number>(drawdown.length).fill(0),
    interest_expense: interestExpense,
    loan_principal: loanPrincipal,
    bullet_principal: bulletPrincipal,
    drawdown,
    eofy_balance: eofyBalance,
    effective_rate_pct: effectiveRatePct,
  };
}

// ─── Principal-spec resolver ────────────────────────────────────────

function resolvePrincipal(
  t: DebtTranche,
  inputs: UnderwritingInputs,
  capexBase: number,
  projectBase: number,
): number {
  const spec = t.principal;
  switch (spec.kind) {
    case "fixed_amount":
      return Math.max(0, spec.amount);
    case "ltv_of_value": {
      const value = spec.value_basis === "acquisition"
        ? inputs.acquisition.asking_price
        : inputs.acquisition.hotel_value;
      return Math.max(0, value * (spec.ltv_pct / 100));
    }
    case "ltc_of_total": {
      const base = spec.cost_basis === "capex_only" ? capexBase : projectBase;
      return Math.max(0, base * (spec.ltc_pct / 100));
    }
  }
}

// ─── Rate resolver ──────────────────────────────────────────────────

function resolveEffectiveRatePct(t: DebtTranche, inputs: UnderwritingInputs): number {
  const r = t.rate;
  if (r.kind === "fixed") return r.pct;
  // Floating · only euribor_12m wired in MVP; sofr + 6m fall back to 12m.
  const base = inputs.financing.euribor_12m_pct;
  let pct = base + r.margin_pct;
  if (r.floor_pct !== undefined) pct = Math.max(pct, r.floor_pct);
  if (r.cap_pct !== undefined) pct = Math.min(pct, r.cap_pct);
  return pct;
}

// ─── Principal-series builder ───────────────────────────────────────
//
// Returns separate `loan` (scheduled amortization) and `bullet`
// (single-period repayments) series so PnL / CF / BS can show them
// distinctly.

function buildPrincipalSeries(
  t: DebtTranche,
  principal: number,
  origin: number,
  n: number,
): { loan: number[]; bullet: number[] } {
  const loan = new Array<number>(n).fill(0);
  const bullet = new Array<number>(n).fill(0);
  const a = t.amortization;
  const grace = Math.max(0, t.grace_periods);
  const years = Math.max(1, a.years);

  switch (a.kind) {
    case "interest_only": {
      // Single bullet at maturity (origin + years).
      const maturity = clampIndex(origin + years, n);
      bullet[maturity] = principal;
      return { loan, bullet };
    }
    case "straight": {
      // Equal principal payments over (years − grace) periods,
      // starting at (origin + grace + 1).
      const amortPeriods = Math.max(1, years - grace);
      const annual = principal / amortPeriods;
      const start = clampIndex(origin + grace + 1, n);
      const end = clampIndex(start + amortPeriods, n);
      for (let i = start; i < end; i++) loan[i] = annual;
      return { loan, bullet };
    }
    case "bullet": {
      const bulletPct = Math.max(0, Math.min(1, (a.bullet_pct ?? 0) / 100));
      const bulletAmount = principal * bulletPct;
      const amortAmount = principal - bulletAmount;
      // Straight-line over (years − grace − 1) periods after grace,
      // bullet lands at maturity (origin + years).
      const amortPeriods = Math.max(1, years - grace - 1);
      const annual = amortAmount / amortPeriods;
      const start = clampIndex(origin + grace + 1, n);
      const end = clampIndex(start + amortPeriods, n);
      for (let i = start; i < end; i++) loan[i] = annual;
      const maturity = clampIndex(origin + years, n);
      bullet[maturity] = bulletAmount;
      return { loan, bullet };
    }
    case "custom": {
      const series = a.custom_principal_series ?? [];
      for (let i = 0; i < n; i++) loan[i] = series[i] ?? 0;
      return { loan, bullet };
    }
  }
}

function clampIndex(i: number, n: number): number {
  return Math.max(0, Math.min(n - 1, i));
}
