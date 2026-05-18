// Verify the engine re-prices reactively when scenario changes.
// Run with: cd apps/web && npx tsx scripts/scenario-compare.mjs

import { SCENARIO_CATALOG, buildBundleForScenario } from "../src/lib/underwriting/defaults.ts";

const fmt = (n) => (Number.isFinite(n) ? n.toFixed(2).replace(".", ",") : "—");
const fmtEur = (n) => {
  if (!Number.isFinite(n)) return "—";
  const abs = Math.abs(n);
  if (abs >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M €`;
  if (abs >= 1_000) return `${(n / 1_000).toFixed(0)}k €`;
  return `${n.toFixed(0)} €`;
};

console.log("Scenario comparison · Madrid Centro · 4* · 256 keys · exit Y7\n");
console.log("| Scenario     | Entry cap | Exit cap | Exit price   | Project IRR | Equity IRR | MOIC  | Confidence |");
console.log("|--------------|----------:|---------:|-------------:|------------:|-----------:|------:|-----------:|");

for (const s of SCENARIO_CATALOG) {
  const b = buildBundleForScenario(s.id);
  const cap = b.computed.cap_rate;
  const exit = b.computed.exit;
  console.log(
    `| ${s.label.padEnd(12)} | ${fmt(cap.entry.used_pct).padStart(8)}% | ${fmt(cap.exit.used_pct).padStart(7)}% | ${fmtEur(exit.exit_price).padStart(12)} | ${fmt(exit.project_irr_pct).padStart(10)}% | ${fmt(exit.equity_irr_pct).padStart(9)}% | ${fmt(exit.moic).padStart(5)}x | ${cap.entry.dynamic.confidence.score_0_100.toFixed(0).padStart(3)}/100 |`,
  );
}

console.log("\nDelta vs Mercado:");
const base = buildBundleForScenario("base");
for (const s of SCENARIO_CATALOG) {
  if (s.id === "base") continue;
  const b = buildBundleForScenario(s.id);
  const dCap = (b.computed.cap_rate.entry.used_pct - base.computed.cap_rate.entry.used_pct).toFixed(2);
  const dIrr = (b.computed.exit.equity_irr_pct - base.computed.exit.equity_irr_pct).toFixed(2);
  const dMoic = (b.computed.exit.moic - base.computed.exit.moic).toFixed(2);
  const dPrice = b.computed.exit.exit_price - base.computed.exit.exit_price;
  console.log(`  ${s.label}: Δ entry cap ${dCap}pp · Δ equity IRR ${dIrr}pp · Δ MOIC ${dMoic}x · Δ exit price ${fmtEur(dPrice)}`);
}
