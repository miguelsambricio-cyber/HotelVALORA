import { Fragment } from "react";
import { cn } from "@/lib/utils";
import {
  formatCompactCurrency,
  formatPercent,
  type Currency,
  type FiveYears,
  type PLResultVariant,
} from "@/lib/report/financials";

export interface FinancialResultRowProps {
  label: string;
  variant: PLResultVariant;
  values: FiveYears;
  currency: Currency;
  /** When set, render an additional "% Margin" sub-row beneath (used by EBITDA) */
  marginValues?: FiveYears;
  /**
   * Optional 12-month breakdown for Year 1. When provided, the single
   * Year-1 result cell is replaced by 12 monthly cells.
   */
  year1Monthly?: number[];
  /** Optional 12-month margin breakdown (for EBITDA % Margin sub-row) */
  year1MonthlyMargin?: number[];
}

/**
 * Emphasized total / GOP / EBITDA row. Slate-50 for `total`, emerald-50 for
 * `gop`, emerald-100 for `ebitda` — matches the Stitch reference exactly.
 *
 * EBITDA optionally renders a sub-row with the corresponding margin %.
 * When Year 1 is expanded, both rows render 12 month cells in place of the
 * single Year-1 cell.
 */
export function FinancialResultRow({
  label,
  variant,
  values,
  currency,
  marginValues,
  year1Monthly,
  year1MonthlyMargin,
}: FinancialResultRowProps) {
  const styles = VARIANT_STYLES[variant];
  return (
    <Fragment>
      <tr className={styles.row}>
        <td className={cn("py-4 pl-2 uppercase font-bold text-xs print:py-2 print:pl-1 print:text-[9px]", styles.label)}>
          {label}
        </td>
        <td className="py-4 px-2 print:hidden" />
        {year1Monthly ? (
          year1Monthly.map((v, m) => (
            <td
              key={m}
              className={cn(
                "py-4 px-1 text-right font-headline text-[11px] print:py-2 print:px-0.5 print:text-[8px]",
                styles.value,
              )}
            >
              {formatCompactCurrency(v, currency)}
            </td>
          ))
        ) : (
          <td
            className={cn(
              "py-4 px-2 text-right font-headline print:py-2 print:px-1 print:text-[9px]",
              styles.value,
            )}
          >
            {formatCompactCurrency(values[0], currency)}
          </td>
        )}
        {[1, 2, 3, 4].map((i) => (
          <td
            key={i}
            className={cn(
              "py-4 px-2 text-right font-headline print:py-2 print:px-1 print:text-[9px]",
              styles.value,
            )}
          >
            {formatCompactCurrency(values[i], currency)}
          </td>
        ))}
      </tr>

      {marginValues && (
        <tr className={styles.marginRow}>
          <td className={cn("py-2 pl-2 text-xs font-bold print:py-1 print:pl-1 print:text-[7px]", styles.marginLabel)}>
            % Margin
          </td>
          <td className="py-2 px-2 print:hidden" />
          {year1MonthlyMargin ? (
            year1MonthlyMargin.map((m, idx) => (
              <td
                key={idx}
                className={cn(
                  "py-2 px-1 text-right text-[10px] font-bold font-headline print:py-1 print:px-0.5 print:text-[7px]",
                  styles.marginValue,
                )}
              >
                {formatPercent(m, 1)}
              </td>
            ))
          ) : (
            <td
              className={cn(
                "py-2 px-2 text-right text-xs font-bold font-headline print:py-1 print:px-1 print:text-[7px]",
                styles.marginValue,
              )}
            >
              {formatPercent(marginValues[0], 1)}
            </td>
          )}
          {[1, 2, 3, 4].map((i) => (
            <td
              key={i}
              className={cn(
                "py-2 px-2 text-right text-xs font-bold font-headline print:py-1 print:px-1 print:text-[7px]",
                styles.marginValue,
              )}
            >
              {formatPercent(marginValues[i], 1)}
            </td>
          ))}
        </tr>
      )}
    </Fragment>
  );
}

// ── Visual variants ─────────────────────────────────────────────────────────

const VARIANT_STYLES: Record<
  PLResultVariant,
  {
    row: string;
    label: string;
    value: string;
    marginRow: string;
    marginLabel: string;
    marginValue: string;
  }
> = {
  total: {
    row: "bg-slate-50 border-y border-slate-200",
    label: "text-slate-900",
    value: "text-slate-900 font-bold",
    marginRow: "",
    marginLabel: "",
    marginValue: "",
  },
  gop: {
    row: "bg-emerald-50/50 border-y border-emerald-100",
    label: "text-emerald-900",
    value: "text-emerald-900 font-bold",
    marginRow: "",
    marginLabel: "",
    marginValue: "",
  },
  ebitda: {
    row: "bg-emerald-100/60 border-t border-emerald-200",
    label: "text-emerald-950 font-black text-sm print:text-[10px]",
    value: "text-emerald-950 font-black text-base print:text-[10px]",
    marginRow: "bg-emerald-50/50 border-b border-emerald-200",
    marginLabel: "text-emerald-800",
    marginValue: "text-emerald-800",
  },
};
