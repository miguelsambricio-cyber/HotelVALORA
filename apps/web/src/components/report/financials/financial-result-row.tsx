import { Fragment } from "react";
import { cn } from "@/lib/utils";
import {
  formatCurrency,
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
}

/**
 * Emphasized total / GOP / EBITDA row. Slate-50 for `total`, emerald-50 for
 * `gop`, emerald-100 for `ebitda` — matches the Stitch reference exactly.
 *
 * EBITDA optionally renders a sub-row with the corresponding margin %.
 */
export function FinancialResultRow({
  label,
  variant,
  values,
  currency,
  marginValues,
}: FinancialResultRowProps) {
  const styles = VARIANT_STYLES[variant];
  return (
    <Fragment>
      <tr className={styles.row}>
        <td className={cn("py-4 pl-2 uppercase font-bold text-xs print:py-2 print:pl-1 print:text-[9px]", styles.label)}>
          {label}
        </td>
        <td className="py-4 px-2 print:hidden" />
        {values.map((v, i) => (
          <td
            key={i}
            className={cn(
              "py-4 px-2 text-right font-headline print:py-2 print:px-1 print:text-[9px]",
              styles.value,
            )}
          >
            {formatCurrency(v, currency, { decimals: 0 })}
          </td>
        ))}
      </tr>

      {marginValues && (
        <tr className={styles.marginRow}>
          <td className={cn("py-2 pl-2 text-xs font-bold print:py-1 print:pl-1 print:text-[7px]", styles.marginLabel)}>
            % Margin
          </td>
          <td className="py-2 px-2 print:hidden" />
          {marginValues.map((m, i) => (
            <td
              key={i}
              className={cn("py-2 px-2 text-right text-xs font-bold font-headline print:py-1 print:px-1 print:text-[7px]", styles.marginValue)}
            >
              {formatPercent(m, 1)}
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
