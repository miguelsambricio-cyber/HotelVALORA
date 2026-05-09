import { cn } from "@/lib/utils";

export interface CapexDurationBadgeProps {
  months: number;
  /** Suffix appended after the number (defaults to "meses") */
  unitLabel?: string;
  className?: string;
}

/**
 * Pill that displays the current CAPEX duration. Visually identical to the
 * inline badge inside `CapexTimeline` so both can be used interchangeably —
 * the schedule row layout pulls the badge into a centred column between the
 * slider and the operational toggle.
 */
export function CapexDurationBadge({
  months,
  unitLabel = "meses",
  className,
}: CapexDurationBadgeProps) {
  return (
    <span
      className={cn(
        "text-sm font-bold text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full whitespace-nowrap",
        className,
      )}
    >
      {months} {unitLabel}
    </span>
  );
}
