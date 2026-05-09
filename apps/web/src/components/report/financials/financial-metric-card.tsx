import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export type FinancialMetricCardVariant = "light" | "dark";

export interface FinancialMetricCardProps {
  variant?: FinancialMetricCardVariant;
  /** Slot for the card content — caller composes title, fields, KPIs, etc. */
  children: ReactNode;
  className?: string;
}

/**
 * Base card primitive used by the Financial Summary strip.
 *
 * Two visual variants matching the Stitch reference:
 *  - `light`: white card with slate border, used for assumption-grid cards
 *    (RevPAR Growth, Expense Inflation).
 *  - `dark`:  forest-900 card with emerald accent text, used for hero KPI
 *    tiles (EBITDA Stabilized).
 *
 * Slot-based so the same primitive carries any composition the page needs
 * — input grids, KPI pairs, progress bars, sparklines (future).
 */
export function FinancialMetricCard({
  variant = "light",
  children,
  className,
}: FinancialMetricCardProps) {
  return (
    <div
      className={cn(
        "rounded-xl p-5 shadow-sm print:p-3 print:shadow-none print:rounded-md print:break-inside-avoid",
        variant === "light"
          ? "bg-white border border-slate-200 text-slate-800"
          : "bg-[#00331e] border border-forest-700 text-white",
        className,
      )}
    >
      {children}
    </div>
  );
}
