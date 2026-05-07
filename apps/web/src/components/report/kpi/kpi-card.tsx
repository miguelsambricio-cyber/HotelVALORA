import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import type { KPIValue } from "@/types/report";
import { cn } from "@/lib/utils";

interface KPICardProps extends KPIValue {
  isLoading?: boolean;
  className?: string;
}

const TREND_STYLES = {
  up:   { icon: TrendingUp,   badge: "text-emerald-600 bg-emerald-50"  },
  down: { icon: TrendingDown, badge: "text-red-500    bg-red-50"       },
  flat: { icon: Minus,        badge: "text-slate-400  bg-slate-100"    },
} as const;

const VARIANT_BORDER = {
  default:  "border-slate-200",
  positive: "border-l-4 border-l-emerald-400 border-slate-200",
  negative: "border-l-4 border-l-red-400    border-slate-200",
  warning:  "border-l-4 border-l-amber-400  border-slate-200",
} as const;

export function KPICard({
  label,
  value,
  unit,
  prefix,
  formattedValue,
  change,
  trend,
  period,
  benchmark,
  benchmarkLabel = "Benchmark",
  sublabel,
  variant = "default",
  isLoading = false,
  className,
}: KPICardProps) {
  if (isLoading) {
    return (
      <div
        className={cn(
          "bg-white rounded-2xl border border-slate-200 p-5 animate-pulse",
          className
        )}
      >
        <div className="h-3 w-20 bg-slate-200 rounded mb-4" />
        <div className="h-7 w-28 bg-slate-200 rounded mb-3" />
        <div className="h-2.5 w-16 bg-slate-100 rounded" />
      </div>
    );
  }

  const displayValue =
    formattedValue ?? `${prefix ?? ""}${value}${unit ? ` ${unit}` : ""}`;

  const trendStyle = trend ? TREND_STYLES[trend] : null;
  const TrendIcon = trendStyle?.icon;

  return (
    <div
      className={cn(
        "bg-white rounded-2xl border p-5 flex flex-col gap-2 print:rounded-lg print:shadow-none",
        VARIANT_BORDER[variant],
        className
      )}
    >
      {/* Label row */}
      <div className="flex items-center justify-between gap-2">
        <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider leading-none">
          {label}
        </p>
        {period && (
          <span className="text-[10px] text-slate-300 font-medium">{period}</span>
        )}
      </div>

      {/* Main value */}
      <p className="text-2xl font-bold text-slate-900 tabular-nums leading-none tracking-tight">
        {displayValue}
      </p>

      {/* Footer row */}
      <div className="flex items-center justify-between gap-2 mt-auto pt-1">
        <div className="flex items-center gap-1.5 flex-wrap">
          {trendStyle && TrendIcon && change !== undefined && (
            <span
              className={cn(
                "inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[11px] font-semibold",
                trendStyle.badge
              )}
            >
              <TrendIcon size={11} />
              {change > 0 ? "+" : ""}
              {change.toFixed(1)}%
            </span>
          )}
          {sublabel && (
            <span className="text-xs text-slate-400">{sublabel}</span>
          )}
        </div>

        {benchmark !== undefined && (
          <div className="text-right flex-shrink-0">
            <p className="text-[10px] text-slate-300 font-medium leading-none">
              {benchmarkLabel}
            </p>
            <p className="text-xs font-semibold text-slate-500 mt-0.5">
              {prefix}{benchmark}{unit ? ` ${unit}` : ""}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
