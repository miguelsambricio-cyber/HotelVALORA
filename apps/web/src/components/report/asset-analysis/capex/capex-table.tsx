import { cn } from "@/lib/utils";
import type { CapexBreakdown } from "@/lib/report/capex-renders-data";
import { CapexTotalRow } from "./capex-total-row";
import { CapexCategory } from "./capex-category";

export interface CapexTableProps {
  breakdown: CapexBreakdown;
  className?: string;
}

/**
 * Composite of the headline TOTAL CAPEX row + every category in the breakdown,
 * rendered in registry order. Categories are independent collapsible blocks —
 * the table doesn't synchronise their open/closed state.
 */
export function CapexTable({ breakdown, className }: CapexTableProps) {
  return (
    <div className={cn("space-y-4", className)}>
      <CapexTotalRow
        total={breakdown.total}
        unit={breakdown.unit}
        unitOptions={breakdown.unitOptions}
      />
      {breakdown.categories.map((category) => (
        <CapexCategory key={category.id} category={category} />
      ))}
    </div>
  );
}
