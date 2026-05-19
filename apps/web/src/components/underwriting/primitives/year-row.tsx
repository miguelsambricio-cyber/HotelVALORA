import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import type { PeriodSeries } from "@/lib/underwriting/temporal";
import { useYearGridContext } from "./year-grid";

/**
 * Single data row in a YearGrid.
 *
 * Corporate light theme · sticky label cell uses white bg so the column
 * stays legible during horizontal scroll. Negative / positive rows use
 * amber-700 / emerald-700.
 *
 * The row picks values at the `visibleIndices` projected by the parent
 * grid (which encodes both the `displayThroughIndex` limit and the
 * `excludeAcquisition` filter). Operating tables drop acquisition
 * columns entirely · capital tables keep them visible.
 */

export type RowKind = "data" | "subgroup" | "negative" | "positive" | "muted";

export function YearRow({
  label,
  labelNode,
  values,
  assumption,
  indent = 0,
  kind = "data",
  format = "currency_compact",
}: {
  label: string;
  /** Optional · overrides the plain `label` rendering with a custom node
   *  (e.g. interactive button + popover for covenant info). */
  labelNode?: ReactNode;
  values: PeriodSeries;
  assumption?: string;
  indent?: 0 | 1 | 2;
  kind?: RowKind;
  format?: "currency_compact" | "percent" | "integer" | "ratio";
}) {
  const labelTone =
    kind === "subgroup" ? "text-slate-900 font-bold"
    : kind === "muted" ? "text-slate-500"
    : "text-slate-700";

  const valueTone =
    kind === "negative" ? "text-amber-700"
    : kind === "positive" ? "text-emerald-700"
    : kind === "muted" ? "text-slate-500"
    : "text-slate-800";

  const indentPad = indent === 0 ? "pl-3" : indent === 1 ? "pl-6" : "pl-9";
  const { visibleIndices } = useYearGridContext();
  const displayValues = visibleIndices.map((idx) => values[idx] ?? 0);

  return (
    <tr className="border-t border-slate-100 align-top hover:bg-slate-50/60 print:hover:bg-transparent">
      <td className={cn("sticky left-0 z-[1] bg-white py-1.5 pr-2 font-headline text-[11px]", indentPad, labelTone)}>
        {labelNode ?? label}
      </td>
      {assumption !== undefined && (
        <td className="px-2 py-1.5 text-right font-mono text-[10.5px] text-[#005db7] font-semibold">
          {assumption || "—"}
        </td>
      )}
      {displayValues.map((v, i) => (
        <td
          key={i}
          className={cn(
            "px-2 py-1.5 text-right font-mono text-[10.5px] tabular-nums",
            valueTone,
          )}
        >
          {formatCell(v, format)}
        </td>
      ))}
    </tr>
  );
}

// ─── Format helpers ───────────────────────────────────────────────────

function formatCell(n: number, kind: "currency_compact" | "percent" | "integer" | "ratio"): string {
  if (!Number.isFinite(n)) return "—";
  if (n === 0) return "·";

  switch (kind) {
    case "percent":
      return `${(n * 100).toFixed(1).replace(".", ",")}%`;
    case "integer":
      return new Intl.NumberFormat("es-ES").format(Math.round(n));
    case "ratio":
      return n.toFixed(2).replace(".", ",");
    case "currency_compact":
    default:
      return fmtCompactEUR(n);
  }
}

function fmtCompactEUR(n: number): string {
  const abs = Math.abs(n);
  if (abs >= 1_000_000) {
    const m = Math.round((n / 1_000_000) * 10) / 10;
    return `${String(m).replace(".", ",")}M`;
  }
  if (abs >= 1_000) {
    const k = Math.round((n / 1_000) * 10) / 10;
    return `${String(k).replace(".", ",")}k`;
  }
  return new Intl.NumberFormat("es-ES").format(Math.round(n));
}
