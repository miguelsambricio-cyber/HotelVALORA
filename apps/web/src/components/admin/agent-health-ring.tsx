import { cn } from "@/lib/utils";
import { getStatusVisual, type AgentStatus } from "@/lib/admin/agents";

export interface AgentHealthRingProps {
  /** 0–100 */
  score: number;
  status: AgentStatus;
  size?: number;
  thickness?: number;
  showLabel?: boolean;
  className?: string;
}

/**
 * SVG ring with stroke-dasharray progress. Inner label shows the score
 * + a one-line status hint. Status color comes from the same contract
 * as the badge — ring stays coherent across the whole AI Ops surface.
 */
export function AgentHealthRing({
  score,
  status,
  size = 132,
  thickness = 8,
  showLabel = true,
  className,
}: AgentHealthRingProps) {
  const visual = getStatusVisual(status);
  const clamped = Math.max(0, Math.min(100, score));
  const radius = (size - thickness) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - clamped / 100);
  const center = size / 2;

  return (
    <div
      className={cn("relative inline-flex items-center justify-center", className)}
      style={{ width: size, height: size }}
      role="img"
      aria-label={`Health ${clamped} of 100, status ${visual.label}`}
    >
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="-rotate-90"
        aria-hidden
      >
        <circle
          cx={center}
          cy={center}
          r={radius}
          stroke="currentColor"
          strokeWidth={thickness}
          fill="none"
          className="text-slate-200"
        />
        <circle
          cx={center}
          cy={center}
          r={radius}
          strokeWidth={thickness}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className={visual.ringClass}
        />
      </svg>
      {showLabel && (
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
          <span className="font-headline text-2xl font-extrabold tracking-tighter text-forest-900">
            {clamped}
          </span>
          <span className="font-headline text-[9px] font-bold uppercase tracking-widest text-slate-500">
            {visual.label}
          </span>
        </div>
      )}
    </div>
  );
}
