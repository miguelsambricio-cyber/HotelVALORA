"use client";

import { cn } from "@/lib/utils";

export interface LabeledSliderProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (v: number) => void;
  /** Right-aligned formatted display (e.g. "6.5%" or "15 Years") */
  displayValue?: string;
  /** Optional small range hint shown above the slider (e.g. "(0–100%)") */
  rangeHint?: string;
  className?: string;
}

/**
 * Generic single-thumb slider with label on the left and current value
 * on the right. Used heavily on the Finance Structure section (8
 * sliders) and Exit Investment targets (Yield / IRR Project / IRR Equity).
 */
export function LabeledSlider({
  label,
  value,
  min,
  max,
  step = 1,
  onChange,
  displayValue,
  rangeHint,
  className,
}: LabeledSliderProps) {
  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex items-center justify-between">
        <label className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-500">
          {label}
        </label>
        {displayValue && (
          <span className="text-sm font-bold text-forest-900">{displayValue}</span>
        )}
      </div>
      {rangeHint && (
        <div className="text-[10px] font-medium text-slate-400">{rangeHint}</div>
      )}
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-forest-900"
      />
    </div>
  );
}
