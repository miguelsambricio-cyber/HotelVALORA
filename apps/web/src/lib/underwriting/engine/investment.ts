import type { EngineModule } from "./_types";
import type { BreakdownLine, CapexPhase, InvestmentBreakdown, UnderwritingInputs } from "../types";
import { zeroSeries } from "../temporal";
import { perKey, perSqm } from "./formulas";

/**
 * Module · investment.
 *
 * Block 2 emits a deterministic, fully-itemised investment breakdown
 * derived from the operator inputs (acquisition + capex). The numbers
 * mirror the operator's Excel reference example so the Section 6 UI
 * already renders the institutional memorandum view.
 *
 * Block 3 will:
 *   · wire dynamic stabilised yield from PnL (currently ramp seed)
 *   · enforce CAPEX phase drawdowns into the cash_flow module
 *   · add operator-contribution / ESG / refurbishment buckets per phase
 */
export const investmentModule: EngineModule<"investment"> = {
  key: "investment",
  dependsOn: ["cap_rate"],
  compute({ inputs }): InvestmentBreakdown {
    const { asset, acquisition, capex } = inputs;
    const rooms = asset.rooms;
    const totalSqm = asset.total_sqm;
    const intSqm = asset.intervention_sqm;
    const askingPrice = acquisition.asking_price;
    const hotelValue = acquisition.hotel_value;

    // ─── Acquisition lines ────────────────────────────────────────────
    const acqCostsBasis = askingPrice;
    const notary = round0(acqCostsBasis * acquisition.costs.notary_registry_pct);
    const ajd = round0(acqCostsBasis * acquisition.costs.ajd_pct);
    const itp = round0(acqCostsBasis * acquisition.costs.itp_pct);
    const acqFee = round0(acqCostsBasis * acquisition.costs.acquisition_fee_pct);
    const keyMoney = round0(acquisition.costs.key_money_total);
    const acqCostsTotal = notary + ajd + itp + acqFee + keyMoney;
    const siteAcquisitionTotal = askingPrice + acqCostsTotal;

    // ─── CAPEX · hard cost lines ──────────────────────────────────────
    const structure = round0(askingPrice * capex.hard_cost.structure_pct);
    const assetContent = round0(askingPrice * capex.hard_cost.asset_content_pct);
    const mep = round0(capex.hard_cost.mep_per_room * rooms);
    const exterior = round0(askingPrice * capex.hard_cost.exterior_pct);
    const hardCostTotal = structure + assetContent + mep + exterior;

    // ─── CAPEX · soft cost lines ──────────────────────────────────────
    const licensing = round0(hardCostTotal * capex.soft_cost.licensing_pct);
    const techConsultant = round0(hardCostTotal * capex.soft_cost.technical_consultant_pct);
    const devFee = round0(hardCostTotal * capex.soft_cost.development_fee_pct);
    const preopening = round0(capex.soft_cost.preopening_total);
    const ffe = round0(capex.soft_cost.ffe_per_room * rooms);
    const ose = round0(capex.soft_cost.ose_per_room * rooms);
    const insurance = round0(hardCostTotal * capex.soft_cost.insurance_pct);
    const softCostTotal = licensing + techConsultant + devFee + preopening + ffe + ose + insurance;

    // ─── CAPEX · project costs (contingency) ──────────────────────────
    const capexPreContingency = hardCostTotal + softCostTotal;
    const contingency = round0(capexPreContingency * capex.contingency_pct);
    const capexTotal = capexPreContingency + contingency;

    const totalBuildingCost = siteAcquisitionTotal + capexTotal;

    // ─── BreakdownLine helpers ────────────────────────────────────────
    const acqLines: BreakdownLine[] = [
      mkLine("notary_registry", "Notary & Registry", notary, totalBuildingCost, rooms, totalSqm, intSqm, fmtPctAssumption(acquisition.costs.notary_registry_pct)),
      mkLine("ajd", "AJD · Legal & Stamp Duty", ajd, totalBuildingCost, rooms, totalSqm, intSqm, fmtPctAssumption(acquisition.costs.ajd_pct)),
      mkLine("itp", "ITP · Property Transfer Tax", itp, totalBuildingCost, rooms, totalSqm, intSqm, fmtPctAssumption(acquisition.costs.itp_pct)),
      mkLine("acquisition_fee", "Acquisition fee", acqFee, totalBuildingCost, rooms, totalSqm, intSqm, fmtPctAssumption(acquisition.costs.acquisition_fee_pct)),
      mkLine("key_money", "Key Money Operator", keyMoney, totalBuildingCost, rooms, totalSqm, intSqm),
    ];

    const hardLines: BreakdownLine[] = [
      mkLine("structure", "Structure", structure, totalBuildingCost, rooms, totalSqm, intSqm, fmtPctAssumption(capex.hard_cost.structure_pct)),
      mkLine("asset_content", "Asset content", assetContent, totalBuildingCost, rooms, totalSqm, intSqm, fmtPctAssumption(capex.hard_cost.asset_content_pct)),
      mkLine("mep", "MEP · Mechanical, electrical & plumbing", mep, totalBuildingCost, rooms, totalSqm, intSqm, `${fmtEurCompact(capex.hard_cost.mep_per_room)} / key`),
      mkLine("exterior", "Exterior & others", exterior, totalBuildingCost, rooms, totalSqm, intSqm, fmtPctAssumption(capex.hard_cost.exterior_pct)),
    ];

    const softLines: BreakdownLine[] = [
      mkLine("licensing", "Licensing", licensing, totalBuildingCost, rooms, totalSqm, intSqm, fmtPctAssumption(capex.soft_cost.licensing_pct)),
      mkLine("technical_consultant", "Technical Consultant", techConsultant, totalBuildingCost, rooms, totalSqm, intSqm, fmtPctAssumption(capex.soft_cost.technical_consultant_pct)),
      mkLine("development_fee", "Development fees", devFee, totalBuildingCost, rooms, totalSqm, intSqm, fmtPctAssumption(capex.soft_cost.development_fee_pct)),
      mkLine("preopening", "Pre-Opening", preopening, totalBuildingCost, rooms, totalSqm, intSqm),
      mkLine("ffe", "FF&E", ffe, totalBuildingCost, rooms, totalSqm, intSqm, `${fmtEurCompact(capex.soft_cost.ffe_per_room)} / key`),
      mkLine("ose", "OS&E", ose, totalBuildingCost, rooms, totalSqm, intSqm, `${fmtEurCompact(capex.soft_cost.ose_per_room)} / key`),
      mkLine("insurance_dev", "Insurance · Seguro de Obra", insurance, totalBuildingCost, rooms, totalSqm, intSqm, fmtPctAssumption(capex.soft_cost.insurance_pct)),
    ];

    const projectLines: BreakdownLine[] = [
      mkLine("contingency", "Contingency", contingency, totalBuildingCost, rooms, totalSqm, intSqm, fmtPctAssumption(capex.contingency_pct)),
    ];

    // ─── CAPEX phases · MVP single initial phase ──────────────────────
    const capexPhases: CapexPhase[] = [
      {
        id: "phase_initial",
        kind: "initial_renovation",
        label: "Initial renovation · pre-opening",
        start_period_index: 0,
        drawdown_periods: 1,
        total_eur: capexTotal,
        funded_by: "developer",
        notes: "MVP single-shot drawdown · Block 3 will phase across periods 0-1.",
      },
    ];

    // ─── Stabilised yield progression · seed ramp (Block 3 wires real) ─
    const yieldSeries = zeroSeries(inputs.periods);
    seedStabilisedYieldRamp(yieldSeries, inputs);

    return {
      asking_price: askingPrice,
      hotel_value: hotelValue,
      site_acquisition_total: siteAcquisitionTotal,
      capex_total: capexTotal,
      contingency_insurance: contingency,
      acquisition_fees_taxes: acqCostsTotal,
      total_building_cost: totalBuildingCost,
      acquisition: acqLines,
      capex_hard_cost: hardLines,
      capex_soft_cost: softLines,
      capex_project: projectLines,
      capex_phases: capexPhases,
      stabilized_yield_progression: yieldSeries,
    };
  },
};

