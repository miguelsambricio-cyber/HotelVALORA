// Acquisition cost line items — fixed taxonomy for the Hotel Value tab's
// "Acquisition Cost" table. Mirrors the underwriting workbook structure
// so each `id` can be hydrated 1:1 once Excel ingestion ships.

import type { AcquisitionCostEntry, CapexUnit } from "./types";

export interface AcquisitionCostLine {
  id: string;
  label: string;
  defaultUnit: CapexUnit;
  availableUnits: readonly CapexUnit[];
}

export const ACQUISITION_COST_LINES: AcquisitionCostLine[] = [
  {
    id: "notary-registry",
    label: "Notary & Registry",
    defaultUnit: "percent",
    availableUnits: ["percent", "total"],
  },
  {
    id: "ajd-stamp-duty",
    label: "AJD (Legal & Stamp Duty)",
    defaultUnit: "percent",
    availableUnits: ["percent", "total"],
  },
  {
    id: "itp-property-tax",
    label: "ITP (Property Tax transfer)",
    defaultUnit: "percent",
    availableUnits: ["percent", "total"],
  },
  {
    id: "acquisition-fee",
    label: "Acquisition Fee",
    defaultUnit: "total",
    availableUnits: ["total", "percent"],
  },
  {
    id: "key-money-operator",
    label: "Key Money Operator",
    defaultUnit: "total",
    availableUnits: ["total", "percent"],
  },
];

export function buildInitialAcquisitionCostEntries(): Record<string, AcquisitionCostEntry> {
  const out: Record<string, AcquisitionCostEntry> = {};
  for (const l of ACQUISITION_COST_LINES) {
    out[l.id] = { value: null, unit: l.defaultUnit };
  }
  return out;
}
