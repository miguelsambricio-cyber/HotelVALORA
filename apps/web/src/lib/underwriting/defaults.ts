/**
 * Default scenario · seeds the operator's Excel baseline.
 *
 * Block 2 refactor (2026-05-18):
 *   · Switched to PeriodSeries + YEARLY_PERIODS_Y0_Y10
 *   · Replaced asset_tranche/capex_tranche → tranches: DebtTranche[]
 *   · Bundle now carries VersionTag (schema + engine versions)
 *   · Computed is built by the engine orchestrator (zero-shaped during scaffold)
 *
 * What's here right now: inputs only · the engine runs at module load
 * to produce computed. UI sees a complete bundle either way.
 */

import type { UnderwritingBundle, UnderwritingInputs, ScenarioMeta } from "./types";
import type { DebtTranche } from "./financing-tranches";
import { YEARLY_PERIODS_Y0_Y10, alignToSeries } from "./temporal";
import { currentVersionTag } from "./versioning";
import { runEngine } from "./engine";

const SCENARIO_BASE_META: ScenarioMeta = {
  id: "base",
  label: "Base case",
  description: "Default underwriting scenario · operator baseline assumptions",
};

const PERIODS = YEARLY_PERIODS_Y0_Y10;

const SENIOR_TRANCHE: DebtTranche = {
  id: "senior_secured_y0",
  kind: "senior_secured",
  label: "Senior Secured · acquisition",
  origination_period_index: 0,
  principal: { kind: "ltv_of_value", ltv_pct: 65, value_basis: "hotel_value" },
  rate: { kind: "floating", base: "euribor_12m", margin_pct: 1.25 },
  amortization: { kind: "bullet", years: 10, bullet_pct: 25 },
  grace_periods: 1,
  maturity_periods: 10,
};

const CAPEX_TRANCHE: DebtTranche = {
  id: "senior_capex_y0",
  kind: "senior_capex",
  label: "Senior CAPEX line",
  origination_period_index: 0,
  principal: { kind: "ltc_of_total", ltc_pct: 80, cost_basis: "capex_only" },
  rate: { kind: "floating", base: "euribor_12m", margin_pct: 1.25 },
  amortization: { kind: "straight", years: 7 },
  grace_periods: 1,
  maturity_periods: 7,
};

const INPUTS_BASE: UnderwritingInputs = {
  scenario_id: "base",
  asset: {
    hotel_name: "Placeholder Hotel",
    rooms: 256,
    total_sqm: 15_450,
    intervention_sqm: 11_588,
    market: "Madrid",
    submarket: "Madrid Centro",
    category: "4star",
    state: "renovated",
  },
  periods: PERIODS,
  acquisition: {
    asking_price: 82_300_000,
    hotel_value: 83_383_058,
    cap_rate: { manual_override_pct: 6.25, use_dynamic: true },
    costs: {
      // Spanish acquisition-cost percentages · stored as decimals.
      // Excel shows them as 0.02% and 0.06% · we store the decimal (0.0002 = 0.02%).
      notary_registry_pct: 0.0002,
      ajd_pct: 0.0006,
      itp_pct: 0,
      acquisition_fee_pct: 0,
      key_money_total: 0,
    },
  },
  capex: {
    hard_cost: {
      structure_pct: 0,
      asset_content_pct: 0,
      mep_per_room: 11_250,
      exterior_pct: 0.02,
    },
    soft_cost: {
      licensing_pct: 0.02,
      technical_consultant_pct: 0.04,
      development_fee_pct: 0,
      preopening_total: 0,
      ffe_per_room: 23_500,
      ose_per_room: 1_500,
      insurance_pct: 0.0012,
    },
    contingency_pct: 0.05,
  },
  // pl_drivers in ACTUAL € (Excel reference shows k€; multiplied ×1000 here).
  pl_drivers: {
    gop: {
      hotel: alignToSeries([0, 4_891_000, 5_291_000, 5_473_000, 5_636_000, 5_623_000, 5_641_000, 5_657_000, 5_716_000, 5_720_000, 5_743_000], PERIODS),
      fb: alignToSeries([0, 1_374_000, 1_400_000, 1_427_000, 1_454_000, 1_482_000, 1_510_000, 1_539_000, 1_568_000, 1_598_000, 1_629_000], PERIODS),
      other: alignToSeries([0, 418_000, 440_000, 463_000, 488_000, 513_000, 539_000, 567_000, 596_000, 626_000, 657_000], PERIODS),
    },
    costs: {
      mgmt_fee: alignToSeries([0, -698_000, -729_000, -750_000, -770_000, -783_000, -797_000, -812_000, -829_000, -844_000, -860_000], PERIODS),
      property_tax: alignToSeries([0, -106_000, -109_000, -113_000, -116_000, -120_000, -123_000, -127_000, -131_000, -135_000, -139_000], PERIODS),
      property_insurance: alignToSeries([0, -61_000, -62_000, -64_000, -65_000, -67_000, -69_000, -70_000, -72_000, -74_000, -76_000], PERIODS),
      ffe_reserve: alignToSeries([0, -607_000, -634_000, -652_000, -670_000, -681_000, -693_000, -706_000, -721_000, -734_000, -748_000], PERIODS),
    },
  },
  depreciation: { building_years: 25, mep_years: 7 },
  financing: {
    tranches: [SENIOR_TRANCHE, CAPEX_TRANCHE],
    euribor_12m_pct: 2.75,
  },
  exit: {
    cap_rate: { manual_override_pct: 6.25, use_dynamic: true },
    year: 7,
    fee_pct: 0.015,
  },
  tax: { cit_rate_pct: 0.25, ebitda_limit_pct: 0.30, finexp_floor_eur: 1_000_000 },
};

export const SCENARIO_BASE: UnderwritingBundle = {
  ...currentVersionTag(),
  meta: SCENARIO_BASE_META,
  inputs: INPUTS_BASE,
  computed: runEngine(INPUTS_BASE),
};

// ─── Scenario catalog · drives the Scenario UI picker ────────────────
//
// The cap-rate-engine's adjustment policy maps scenario_id substrings
// to deltas (downside/conservative → +0.30 pp · upside/aggressive → -0.20 pp).
// The IDs below match those substrings so the engine reacts correctly.

export interface ScenarioCatalogEntry {
  id: string;
  label: string;
  hint: string;
}

export const SCENARIO_CATALOG: ScenarioCatalogEntry[] = [
  { id: "downside", label: "Conservador", hint: "+0,30pp · underwriting prudence" },
  { id: "base", label: "Mercado", hint: "Base case · no scenario overlay" },
  { id: "upside", label: "Optimista", hint: "−0,20pp · aggressive pricing" },
];

/**
 * Build a fresh UnderwritingBundle for a given scenarioId · re-runs the
 * engine deterministically. Used by the Scenario UI to re-price the
 * whole report reactively when the operator switches scenarios.
 */
export function buildBundleForScenario(scenarioId: string): UnderwritingBundle {
  const entry = SCENARIO_CATALOG.find((s) => s.id === scenarioId);
  const inputs: UnderwritingInputs = { ...INPUTS_BASE, scenario_id: scenarioId };
  return {
    ...currentVersionTag(),
    meta: {
      id: scenarioId,
      label: entry?.label ?? scenarioId,
      description: entry?.hint ?? SCENARIO_BASE_META.description,
    },
    inputs,
    computed: runEngine(inputs),
  };
}