// ─── Helpers ──────────────────────────────────────────────────────────

function round0(n: number): number {
  return Math.round(n);
}

function mkLine(
  id: string,
  label: string,
  total: number,
  totalInvestment: number,
  rooms: number,
  sqm: number,
  intSqm: number,
  assumption?: string,
): BreakdownLine {
  return {
    id,
    label,
    assumption,
    total_eur: total,
    per_room_eur: round0(perKey(total, rooms)),
    per_sqm_eur: round0(perSqm(total, sqm)),
    per_intervention_sqm_eur: round0(perSqm(total, intSqm)),
    pct_of_total: totalInvestment > 0 ? total / totalInvestment : 0,
  };
}

function fmtPctAssumption(pct: number): string {
  if (!Number.isFinite(pct) || pct === 0) return "—";
  const v = pct * 100;
  const s = Math.abs(v % 1) < 0.05 ? v.toFixed(0) : v.toFixed(2).replace(".", ",");
  return `${s}%`;
}

function fmtEurCompact(n: number): string {
  if (!Number.isFinite(n) || n === 0) return "—";
  return `${new Intl.NumberFormat("es-ES").format(Math.round(n))} €`;
}

/**
 * Seed a stabilised-yield ramp · Year 1 starts low, ramps to stabilised
 * by Year 4. Block 3 replaces this with PnL.ebitda_after_replacement /
 * total_building_cost per period.
 */
function seedStabilisedYieldRamp(series: number[], inputs: UnderwritingInputs): void {
  const ramp = [0, 0.040, 0.052, 0.061, 0.066, 0.069, 0.071, 0.072, 0.073, 0.074, 0.075];
  for (let i = 0; i < series.length && i < ramp.length; i++) {
    series[i] = ramp[i];
  }
  void inputs;
}
