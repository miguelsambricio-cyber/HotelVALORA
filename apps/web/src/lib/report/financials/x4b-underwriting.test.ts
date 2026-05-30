import { describe, it, expect } from "vitest";
import { computePL } from "./calculations";
import { getDefaultAssumptions } from "./assumptions";
import { buildEnginePlDrivers } from "./pl-drivers-bridge";
import { computeValuationFromNoi } from "./valuation";
import type { PLAssumptions } from "./types";
import { SCENARIO_BASE } from "@/lib/underwriting/defaults";
import { runEngine } from "@/lib/underwriting/engine";
import {
  runDynamicCapRate,
  DEFAULT_RATES_REGIME,
  SEEDED_HOTEL_COMPS,
} from "@/lib/underwriting/cap-rate-engine";
import type { UnderwritingInputs } from "@/lib/underwriting/types";
import type { AssetBasics } from "@/lib/underwriting/types";
import type { DebtTranche } from "@/lib/underwriting/financing-tranches";
import {
  FINANCIAL_STRUCTURE_ENGINE,
  buildFinancingTranches,
} from "@/lib/admin/financials/financial-structure-config";
import {
  ACQUISITION_COST_POLICY_DEFAULTS,
  acquisitionPolicyForCountry,
  acquisitionPolicyToEngineCosts,
  sizeTierForRooms,
} from "@/lib/admin/financials/acquisition-cost-policy";
import {
  qualityScore,
  computeScoreCapAdjustment,
  SCORE_QUALITY_WEIGHTS,
} from "@/lib/admin/financials/score-cap-adjustment";
import { DYNAMIC_CAP_RATE_POLICY_DEFAULTS } from "@/lib/admin/financials/dynamic-cap-rate-policy";
import { resolveSegmentBase, SEGMENT_BASE_PRIORS_ES, SEGMENTS, priorFromBand } from "@/lib/admin/financials/segment-base-priors";
import { estimateNoiAfterReplacement, impliedCapPct, summarizeImpliedCapBySegment } from "@/lib/admin/financials/implied-cap-check";
import { repositionCapexForAsset, capexReformTotalEur, defaultCapexMatrixState } from "@/lib/admin/financials/capex-reform";
import { capexTotalForCell } from "@/lib/admin/financials/defaults";
import { deriveHasCapex, CAPEX_RECENCY_YEARS } from "./ffe-reserve";

// Barajas-style hotel under the national-USALI cascade (Level 2).
const COSTAR_NATIONAL_ES = {
  revFB: (17.7 + 6.8) / 100,
  revMeeting: 0.038, revSpa: 0.022, revParkingOther: 0.019,
  expRooms: 0.257, expFB: 0.792, expOtherDept: 0.858,
  expAdmin: 0.072, expSalesMarketing: 0.065, expPropertyMaint: 0.038, expUtilities: 0.028,
  expMgmtFee: 0.046, expPropertyTax: 0.007, expInsurance: 0.004, expFfeReserve: 0.04,
};
function barajasAssumptions(): PLAssumptions {
  return {
    ...getDefaultAssumptions(),
    ratios: { ...COSTAR_NATIONAL_ES },
    rooms: 150,
    occupancyYear1: 0.7648,
    adrYear1: 112.62,
  };
}

const ZERO_CAPEX: UnderwritingInputs["capex"] = {
  hard_cost: { structure_pct: 0, asset_content_pct: 0, mep_per_room: 0, exterior_pct: 0 },
  soft_cost: { licensing_pct: 0, technical_consultant_pct: 0, development_fee_pct: 0, preopening_total: 0, ffe_per_room: 0, ose_per_room: 0, insurance_pct: 0 },
  contingency_pct: 0,
};

