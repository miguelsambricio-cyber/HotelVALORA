// Cross-segment validation · 3 representative Madrid hotels.
// Confirms the cap-rate engine + Executive Summary mapper don't
// overfit to Mandarin Ritz, behave coherently across cohorts, and
// don't leak NaN/null/absurd values.
//
// Run with: cd apps/web && npx tsx scripts/cross-segment-validation.mjs

import {
  runDynamicCapRate,
  DEFAULT_RATES_REGIME,
  SEEDED_HOTEL_COMPS,
} from "../src/lib/underwriting/cap-rate-engine/index.ts";

// Hard-coded canonical data snapshots (frozen at validation time so the
// test is reproducible if Supabase data later changes). Pulled via MCP.
const HOTELS = [
  {
    cohort: "luxury_branded",
    id: "dafc4073-ab60-43ec-91a0-ac1d7311232e",
    canonical_name: "Mandarin Oriental Ritz, Madrid",
    chain_scale: "luxury",
    star_rating: 5,
    hotel_type: "urban",
    brand: "Mandarin Oriental",
    brand_family: "Mandarin Oriental Hotel Group",
    total_rooms: 153,
    total_keys: 153,
    year_opened: 1910,
    year_renovated_last: 2021,
    meeting_space_sqm: 1500,
    meeting_rooms_count: 13,
    city_normalized: "Madrid",
    neighborhood: "Retiro",
    country_code: "ES",
    market_name: "Madrid",
    submarket_name: "Retiro",
  },
  {
    cohort: "upscale_branded_no_keys",
    id: "651f9675-301c-43f7-820a-82e3f129b9f3",
    canonical_name: "AC Hotel Recoletos by Marriott",
    chain_scale: "upscale",
    star_rating: 4,
    hotel_type: "urban",
    brand: "AC Hotel",
    brand_family: "Marriott International",
    total_rooms: null,
    total_keys: null,
    year_opened: null,
    year_renovated_last: null,
    meeting_space_sqm: null,
    meeting_rooms_count: null,
    city_normalized: "Madrid",
    neighborhood: "Salamanca",
    country_code: "ES",
    market_name: "Madrid",
    submarket_name: "Salamanca",
  },
  {
    cohort: "independent_unknown_scale",
    id: "ac2d227a-4721-43b5-aba5-d0e2f4311de8",
    canonical_name: "7 Islas Hotel",
    chain_scale: "unknown",
    star_rating: 4,
    hotel_type: "urban",
    brand: null,
    brand_family: null,
    total_rooms: null,
    total_keys: null,
    year_opened: null,
    year_renovated_last: null,
    meeting_space_sqm: null,
    meeting_rooms_count: null,
    city_normalized: "Madrid",
    neighborhood: "Centro",
    country_code: "ES",
    market_name: "Madrid",
    submarket_name: "Madrid Centre",
  },
];

// Snapshot · market_timeseries placeholders (close to live values for Madrid)
// Used by the Executive Summary mapper for ADR/occupancy/RevPAR/per-room.
const MARKET_KPI = {
  adr_spot: 218.5,
  adr_12m: 215.0,
  occupancy_spot: 0.74,
  occupancy_12m: 0.72,
  revpar_spot: 162.0,
  revpar_12m: 154.8,
  market_yield: 6.5,
  market_sale_price_per_room: 285_000,
};

/** Mirror of toStarCategory in underwriting-runner.ts */
function toStarCategory(starRating, chainScale) {
  if (starRating === 5 || chainScale === "luxury" || chainScale === "upper_upscale") return "5star";
  if (starRating === 4 || chainScale === "upscale" || chainScale === "upper_midscale") return "4star";
  if (starRating === 3 || chainScale === "midscale" || chainScale === "economy") return "3star";
  if (chainScale === "lifestyle" || chainScale === "boutique") return "5star";
  return null;
}

function defaultRoomsByScale(scale) {
  switch (scale) {
    case "luxury": return 150;
    case "upper_upscale": return 220;
    case "upscale": return 180;
    case "upper_midscale": return 140;
    case "midscale": return 110;
    case "economy": return 90;
    default: return 150;
  }
}

