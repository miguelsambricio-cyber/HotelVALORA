"use client";

import { cn } from "@/lib/utils";

export interface MapLayerToggleProps {
  checked: boolean;
  onChange: (next: boolean) => void;
  label: string;
  /** Optional swatch — when present, renders the legend dot left of the label */
  swatchClassName?: string;
  ariaLabel?: string;
}

/**
 * Tiny institutional rail toggle used inside the legend / layers card.
 *
 * Rail 32×18, thumb 14×14, slate-300 → blue-700 on. Matches the Stitch
 * reference. We intentionally do not use Radix's Switch here: this is a
 * dense institutional control where 18 px is the design target — Radix's
 * default sizing fights that.
 */
export function MapLayerToggle({
  checked,
  onChange,
  label,
  swatchClassName,
  ariaLabel,
}: MapLayerToggleProps) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-3">
      <span className="flex items-center gap-2.5">
        {swatchClassName && (
          <span
            aria-hidden
            className={cn("h-2.5 w-2.5 rounded-full ring-[3px]", swatchClassName)}
          />
        )}
        <span className="font-body text-[13px] font-medium text-slate-900">
          {label}
        </span>
      </span>

      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={ariaLabel ?? label}
        onClick={() => onChange(!checked)}
        className={cn(
          "relative inline-flex h-4 w-7 shrink-0 items-center rounded-full transition-colors",
          "focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-700/40",
          checked ? "bg-blue-700" : "bg-slate-300",
        )}
      >
        <span
          className={cn(
            "block h-3 w-3 transform rounded-full bg-white shadow-sm transition-transform",
            checked ? "translate-x-[14px]" : "translate-x-[2px]",
          )}
        />
      </button>
    </label>
  );
}
