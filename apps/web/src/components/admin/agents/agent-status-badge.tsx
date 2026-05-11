import { cn } from "@/lib/utils";
import { getStatusVisual, type AgentStatus } from "@/lib/admin/agents";

export interface AgentStatusBadgeProps {
  status: AgentStatus;
  label?: string;
  size?: "sm" | "md";
  className?: string;
}

/**
 * Pill-shaped status indicator. Dot + label. Visual contract per
 * `lib/admin/agents/status.ts`. Inherits HOTELVALORA typography
 * (font-headline, uppercase, tracked-out for the small variant).
 */
export function AgentStatusBadge({
  status,
  label,
  size = "md",
  className,
}: AgentStatusBadgeProps) {
  const v = getStatusVisual(status);
  const text = label ?? v.label;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full font-headline font-bold",
        v.badgeClass,
        size === "sm"
          ? "px-2 py-0.5 text-[10px] uppercase tracking-widest"
          : "px-2.5 py-1 text-[11px] uppercase tracking-widest",
        className,
      )}
    >
      <span aria-hidden className="text-[10px] leading-none">{v.dot}</span>
      {text}
    </span>
  );
}
