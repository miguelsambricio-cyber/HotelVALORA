// CAPEX taxonomy — shaped to map directly onto the Excel underwriting
// workbook columns (Hard Cost / Soft Cost / Project Costs). When the
// Excel ingestion ships, each `id` here corresponds to a line in the
// workbook so values can be hydrated 1:1.

import type { CapexGroup } from "./types";

export const CAPEX_TREE: CapexGroup[] = [
  {
    id: "hard-cost",
    label: "Hard Cost",
    icon: "construction",
    defaultUnit: "total",
    availableUnits: ["total", "per_room", "per_m2"],
    children: [
      { id: "structure", label: "Structure", defaultUnit: "total", availableUnits: ["total", "per_room", "per_m2"] },
      { id: "asset-content", label: "Asset content", defaultUnit: "total", availableUnits: ["total", "per_room", "per_m2"] },
      { id: "mep", label: "MEP", defaultUnit: "per_room", availableUnits: ["per_room", "total", "per_m2"] },
      { id: "exterior", label: "Exterior", defaultUnit: "total", availableUnits: ["total", "per_room", "per_m2"] },
    ],
  },
  {
    id: "soft-cost",
    label: "Soft Cost",
    icon: "design_services",
    defaultUnit: "total",
    availableUnits: ["total", "per_room", "per_m2"],
    children: [
      { id: "licensing", label: "Licensing", defaultUnit: "per_room", availableUnits: ["per_room", "total", "per_m2"] },
      { id: "technical", label: "Technical", defaultUnit: "per_room", availableUnits: ["per_room", "total", "per_m2"] },
      { id: "development", label: "Development", defaultUnit: "per_room", availableUnits: ["per_room", "total", "per_m2"] },
      { id: "preopening", label: "PreOpening", defaultUnit: "total", availableUnits: ["total", "per_room", "per_m2"] },
      { id: "ffe", label: "FF&E", defaultUnit: "per_room", availableUnits: ["per_room", "total", "per_m2"] },
      { id: "ose", label: "OS&E", defaultUnit: "per_room", availableUnits: ["per_room", "total", "per_m2"] },
    ],
  },
  {
    id: "project-costs",
    label: "Project Costs",
    icon: "payments",
    defaultUnit: "percent",
    availableUnits: ["percent", "total", "per_room", "per_m2"],
    children: [
      { id: "contingency", label: "Contingency*", defaultUnit: "percent", availableUnits: ["percent", "total", "per_room", "per_m2"] },
      { id: "insurance", label: "Insurance", defaultUnit: "percent", availableUnits: ["percent", "total", "per_room", "per_m2"] },
    ],
  },
];

export const CAPEX_UNIT_LABELS: Record<import("./types").CapexUnit, string> = {
  total: "(€) total",
  per_room: "(€) per room",
  per_m2: "(€) per m²",
  percent: "(%) total",
};

/** Flat list of all line item ids — useful for store hydration loops. */
export function getAllCapexLineIds(): string[] {
  const out: string[] = [];
  for (const group of CAPEX_TREE) {
    out.push(group.id);
    for (const child of group.children) out.push(child.id);
  }
  return out;
}
