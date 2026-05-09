import { cn } from "@/lib/utils";
import type { ProjectStatus } from "@/lib/report/projects-data";

export interface StatusBadgeProps {
  status: ProjectStatus;
  className?: string;
}

const STATUS_STYLES: Record<ProjectStatus, string> = {
  Complete: "bg-emerald-100 text-emerald-700 border-emerald-200",
  "Under Construction": "bg-blue-100 text-blue-700 border-blue-200",
};

/**
 * Pill rendered inside the STATUS column of `ProjectsTable`. Emerald for
 * completed projects, blue for under-construction. Tone choices match the
 * Stitch reference and the institutional palette already used for tags.
 */
export function StatusBadge({ status, className }: StatusBadgeProps) {
  return (
    <span
      className={cn(
        "px-2 py-1 text-[10px] font-bold uppercase rounded-full border whitespace-nowrap",
        STATUS_STYLES[status],
        className,
      )}
    >
      {status}
    </span>
  );
}