function sqmPerKey(scale) {
  switch (scale) {
    case "luxury": return 50;
    case "upper_upscale": return 42;
    case "upscale": return 35;
    case "midscale": return 28;
    default: return 35;
  }
}

function deriveAssetState(h) {
  const yr = new Date().getFullYear();
  if (h.year_renovated_last && yr - h.year_renovated_last <= 7) return "renovated";
  if (h.year_opened && yr - h.year_opened <= 5) return "new";
  return "renovated";
}

function buildAssetBasics(h) {
  const category = toStarCategory(h.star_rating, h.chain_scale);
  const market = h.market_name ?? h.city_normalized;
  const submarket = h.submarket_name ?? h.neighborhood;
  if (!category || !market || !submarket) return null;
  const rooms = h.total_keys ?? h.total_rooms ?? defaultRoomsByScale(h.chain_scale);
  const perKey = sqmPerKey(h.chain_scale);
  const total_sqm = rooms * perKey;
  return {
    asset_id: h.id,
    hotel_name: h.canonical_name,
    rooms,
    total_sqm,
    intervention_sqm: total_sqm,
    market,
    submarket,
    category,
    state: deriveAssetState(h),
  };
}

function runForHotel(h) {
  const asset = buildAssetBasics(h);
  if (!asset) return null;
  const heuristic_fields = [];
  if (h.total_keys === null && h.total_rooms === null) heuristic_fields.push("rooms");
  heuristic_fields.push("total_sqm");
  if (!h.year_opened && !h.year_renovated_last) heuristic_fields.push("state");
  const result = runDynamicCapRate({
    asset,
    scenario_id: "base",
    override: { enabled: false },
    rates_regime: DEFAULT_RATES_REGIME,
    comparables: SEEDED_HOTEL_COMPS,
    side: "entry",
  });
  return { capRate: result, assetBasics: asset, used_heuristics: heuristic_fields.length > 0, heuristic_fields };
}

function gopByScale(s) {
  if (s === "luxury") return 35;
  if (s === "upper_upscale") return 38;
  if (s === "upscale") return 40;
  if (s === "upper_midscale") return 41;
  if (s === "midscale") return 42;
  if (s === "economy") return 44;
  return 39;
}

function mapExecutiveSummaryValuation(h, marketKpi) {
  const keys = h.total_keys ?? h.total_rooms ?? 0;
  const engineRun = runForHotel(h);
  const capRate = engineRun?.capRate.used_pct ?? marketKpi.market_yield;
  const perRoom = marketKpi.market_sale_price_per_room;
  const totalSqm = engineRun?.assetBasics.total_sqm ?? keys * 38;
  const estimatedValue = keys > 0 ? Math.round(perRoom * keys) : (engineRun ? Math.round(perRoom * engineRun.assetBasics.rooms) : 0);
  const gopMargin = gopByScale(h.chain_scale);
  const ebitdaAfterReplacement = estimatedValue > 0 ? Math.round((estimatedValue * capRate) / 100) : 0;
  const bandLow = engineRun?.capRate.band.low_pct ?? capRate * 0.95;
  const bandHigh = engineRun?.capRate.band.high_pct ?? capRate * 1.05;
  const valuationRangeLow = estimatedValue > 0 ? Math.round(estimatedValue * (capRate / bandHigh)) : 0;
  const valuationRangeHigh = estimatedValue > 0 ? Math.round(estimatedValue * (capRate / bandLow)) : 0;
  const perSqmHotel = totalSqm > 0 ? Math.round(estimatedValue / totalSqm) : 0;
  return {
    engineRun,
    valuation: {
      gopMargin,
      ebitdaAfterReplacement,
      capRate: Number(capRate.toFixed(2)),
      bandLow: Number(bandLow.toFixed(2)),
      bandHigh: Number(bandHigh.toFixed(2)),
      scenario: engineRun ? "Engine · base" : "Mercado",
      valuationRangeLow,
      valuationRangeHigh,
      estimatedValue,
      perRoom: Math.round(perRoom),
      perSqmHotel,
    },
    keys: keys > 0 ? keys : (engineRun?.assetBasics.rooms ?? 0),
    totalSqm,
  };
}

