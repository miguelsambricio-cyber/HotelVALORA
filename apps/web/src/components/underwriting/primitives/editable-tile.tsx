"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

/**
 * Editable driver tile · institutional "live underwriting" surface.
 *
 * Corporate light theme · white card · blue (#005db7) border + text marks
 * the field as user-editable. Identical to the P&L EditableAssumptionCell
 * visual contract so the operator sees one consistent "blue = editable"
 * signal across all financial pages.
 *
 * Format-aware parsing: integer / years / currency / percent.
 */

export type EditableTileFormat = "integer" | "years" | "currency" | "percent";

export function EditableTile({
  label,
  value,
  format,
  onCommit,
  sub,
  min,
  max,
}: {
  label: string;
  value: number;
  format: EditableTileFormat;
  onCommit: (next: number) => void;
  sub?: string;
  /** Legacy `highlight` prop retained for compat — visual treatment is
   * always the blue editable surface so the operator's mental model of
   * "blue = I can change this" stays consistent. */
  highlight?: boolean;
  min?: number;
  max?: number;
}) {
  const [draft, setDraft] = useState(formatRaw(value, format));
  useEffect(() => {
    setDraft(formatRaw(value, format));
  }, [value, format]);

  const commit = () => {
    const parsed = parseRaw(draft, format);
    if (parsed === null) {
      setDraft(formatRaw(value, format));
      return;
    }
    if (min !== undefined && parsed < min) { setDraft(formatRaw(value, format)); return; }
    if (max !== undefined && parsed > max) { setDraft(formatRaw(value, format)); return; }
    if (parsed === value) {
      setDraft(formatRaw(value, format));
      return;
    }
    onCommit(parsed);
  };

  return (
    <div className="rounded-md border border-blue-200 bg-blue-50/40 p-3 print:break-inside-avoid print:border-blue-300 print:bg-white">
      <p className="flex items-center justify-between font-headline text-[9px] font-bold uppercase tracking-[0.22em] text-slate-600">
        <span>{label}</span>
        <span className="rounded bg-blue-100 px-1 font-mono text-[8.5px] font-bold text-[#005db7] ring-1 ring-blue-200 print:hidden">
          Edit
        </span>
      </p>
      <input
        type="text"
        inputMode={format === "integer" || format === "years" ? "numeric" : "decimal"}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Enter") (e.target as HTMLInputElement).blur();
          if (e.key === "Escape") {
            setDraft(formatRaw(value, format));
            (e.target as HTMLInputElement).blur();
          }
        }}
        className={cn(
          "mt-1 w-full rounded-sm border border-transparent bg-transparent px-0 py-0 font-mono text-[17px] font-extrabold tabular-nums text-[#005db7]",
          "focus:border-blue-400 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-400",
        )}
        aria-label={label}
      />
      {sub && (
        <p className="mt-0.5 truncate font-mono text-[9.5px] text-slate-500">
          {sub}
        </p>
      )}
    </div>
  );
}

// ─── Format / parse helpers ──────────────────────────────────────────

function formatRaw(value: number, fmt: EditableTileFormat): string {
  if (!Number.isFinite(value)) return "";
  switch (fmt) {
    case "integer":
      return String(Math.round(value));
    case "years":
      return `${Math.round(value)}y`;
    case "currency": {
      const abs = Math.abs(value);
      if (abs >= 1_000_000) {
        return `${(Math.round((value / 1_000_000) * 10) / 10).toString().replace(".", ",")}M €`;
      }
      if (abs >= 1_000) {
        return `${(Math.round((value / 1_000) * 10) / 10).toString().replace(".", ",")}k €`;
      }
      return `${new Intl.NumberFormat("es-ES").format(Math.round(value))} €`;
    }
    case "percent":
      return value === 0 ? "0%" : `${value.toFixed(2).replace(".", ",")}%`;
  }
}

function parseRaw(raw: string, fmt: EditableTileFormat): number | null {
  if (!raw) return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;
  let v = trimmed
    .replace(/€/g, "")
    .replace(/%/g, "")
    .replace(/y/gi, "")
    .replace(/\s/g, "")
    .replace(/\.(?=\d{3}(?:\D|$))/g, "")
    .replace(",", ".");

  let multiplier = 1;
  const last = v.slice(-1).toLowerCase();
  if (last === "m") {
    multiplier = 1_000_000;
    v = v.slice(0, -1);
  } else if (last === "k") {
    multiplier = 1_000;
    v = v.slice(0, -1);
  }
  const n = parseFloat(v);
  if (!Number.isFinite(n)) return null;
  switch (fmt) {
    case "integer":
      return Math.round(n * multiplier);
    case "years":
      return Math.round(n);
    case "currency":
      return n * multiplier;
    case "percent":
      return n;
  }
}
