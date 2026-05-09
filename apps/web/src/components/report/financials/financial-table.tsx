import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export interface FinancialTableProps {
  /** Tbody children — typically multiple <PLSection /> instances */
  children: ReactNode;
  className?: string;
}

/**
 * Outer table shell with the canonical USALI column structure:
 *   1. Label (w-48)
 *   2. Assumption (w-28, hidden in print)
 *   3. Year 1 (active marker `›` rendered by PLRow)
 *   4. Year 2
 *   5. Year 3
 *   6. Year 4
 *   7. Year 5
 *
 * Wraps in `overflow-x-auto` for narrow viewports; the print layout drops
 * the assumption column so all 6 remaining columns fit cleanly on A4
 * portrait without horizontal scroll.
 */
export function FinancialTable({ children, className }: FinancialTableProps) {
  return (
    <div className={cn("w-full overflow-x-auto pb-4 print:overflow-visible print:pb-0", className)}>
      <table className="w-full text-sm text-left print:text-[9px]">
        <colgroup>
          <col className="w-48 print:w-32" />
          <col className="w-28 print:hidden" />
          <col className="min-w-[100px] print:min-w-0" />
          <col className="min-w-[110px] print:min-w-0" />
          <col className="min-w-[110px] print:min-w-0" />
          <col className="min-w-[110px] print:min-w-0" />
          <col className="min-w-[110px] print:min-w-0" />
        </colgroup>

        <thead>
          <tr className="border-b border-slate-200 text-slate-700 font-bold">
            <th className="py-4 pl-2 pr-4 font-headline text-base print:py-2 print:pl-1 print:text-[10px]">
              P&amp;L USALI
            </th>
            <th className="py-4 px-2 text-center print:hidden">
              <span className="inline-block rounded bg-red-50 px-2 py-1 text-xs font-bold uppercase tracking-wider text-red-600">
                Assump.
              </span>
            </th>
            <th className="py-4 px-2 text-right font-headline print:py-2 print:px-1 print:text-[9px]">
              <span className="text-emerald-700 font-black mr-1 print:hidden">›</span>
              Year 1
            </th>
            <th className="py-4 px-2 text-right font-headline print:py-2 print:px-1 print:text-[9px]">
              Year 2
            </th>
            <th className="py-4 px-2 text-right font-headline print:py-2 print:px-1 print:text-[9px]">
              Year 3
            </th>
            <th className="py-4 px-2 text-right font-headline print:py-2 print:px-1 print:text-[9px]">
              Year 4
            </th>
            <th className="py-4 px-2 text-right font-headline print:py-2 print:px-1 print:text-[9px]">
              Year 5
            </th>
          </tr>
        </thead>

        {children}
      </table>
    </div>
  );
}

/** Total column count — kept in sync with the colgroup above. */
export const FINANCIAL_TABLE_COLS = 7;
