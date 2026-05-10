import { cn } from "@/lib/utils";
import { MATCH_TIER_LABELS, type MatchTier } from "@/lib/investment";

export interface MatchIndicatorProps {
  tier: MatchTier;
  /** Optional score 0..1 — rendered as percentage next to the label */
  score?: number;
  size?: "sm" | "md";
  className?: string;
}

const TIER_STYLES: Record<MatchTier, { dot: string; text: string; bg: string; border: string }> = {
  strong: {
    dot: "bg-emerald-500",
    text: "text-emerald-700",
    bg: "bg-emerald-50",
    border: "border-emerald-200",
  },
  partial: {
    dot: "bg-yellow-400",
    text: "text-yellow-800",
    bg: "bg-yellow-50",
    border: "border-yellow-200",
  },
  weak: {
    dot: "bg-red-500",
    text: "text-red-700",
    bg: "bg-red-50",
    border: "border-red-200",
  },
};

/**
 * 🟢🟡🔴 placeholder primitive for the future match-engine surface.
 * Not used by the Investment Requirements page itself — but every
 * downstream report (Executive Summary, Asset Analysis, Deal Screening)
 * will render this inline next to candidate hotels.
 */
export function MatchIndicator({
  tier,
  score,
  size = "md",
  className,
}: MatchIndicatorProps) {
  const styles = TIER_STYLES[tier];
  const padding = size === "sm" ? "px-2 py-0.5 text-[10px]" : "px-2.5 py-1 text-xs";
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border font-bold uppercase tracking-wider",
        styles.bg,
        styles.text,
        styles.border,
        padding,
        className,
      )}
    >
      <span className={cn("h-1.5 w-1.5 rounded-full", styles.dot)} />
      {MATCH_TIER_LABELS[tier]}
      {score !== undefined && (
        <span className="ml-0.5 opacity-70">{Math.round(score * 100)}%</span>
      )}
    </span>
  );
}
