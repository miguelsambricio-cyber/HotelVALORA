import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export interface MetricRowProps {
  /** Left-column label */
  label: ReactNode;
  /** Right-column value (string, number, or any node) */
  value: ReactNode;
  /** Optional smaller line below the label */
  sublabel?: ReactNode;
  /** Optional smaller line below the value */
  subvalue?: ReactNode;
  /** Italic, muted styling — used for secondary comparables */
  muted?: boolean;
  /** Emerald-tinted highlighted row — used for headline metrics */
  highlight?: boolean;
  /** Bold separator below this row */
  separator?: "none" | "light" | "strong";
  /** Custom className applied to the row */
  className?: string;
}

const SEPARATOR_CLASS: Record<NonNullable<MetricRowProps["separator"]>, string> = {
  none: "",
  light: "border-b border-slate-100",
  strong: "border-b border-slate-300",
};

export function MetricRow({
  label,
  value,
  sublabel,
  subvalue,
  muted,
  highlight,
  separator = "light",
  className,
}: MetricRowProps) {
  return (
    <div
      className={cn(
        "flex items-baseline justify-between py-1.5 gap-3",
        SEPARATOR_CLASS[separator],
        highlight && "bg-emerald-50/50 px-2 -mx-2 rounded-sm",
        muted && "italic text-slate-400",
        className,
      )}
    >
      <div className="min-w-0 flex-1">
        <div className="text-xs font-bold uppercase tracking-wider text-slate-500">{label}</div>
        {sublabel && (
          <div className="text-[10px] text-slate-400 mt-0.5">{sublabel}</div>
        )}
      </div>
      <div className="text-right shrink-0">
        <div
          className={cn(
            "text-sm tabular-nums",
            highlight ? "text-xl font-extrabold text-forest-900" : "font-semibold text-slate-700",
          )}
        >
          {value}
        </div>
        {subvalue && (
          <div className="text-[10px] text-slate-400 mt-0.5">{subvalue}</div>
        )}
      </div>
    </div>
  );
}
