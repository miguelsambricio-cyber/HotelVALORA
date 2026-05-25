import type { CapexBreakdown, CapexCategoryData } from "@/lib/report/capex-renders-data";
import type { CapexSlice } from "../types";

/**
 * Adapter · `CapexSlice` (canonical-derived) → `CapexBreakdown` (UI shape).
 *
 *  The /report/asset-analysis/capex page renders `<CapexTable breakdown={…} />`
 *  which expects the legacy CapexBreakdown shape (3 categories · items ·
 *  totals). Our admin-derived CapexSlice carries per-line `group` (hard/soft/
 *  project) · we just group the lines and emit the breakdown.
 */
export function adaptCapexSliceToBreakdown(slice: CapexSlice, rooms: number): CapexBreakdown {
  const byGroup = {
    hard: [] as CapexCategoryData["items"],
    soft: [] as CapexCategoryData["items"],
    project: [] as CapexCategoryData["items"],
  };

  for (const line of slice.lines) {
    byGroup[line.group].push({
      id: line.id,
      label: line.label,
      amount: line.total_eur,
      unit: "total",
      meta: { per_room_eur: line.per_room_eur, description: line.description },
    });
  }

  const categories: CapexCategoryData[] = [
    {
      id: "hard",
      label: "Hard Costs",
      total: slice.totals.hard_eur,
      unit: "total",
      defaultOpen: true,
      items: byGroup.hard,
    },
    {
      id: "soft",
      label: "Soft Costs",
      total: slice.totals.soft_eur,
      unit: "total",
      defaultOpen: false,
      items: byGroup.soft,
    },
    {
      id: "project",
      label: "Project Costs",
      total: slice.totals.project_eur,
      unit: "total",
      defaultOpen: false,
      items: byGroup.project,
    },
  ];

  // Drop empty categories (some chain_scale × room_tier combinations have
  // no project costs in the admin matrix).
  const nonEmpty = categories.filter((c) => c.items.length > 0);

  return {
    mode: "basic",
    total: slice.totals.total_eur,
    unit: "total",
    unitOptions: [
      { id: "total", label: "Total" },
      { id: "perRoom", label: "Per room" },
    ],
    categories: nonEmpty,
  };
}
