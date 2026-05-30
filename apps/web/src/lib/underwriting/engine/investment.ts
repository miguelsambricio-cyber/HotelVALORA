import type { EngineModule } from "./_types";
import type { BreakdownLine, CapexPhase, InvestmentBreakdown } from "../types";
import { zeroSeries } from "../temporal";
import { perKey, perSqm } from "./formulas";

/**
 * Module · investment.
 *
 * Block 3A reaudit (2026-05-18) · formulas reverse-engineered from
 * operator Excel reference and validated against the Madrid Centro
 * 4* / 256-keys baseline (parity report: docs/underwriting/
 * excel-parity-block-3a.md).
 *
 * Excel-matched formulas:
 *   · Acquisition costs : pct × asking_price
 *   · MEP               : mep_per_room × rooms
 *   · Exterior          : exterior_pct × (MEP + FF&E + OS&E)
 *   · FF&E              : ffe_per_room × rooms
 *   · OS&E              : ose_per_room × rooms
 *   · Licensing         : licensing_pct × HARD
 *   · Tech consultant   : tc_pct × (HARD + PRE + FF&E + OS&E)
 *   · Dev fee           : dev_fee_pct × (HARD + PRE + FF&E + OS&E)
 *   · Insurance dev     : insurance_pct × asking_price
 *   · Contingency       : contingency_pct × (HARD + SOFT_pre_contingency_and_insurance)
 *
 * Bucket layout (per Section 6 spec):
 *   · capex_hard_cost   : Structure · Asset content · MEP · Exterior
 *   · capex_soft_cost   : Licensing · TC · Dev fee · Pre-Opening · FF&E ·
 *                         OS&E · Contingency · Insurance development
 *   · capex_project     : reserved (empty in MVP, kept for future split)
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

    // ─── Acquisition lines · pct × asking_price ──────────────────────
    const notary = round0(askingPrice * acquisition.costs.notary_registry_pct);
    const ajd = round0(askingPrice * acquisition.costs.ajd_pct);
    const itp = round0(askingPrice * acquisition.costs.itp_pct);
    const acqFee = round0(askingPrice * acquisition.costs.acquisition_fee_pct);
    const keyMoney = round0(acquisition.costs.key_money_total);
    const acqCostsTotal = notary + ajd + itp + acqFee + keyMoney;
    const siteAcquisitionTotal = askingPrice + acqCostsTotal;

    // ─── Hard cost ────────────────────────────────────────────────────
    const structure = round0(askingPrice * capex.hard_cost.structure_pct);
    const assetContent = round0(askingPrice * capex.hard_cost.asset_content_pct);
    const mep = round0(capex.hard_cost.mep_per_room * rooms);
    const ffe = round0(capex.soft_cost.ffe_per_room * rooms);
    const ose = round0(capex.soft_cost.ose_per_room * rooms);
    // Exterior basis = MEP + FF&E + OS&E (per Excel reverse-engineering)
    const exterior = round0(capex.hard_cost.exterior_pct * (mep + ffe + ose));
    const hardCostTotal = structure + assetContent + mep + exterior;

    // ─── Soft cost · base figures ─────────────────────────────────────
    // Bases used by Excel:
    //   · licensing → HARD
    //   · TC / dev fee → HARD + PRE + FF&E + OS&E
    //   · insurance → asking_price
    //   · contingency → HARD + SOFT_pre (excludes insurance + contingency itself)
    const preopening = round0(capex.soft_cost.preopening_total);
    const licensing = round0(hardCostTotal * capex.soft_cost.licensing_pct);
    const tcDevBase = hardCostTotal + preopening + ffe + ose;
    const techConsultant = round0(tcDevBase * capex.soft_cost.technical_consultant_pct);
    const devFee = round0(tcDevBase * capex.soft_cost.development_fee_pct);
    const insurance = round0(askingPrice * capex.soft_cost.insurance_pct);

    const softPreContingencyAndInsurance =
      licensing + techConsultant + devFee + preopening + ffe + ose;
    const contingency = round0(
      capex.contingency_pct * (hardCostTotal + softPreContingencyAndInsurance),
    );

    const softCostTotal =
      softPreContingencyAndInsurance + insurance + contingency;
    // Reposition CAPEX (X4b · TRAMO 4) · admin renovation matrix total €, added
    // as reform investment. 0 for a stabilised asset (exact no-regression).
    const reposition = round0(capex.reposition_capex_total_eur ?? 0);
    const capexTotal = hardCostTotal + softCostTotal + reposition;
    const totalBuildingCost = siteAcquisitionTotal + capexTotal;

    // ─── BreakdownLine helpers ────────────────────────────────────────
    const acqLines: BreakdownLine[] = [
      mkLine("notary_registry", "Notary & Registry", notary, totalBuildingCost, rooms, totalSqm, intSqm, fmtPctAssumption(acquisition.costs.notary_registry_pct), acquisition.costs.notary_registry_pct, "percent_asking"),
      mkLine("ajd", "AJD · Legal & Stamp Duty", ajd, totalBuildingCost, rooms, totalSqm, intSqm, fmtPctAssumption(acquisition.costs.ajd_pct), acquisition.costs.ajd_pct, "percent_asking"),
      mkLine("itp", "ITP · Property Transfer Tax", itp, totalBuildingCost, rooms, totalSqm, intSqm, fmtPctAssumption(acquisition.costs.itp_pct), acquisition.costs.itp_pct, "percent_asking"),
      mkLine("acquisition_fee", "Acquisition fee", acqFee, totalBuildingCost, rooms, totalSqm, intSqm, fmtPctAssumption(acquisition.costs.acquisition_fee_pct), acquisition.costs.acquisition_fee_pct, "percent_asking"),
      mkLine("key_money", "Key Money Operator", keyMoney, totalBuildingCost, rooms, totalSqm, intSqm, undefined, acquisition.costs.key_money_total, "currency_total"),
    ];

    const hardLines: BreakdownLine[] = [
      mkLine("structure", "Structure", structure, totalBuildingCost, rooms, totalSqm, intSqm, fmtPctAssumption(capex.hard_cost.structure_pct), capex.hard_cost.structure_pct, "percent_asking"),
      mkLine("asset_content", "Asset content", assetContent, totalBuildingCost, rooms, totalSqm, intSqm, fmtPctAssumption(capex.hard_cost.asset_content_pct), capex.hard_cost.asset_content_pct, "percent_asking"),
      mkLine("mep", "MEP · Mechanical, electrical & plumbing", mep, totalBuildingCost, rooms, totalSqm, intSqm, `${fmtEurCompact(capex.hard_cost.mep_per_room)} / key`, capex.hard_cost.mep_per_room, "currency_per_key"),
      mkLine("exterior", "Exterior & others", exterior, totalBuildingCost, rooms, totalSqm, intSqm, fmtPctAssumption(capex.hard_cost.exterior_pct), capex.hard_cost.exterior_pct, "percent_subtotal"),
    ];

    const softLines: BreakdownLine[] = [
      mkLine("licensing", "Licensing", licensing, totalBuildingCost, rooms, totalSqm, intSqm, fmtPctAssumption(capex.soft_cost.licensing_pct), capex.soft_cost.licensing_pct, "percent_subtotal"),
      mkLine("technical_consultant", "Technical Consultant", techConsultant, totalBuildingCost, rooms, totalSqm, intSqm, fmtPctAssumption(capex.soft_cost.technical_consultant_pct), capex.soft_cost.technical_consultant_pct, "percent_subtotal"),
      mkLine("development_fee", "Development fees", devFee, totalBuildingCost, rooms, totalSqm, intSqm, fmtPctAssumption(capex.soft_cost.development_fee_pct), capex.soft_cost.development_fee_pct, "percent_subtotal"),
      mkLine("preopening", "Pre-Opening", preopening, totalBuildingCost, rooms, totalSqm, intSqm, undefined, capex.soft_cost.preopening_total, "currency_total"),
      mkLine("ffe", "FF&E", ffe, totalBuildingCost, rooms, totalSqm, intSqm, `${fmtEurCompact(capex.soft_cost.ffe_per_room)} / key`, capex.soft_cost.ffe_per_room, "currency_per_key"),
      mkLine("ose", "OS&E", ose, totalBuildingCost, rooms, totalSqm, intSqm, `${fmtEurCompact(capex.soft_cost.ose_per_room)} / key`, capex.soft_cost.ose_per_room, "currency_per_key"),
    ];

    // ── PROJECT COST ── canonical admin/financials grouping (Contingency + Insurance)
    const projectLines: BreakdownLine[] = [
      mkLine("contingency", "Contingency", contingency, totalBuildingCost, rooms, totalSqm, intSqm, fmtPctAssumption(capex.contingency_pct), capex.contingency_pct, "percent_subtotal"),
      mkLine("insurance_dev", "Insurance · Seguro de Obra", insurance, totalBuildingCost, rooms, totalSqm, intSqm, fmtPctAssumption(capex.soft_cost.insurance_pct), capex.soft_cost.insurance_pct, "percent_asking"),
      ...(reposition > 0
        ? [mkLine("reposition_capex", "CAPEX reforma · reposición", reposition, totalBuildingCost, rooms, totalSqm, intSqm, undefined, reposition, "currency_total")]
        : []),
    ];

    const capexPhases: CapexPhase[] = [
      {
        id: "phase_initial",
        kind: "initial_renovation",
        label: "Initial renovation · pre-opening",
        start_period_index: 0,
        drawdown_periods: 1,
        total_eur: capexTotal,
        funded_by: "developer",
        notes: "MVP single-shot drawdown · Block 3B will phase across periods 0-1 with operator-contribution split.",
      },
    ];

    // ─── Stabilised yield progression · derived from later modules ──
    // Block 3A leaves a deterministic ramp; Block 3B will rewrite this
    // post-pnl as ebitda_after_replacement[t] / total_building_cost.
    const yieldSeries = zeroSeries(inputs.periods);
    const ramp = [0, 0.040, 0.052, 0.061, 0.066, 0.069, 0.071, 0.072, 0.073, 0.074, 0.075];
    for (let i = 0; i < yieldSeries.length && i < ramp.length; i++) {
      yieldSeries[i] = ramp[i];
    }

    return {
      asking_price: askingPrice,
      hotel_value: hotelValue,
      site_acquisition_total: siteAcquisitionTotal,
      capex_total: capexTotal,
      contingency_insurance: contingency + insurance,
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
  assumption_raw?: number,
  assumption_kind?: BreakdownLine["assumption_kind"],
): BreakdownLine {
  return {
    id,
    label,
    assumption,
    assumption_raw,
    assumption_kind,
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
