"use client";

import { cn } from "@/lib/utils";

export interface ProfileCompletionCardProps {
  /** 0..1 ratio of completed required fields */
  ratio: number;
  className?: string;
}

/**
 * Small floating card surfacing how complete the user's institutional
 * profile is. Lives next to the SettingsHeader on desktop (right side
 * of the title) and stacks below the title on mobile.
 *
 * The percentage is derived from the live profile store — re-renders as
 * the user fills fields without any wiring at the consumer.
 */
export function ProfileCompletionCard({
  ratio,
  className,
}: ProfileCompletionCardProps) {
  const percent = Math.round(Math.max(0, Math.min(1, ratio)) * 100);
  return (
    <div
      className={cn(
        "w-full rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_8px_24px_rgba(0,51,30,0.04)]",
        "md:w-80",
        className,
      )}
    >
      <div className="mb-2 flex items-center justify-between">
        <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">
          Institutional Profile
        </span>
        <span className="text-xs font-extrabold text-forest-900">{percent}%</span>
      </div>
      <p className="mb-3 text-xs text-slate-500">Complete your credentials</p>
      <div
        role="progressbar"
        aria-valuenow={percent}
        aria-valuemin={0}
        aria-valuemax={100}
        className="h-2 w-full overflow-hidden rounded-full bg-slate-100"
      >
        <div
          className="h-full rounded-full bg-yellow-400 transition-all duration-500 ease-out"
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}
