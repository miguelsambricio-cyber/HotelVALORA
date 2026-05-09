"use client";

import { cn } from "@/lib/utils";

export interface ConnectivityStatusBarProps {
  /** Status percentage, 0..100. Defaults to 98.4 (mock). */
  percentage?: number;
  /** Status descriptor (e.g. "System Stable"). */
  label?: string;
  className?: string;
}

/**
 * Subtle institutional connectivity indicator. Mirrors the Stitch
 * "Market Connectivity Status" widget — small label, narrow rail, soft
 * breathing animation. No flashy SaaS bar.
 *
 * Today the percentage is hardcoded; future will read live status from
 * the data ingestion service health-check.
 */
export function ConnectivityStatusBar({
  percentage = 98.4,
  label = "System Stable",
  className,
}: ConnectivityStatusBarProps) {
  const clamped = Math.max(0, Math.min(100, percentage));
  return (
    <div className={cn("flex flex-col items-center gap-2", className)}>
      <div className="flex items-center justify-between gap-3 w-40">
        <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">
          Market Connectivity
        </span>
        <span className="text-[10px] font-bold tracking-wider text-emerald-700">
          {clamped.toFixed(1)}%
        </span>
      </div>
      <div className="relative h-[3px] w-40 overflow-hidden rounded-full bg-slate-100">
        <div
          className="h-full rounded-full bg-emerald-500 connectivity-pulse"
          style={{ width: `${clamped}%` }}
        />
      </div>
      <span className="text-[10px] font-medium uppercase tracking-widest text-slate-400">
        {label}
      </span>

      {/*
        Subtle breathing — slower than Tailwind's animate-pulse so it reads
        as institutional health-check, not a loading spinner.
      */}
      <style jsx>{`
        :global(.connectivity-pulse) {
          animation: connectivity-pulse 3s ease-in-out infinite;
        }
        @keyframes connectivity-pulse {
          0%,
          100% {
            opacity: 0.85;
          }
          50% {
            opacity: 1;
            box-shadow: 0 0 6px rgba(16, 185, 129, 0.45);
          }
        }
      `}</style>
    </div>
  );
}
