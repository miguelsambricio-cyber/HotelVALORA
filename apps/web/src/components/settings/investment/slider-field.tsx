"use client";

import { cn } from "@/lib/utils";

export interface SliderFieldProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (v: number) => void;
  /** Display formatter for the right-side value chip */
  formatValue?: (v: number) => string;
  /** Optional small hint shown under the slider (e.g. "No minimum / No maximum") */
  hintLeft?: string;
  hintRight?: string;
  className?: string;
}

/**
 * Labeled single-thumb slider with the institutional weight + spacing
 * used across the Investment Requirements page (and re-used by future
 * underwriting sensitivity surfaces).
 */
export function SliderField({
  label,
  value,
  min,
  max,
  step = 1,
  onChange,
  formatValue,
  hintLeft,
  hintRight,
  className,
}: SliderFieldProps) {
  const display = formatValue ? formatValue(value) : String(value);
  return (
    <div className={cn("space-y-3", className)}>
      <div className="flex items-center justify-between">
        <label className="block text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">
          {label}
        </label>
        <span className="text-sm font-bold text-forest-900">{display}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-forest-900"
      />
      {(hintLeft || hintRight) && (
        <div className="flex justify-between pt-0.5 text-[10px] font-bold uppercase tracking-tight text-slate-400">
          <span>{hintLeft}</span>
          <span>{hintRight}</span>
        </div>
      )}
    </div>
  );
}
