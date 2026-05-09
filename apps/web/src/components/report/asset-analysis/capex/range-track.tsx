"use client";

import { cn } from "@/lib/utils";

export interface RangeTrackProps {
  /** Current value (controlled) */
  value: number;
  min: number;
  max: number;
  onChange: (next: number) => void;
  ariaLabel?: string;
  /** Tailwind bg- class for the filled portion (default emerald-600) */
  fillColor?: string;
  /** Tailwind border- class for the thumb (default emerald-600) */
  thumbBorder?: string;
  className?: string;
}

/**
 * Bare horizontal range slider — slate track + coloured fill + circular
 * thumb + invisible native `<input type="range">` overlay for keyboard /
 * pointer accessibility. The 20 px height matches the thumb diameter so the
 * slider sits cleanly on a single grid row aligned with sibling sliders.
 */
export function RangeTrack({
  value,
  min,
  max,
  onChange,
  ariaLabel,
  fillColor = "bg-emerald-600",
  thumbBorder = "border-emerald-600",
  className,
}: RangeTrackProps) {
  const fillPct =
    max === min
      ? 0
      : Math.max(0, Math.min(100, ((value - min) / (max - min)) * 100));

  return (
    <div className={cn("relative h-5", className)}>
      <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-1.5 bg-slate-200 rounded-full" />
      <div
        className={cn(
          "absolute left-0 top-1/2 -translate-y-1/2 h-1.5 rounded-full transition-[width]",
          fillColor,
        )}
        style={{ width: `${fillPct}%` }}
      />
      <div
        className={cn(
          "absolute top-1/2 -translate-y-1/2 h-5 w-5 bg-white border-2 rounded-full shadow-md pointer-events-none",
          thumbBorder,
        )}
        style={{ left: `calc(${fillPct}% - 10px)` }}
      />
      <input
        type="range"
        min={min}
        max={max}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        aria-label={ariaLabel}
        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer print:hidden"
      />
    </div>
  );
}
