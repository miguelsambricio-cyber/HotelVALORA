import { cn } from "@/lib/utils";

export interface FinancialSectionHeaderProps {
  label: string;
  /** Number of columns the row spans — must match the parent table */
  colSpan: number;
  /** Reduce top padding (used for the very first section in the table) */
  compact?: boolean;
  className?: string;
}

/**
 * Uppercase tracked-wide divider row that opens a USALI section
 * (`ROOM STATISTICS`, `OPERATING REVENUE`, etc.).
 *
 * Renders as a single `<tr>` so it can live inside a `<tbody>`. Pairs with
 * the print `break-inside-avoid` on the parent `<tbody>` so the header
 * never lands at the bottom of an A4 page divorced from its rows.
 */
export function FinancialSectionHeader({
  label,
  colSpan,
  compact = false,
  className,
}: FinancialSectionHeaderProps) {
  return (
    <tr>
      <td
        colSpan={colSpan}
        className={cn(
          "pl-2 font-bold text-xs uppercase tracking-wider text-slate-500 font-headline",
          compact ? "py-2" : "pt-6 pb-2 print:pt-3",
          "print:text-[8px]",
          className,
        )}
      >
        {label}
      </td>
    </tr>
  );
}
