import { cn } from "@/lib/utils";

interface SparklineBarProps {
  /** Values in 0–1 range */
  data: number[];
  className?: string;
}

function barColorClass(normalized: number): string {
  if (normalized >= 0.7) return "bg-emerald-500";
  if (normalized >= 0.4) return "bg-emerald-400";
  if (normalized >= 0.2) return "bg-emerald-300";
  return "bg-emerald-200";
}

export function SparklineBar({ data, className }: SparklineBarProps) {
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 0.001;

  return (
    <div
      className={cn(
        "flex items-end justify-around h-full w-full px-4 pt-6 pb-2",
        className
      )}
    >
      {data.map((v, i) => {
        const normalized = (v - min) / range;
        // Map to 45–90% height band so short bars are still visible
        const heightPct = 45 + normalized * 45;
        return (
          <div
            key={i}
            className={cn("w-2.5 rounded-t-sm", barColorClass(normalized))}
            style={{ height: `${heightPct}%` }}
          />
        );
      })}
    </div>
  );
}
