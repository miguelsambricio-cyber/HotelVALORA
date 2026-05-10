"use client";

import { cn } from "@/lib/utils";
import type { UnderwritingScenario } from "@/lib/investment";

const OPTIONS: { id: UnderwritingScenario; label: string }[] = [
  { id: "downside", label: "Conservador" },
  { id: "base", label: "Mercado" },
  { id: "upside", label: "Optimista" },
];

export interface CapRatePickerProps {
  value: UnderwritingScenario;
  onChange: (s: UnderwritingScenario) => void;
  className?: string;
}

/**
 * Flat segmented control — Conservador / Mercado / Optimista — used for
 * the Cap Rate scenario on the Exit Investment section. Visually
 * distinct from the P&L's `RevparScenarioCard` (which uses 3 stacked
 * tiles with decorative top labels); this one is a single horizontal
 * pill with equal-flex buttons per the Stitch reference.
 *
 * Re-uses the canonical `UnderwritingScenario` discriminator so the
 * downstream DCF / cap rate engine can consume both surfaces uniformly.
 */
export function CapRatePicker({ value, onChange, className }: CapRatePickerProps) {
  return (
    <div className={cn("flex gap-1 rounded-xl bg-slate-50 p-1", className)}>
      {OPTIONS.map((opt) => {
        const isActive = opt.id === value;
        return (
          <button
            key={opt.id}
            type="button"
            onClick={() => onChange(opt.id)}
            className={cn(
              "flex-1 rounded-lg px-4 py-2.5 text-xs font-bold transition-all",
              isActive
                ? "bg-white text-forest-900 shadow-sm"
                : "text-slate-500 hover:bg-white/50 hover:text-forest-900",
            )}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
