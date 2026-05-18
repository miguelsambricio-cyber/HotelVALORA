import { cn } from "@/lib/utils";
import { YEAR_COUNT, type YearSeries } from "@/lib/underwriting/types";

/**
 * Highlighted subtotal row · used for GOP · EBITDA · NOI · GOP · etc.
 * Lime band when tone="result", slate band when tone="subtotal".
 */
export function SubtotalRow({
  label,
  values,
  assumption,
  tone = "subtotal",
  format = "currency_compact",
}: {
  label: string;
  values: YearSeries;
  assumption?: string;
  tone?: "subtotal" | "result" | "warning";
  format?: "currency_compact" | "percent" | "integer" | "ratio";
}) {
  const rowCls =
    tone === "result" ? "bg-lime-300/10 border-lime-300/30"
    : tone === "warning" ? "bg-amber-500/10 border-amber-500/30"
    : "bg-slate-800/40";
  const labelCls =
    tone === "result" ? "text-lime-200 font-extrabold"
    : tone === "warning" ? "text-amber-200 font-extrabold"
    : "text-slate-100 font-extrabold";
  const valueCls =
    tone === "result" ? "text-lime-200 font-extrabold"
    : tone === "warning" ? "text-amber-200 font-extrabold"
    : "text-slate-100 font-extrabold";

  // Ensure cellCount matches the grid width (Block 1: assumption col optional)
  const cellCount = YEAR_COUNT;
  void cellCount;

  return (
    <tr className={cn("border-t border-slate-800/60 align-top", rowCls)}>
      <td className={cn("sticky left-0 z-[1] bg-inherit px-3 py-1.5 font-headline text-[11.5px]", labelCls)}>
        {label}
      </td>
      {assumption !== undefined && (
        <td className="px-2 py-1.5 text-right font-mono text-[11px] text-slate-300 font-bold">
          {assumption || "—"}
        </td>
      )}
      {values.map((v, i) => (
        <td key={i} className={cn("px-2 py-1.5 text-right font-mono text-[11px]", valueCls)}>
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
export function DivisionRow({ label }: { label: string }) {
  return (
    <tr>
      <td
        colSpan={2 + YEAR_COUNT}
        className="border-t border-slate-800/60 bg-slate-900/40 px-3 py-1 font-headline text-[9.5px] font-bold uppercase tracking-[0.22em] text-slate-500"
      >
        {label}
      </td>
    </tr>
  );
}
