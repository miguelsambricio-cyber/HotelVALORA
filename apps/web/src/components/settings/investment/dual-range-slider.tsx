"use client";

import { useId } from "react";
import { cn } from "@/lib/utils";

export interface DualRangeSliderProps {
  min: number;
  max: number;
  step?: number;
  minValue: number;
  maxValue: number;
  onMinChange: (v: number) => void;
  onMaxChange: (v: number) => void;
  /** Minimum gap between thumbs (in slider units) — defaults to step */
  minGap?: number;
  className?: string;
}

/**
 * Two-thumb range slider with active band between thumbs. Primary use:
 * "Min – Max Number of Rooms" on the Investment Requirements page.
 *
 * Implementation: two stacked native `<input type="range">` with a
 * shared track + active-band div underneath. Thumbs styled via scoped
 * styled-jsx so they match the institutional forest-900 brand.
 */
export function DualRangeSlider({
  min,
  max,
  step = 1,
  minValue,
  maxValue,
  onMinChange,
  onMaxChange,
  minGap,
  className,
}: DualRangeSliderProps) {
  const id = useId();
  const gap = minGap ?? step;
  const range = max - min;
  const minPct = ((minValue - min) / range) * 100;
  const maxPct = ((maxValue - min) / range) * 100;

  const handleMin = (next: number) => {
    if (next + gap > maxValue) onMinChange(Math.max(min, maxValue - gap));
    else onMinChange(next);
  };
  const handleMax = (next: number) => {
    if (next - gap < minValue) onMaxChange(Math.min(max, minValue + gap));
    else onMaxChange(next);
  };

  return (
    <div className={cn("relative h-6 w-full select-none", className)}>
      {/* Track */}
      <div className="pointer-events-none absolute left-0 right-0 top-1/2 h-1 -translate-y-1/2 rounded-full bg-slate-200" />
      {/* Active band */}
      <div
        className="pointer-events-none absolute top-1/2 h-1 -translate-y-1/2 rounded-full bg-forest-900"
        style={{ left: `${minPct}%`, right: `${100 - maxPct}%` }}
      />
      {/* Min thumb input */}
      <input
        id={`${id}-min`}
        type="range"
        min={min}
        max={max}
        step={step}
        value={minValue}
        onChange={(e) => handleMin(Number(e.target.value))}
        className="dual-range-input"
        aria-label="Minimum value"
      />
      {/* Max thumb input */}
      <input
        id={`${id}-max`}
        type="range"
        min={min}
        max={max}
        step={step}
        value={maxValue}
        onChange={(e) => handleMax(Number(e.target.value))}
        className="dual-range-input"
        aria-label="Maximum value"
      />

      <style jsx>{`
        :global(.dual-range-input) {
          position: absolute;
          top: 50%;
          left: 0;
          width: 100%;
          height: 18px;
          margin: 0;
          padding: 0;
          background: transparent;
          pointer-events: none;
          appearance: none;
          -webkit-appearance: none;
          transform: translateY(-50%);
        }
        :global(.dual-range-input::-webkit-slider-runnable-track) {
          background: transparent;
          height: 4px;
        }
        :global(.dual-range-input::-moz-range-track) {
          background: transparent;
          height: 4px;
        }
        :global(.dual-range-input::-webkit-slider-thumb) {
          -webkit-appearance: none;
          appearance: none;
          width: 18px;
          height: 18px;
          border-radius: 9999px;
          background: #062c1c;
          border: 2px solid white;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
          cursor: pointer;
          pointer-events: auto;
        }
        :global(.dual-range-input::-moz-range-thumb) {
          width: 18px;
          height: 18px;
          border-radius: 9999px;
          background: #062c1c;
          border: 2px solid white;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
          cursor: pointer;
          pointer-events: auto;
        }
      `}</style>
    </div>
  );
}
