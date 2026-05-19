import { cn } from "@/lib/utils";
import type { PeriodSeries } from "@/lib/underwriting/temporal";
import { useYearGridContext } from "./year-grid";

/**
 * Highlighted subtotal row · GOP · EBITDA · NOI · etc.
 *
 * Corporate light theme · subtotal = slate band · result = forest accent
 * (the same forest-900 palette the P&L uses for the dark EBITDA hero) ·
 * warning = amber band.
 *
 * The row picks values at the `visibleIndices` projected by the parent
 * grid (encodes both displayThroughIndex limit + excludeAcquisition).
 */
export function SubtotalRow({
  label,
  values,
  assumption,
  tone = "subtotal",
  format = "currency_compact",
}: {
  label: string;
  values: PeriodSeries;
  assumption?: string;
  tone?: "subtotal" | "result" | "warning";
  format?: "currency_compact" | "percent" | "integer" | "ratio";
}) {
  const rowCls =
    tone === "result" ? "bg-forest-50 border-forest-900/20"
    : tone === "warning" ? "bg-amber-50 border-amber-200"
    : "bg-slate-100";
  const labelCls =
    tone === "result" ? "text-forest-900 font-extrabold"
    : tone === "warning" ? "text-amber-800 font-extrabold"
    : "text-slate-900 font-extrabold";
  const valueCls =
    tone === "result" ? "text-forest-900 font-extrabold"
    : tone === "warning" ? "text-amber-800 font-extrabold"
    : "text-slate-900 font-extrabold";

  const { visibleIndices } = useYearGridContext();
  const displayValues = visibleIndices.map((idx) => values[idx] ?? 0);

  return (
    <tr className={cn("border-t border-slate-200 align-top", rowCls)}>
      <td className={cn("sticky left-0 z-[1] bg-inherit px-3 py-1.5 font-headline text-[11.5px]", labelCls)}>
        {label}
      </td>
      {assumption !== undefined && (
        <td className="px-2 py-1.5 text-right font-mono text-[11px] text-[#005db7] font-bold">
          {assumption || "—"}
        </td>
      )}
      {displayValues.map((v, i) => (
        <td
          key={i}
          className={cn("px-2 py-1.5 text-right font-mono text-[11px] tabular-nums", valueCls)}
        >
          {formatCell(v, format)}
        </td>
      ))}
    </tr>
  );
}

function formatCell(n: number, kind: "currency_compact" | "percent" | "integer" | "ratio"): string {
  if (!Number.isFinite(n)) return "—";
  if (n === 0) return "·";
  switch (kind) {
    case "percent": return `${(n * 100).toFixed(1).replace(".", ",")}%`;
    case "integer": return new Intl.NumberFormat("es-ES").format(Math.round(n));
    case "ratio": return n.toFixed(2).replace(".", ",");
    default: {
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
  }
}

/**
 * Section-divider row (e.g. inside CF between Investment and Financing).
 * Renders an empty band with just the label.
 */
export function DivisionRow({ label, columnCount }: { label: string; columnCount: number }) {
  return (
    <tr>
      <td
        colSpan={columnCount}
        className="border-t border-slate-200 bg-slate-50 px-3 py-1 font-headline text-[9.5px] font-bold uppercase tracking-[0.22em] text-slate-500"
      >
        {label}
      </td>
    </tr>
  );
}
