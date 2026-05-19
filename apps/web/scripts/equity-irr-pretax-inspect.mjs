// One-off · compute Equity IRR · LEVERED · PRE-TAX for the base scenario.
// Run with: cd apps/web && npx tsx scripts/equity-irr-pretax-inspect.mjs
//
// The engine ships with Equity IRR post-tax (cashTax subtracted from CF).
// This script builds a parallel CF stream that keeps debt service but
// excludes cashTax, then runs the same IRR routine to surface the
// pre-tax levered number for operator inspection.

import { SCENARIO_BASE } from "../src/lib/underwriting/defaults.ts";
import { irrPct, moic } from "../src/lib/underwriting/engine/formulas.ts";

const b = SCENARIO_BASE;
const c = b.computed;
const exitYear = c.exit.exit_year;

// Equity CF · LEVERED · POST-TAX (what the engine already publishes)
const equityCfPosttax = c.exit.equity_cash_flow;

// Equity CF · LEVERED · PRE-TAX (synthesize)
// Identical to post-tax minus the cashTax addback (so we ADD back what
// the engine subtracted).
const equityCfPretax = equityCfPosttax.map((v, t) => {
  const cashTax = c.dta.tax_payment[t] ?? 0;
  return v + cashTax; // add back the tax that the engine subtracted
});

const equityIrrPosttax = c.exit.equity_irr_pct;
const equityIrrPretax = irrPct(equityCfPretax);
const moicPosttax = c.exit.moic;
const moicPretax = moic(equityCfPretax);

console.log("\n========== EQUITY IRR · PRE-TAX vs POST-TAX (base scenario) ==========");
console.log(`Asset:          ${b.inputs.asset.submarket} · ${b.inputs.asset.category} · ${b.inputs.asset.rooms} keys`);
console.log(`Hold:           Y0 → Y${exitYear}`);
console.log(`Equity inj.:    ${(c.exit.equity_investment / 1e6).toFixed(2)}M €`);
console.log(`CIT rate:       ${(b.inputs.tax.cit_rate_pct * 100).toFixed(0)}%`);
console.log();
console.log("Equity Cash Flow · LEVERED · POST-TAX (engine ships this):");
equityCfPosttax.slice(0, exitYear + 1).forEach((v, t) => {
  console.log(`  Y${t}: ${(v / 1e6).toFixed(2)}M €`);
});
console.log(`  ⇒ IRR post-tax: ${equityIrrPosttax.toFixed(2).replace(".", ",")}%`);
console.log(`  ⇒ MOIC post-tax: ${moicPosttax.toFixed(2).replace(".", ",")}x`);

console.log();
console.log("Equity Cash Flow · LEVERED · PRE-TAX (cashTax added back):");
equityCfPretax.slice(0, exitYear + 1).forEach((v, t) => {
  const tax = c.dta.tax_payment[t] ?? 0;
  console.log(`  Y${t}: ${(v / 1e6).toFixed(2)}M €  (tax added back: ${(tax / 1e6).toFixed(2)}M €)`);
});
console.log(`  ⇒ IRR PRE-TAX: ${equityIrrPretax.toFixed(2).replace(".", ",")}%`);
console.log(`  ⇒ MOIC pre-tax: ${moicPretax.toFixed(2).replace(".", ",")}x`);

console.log();
console.log(`Δ pre-tax − post-tax: ${(equityIrrPretax - equityIrrPosttax).toFixed(2).replace(".", ",")}pp`);
