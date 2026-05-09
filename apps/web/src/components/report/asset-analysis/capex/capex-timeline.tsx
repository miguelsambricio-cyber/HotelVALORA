"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

export interface CapexTimelineProps {
  /** Initial duration in months (uncontrolled) */
  defaultMonths?: number;
  /** Current value (controlled) */
  value?: number;
  /** Change handler — fires for both controlled and uncontrolled modes */
  onChange?: (months: number) => void;
  minMonths: number;
  maxMonths: number;
  /** Top-left field label */
  label?: string;
  /** Suffix for the value display (defaults to "meses") */
  unitLabel?: string;
  /** Render the heading label above the slider */
  showLabel?: boolean;
  /** Render the inline duration badge in the header row (right of the label) */
  showBadge?: boolean;
  /**
   * Render the duration badge floating above the slider thumb (tracks the
   * thumb position). Overrides `showBadge` when true.
   */
  floatingBadge?: boolean;
  /** Optional cap for the slider track width (px or any CSS length) */
  sliderMaxWidth?: number | string;
  className?: string;
}

/**
 * Slider-style range control for CAPEX duration. The track shows the elapsed
 * portion in emerald and the remainder in slate. The thumb is positioned by
 * the current value; dragging is wired through a range input that overlays
 * the visual track for accessibility.
 *
 * Composable badge placement:
 *   showBadge={true}      → emerald pill in the header row beside the label
 *   floatingBadge={true}  → emerald pill floating above the slider thumb
 *                           (tracks the value)
 */
export function CapexTimeline({
  defaultMonths,
  value,
  onChange,
  minMonths,
  maxMonths,
  label = "Duración del CAPEX",
  unitLabel = "meses",
  showLabel = true,
  showBadge = true,
  floatingBadge = false,
  sliderMaxWidth,
  className,
}: CapexTimelineProps) {
  const isControlled = value !== undefined;
  const [internal, setInternal] = useState<number>(defaultMonths ?? minMonths);
  const months = isControlled ? (value as number) : internal;

  const handleChange = (next: number) => {
    if (!isControlled) setInternal(next);
    onChange?.(next);
  };

  const fillPct =
    maxMonths === minMonths
      ? 0
      : Math.max(
          0,
          Math.min(100, ((months - minMonths) / (maxMonths - minMonths)) * 100),
        );

  const renderInlineBadge = showBadge && !floatingBadge;
  const showHeaderRow = showLabel || renderInlineBadge;

  const maxWidthStyle =
    sliderMaxWidth !== undefined
      ? {
          maxWidth:
            typeof sliderMaxWidth === "number"
              ? `${sliderMaxWidth}px`
              : sliderMaxWidth,
        }
      : undefined;

  return (
    <div className={cn("space-y-4", className)}>
      {showHeaderRow && (
        <div className="flex justify-between items-center">
          {showLabel ? (
            <label className="text-sm font-bold text-slate-700">{label}</label>
          ) : (
            <span />
          )}
          {renderInlineBadge && (
            <span className="text-sm font-bold text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full whitespace-nowrap">
              {months} {unitLabel}
            </span>
          )}
        </div>
      )}

      <div
        className={cn("relative", floatingBadge ? "pt-12 pb-4" : "py-4")}
        style={maxWidthStyle}
      >
        {floatingBadge && (
          <span
            className="absolute top-1 -translate-x-1/2 text-sm font-bold text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full whitespace-nowrap shadow-sm transition-[left]"
            style={{ left: `${fillPct}%` }}
          >
            {months} {unitLabel}
          </span>
        )}
        <div className="h-1.5 bg-slate-200 rounded-full w-full" />
        <div
          className="absolute left-0 h-1.5 bg-emerald-600 rounded-full transition-[width]"
          style={{
            width: `${fillPct}%`,
            top: floatingBadge ? "calc(48px + 16px)" : "50%",
            transform: floatingBadge ? "translateY(-50%)" : "translateY(-50%)",
          }}
        />
        <div
          className="absolute h-5 w-5 bg-white border-2 border-emerald-600 rounded-full shadow-md pointer-events-none"
          style={{
            left: `calc(${fillPct}% - 10px)`,
            top: floatingBadge ? "calc(48px + 16px)" : "50%",
            transform: "translateY(-50%)",
          }}
        />
        <input
          type="range"
          min={minMonths}
          max={maxMonths}
          value={months}
          onChange={(e) => handleChange(Number(e.target.value))}
          aria-label={label}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer print:hidden"
        />
      </div>

      <div
        className="flex justify-between text-[10px] font-bold text-slate-400 uppercase tracking-wider"
        style={maxWidthStyle}
      >
        <span>{minMonths} {unitLabel}</span>
        <span>{maxMonths} {unitLabel}</span>
      </div>
    </div>
  );
}
