import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export interface FinancialSummaryStripProps {
  children: ReactNode;
  className?: string;
}

/**
 * Horizontal strip wrapping the top metric cards.
 *
 * Web:  1×N grid (responsive — stacks on narrow screens).
 * Print: stays in 3-column grid, condensed gaps so it fits within the
 * header band of the first A4 portrait page.
 */
export function FinancialSummaryStrip({
  children,
  className,
}: FinancialSummaryStripProps) {
  return (
    <div
      className={cn(
        "grid grid-cols-1 gap-6 md:grid-cols-3 print:grid-cols-3 print:gap-3",
        className,
      )}
    >
      {children}
    </div>
  );
}
