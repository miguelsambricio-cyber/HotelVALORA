import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export interface SectionHeaderProps {
  icon: ReactNode;
  title: string;
  className?: string;
}

/**
 * Uniform section header used inside every card on the Investment
 * Requirements page. Single source of truth for spacing + divider so
 * all 6 sections read identically.
 */
export function SectionHeader({ icon, title, className }: SectionHeaderProps) {
  return (
    <div
      className={cn(
        "mb-7 flex items-center gap-3 border-b border-slate-200 pb-4",
        className,
      )}
    >
      <span className="text-forest-700">{icon}</span>
      <h2 className="font-headline text-lg font-bold text-forest-900 md:text-xl">
        {title}
      </h2>
    </div>
  );
}
