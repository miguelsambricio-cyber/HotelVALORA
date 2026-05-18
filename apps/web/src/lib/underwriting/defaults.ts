/**
 * BLOCK 1 SCAFFOLD · defaults seeded from the operator's Excel template.
 *
 * Block 2 deliverable: full audit pass on this file before engine wiring:
 *   · normalise inputs vs derived
 *   · flag hardcoded assumptions
 *   · detect circular refs
 *   · separate assumptions / calculations / outputs cleanly
 *
 * What's here right now: enough to render an empty shell with realistic
 * placeholder numbers. NO engine logic runs on this data yet.
 */

import type {
  UnderwritingBundle,
  UnderwritingInputs,
  UnderwritingComputed,
  YearSeries,
  ScenarioMeta,
} from "./types";
import { YEAR_COUNT } from "./types";

const ZERO_SERIES: YearSeries = Object.freeze([
  0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
]) as unknown as YearSeries;

function seriesFrom(values: readonly number[]): YearSeries {
  const padded = [...values];
  while (padded.length < YEAR_COUNT) padded.push(0);
  return padded.slice(0, YEAR_COUNT) as unknown as YearSeries;
}

// Operator's Excel · single asset baseline (Madrid Centro · 4* · 256 keys · renovated)
const SCENARIO_BASE_META: ScenarioMeta = {
  id: "base",
  label: "Base case",
  description: "Default underwriting scenario · operator baseline assumptions",
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
      hotel: seriesFrom([0, 4_891, 5_291, 5_473, 5_636, 5_623, 5_641, 5_657, 5_716, 5_720, 5_743]),
      fb: seriesFrom([0, 1_374, 1_400, 1_427, 1_454, 1_482, 1_510, 1_539, 1_568, 1_598, 1_629]),
      other: seriesFrom([0, 418, 440, 463, 488, 513, 539, 567, 596, 626, 657]),
    },
    costs: {
      mgmt_fee: seriesFrom([0, -698, -729, -750, -770, -783, -797, -812, -829, -844, -860]),
      property_tax: seriesFrom([0, -106, -109, -113, -116, -120, -123, -127, -131, -135, -139]),
      property_insurance: seriesFrom([0, -61, -62, -64, -65, -67, -69, -70, -72, -74, -76]),
      ffe_reserve: seriesFrom([0, -607, -634, -652, -670, -681, -693, -706, -721, -734, -748]),
    },
  },
  depreciation: { building_years: 25, mep_years: 7 },
  financing: {
    asset_tranche: { ltv: 0.65, years: 10, grace: 1, bullet_pct: 0.25 },
    capex_tranche: { ltv: 0.80, years: 7, grace: 1 },
    euribor_12m_pct: 2.75,
    margin_pct: 1.25,
  },
  exit: {
    cap_rate: { manual_override_pct: 6.25, use_dynamic: true },
    year: 7,
    fee_pct: 0.015,
  },
  tax: { cit_rate_pct: 0.25, ebitda_limit_pct: 0.30, finexp_floor_eur: 1_000_000 },
};

