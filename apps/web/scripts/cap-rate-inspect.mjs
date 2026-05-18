// Inspect the Dynamic Cap Rate Engine output for the base scenario.
// Run with: cd apps/web && npx tsx scripts/cap-rate-inspect.mjs

import { SCENARIO_BASE } from "../src/lib/underwriting/defaults.ts";

const b = SCENARIO_BASE;
const cap = b.computed.cap_rate;

for (const side of ["entry", "exit"]) {
  const d = cap[side].dynamic;
  console.log(`\n========== ${side.toUpperCase()} ==========`);
  console.log(`Used:        ${d.used_pct.toFixed(2)}%  (source: ${d.source})`);
  console.log(`Recommended: ${d.recommended_pct.toFixed(2)}%`);
  console.log(`Band:        ${d.band.low_pct.toFixed(2)}% — ${d.band.high_pct.toFixed(2)}%`);

  console.log(`\nEvidence:`);
  console.log(`  Comps in scope: ${d.evidence.comp_count}`);
  console.log(`  Median: ${d.evidence.median_cap_pct.toFixed(2)}%  Mean: ${d.evidence.mean_cap_pct.toFixed(2)}%`);
  console.log(`  IQR: ${d.evidence.p25_cap_pct.toFixed(2)}% — ${d.evidence.p75_cap_pct.toFixed(2)}% (spread ${d.evidence.spread_p75_p25_pct.toFixed(2)}pp)`);
  console.log(`  Stddev: ${d.evidence.stddev_cap_pct.toFixed(2)}pp`);
  console.log(`  Date range: ${d.evidence.oldest_in_scope_date} → ${d.evidence.most_recent_date}`);
  console.log(`  Liquidity 12m: ${d.evidence.liquidity_metrics.transactions_last_12m} deals · ${(d.evidence.liquidity_metrics.total_volume_last_12m_eur / 1e6).toFixed(0)}M €`);
  console.log(`  Excluded comps: ${d.evidence.comparables_excluded.length}`);
  d.evidence.comparables_excluded.slice(0, 3).forEach((e) => {
    console.log(`    · ${e.transaction_id}: ${e.reason}`);
  });

  console.log(`\nAdjustments:`);
  d.adjustments.forEach((a, i) => {
    const sign = a.category === "base" ? "=" : (a.delta_pct >= 0 ? "+" : "");
    console.log(`  ${i + 1}. [${a.category}] ${a.label}: ${sign}${a.delta_pct.toFixed(2)}pp`);
    console.log(`     ↳ ${a.rationale}`);
  });

  console.log(`\nConfidence: ${d.confidence.score_0_100.toFixed(0)}/100  (${d.confidence.band})`);
  Object.entries(d.confidence.components).forEach(([k, c]) => {
    console.log(`  · ${k}: ${c.score}/100 · ${c.explanation}`);
  });

  console.log(`\nNarrative:\n  ${d.rationale.narrative}`);

  console.log(`\nOverride: ${d.override.enabled ? `pinned ${d.override.manual_value_pct}% (Δ ${d.override.delta_vs_recommended_pct?.toFixed(2)}pp vs recommended)` : "none"}`);
}
