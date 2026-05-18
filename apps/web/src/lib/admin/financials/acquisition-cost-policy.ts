/**
 * Acquisition Cost Policy · institutional transaction-friction layer.
 *
 * Lives at the top of /user/admin/financials. NOT a settings panel ·
 * IS the operator's acquisition policy layer that the underwriting
 * engine consumes via `investment.compute` (Block 7 wires the flow ·
 * MVP keeps engine defaults in sync via `acquisitionPolicyToInputs`).
 *
 * Each line carries:
 *   · 9-cell matrix per (category × size tier)
 *   · unit selector  (% total acquisition · € per room · € total · € per m²)
 *   · description / tooltip
 *   · future-proof anchors for country · VAT · SPV · operator brand
 *
 * Sign convention: positive values are EXPENSES (friction added on top
 * of asking price). The engine sums them all into
 * `investment.acquisition_fees_taxes`.
 */

import type { StarCategoryId } from "./defaults";
import { SIZE_TIERS, type SizeTierId } from "./dynamic-cap-rate-policy";

// Re-export so the admin card has a single import.
export { SIZE_TIERS } from "./dynamic-cap-rate-policy";
export type { SizeTierId } from "./dynamic-cap-rate-policy";

/** Pre-computed 9-cell axis for grid rendering · matches Dynamic Cap Rate panel. */
export const ACQ_GRID_CELLS: Array<{ category: StarCategoryId; size: SizeTierId; label: string }> = [
  ...(["3star", "4star", "5star"] as const).flatMap((cat) =>
    SIZE_TIERS.map((s) => ({
      category: cat,
      size: s.id,
      label: `${cat.replace("star", "*")} ${s.label}`,
    })),
  ),
];

// ─── Unit taxonomy ────────────────────────────────────────────────────

export const ACQ_COST_UNITS = [
  { id: "pct_total", label: "(%) Total" },
  { id: "eur_per_room", label: "(€) per room" },
  { id: "eur_total", label: "(€) total" },
  { id: "eur_per_sqm", label: "(€) per m²" },
] as const;

export type AcquisitionCostUnitId = (typeof ACQ_COST_UNITS)[number]["id"];

// ─── Line shape · 9-cell matrix per line ─────────────────────────────

export interface AcquisitionCostLine {
  id: string;
  label: string;
  /** Short institutional description · shown in tooltip + rationale. */
  description: string;
  /** Selected unit · operator-tunable per line. */
  unit: AcquisitionCostUnitId;
  /** 9-cell matrix · stored value in the line's currently-selected unit. */
  matrix: Record<StarCategoryId, Record<SizeTierId, number>>;
  /** Available units for this line (some lines lock to % only, others allow €). */
  allowed_units: readonly AcquisitionCostUnitId[];
}

// ─── Policy shape · future-proof for country / VAT / SPV / operator ──

export interface AcquisitionCostPolicy {
  lines: AcquisitionCostLine[];

  /** Country · drives default tax regime (ES default in MVP). */
  country: string;
  /** VAT regime · "spanish_iva" | "exempt" | "operator_passes_through" · future. */
  vat_regime: "spanish_iva" | "exempt" | "operator_passes_through";
  /** SPV type · drives certain stamp duty treatments. */
  spv_type: "sociedad_limitada" | "socimi" | "fondo_inmobiliario" | "branch";
  /** Operator brand · informs key-money structure. */
  operator_brand?: string;
}

// ─── Helpers ─────────────────────────────────────────────────────────

function flatMatrix(value: number): Record<StarCategoryId, Record<SizeTierId, number>> {
  return {
    "3star": { small: value, medium: value, large: value },
    "4star": { small: value, medium: value, large: value },
    "5star": { small: value, medium: value, large: value },
  };
}