function buildInputs(
  entryCap: number,
  exitCap: number,
  exitYear: number,
  financingTranches?: DebtTranche[],
): {
  inputs: UnderwritingInputs;
  pl: ReturnType<typeof computePL>;
  entryValue: number;
} {
  const a = barajasAssumptions();
  const pl = computePL(a, { hasCapex: false });
  const base = SCENARIO_BASE.inputs as UnderwritingInputs;
  const plDrivers = buildEnginePlDrivers(pl, a, base.periods.length);
  const entryValue = computeValuationFromNoi({
    pl, assumptions: a, capRatePct: entryCap, costarRatiosResolved: true, mode: { kind: "current_ttm" },
  })!;
  const inputs: UnderwritingInputs = {
    ...base,
    asset: { ...base.asset, rooms: 150, total_sqm: 150 * 38, intervention_sqm: 150 * 38 },
    acquisition: { ...base.acquisition, asking_price: entryValue, hotel_value: entryValue, cap_rate: { manual_override_pct: entryCap, use_dynamic: false } },
    capex: ZERO_CAPEX,
    pl_drivers: plDrivers,
    exit: { ...base.exit, year: exitYear, cap_rate: { manual_override_pct: exitCap, use_dynamic: false } },
    financing: financingTranches
      ? { tranches: financingTranches, euribor_12m_pct: base.financing.euribor_12m_pct }
      : base.financing,
  };
  return { inputs, pl, entryValue };
}

describe("X4b · pl-drivers bridge (computePL → engine)", () => {
  it("engine ebitda_after_replacement equals computePL ebitdaAfterReplacement (Y1-5)", () => {
    const { inputs, pl } = buildInputs(6.5, 6.9, 7);
    const computed = runEngine(inputs);
    for (let y = 1; y <= 5; y++) {
      expect(computed.pnl.ebitda_after_replacement[y]).toBeCloseTo(pl.results.ebitdaAfterReplacement[y - 1], 0);
    }
    expect(computed.pnl.ebitda_after_replacement[0]).toBe(0); // Y0 acquisition · no ops
  });
});

describe("X4b · IRR (project + equity) on real NOI + financing", () => {
  it("project + equity IRR are finite and in a sane band", () => {
    const { inputs } = buildInputs(6.5, 6.9, 7);
    const computed = runEngine(inputs);
    const pirr = computed.exit!.project_irr_pct;
    const eirr = computed.exit!.equity_irr_pct;
    expect(Number.isFinite(pirr)).toBe(true);
    expect(Number.isFinite(eirr)).toBe(true);
    expect(pirr).toBeGreaterThan(-50);
    expect(pirr).toBeLessThan(100);
    expect(eirr).toBeGreaterThan(-50);
    expect(eirr).toBeLessThan(150);
    expect(computed.exit!.moic).toBeGreaterThan(0);
  });

  it("exit value = NOI(exit year) / exit cap (post-FF&E NOI)", () => {
    const exitCap = 6.9;
    const { inputs } = buildInputs(6.5, exitCap, 7);
    const computed = runEngine(inputs);
    const noiExit = computed.pnl.ebitda_after_replacement[7];
    expect(computed.exit!.exit_price).toBeCloseTo(noiExit / (exitCap / 100), 0);
  });
});

describe("X4b TRAMO 1 · Financial Structure bridge (admin → engine)", () => {
  it("config carries the operator single values (65 LTV · 250 bps · interest-only 5y · hold 7)", () => {
    expect(FINANCIAL_STRUCTURE_ENGINE.senior_ltv_pct).toBe(65);
    expect(FINANCIAL_STRUCTURE_ENGINE.debt_spread_bps).toBe(250);
    expect(FINANCIAL_STRUCTURE_ENGINE.term_years).toBe(5);
    expect(FINANCIAL_STRUCTURE_ENGINE.hold_years).toBe(7);
  });

  it("raising debt cost 125→250 bps WORSENS equity IRR (sign check)", () => {
    // Before: SCENARIO_BASE tranches (Euribor + 125 bps, bullet 10y).
    const before = runEngine(buildInputs(6.5, 6.9, 7).inputs).exit!.equity_irr_pct;
    // After: Financial Structure bridge (Euribor + 250 bps, interest-only 5y).
    const after = runEngine(buildInputs(6.5, 6.9, 7, buildFinancingTranches()).inputs).exit!.equity_irr_pct;
    expect(after).toBeLessThan(before); // higher debt cost → lower equity IRR
  });

  it("positive leverage · equity IRR > project IRR when asset yield > debt cost", () => {
    const computed = runEngine(buildInputs(6.5, 6.9, 7, buildFinancingTranches()).inputs).exit!;
    // cap ~6.5% > all-in debt ~5.25% (Euribor 2.75 + 250 bps) → leverage accretive.
    expect(computed.equity_irr_pct).toBeGreaterThan(computed.project_irr_pct);
  });
});

