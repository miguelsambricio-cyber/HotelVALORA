"use client";

import { cn } from "@/lib/utils";

export interface InstitutionalToggleProps {
  checked: boolean;
  onChange: (next: boolean) => void;
  /** Optional accessible label */
  ariaLabel?: string;
  className?: string;
}

/**
 * Canonical ON/OFF switch for institutional sections (Investment Market
 * forecast cards, Investment Value section headers, etc.). Forest-900
 * fill when active, slate-300 when off — same visual rhythm across
 * every settings surface.
 */
export function InstitutionalToggle({
  checked,
  onChange,
  ariaLabel,
  className,
}: InstitutionalToggleProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={ariaLabel}
      onClick={() => onChange(!checked)}
      className={cn(
        "relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none",
        checked ? "bg-forest-900" : "bg-slate-300",
        className,
      )}
    >
      <span
        className={cn(
          "pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out",
          checked ? "translate-x-5" : "translate-x-0",
        )}
      />
    </button>
  );
}
