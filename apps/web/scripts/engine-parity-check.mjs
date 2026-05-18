// Block 3B parity-validation script. Run with:
//   cd apps/web && npx tsx scripts/engine-parity-check.mjs
// Renamed .mjs only to dodge node's pure JS resolver — tsx handles TS imports.

import { SCENARIO_BASE } from "../src/lib/underwriting/defaults.ts";

const b = SCENARIO_BASE;
const bs = b.computed.balance_sheet;
const cf = b.computed.cash_flow;
const fin = b.computed.financing;
const pnl = b.computed.pnl;
const dta = b.computed.dta;
const exit = b.computed.exit;
const inv = b.computed.investment;

const r = (n) => Math.round(n);
const f2 = (n) => n.toFixed(2);

console.log("=== I-1 BS balance ===");
let i1Pass = true;
for (let t = 0; t < bs.total_assets.length; t++) {
  const a = bs.total_assets[t];
  const ed = bs.total_eq_debt[t];
  const d = a - ed;
  console.log(`  t=${t} assets=${r(a)} eq+debt=${r(ed)} Δ=${f2(d)}`);
  if (Math.abs(d) > 1) i1Pass = false;
}
console.log(i1Pass ? "  ✅ I-1 PASS" : "  ❌ I-1 FAIL");

console.log("\n=== I-2 Cash bridge ===");
let i2Pass = true;
for (let t = 1; t < bs.cash.length; t++) {
  const bsDelta = bs.cash[t] - bs.cash[t - 1];
  const cfDelta = cf.change_in_cash_bs[t];
  console.log(`  t=${t} BS_Δ=${r(bsDelta)} CF_Δ=${r(cfDelta)} diff=${f2(bsDelta - cfDelta)}`);
  if (Math.abs(bsDelta - cfDelta) > 1) i2Pass = false;
}
console.log(i2Pass ? "  ✅ I-2 PASS" : "  ❌ I-2 FAIL");

console.log("\n=== I-4 DTA roll-forward + non-negative ===");
let i4Pass = true;
let dtaRunCheck = true;
for (let t = 0; t < dta.dta_end.length; t++) {
  const beg = dta.dta_beginning[t];
  const inc = dta.dta_increases[t];
  const dec = dta.dta_decreases[t];
  const end = dta.dta_end[t];
  const recomp = beg + inc - dec;
  const rollDelta = end - recomp;
  console.log(`  t=${t} beg=${r(beg)} +inc=${r(inc)} -dec=${r(dec)} end=${r(end)} rollΔ=${f2(rollDelta)}`);
  if (end < -1) i4Pass = false;
  if (Math.abs(rollDelta) > 1) dtaRunCheck = false;
}
console.log(i4Pass ? "  ✅ I-4 PASS (DTA ≥ 0)" : "  ❌ I-4 FAIL");
console.log(dtaRunCheck ? "  ✅ DTA roll-forward consistent" : "  ❌ DTA roll-forward broken");

console.log("\n=== I-5 Debt drawdown == Σ tranche principal ===");
const dY0 = fin.total_drawdown[0];
const principalSum = fin.total_principal;
console.log(`  drawdown_Y0=${r(dY0)} Σ principal=${r(principalSum)} Δ=${f2(dY0 - principalSum)}`);
console.log(Math.abs(dY0 - principalSum) <= 1 ? "  ✅ I-5 PASS" : "  ❌ I-5 FAIL");

console.log("\n=== Exit ===");
console.log(`  stabilized NOI (exit yr ${exit.exit_year}) = ${r(pnl.ebitda_after_replacement[exit.exit_year])}`);
console.log(`  exit_cap_rate_pct = ${f2(exit.exit_cap_rate_pct)}%`);
console.log(`  exit_price = ${r(exit.exit_price)}`);
console.log(`  debt_repayment_at_exit = ${r(exit.debt_repayment_at_exit)}`);
console.log(`  equity_investment = ${r(exit.equity_investment)}`);
console.log(`  project_irr_pct = ${f2(exit.project_irr_pct)}%`);
console.log(`  equity_irr_pct = ${f2(exit.equity_irr_pct)}%`);
console.log(`  moic = ${exit.moic.toFixed(3)}x`);
console.log(`  equity_cf series: ${exit.equity_cash_flow.map(r).join(" | ")}`);
console.log(`  project_cf series: ${exit.project_cash_flow.map(r).join(" | ")}`);

console.log("\n=== Reconciliation warnings ===");
if (b.computed.reconciliation.warnings.length === 0) {
  console.log("  ✅ (none)");
} else {
  b.computed.reconciliation.warnings.forEach((w) => console.log("  " + w));
}

console.log("\n=== DSCR / ICR / LTV per period ===");
for (let t = 1; t <= exit.exit_year; t++) {
  console.log(`  t=${t} DSCR=${fin.dscr[t].toFixed(2)} ICR=${fin.icr[t].toFixed(2)} LTV=${(fin.ltv_pct[t] * 100).toFixed(1)}%`);
}