describe("X4b TRAMO 2 · Acquisition friction matrix (admin → engine · country-agnostic)", () => {
  it("size tier from rooms (0-75 small · 76-200 medium · 201+ large)", () => {
    expect(sizeTierForRooms(50)).toBe("small");
    expect(sizeTierForRooms(150)).toBe("medium");
    expect(sizeTierForRooms(300)).toBe("large");
  });

  it("country-agnostic resolver: ES → policy · unknown country → null", () => {
    expect(acquisitionPolicyForCountry("ES")).not.toBeNull();
    expect(acquisitionPolicyForCountry("es")).not.toBeNull();
    expect(acquisitionPolicyForCountry("FR")).toBeNull();
    expect(acquisitionPolicyForCountry(null)).toBeNull();
  });

  it("España matrix flows to engine costs (large 4★: notary 0.02% · AJD 0.06% · ITP 0)", () => {
    const costs = acquisitionPolicyToEngineCosts(
      ACQUISITION_COST_POLICY_DEFAULTS, "4star", "large",
      { asking_price_eur: 30_000_000, rooms: 250, total_sqm: 9500 },
    );
    expect(costs.notary_registry_pct).toBeCloseTo(0.0002, 6); // 0.02%
    expect(costs.ajd_pct).toBeCloseTo(0.0006, 6);             // 0.06%
    expect(costs.itp_pct).toBe(0);
    expect(costs.key_money_total).toBe(0);
  });

  it("size-driven: small tier carries higher friction than large", () => {
    const ctx = { asking_price_eur: 20_000_000, rooms: 50, total_sqm: 1900 };
    const small = acquisitionPolicyToEngineCosts(ACQUISITION_COST_POLICY_DEFAULTS, "4star", "small", ctx);
    const large = acquisitionPolicyToEngineCosts(ACQUISITION_COST_POLICY_DEFAULTS, "4star", "large", ctx);
    expect(small.notary_registry_pct).toBeGreaterThan(large.notary_registry_pct); // 0.07% > 0.02%
  });
});

describe("X4b · entry value coherent with Executive Summary", () => {
  it("entry value = NOI(Y1)/entry cap via the SAME helper (shared by construction)", () => {
    const a = barajasAssumptions();
    const pl = computePL(a, { hasCapex: false });
    const cap = 6.5;
    const v = computeValuationFromNoi({ pl, assumptions: a, capRatePct: cap, costarRatiosResolved: true, mode: { kind: "current_ttm" } });
    expect(v).toBe(Math.round(pl.results.ebitdaAfterReplacement[0] / (cap / 100)));
    // The underwriting slice uses this exact call → same value as Executive Summary.
  });
});

