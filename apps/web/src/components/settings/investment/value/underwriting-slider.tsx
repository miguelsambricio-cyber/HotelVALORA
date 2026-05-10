"use client";

import { cn } from "@/lib/utils";
import type { CurrencyCode, DisplayMode } from "@/lib/investment";
import { DisplayModeToggle } from "./display-mode-toggle";

export interface UnderwritingSliderProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (v: number) => void;
  mode: DisplayMode;
  onModeChange: (m: DisplayMode) => void;
  /** When provided, renders a €/$ currency selector inside the input pill */
  currency?: CurrencyCode;
  onCurrencyChange?: (c: CurrencyCode) => void;
  /** When provided, renders a "Guardar" button that calls back */
  onSave?: () => void;
  className?: string;
}

/**
 * Composite slider field used for the big monetary thesis inputs on the
 * Hotel Value page (Asking Price, Total Investment, Exit Price). Combines:
 *   • Range slider (left, fluid width)
 *   • Numeric input pill (right) — formatted with thousand separators
 *   • Optional inline €/$ currency selector OR "Guardar" CTA
 *   • Display-mode toggle below right (Total / Per Room / Per m²)
 */
export function UnderwritingSlider({
  label,
  value,
  min,
  max,
  step = 100_000,
  onChange,
  mode,
  onModeChange,
  currency,
  onCurrencyChange,
  onSave,
  className,
}: UnderwritingSliderProps) {
  const handleInput = (raw: string) => {
    const cleaned = raw.replace(/[^\d.,-]/g, "").replace(/[.,]/g, "");
    if (cleaned === "") return onChange(0);
    const parsed = Number(cleaned);
    if (!Number.isNaN(parsed)) onChange(parsed);
  };

  return (
    <div className={cn("space-y-3", className)}>
      <label className="block text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">
        {label}
      </label>
      <div className="flex items-center gap-4">
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className="w-full accent-forest-900"
        />
        {currency && onCurrencyChange ? (
          <div className="flex items-center gap-2 rounded-lg bg-slate-50 pr-2">
            <input
              type="text"
              value={value.toLocaleString("en-US")}
              onChange={(e) => handleInput(e.target.value)}
              className="w-32 border-transparent bg-transparent px-3 py-2 text-right text-sm font-bold text-forest-900 focus:outline-none focus:ring-0"
            />
            <select
              value={currency}
              onChange={(e) => onCurrencyChange(e.target.value as CurrencyCode)}
              className="cursor-pointer border-none bg-transparent text-[10px] font-bold text-slate-500 focus:outline-none focus:ring-0"
            >
              <option value="eur">€</option>
              <option value="usd">$</option>
            </select>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={value.toLocaleString("en-US")}
              onChange={(e) => handleInput(e.target.value)}
              className="w-32 rounded-lg border-transparent bg-slate-50 px-3 py-2 text-right text-sm font-bold text-forest-900 focus:outline-none focus:ring-0"
            />
            {onSave && (
              <button
                type="button"
                onClick={onSave}
                className="rounded-lg bg-forest-900 px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-white transition-colors hover:brightness-110"
              >
                Guardar
              </button>
            )}
          </div>
        )}
      </div>
      <div className="flex justify-end pt-1">
        <DisplayModeToggle value={mode} onChange={onModeChange} />
      </div>
    </div>
  );
}
