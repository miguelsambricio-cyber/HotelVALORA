"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

/**
 * Editable driver tile · institutional "live underwriting" surface.
 *
 * Renders a tile identical in size to `KpiTile` but with an `<input>`
 * instead of a read-only value. The operator types, presses Enter or
 * tabs out, and `onCommit` fires with the parsed number. The engine
 * re-runs and the whole report re-prices.
 *
 * Format-aware parsing:
 *   · integer   · "256" → 256
 *   · years     · "7y" / "7" → 7
 *   · currency  · "82,3M €" / "82.300.000" / "82300000" → 82_300_000
 *   · percent   · "65%" / "65" / "65,00" → 65 (percentage points)
 *
 * Print hides the "Edit" badge · the value renders as plain text.
 */

export type EditableTileFormat = "integer" | "years" | "currency" | "percent";

export function EditableTile({
  label,
  value,
  format,
  onCommit,
  sub,
  highlight = true,
  min,
  max,
}: {
  label: string;
  value: number;
  format: EditableTileFormat;
  onCommit: (next: number) => void;
  sub?: string;
  highlight?: boolean;
  min?: number;
  max?: number;
}) {
  const [draft, setDraft] = useState(formatRaw(value, format));
  // Keep draft synced if parent re-flows a new value (e.g. scenario change).
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
    <div
      className={cn(
        "rounded-md border p-3 print:break-inside-avoid",
        highlight
          ? "border-lime-300/40 bg-lime-300/5 print:border-emerald-500 print:bg-emerald-50"
          : "border-slate-800/60 bg-slate-900/40 print:border-slate-300 print:bg-white",
      )}
    >
      <p className="flex items-center justify-between font-headline text-[9px] font-bold uppercase tracking-[0.22em] text-slate-500 print:text-slate-600">
        <span>{label}</span>
        <span className="rounded bg-lime-300/15 px-1 font-mono text-[8.5px] text-lime-200 ring-1 ring-lime-300/30 print:hidden">
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
          "mt-1 w-full rounded-sm border border-transparent bg-transparent px-0 py-0 font-mono text-[17px] font-extrabold tabular-nums focus:border-lime-300/40 focus:bg-slate-900/60 focus:outline-none",
          highlight ? "text-lime-200 print:text-emerald-700" : "text-white print:text-slate-900",
        )}
        aria-label={label}
      />
      {sub && (
        <p className="mt-0.5 truncate font-mono text-[9.5px] text-slate-500 print:text-slate-600">
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
  // Strip cosmetic chars and unify decimal sep.
  let v = trimmed
    .replace(/€/g, "")
    .replace(/%/g, "")
    .replace(/y/gi, "")
    .replace(/\s/g, "")
    .replace(/\.(?=\d{3}(?:\D|$))/g, "") // remove thousands dots
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