describe("X4b TRAMO 3 · Dynamic Cap Rate policy connection (panel ↔ engine)", () => {
  const madridCentre: AssetBasics = {
    rooms: 250, total_sqm: 9500, intervention_sqm: 9500,
    market: "Madrid", submarket: "Madrid Centre", category: "4star", state: "renovated",
  };
  const run = (asset: AssetBasics, scenario: string) =>
    runDynamicCapRate({
      asset, scenario_id: scenario, override: { enabled: false },
      rates_regime: DEFAULT_RATES_REGIME, comparables: SEEDED_HOTEL_COMPS, side: "entry",
    });

  it("Madrid Centre 4★ large renovated = upscale prior 5.75 + factors = 6.00% (3b method compression)", () => {
    // Base 5.75 (upscale) − 0.10 size − 0.10 operator + 0.25 macro + 0.20 liquidity = 6.00.
    expect(run(madridCentre, "base").used_pct).toBeCloseTo(6.00, 2);
  });

  it("scenario sign CORRECTED · conservative WIDENS (higher cap → lower value) · aggressive tightens", () => {
    const base = run(madridCentre, "base").used_pct;
    const conservative = run(madridCentre, "conservative").used_pct;
    const aggressive = run(madridCentre, "aggressive").used_pct;
    expect(conservative).toBeGreaterThan(base);  // prudence widens the cap
    expect(aggressive).toBeLessThan(base);        // optimism tightens the cap
    expect(conservative - base).toBeCloseTo(0.30, 2);
    expect(base - aggressive).toBeCloseTo(0.20, 2);
  });

  it("operator + liquidity factors present in the adjustment breakdown", () => {
    const adj = run(madridCentre, "base").adjustments;
    const operator = adj.find((a) => a.id === "operator");
    const liquidity = adj.find((a) => a.id === "liquidity");
    expect(operator?.delta_pct).toBe(-0.10);   // branded chain
    expect(liquidity).toBeDefined();            // band-driven (Madrid Centre = thin)
  });

  it("base = segment prior (TRAMO 3b · not a comp median · star→segment fallback)", () => {
    // 4★ with no chain_scale → star→segment fallback = upscale prior 5.75.
    const base4 = run(madridCentre, "base").adjustments.find((a) => a.id === "base")!;
    expect(base4.source).toBe("policy");
    expect(base4.delta_pct).toBe(5.75);
  });

  it("base resolves PER MARKET · ES → prior · unpopulated market → labelled fallback (never inherits ES)", () => {
    const es = run({ ...madridCentre, country: "ES", segment: "luxury", category: "5star" }, "base")
      .adjustments.find((a) => a.id === "base")!;
    expect(es.delta_pct).toBe(4.75); // ES luxury prior
    const us = run({ ...madridCentre, country: "US", segment: "luxury", category: "5star" }, "base")
      .adjustments.find((a) => a.id === "base")!;
    // US not populated → fallback (NOT the ES luxury 4.75).
    expect(us.delta_pct).toBe(DYNAMIC_CAP_RATE_POLICY_DEFAULTS.base_market_yield_pct);
    expect(us.delta_pct).not.toBe(4.75);
  });
});

describe("X4b TRAMO 3b · segment-prior base (calibrated with real €/key · not comp medians)", () => {
  const seg = (segment: string, category: "3star" | "4star" | "5star" = "5star") =>
    resolveSegmentBase({ segment, category, priors: SEGMENT_BASE_PRIORS_ES, fallbackPct: 6.5 }).base_pct;

  it("priors ordered coherently with real €/key (more €/key → lower cap)", () => {
    // €/key: luxury 720k > upper_upscale 423k > upscale 389k > upper_midscale 287k > midscale 194k
    expect(seg("luxury")).toBeLessThan(seg("upper_upscale"));
    expect(seg("upper_upscale")).toBeLessThan(seg("upscale"));
    expect(seg("upscale")).toBeLessThan(seg("upper_midscale"));
    expect(seg("upper_midscale")).toBeLessThan(seg("midscale"));
    expect(seg("midscale")).toBeLessThan(seg("economy"));
  });

  it("luxury prime compresses to 4.75% (vs the old ~6.2% stub-diluted base)", () => {
    expect(seg("luxury")).toBe(4.75);
    expect(seg("upscale")).toBe(5.75); // rule-pure (5.5-6.5 band)
  });

  it("FIXING RULE · every prior = midpoint(band) − 0.25 (systematic · reproducible)", () => {
    for (const s of SEGMENTS) {
      const p = SEGMENT_BASE_PRIORS_ES[s];
      expect(p.base_pct).toBe(priorFromBand(p.band_low, p.band_high));
    }
  });

  it("each prior declares its €/key backing + transaction count (provenance)", () => {
    expect(SEGMENT_BASE_PRIORS_ES.luxury.eur_per_key).toBe(719_801);
    expect(SEGMENT_BASE_PRIORS_ES.luxury.n_tx).toBe(11);
    expect(SEGMENT_BASE_PRIORS_ES.luxury.provenance).toBe("expert_prior");
  });

  it("chain_scale resolves directly; missing → star→segment fallback (labelled)", () => {
    const direct = resolveSegmentBase({ segment: "luxury", category: "5star", priors: SEGMENT_BASE_PRIORS_ES, fallbackPct: 6.5 });
    expect(direct.segment_from_chain_scale).toBe(true);
    const fallback = resolveSegmentBase({ segment: null, category: "5star", priors: SEGMENT_BASE_PRIORS_ES, fallbackPct: 6.5 });
    expect(fallback.segment_from_chain_scale).toBe(false);
    expect(fallback.segment).toBe("upper_upscale"); // 5★ default
  });

  it("no priors → labelled fallback (never a number without provenance)", () => {
    const r = resolveSegmentBase({ segment: "luxury", category: "5star", priors: null, fallbackPct: 6.5 });
    expect(r.base_pct).toBe(6.5);
    expect(r.label).toContain("sin calibrar");
  });
});

