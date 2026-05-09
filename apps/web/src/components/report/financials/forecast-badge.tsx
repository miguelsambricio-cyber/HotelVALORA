import { cn } from "@/lib/utils";

export type ForecastBadgeTone = "up" | "down" | "neutral";

export interface ForecastBadgeProps {
  /** Pre-formatted text (e.g. "+8.4%", "-2.1%", "+3pp") */
  text: string;
  tone?: ForecastBadgeTone;
  /** Stronger styling for emphasized rows (RevPAR, totals) */
  strong?: boolean;
  className?: string;
}

const TONE_CLASSES: Record<ForecastBadgeTone, { regular: string; strong: string }> = {
  up: {
    regular: "text-blue-500",
    strong: "text-blue-600 font-semibold",
  },
  down: {
    regular: "text-red-500",
    strong: "text-red-600 font-semibold",
  },
  neutral: {
    regular: "text-slate-400",
    strong: "text-slate-500 font-semibold",
  },
};

/**
 * Small inline pill that sits to the right of a year cell to show the
 * year-over-year change ("+8.4%", "+3pp", etc.). Tone derives from the
 * sign of the delta — handled at the call site so this component stays
 * format-agnostic.
 */
export function ForecastBadge({
  text,
  tone = "up",
  strong = false,
  className,
}: ForecastBadgeProps) {
  const palette = TONE_CLASSES[tone];
  return (
    <span
      className={cn(
        "ml-1 text-xs print:text-[7px] print:ml-0.5",
        strong ? palette.strong : palette.regular,
        className,
      )}
    >
      {text}
    </span>
  );
}
