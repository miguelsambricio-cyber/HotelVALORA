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
      notary_registry_pct: 0.02,
      ajd_pct: 0.06,
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
  pl_drivers: {
    gop: {
      hotel: alignToSeries([0, 4_891, 5_291, 5_473, 5_636, 5_623, 5_641, 5_657, 5_716, 5_720, 5_743], PERIODS),
      fb: alignToSeries([0, 1_374, 1_400, 1_427, 1_454, 1_482, 1_510, 1_539, 1_568, 1_598, 1_629], PERIODS),
      other: alignToSeries([0, 418, 440, 463, 488, 513, 539, 567, 596, 626, 657], PERIODS),
    },
    costs: {
      mgmt_fee: alignToSeries([0, -698, -729, -750, -770, -783, -797, -812, -829, -844, -860], PERIODS),
      property_tax: alignToSeries([0, -106, -109, -113, -116, -120, -123, -127, -131, -135, -139], PERIODS),
      property_insurance: alignToSeries([0, -61, -62, -64, -65, -67, -69, -70, -72, -74, -76], PERIODS),
      ffe_reserve: alignToSeries([0, -607, -634, -652, -670, -681, -693, -706, -721, -734, -748], PERIODS),
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