// Block 1 placeholder: empty schedules. Block 2 engine fills these
// from inputs. Until then, schedules render as visible-but-blank scaffolds.
const EMPTY_COMPUTED: UnderwritingComputed = {
  scenario_id: "base",
  asset: INPUTS_BASE.asset,
  pnl: {
    hotel: ZERO_SERIES,
    fb: ZERO_SERIES,
    other_departments: ZERO_SERIES,
    gross_operating_profit: ZERO_SERIES,
    mgmt_fee: ZERO_SERIES,
    property_taxes: ZERO_SERIES,
    property_insurance: ZERO_SERIES,
    ffe_reserve: ZERO_SERIES,
    total_costs: ZERO_SERIES,
    ebitda_after_replacement: ZERO_SERIES,
    da: ZERO_SERIES,
    ebit: ZERO_SERIES,
    financial_expenses: ZERO_SERIES,
    ebt: ZERO_SERIES,
    cit: ZERO_SERIES,
    net_income: ZERO_SERIES,
    total_net_income: ZERO_SERIES,
  },
  balance_sheet: {
    non_current_assets: ZERO_SERIES,
    building: ZERO_SERIES,
    installations_mep: ZERO_SERIES,
    dta_asset: ZERO_SERIES,
    cash: ZERO_SERIES,
    total_assets: ZERO_SERIES,
    equity: ZERO_SERIES,
    initial_equity: ZERO_SERIES,
    reserves: ZERO_SERIES,
    net_income_period: ZERO_SERIES,
    debt: ZERO_SERIES,
    total_eq_debt: ZERO_SERIES,
  },
  cash_flow: {
    ebitda_after_replacement: ZERO_SERIES,
    yield_net: ZERO_SERIES,
    tax_payment: ZERO_SERIES,
    acquisition: ZERO_SERIES,
    capex: ZERO_SERIES,
    contingency_insurance: ZERO_SERIES,
    acquisition_fees_taxes: ZERO_SERIES,
    operating_cash_flow: ZERO_SERIES,
    debt_drawn: ZERO_SERIES,
    interest_expense: ZERO_SERIES,
    loan_principal: ZERO_SERIES,
    equity_drawn: ZERO_SERIES,
    net_cash_flow: ZERO_SERIES,
    change_in_cash_bs: ZERO_SERIES,
  },
  dta: {
    ebit: ZERO_SERIES,
    ebitda: ZERO_SERIES,
    limit_ebitda_30pct: ZERO_SERIES,
    limit_finexp_floor: ZERO_SERIES,
    financial_expenses_after_limits: ZERO_SERIES,
    ebt_after_limits: ZERO_SERIES,
    dta_beginning: ZERO_SERIES,
    dta_increases: ZERO_SERIES,
    dta_decreases: ZERO_SERIES,
    dta_end: ZERO_SERIES,
    cit_pl: ZERO_SERIES,
    dta_compensation: ZERO_SERIES,
    tax_payment: ZERO_SERIES,
  },
  financing: {
    total_asset_costs: 0,
    total_ltv_pct: 0,
    total_debt: 0,
    bullet_pct: 0,
    bullet_amount: 0,
    principal_loan: 0,
    bofy_balance: ZERO_SERIES,
    payment: ZERO_SERIES,
    interest_expense: ZERO_SERIES,
    loan_principal: ZERO_SERIES,
    loan_capex: ZERO_SERIES,
    bullet_principal: ZERO_SERIES,
    eofy_balance: ZERO_SERIES,
    rcsd: ZERO_SERIES,
  },
  investment: {
    site_acquisition_total: 0,
    capex_total: 0,
    contingency_insurance: 0,
    acquisition_fees_taxes: 0,
    total_building_cost: 0,
    acquisition: [],
    capex_hard_cost: [],
    capex_soft_cost: [],
    capex_project: [],
  },
  exit: {
    exit_cap_rate_pct: 6.25,
    exit_year: 7,
    exit_fee_pct: 0.015,
    exit_price: 0,
    exit_price_per_room: 0,
    exit_price_per_sqm: 0,
    debt_repayment_at_exit: 0,
    equity_investment: 0,
    profit_share: 0,
    project_cash_flow: ZERO_SERIES,
    equity_cash_flow: ZERO_SERIES,
    debt_cash_flow: ZERO_SERIES,
    project_irr_pct: 0,
    equity_irr_pct: 0,
    moic: 0,
  },
  cap_rate: {
    entry: {
      dynamic: {
        recommended_pct: 6.25,
        band: { low_pct: 6.10, high_pct: 6.40 },
        base_pct: 6.15,
        evidence: {
          comp_count: 0,
          median_pct: 0,
          p25_pct: 0,
          p75_pct: 0,
          stddev_pct: 0,
          most_recent_date: null,
        },
        adjustments: [],
        confidence: { level: "low", reasons: ["Block 1 scaffold · engine not wired yet"] },
      },
      used_pct: 6.25,
      source: "override",
    },
    exit: {
      dynamic: {
        recommended_pct: 6.25,
        band: { low_pct: 6.10, high_pct: 6.40 },
        base_pct: 6.15,
        evidence: {
          comp_count: 0,
          median_pct: 0,
          p25_pct: 0,
          p75_pct: 0,
          stddev_pct: 0,
          most_recent_date: null,
        },
        adjustments: [],
        confidence: { level: "low", reasons: ["Block 1 scaffold · engine not wired yet"] },
      },
      used_pct: 6.25,
      source: "override",
    },
  },
  reconciliation: {
    bs_balanced: Array(YEAR_COUNT).fill(true),
    cash_matches_cf: true,
    dscr_per_year: ZERO_SERIES,
    warnings: ["Engine not yet wired · all schedules empty (Block 1 scaffold)"],
  },
};

export const SCENARIO_BASE: UnderwritingBundle = {
  meta: SCENARIO_BASE_META,
  inputs: INPUTS_BASE,
  computed: EMPTY_COMPUTED,
};