describe("X4b TRAMO 3b · implied-cap sanity mirror (reusable prior-validation tool)", () => {
  const ES = { rooms_revenue_pct: 0.675, ebitda_pct: 0.232, ffe_reserve_pct: 0.040 };

  it("NOI after-replacement = revenue grossed up × (EBITDA − FF&E) shares", () => {
    // 100 rooms · ADR 200 · occ 0.75 → rooms rev 5,475,000 → total/0.675 → ×0.192
    const noi = estimateNoiAfterReplacement({ rooms: 100, adr: 200, occupancy: 0.75, usali: ES });
    const expected = (100 * 200 * 0.75 * 365 / 0.675) * (0.232 - 0.040);
    expect(noi).toBeCloseTo(expected, 0);
  });

  it("implied cap = NOI / price · null when price/rooms/adr missing", () => {
    const cap = impliedCapPct({ rooms: 200, price_eur: 80_000_000, adr: 233, occupancy: 0.789, usali: ES });
    expect(cap).toBeGreaterThan(0);
    expect(impliedCapPct({ rooms: 0, price_eur: 80_000_000, adr: 233, occupancy: 0.789, usali: ES })).toBeNull();
    expect(impliedCapPct({ rooms: 200, price_eur: 0, adr: 233, occupancy: 0.789, usali: ES })).toBeNull();
  });

  it("aggregates per-segment medians + ignores nulls", () => {
    const s = summarizeImpliedCapBySegment([
      { segment: "luxury", implied_cap_pct: 2.5 },
      { segment: "luxury", implied_cap_pct: 3.5 },
      { segment: "luxury", implied_cap_pct: null },
      { segment: "upscale", implied_cap_pct: 4.0 },
    ]);
    const lux = s.find((x) => x.segment === "luxury")!;
    expect(lux.n).toBe(2);
    expect(lux.median_pct).toBe(3.0);
  });
});