// === Sanity checks ===
function isNumberOk(n, allowZero = false) {
  if (typeof n !== "number") return false;
  if (Number.isNaN(n)) return false;
  if (!Number.isFinite(n)) return false;
  if (!allowZero && n === 0) return false;
  return true;
}

function validate(result) {
  const issues = [];
  const v = result.valuation;
  if (!result.engineRun) issues.push("engineRun is null · engine did not run");
  if (!isNumberOk(v.capRate)) issues.push(`capRate not finite: ${v.capRate}`);
  if (!isNumberOk(v.gopMargin)) issues.push(`gopMargin not finite: ${v.gopMargin}`);
  if (!isNumberOk(v.ebitdaAfterReplacement)) issues.push(`ebitdaAfterReplacement not finite: ${v.ebitdaAfterReplacement}`);
  if (!isNumberOk(v.valuationRangeLow)) issues.push(`valuationRangeLow not finite: ${v.valuationRangeLow}`);
  if (!isNumberOk(v.valuationRangeHigh)) issues.push(`valuationRangeHigh not finite: ${v.valuationRangeHigh}`);
  if (!isNumberOk(v.estimatedValue)) issues.push(`estimatedValue not finite: ${v.estimatedValue}`);
  if (!isNumberOk(v.perSqmHotel)) issues.push(`perSqmHotel not finite: ${v.perSqmHotel}`);
  // Range sanity
  if (v.valuationRangeLow > v.valuationRangeHigh) issues.push("range inverted: low > high");
  if (v.valuationRangeLow > v.estimatedValue * 1.2) issues.push("range low > estimated*1.2 · suspect");
  if (v.valuationRangeHigh < v.estimatedValue * 0.5) issues.push("range high < estimated*0.5 · suspect");
  // Cap rate sanity · Madrid hotel cap rates 4-9 % is the institutional band
  if (v.capRate < 3.5 || v.capRate > 10) issues.push(`capRate outside 3.5-10 % band: ${v.capRate}`);
  if (v.bandLow >= v.bandHigh) issues.push("band inverted: low >= high");
  // GOP sanity
  if (v.gopMargin < 25 || v.gopMargin > 50) issues.push(`gopMargin outside 25-50 % band: ${v.gopMargin}`);
  // €/sqm sanity · Madrid prime 2k-12k €/sqm
  if (v.perSqmHotel < 1500 || v.perSqmHotel > 20_000) issues.push(`perSqmHotel outside 1.5-20k €/sqm: ${v.perSqmHotel}`);
  return issues;
}

console.log("================================================================================");
console.log("CROSS-SEGMENT VALIDATION · Cap-rate engine + Executive Summary mapper");
console.log("================================================================================");
console.log(`Date: ${new Date().toISOString()}`);
console.log(`Rates regime: euribor=${DEFAULT_RATES_REGIME.euribor_12m_pct}% · bond10y=${DEFAULT_RATES_REGIME.bond_10y_pct}%`);
console.log(`Market KPI assumption: yield=${MARKET_KPI.market_yield}% · €/key=${MARKET_KPI.market_sale_price_per_room.toLocaleString("es-ES")}`);
console.log(`Comps in seed pool: ${SEEDED_HOTEL_COMPS.length}`);
console.log("");

const allIssues = [];
const cohortSummary = [];

