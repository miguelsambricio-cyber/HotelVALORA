import { cn } from "@/lib/utils";

export interface InsightBadgeProps {
  children: React.ReactNode;
  className?: string;
}

/**
 * Small uppercase pill rendered top-right of every insight / investment card
 * (e.g. "Country Insight", "Investment Market Insight").
 */
export function InsightBadge({ children, className }: InsightBadgeProps) {
  return (
    <span
      className={cn(
        "text-[10px] font-bold tracking-widest text-emerald-800 bg-emerald-50 px-2 py-1 rounded-full uppercase border border-emerald-100 text-right leading-tight whitespace-pre-line",
        "print:text-[6px] print:px-1 print:py-0.5 print:rounded-sm print:tracking-wider",
        className,
      )}
    >
      {children}
    </span>
  );
}
