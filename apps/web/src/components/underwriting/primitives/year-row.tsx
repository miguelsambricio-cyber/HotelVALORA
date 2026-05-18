import { cn } from "@/lib/utils";
import type { PeriodSeries } from "@/lib/underwriting/temporal";

/**
 * Single data row in a YearGrid.
 *
 *   · label + optional indent (sub-line under a group header)
 *   · optional assumption cell (when grid has assumptionCol)
 *   · 11 numeric cells (Y0..Y10) · formatted server-side
 *   · optional heatmap polarity tint (good/bad based on improvement)
 */

export type RowKind = "data" | "subgroup" | "negative" | "positive" | "muted";

export function YearRow({
  label,
  values,
  assumption,
  indent = 0,
  kind = "data",
  format = "currency_compact",
}: {
  label: string;
  values: PeriodSeries;
  assumption?: string;
  /** 0 = top level · 1 = first indent · 2 = sub-line of sub-line. */
  indent?: 0 | 1 | 2;
  kind?: RowKind;
  format?: "currency_compact" | "percent" | "integer" | "ratio";
}) {
  const labelTone =
    kind === "subgroup" ? "text-slate-300 font-bold"
    : kind === "muted" ? "text-slate-500"
    : "text-slate-200";

  const valueTone =
    kind === "negative" ? "text-amber-200/90"
    : kind === "positive" ? "text-emerald-200/90"
    : kind === "muted" ? "text-slate-500"
    : "text-slate-100";

  const indentPad = indent === 0 ? "pl-3" : indent === 1 ? "pl-6" : "pl-9";

  return (
    <tr className="border-t border-slate-800/40 align-top">
      <td className={cn("sticky left-0 z-[1] bg-slate-950/95 py-1.5 pr-2 font-headline text-[11px]", indentPad, labelTone)}>
        {label}
      </td>
      {assumption !== undefined && (
        <td className="px-2 py-1.5 text-right font-mono text-[10.5px] text-slate-400">
          {assumption || "—"}
        </td>
      )}
      {values.map((v, i) => (
        <td key={i} className={cn("px-2 py-1.5 text-right font-mono text-[10.5px]", valueTone)}>
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