describe("X4b TRAMO 3 · HotelVALORA Score factor (compset-relative · ±0.15pp)", () => {
  const policy = DYNAMIC_CAP_RATE_POLICY_DEFAULTS.score_adjustment;

  it("quality score EXCLUDES Class (no double-count) · 6 components re-normalized", () => {
    expect("class_score" in SCORE_QUALITY_WEIGHTS).toBe(false);
    // All sixes → composite 6.0 regardless of which weights present.
    const q = qualityScore({ location_score: 6, comfort_score: 6, cleanliness_score: 6, staff_score: 6, value_score: 6, facilities_score: 6 });
    expect(q).toBe(6);
    // Partial profile re-normalizes over present components.
    expect(qualityScore({ location_score: 8 })).toBe(8);
    expect(qualityScore({})).toBeNull();
  });

  it("NO-REGRESSION · hotel score == compset mean → adjustment 0", () => {
    const r = computeScoreCapAdjustment({ hotel_quality: 8.0, compset_qualities: [7.8, 8.0, 8.2, 8.0] }, policy);
    expect(r.adjustment_pp).toBe(0);
    expect(r.status).toBe("applied");
  });

  it("better than compset → LOWER cap (negative) · worse → HIGHER cap (positive)", () => {
    const better = computeScoreCapAdjustment({ hotel_quality: 9.0, compset_qualities: [7.5, 8.0, 8.0, 8.5] }, policy);
    const worse = computeScoreCapAdjustment({ hotel_quality: 7.0, compset_qualities: [7.5, 8.0, 8.0, 8.5] }, policy);
    expect(better.adjustment_pp).toBeLessThan(0);
    expect(worse.adjustment_pp).toBeGreaterThan(0);
  });

  it("STEPPED premium · 0.67σ→−0.10 · 1.33σ→−0.20 · 2σ→−0.30 (clean steps only)", () => {
    const peers = [7.5, 7.5, 8.5, 8.5]; // mean 8.0 · σ 0.5
    const r = (subj: number) => computeScoreCapAdjustment({ hotel_quality: subj, compset_qualities: peers }, policy).adjustment_pp;
    expect(r(8.25)).toBe(0);     // z=0.5 · below first cut → in-band
    expect(r(8.0 + 0.67 * 0.5)).toBe(-0.10); // z≈0.67 → step 1
    expect(r(8.0 + 1.33 * 0.5)).toBe(-0.20); // z≈1.33 → step 2
    expect(r(9.0)).toBe(-0.30);  // z=2.0 → step 3 (full premium)
    expect(r(11)).toBe(-0.30);   // clamp holds
    expect(r(8.75)).toBe(-0.20); // z=1.5 → clean −0.20 (never −0.225)
  });

  it("STEPPED penalty · 0.05 steps to +0.15 · only clean values", () => {
    const peers = [7.5, 7.5, 8.5, 8.5]; // mean 8.0 · σ 0.5
    const r = (subj: number) => computeScoreCapAdjustment({ hotel_quality: subj, compset_qualities: peers }, policy).adjustment_pp;
    expect(r(8.0 - 0.67 * 0.5)).toBe(0.05); // z≈−0.67 → step 1
    expect(r(8.0 - 1.33 * 0.5)).toBe(0.10); // z≈−1.33 → step 2
    expect(r(7.0)).toBe(0.15);   // z=−2.0 → step 3 (full penalty)
    expect(r(6.0)).toBe(0.15);   // clamp holds
  });

  it("σ_floor caps over-sensitivity on a homogeneous compset (no divide-by-zero)", () => {
    // σ=0 → σ_eff=0.30 · hotel 0.30 above → z=1.0 → 1 premium step → −0.10.
    const r = computeScoreCapAdjustment({ hotel_quality: 8.30, compset_qualities: [8.0, 8.0, 8.0, 8.0] }, policy);
    expect(r.stddev).toBe(0);
    expect(r.adjustment_pp).toBe(-0.10);
  });

  it("never penalises missing data · no hotel score / thin compset → 0 labelled", () => {
    const noHotel = computeScoreCapAdjustment({ hotel_quality: null, compset_qualities: [8, 8, 8, 8] }, policy);
    expect(noHotel.adjustment_pp).toBe(0);
    expect(noHotel.status).toBe("no_hotel_score");
    const thin = computeScoreCapAdjustment({ hotel_quality: 9, compset_qualities: [8, 8] }, policy);
    expect(thin.adjustment_pp).toBe(0);
    expect(thin.status).toBe("compset_insufficient");
  });
});

