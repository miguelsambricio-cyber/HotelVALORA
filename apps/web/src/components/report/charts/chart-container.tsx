import type { ReactNode } from "react";
import { AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface ChartContainerProps {
  title: string;
  subtitle?: string;
  /** Data origin attribution */
  source?: string;
  isLoading?: boolean;
  error?: string;
  /** Pixel height of the chart body area (default 280) */
  height?: number;
  className?: string;
  children: ReactNode;
}

export function ChartContainer({
  title,
  subtitle,
  source,
  isLoading = false,
  error,
  height = 280,
  className,
  children,
}: ChartContainerProps) {
  return (
    <div
      className={cn(
        "bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm print:shadow-none print:border-slate-300",
        className
      )}
    >
      {/* Header */}
      <div className="px-5 pt-5 pb-3 border-b border-slate-100">
        <h3 className="text-sm font-semibold text-slate-800 leading-none">{title}</h3>
        {subtitle && (
          <p className="text-xs text-slate-400 mt-1.5">{subtitle}</p>
        )}
      </div>

      {/* Chart body */}
      <div className="relative px-5 py-4" style={{ height }}>
        {isLoading && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/80">
            <div className="w-8 h-8 rounded-full border-2 border-forest-700/30 border-t-forest-700 animate-spin" />
          </div>
        )}

        {error ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-red-500">
            <AlertCircle size={22} />
            <p className="text-xs font-medium">{error}</p>
          </div>
        ) : (
          children
        )}
      </div>

      {/* Source */}
      {source && (
        <div className="px-5 pb-4">
          <p className="text-[10px] font-medium uppercase tracking-wide text-slate-300">
            Fuente: {source}
          </p>
        </div>
      )}
    </div>
  );
}