function sizeDrivenMatrix(small: number, medium: number, large: number): Record<StarCategoryId, Record<SizeTierId, number>> {
  // Same size-driven schedule for all categories (institutional convention ·
  // economies of scale on transaction friction, NOT brand-driven).
  return {
    "3star": { small, medium, large },
    "4star": { small, medium, large },
    "5star": { small, medium, large },
  };
}

// ─── Defaults (Spain · Madrid Centro · institutional baseline) ───────

export const ACQUISITION_COST_POLICY_DEFAULTS: AcquisitionCostPolicy = {
  country: "España",
  vat_regime: "spanish_iva",
  spv_type: "sociedad_limitada",
  lines: [
    {
      id: "notary",
      label: "Notary & Registry",
      description: "Notario + Registro de la Propiedad · escalable por valor de transacción.",
      unit: "pct_total",
      allowed_units: ["pct_total", "eur_total"],
      matrix: sizeDrivenMatrix(0.07, 0.03, 0.02),
    },
    {
      id: "ajd",
      label: "AJD · Legal & Stamp Duty",
      description: "Actos Jurídicos Documentados · impuesto sobre el documento público de transmisión.",
      unit: "pct_total",
      allowed_units: ["pct_total"],
      matrix: sizeDrivenMatrix(0.13, 0.07, 0.06),
    },
    {
      id: "itp",
      label: "ITP · Property Transfer Tax",
      description: "Impuesto sobre Transmisiones Patrimoniales · mutuamente excluyente con AJD según estructura. Habitualmente 0% cuando aplica AJD.",
      unit: "pct_total",
      allowed_units: ["pct_total"],
      matrix: flatMatrix(0),
    },
    {
      id: "acq-fee",
      label: "Acquisition fee",
      description: "Broker / advisor fee · deal-specific · sponsor-paid o cost-of-deal.",
      unit: "pct_total",
      allowed_units: ["pct_total", "eur_total"],
      matrix: flatMatrix(0),
    },
    {
      id: "key-money",
      label: "Key Money Operator",
      description: "Compensación operador · alineación de incentivos · típicamente € por habitación o suma global.",
      unit: "eur_per_room",
      allowed_units: ["eur_per_room", "eur_total", "eur_per_sqm"],
      matrix: flatMatrix(0),
    },
  ],
};

// ─── UI-side preview computation ─────────────────────────────────────

/**
 * Compute the total acquisition cost for the (category, size) cell.
 * Mirrors the engine math · used for the admin's live preview block.
 *
 * Returns absolute euros · per-line + total. Caller supplies the asking
 * price + rooms + sqm needed to convert unit-aware values to absolute €.
 */
export interface AcquisitionCostComputed {
  per_line: Array<{ id: string; label: string; unit: AcquisitionCostUnitId; raw_value: number; absolute_eur: number }>;
  total_eur: number;
  total_pct_of_asking: number;
}

export function computeAcquisitionCostsForCell(
  policy: AcquisitionCostPolicy,
  category: StarCategoryId,
  size: SizeTierId,
  context: { asking_price_eur: number; rooms: number; total_sqm: number },
): AcquisitionCostComputed {
  const perLine = policy.lines.map((line) => {
    const v = line.matrix[category][size];
    let absolute = 0;
    switch (line.unit) {
      case "pct_total":
        absolute = context.asking_price_eur * (v / 100);
        break;
      case "eur_per_room":
        absolute = v * context.rooms;
        break;
      case "eur_total":
        absolute = v;
        break;
      case "eur_per_sqm":
        absolute = v * context.total_sqm;
        break;
    }
    return { id: line.id, label: line.label, unit: line.unit, raw_value: v, absolute_eur: round0(absolute) };
  });
  const total = perLine.reduce((acc, l) => acc + l.absolute_eur, 0);
  return {
    per_line: perLine,
    total_eur: total,
    total_pct_of_asking: context.asking_price_eur > 0 ? total / context.asking_price_eur : 0,
  };
}

function round0(n: number): number {
  return Math.round(n);
}
