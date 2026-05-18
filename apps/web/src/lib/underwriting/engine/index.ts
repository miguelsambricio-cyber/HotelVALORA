/**
 * Engine orchestrator.
 *
 * Walks ENGINE_DAG in topological order, materialises each module's
 * input from prior outputs, and stitches the slice into a freshly
 * constructed UnderwritingComputed.
 *
 * Determinism: same UnderwritingInputs + same ENGINE_VERSION MUST
 * produce byte-identical UnderwritingComputed across runs. Modules are
 * pure · no clocks, no random, no I/O.
 *
 * Failure mode: if a module throws the orchestrator catches, captures
 * the error, and returns a partial computed object with a reconciliation
 * warning. The UI surfaces the failed module rather than crashing the
 * page · operator can recover by fixing inputs.
 */

import type { UnderwritingInputs, UnderwritingComputed } from "../types";
import type { EngineModule, ComputedKey } from "./_types";
import { ENGINE_DAG, topologicalOrder } from "./dag";

import { capRateModule } from "./cap-rate";
import { investmentModule } from "./investment";
import { financingModule } from "./financing";
import { pnlModule } from "./pnl";
import { dtaModule } from "./dta";
import { exitModule } from "./exit";
import { cashFlowModule } from "./cash-flow";
import { balanceSheetModule } from "./balance-sheet";
import { reconciliationModule } from "./reconciliation";

const MODULES: Record<ComputedKey, EngineModule> = {
  cap_rate: capRateModule,
  investment: investmentModule,
  financing: financingModule,
  pnl: pnlModule,
  dta: dtaModule,
  exit: exitModule,
  cash_flow: cashFlowModule,
  balance_sheet: balanceSheetModule,
  reconciliation: reconciliationModule,
  // computed-only metadata fields · not produced by modules
  scenario_id: null as unknown as EngineModule,
  asset: null as unknown as EngineModule,
  periods: null as unknown as EngineModule,
};

export function runEngine(inputs: UnderwritingInputs): UnderwritingComputed {
  const order = topologicalOrder(ENGINE_DAG);
  const prior: Partial<UnderwritingComputed> = {};
  const warnings: string[] = [];

  for (const key of order) {
    const mod = MODULES[key];
    if (!mod) continue;
    try {
      const result = mod.compute({ inputs, prior });
      (prior as Record<string, unknown>)[key] = result;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      warnings.push(`Engine module "${key}" failed · ${msg}`);
    }
  }

  const recon = prior.reconciliation ?? {
    bs_balanced: inputs.periods.map(() => false),
    cash_matches_cf: false,
    dscr_per_period: inputs.periods.map(() => 0),
    warnings: [],
  };

  return {
    scenario_id: inputs.scenario_id,
    asset: inputs.asset,
    periods: inputs.periods,
    cap_rate: prior.cap_rate!,
    investment: prior.investment!,
    financing: prior.financing!,
    pnl: prior.pnl!,
    dta: prior.dta!,
    exit: prior.exit!,
    cash_flow: prior.cash_flow!,
    balance_sheet: prior.balance_sheet!,
    reconciliation: {
      ...recon,
      warnings: [...warnings, ...recon.warnings],
    },
  };
}