for (const h of HOTELS) {
  console.log(`================================================================================`);
  console.log(`COHORT: ${h.cohort}`);
  console.log(`HOTEL:  ${h.canonical_name}`);
  console.log(`================================================================================`);
  const result = mapExecutiveSummaryValuation(h, MARKET_KPI);
  if (!result.engineRun) {
    console.log("⚠️  ENGINE RETURNED NULL · category or market resolution failed");
    allIssues.push({ cohort: h.cohort, issue: "engineRun is null" });
    continue;
  }
  const r = result.engineRun;
  const v = result.valuation;
  console.log(`Asset:        ${r.assetBasics.category} · ${r.assetBasics.state} · ${r.assetBasics.rooms} keys · ${r.assetBasics.total_sqm.toLocaleString("es-ES")} m²`);
  console.log(`Heuristics:   ${r.used_heuristics ? r.heuristic_fields.join(", ") : "none"}`);
  console.log(`Engine result:`);
  console.log(`  Used cap rate:       ${v.capRate.toFixed(2)}%  (source: ${r.capRate.source})`);
  console.log(`  Recommended:         ${r.capRate.recommended_pct.toFixed(2)}%`);
  console.log(`  Band:                ${v.bandLow.toFixed(2)}% — ${v.bandHigh.toFixed(2)}%`);
  console.log(`  Confidence:          ${r.capRate.confidence.score_0_100.toFixed(0)}/100 (${r.capRate.confidence.band})`);
  console.log(`  Evidence comps:      ${r.capRate.evidence.comp_count} in scope · median ${r.capRate.evidence.median_cap_pct.toFixed(2)}%`);
  console.log(`Executive Summary valuation block:`);
  console.log(`  Estimated value:     ${v.estimatedValue.toLocaleString("es-ES")} €`);
  console.log(`  Range:               ${v.valuationRangeLow.toLocaleString("es-ES")} € — ${v.valuationRangeHigh.toLocaleString("es-ES")} €`);
  console.log(`  Range vs estimate:   ${(v.valuationRangeLow / v.estimatedValue * 100).toFixed(1)}% — ${(v.valuationRangeHigh / v.estimatedValue * 100).toFixed(1)}%`);
  console.log(`  Per key:             ${v.perRoom.toLocaleString("es-ES")} €/key`);
  console.log(`  Per m² hotel:        ${v.perSqmHotel.toLocaleString("es-ES")} €/m²`);
  console.log(`  GOP margin:          ${v.gopMargin}%`);
  console.log(`  EBITDA after repl.:  ${v.ebitdaAfterReplacement.toLocaleString("es-ES")} €`);
  console.log(`  Scenario label:      ${v.scenario}`);
  const issues = validate(result);
  if (issues.length === 0) {
    console.log(`✅ PASS · no NaN / null / absurd values`);
  } else {
    console.log(`❌ FAIL · ${issues.length} issue(s):`);
    issues.forEach((i) => console.log(`   · ${i}`));
    issues.forEach((i) => allIssues.push({ cohort: h.cohort, issue: i }));
  }
  cohortSummary.push({
    cohort: h.cohort,
    hotel: h.canonical_name,
    used_pct: v.capRate,
    confidence: r.capRate.confidence.score_0_100,
    estimated: v.estimatedValue,
    perSqm: v.perSqmHotel,
    gop: v.gopMargin,
  });
  console.log("");
}

console.log("================================================================================");
console.log("CROSS-COHORT SUMMARY");
console.log("================================================================================");
console.log("cohort                      cap_rate%   conf%   est (M€)    €/sqm     GOP%");
cohortSummary.forEach((c) => {
  console.log(
    `${c.cohort.padEnd(28)}${c.used_pct.toFixed(2).padStart(7)}    ` +
    `${c.confidence.toFixed(0).padStart(3)}    ` +
    `${(c.estimated / 1e6).toFixed(1).padStart(7)}    ` +
    `${c.perSqm.toLocaleString("es-ES").padStart(7)}    ` +
    `${c.gop.toString().padStart(2)}`
  );
});

// Drift check: cap rate spread across cohorts
const caps = cohortSummary.map((c) => c.used_pct);
const spread = Math.max(...caps) - Math.min(...caps);
console.log(`\nCap-rate spread across cohorts: ${spread.toFixed(2)}pp`);
if (spread < 0.05) {
  console.log(`⚠️  WARNING · spread < 0.05pp · engine may be flat across cohorts`);
} else if (spread > 3) {
  console.log(`⚠️  WARNING · spread > 3pp · engine may be overreacting to category change`);
} else {
  console.log(`✅ Spread within expected institutional range (0.05-3pp)`);
}

if (allIssues.length === 0) {
  console.log(`\n================================================================================`);
  console.log(`✅ ALL ${HOTELS.length} COHORTS PASS · safe to validate UI on preview`);
  console.log(`================================================================================`);
  process.exit(0);
} else {
  console.log(`\n================================================================================`);
  console.log(`❌ ${allIssues.length} ISSUE(S) ACROSS COHORTS`);
  console.log(`================================================================================`);
  process.exit(1);
}
