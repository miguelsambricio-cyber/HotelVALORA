import { Edit3, EyeOff, Flame } from "lucide-react";
import type { ReportIndicators, ReportTypeBadge } from "@/types/library";
import { cn } from "@/lib/utils";

const CHIP_STYLES: Record<ReportTypeBadge, string> = {
  Premium: "bg-slate-900 text-lime-300",
  PRO: "bg-blue-700 text-white",
  Public: "border border-slate-900 bg-white text-slate-900",
  Private: "border border-blue-600 bg-white text-blue-600",
};

export interface ReportTypeChipProps {
  type: ReportTypeBadge;
  indicators?: ReportIndicators;
}

/**
 * Report type chip + auxiliary indicators (top promote / user modified
 * / private). Two glyphs are reserved for the marketplace metadata that
 * lives alongside the chip: 🔥 for an active promotion and ✏ for a
 * report a user has edited on top of the auto-generation. 🚫-style icon
 * for private reports.
 */
export function ReportTypeChip({ type, indicators }: ReportTypeChipProps) {
  return (
    <div className="flex items-center gap-1.5">
      <span
        className={cn(
          "inline-flex h-[20px] items-center rounded px-1.5 font-headline text-[10px] font-bold uppercase tracking-tighter shadow-sm",
          CHIP_STYLES[type],
        )}
      >
        {type}
      </span>
      {indicators?.topPromote && (
        <Flame
          size={14}
          aria-label="Top Promote"
          className="text-blue-600"
        />
      )}
      {indicators?.userModified && (
        <Edit3
          size={14}
          aria-label="User-modified report"
          className="text-blue-600"
        />
      )}
      {indicators?.private && (
        <EyeOff
          size={14}
          aria-label="Private report"
          className="text-blue-500"
        />
      )}
    </div>
  );
}