describe("X4b · CAPEX recency window 5 → 10 years (Mike · 2026-05-30)", () => {
  const y = new Date().getFullYear();
  it("window is 10 years", () => {
    expect(CAPEX_RECENCY_YEARS).toBe(10);
  });
  it("renovation 8 years ago → hasCapex=true (recent · exits renovated) · was false under 5y", () => {
    expect(deriveHasCapex({ year_opened: null, year_renovated_last: y - 8 })).toBe(true);  // within 10
    expect(y - 8 > 5).toBe(true); // would have been false under the old 5y window
  });
  it("renovation 12 years ago → hasCapex=false (outside 10 · ages to needs_work)", () => {
    expect(deriveHasCapex({ year_opened: null, year_renovated_last: y - 12 })).toBe(false);
  });
  it("no renovation date → hasCapex=false (the corpus-wide gap · still needs_work)", () => {
    expect(deriveHasCapex({ year_opened: y - 40, year_renovated_last: null })).toBe(false);
  });
});

describe("X4b TRAMO 4 · reposition CAPEX (admin matrix → IRR · stabilised = 0)", () => {
  it("trigger by state · stabilised (new/renovated) → 0 · needs_work → matrix total", () => {
    expect(repositionCapexForAsset({ state: "renovated", category: "4star", rooms: 200, total_sqm: 9000 })).toBe(0);
    expect(repositionCapexForAsset({ state: "new", category: "4star", rooms: 200, total_sqm: 9000 })).toBe(0);
    const repo = repositionCapexForAsset({ state: "needs_work", category: "4star", rooms: 200, total_sqm: 9000 });
    expect(repo).toBe(capexTotalForCell("large", "4star") * 200); // all per_key × rooms
    expect(repo).toBe(14_580_000);
  });

  it("units · per_key × rooms vs per_m2 × m² (one line switched to €/m²)", () => {
    const base = capexReformTotalEur({ tier: "large", category: "4star", rooms: 200, total_sqm: 9000 });
    const st = defaultCapexMatrixState();
    st.units["structure"] = "per_m2"; // 10,000 large/4★ → now × sqm instead of × rooms
    const withSqm = capexReformTotalEur({ tier: "large", category: "4star", rooms: 200, total_sqm: 9000, state: st });
    expect(withSqm).toBe(base - 10_000 * 200 + 10_000 * 9000);
  });

  it("NO-REGRESSION · stabilised reposition=0 → engine IRR identical to ZERO_CAPEX baseline", () => {
    const { inputs } = buildInputs(6.5, 6.9, 7, buildFinancingTranches());
    const withZero = runEngine(inputs).exit!.equity_irr_pct;
    const withReposZero = runEngine({ ...inputs, capex: { ...inputs.capex, reposition_capex_total_eur: 0 } }).exit!.equity_irr_pct;
    expect(withReposZero).toBeCloseTo(withZero, 10);
  });

  it("reposition CAPEX raises total_building_cost → lowers project IRR", () => {
    const { inputs } = buildInputs(6.5, 6.9, 7, buildFinancingTranches());
    const stabilized = runEngine(inputs);
    const reposed = runEngine({ ...inputs, capex: { ...inputs.capex, reposition_capex_total_eur: 14_580_000 } });
    expect(reposed.exit!.project_irr_pct).toBeLessThan(stabilized.exit!.project_irr_pct);
  });
});

describe("X4b · D4 dynamic exit cap flows to IRR (does not collapse to entry)", () => {
  const baseAsset: AssetBasics = {
    rooms: 150, total_sqm: 5700, intervention_sqm: 5700,
    market: "Madrid", submarket: "Barajas/Hortaleza/San Blas", category: "4star", state: "renovated",
  };
  const run = (asset: AssetBasics, side: "entry" | "exit") =>
    runDynamicCapRate({ asset, scenario_id: "base", override: { enabled: false }, rates_regime: DEFAULT_RATES_REGIME, comparables: SEEDED_HOTEL_COMPS, side }).used_pct;

  it("no-CAPEX asset ages to needs_work at exit → exit cap WIDER than entry", () => {
    const entryCap = run(baseAsset, "entry"); // renovated
    const exitCap = run({ ...baseAsset, state: "needs_work" }, "exit"); // aged
    expect(exitCap).toBeGreaterThan(entryCap);
  });

  it("same asset state → entry == exit (no fixed spread · D4 removed +20bps)", () => {
    expect(run(baseAsset, "exit")).toBeCloseTo(run(baseAsset, "entry"), 10);
  });
});
