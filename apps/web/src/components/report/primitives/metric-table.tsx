import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export interface MetricTableProps {
  /** Optional caption shown above the row block */
  caption?: ReactNode;
  /** Density: row vertical spacing */
  density?: "compact" | "default" | "comfortable";
  children: ReactNode;
  className?: string;
}

const DENSITY_CLASS: Record<NonNullable<MetricTableProps["density"]>, string> = {
  compact: "[&>*]:py-1",
  default: "[&>*]:py-1.5",
  comfortable: "[&>*]:py-2.5",
};

export function MetricTable({
  caption,
  density = "default",
  children,
  className,
}: MetricTableProps) {
  return (
    <div className={cn("w-full text-xs", className)}>
      {caption && (
        <div className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
          {caption}
        </div>
      )}
      <div className={cn("flex flex-col", DENSITY_CLASS[density])}>{children}</div>
    </div>
  );
}
