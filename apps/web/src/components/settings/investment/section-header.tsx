import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export interface SectionHeaderProps {
  icon: ReactNode;
  title: string;
  /** Optional right-aligned content (e.g. ON/OFF toggle on Market sections) */
  rightSlot?: ReactNode;
  className?: string;
}

/**
 * Uniform section header used inside every card on the Investment
 * Requirements page. Single source of truth for spacing + divider so
 * all sections read identically.
 *
 * `rightSlot` is reserved for inline controls that belong to the section
 * itself (e.g. master ON/OFF for ADR / OCC Forecast Growth on the Hotel
 * Market tab) — kept out of the title row when omitted to preserve the
 * default minimal look on Asset-tab sections.
 */
export function SectionHeader({
  icon,
  title,
  rightSlot,
  className,
}: SectionHeaderProps) {
  return (
    <div
      className={cn(
        "mb-7 flex items-center justify-between gap-3 border-b border-slate-200 pb-4",
        className,
      )}
    >
      <div className="flex items-center gap-3">
        <span className="text-forest-700">{icon}</span>
        <h2 className="font-headline text-lg font-bold text-forest-900 md:text-xl">
          {title}
        </h2>
      </div>
      {rightSlot}
    </div>
  );
}
