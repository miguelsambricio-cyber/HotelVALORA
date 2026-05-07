import type { ReactNode } from "react";
import type { ReportSection } from "@/types/report";
import { cn } from "@/lib/utils";

interface SectionWrapperProps {
  section: ReportSection;
  children: ReactNode;
  className?: string;
}

export function SectionWrapper({ section, children, className }: SectionWrapperProps) {
  return (
    <article
      id={`section-${section.id}`}
      className={cn(
        "min-h-full",
        section.printPageBreak && "print:break-before-page",
        className
      )}
    >
      {/* Section title bar */}
      <div className="px-8 py-5 border-b border-slate-200 bg-white print:py-4">
        <div className="flex items-center gap-4">
          <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-forest-700 flex items-center justify-center">
            <span className="text-[11px] font-bold text-white leading-none">
              {section.number}
            </span>
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900 leading-none">
              {section.label}
            </h2>
            <p className="text-xs text-slate-400 mt-1">{section.description}</p>
          </div>
        </div>
      </div>

      {/* Content area */}
      <div className="px-8 py-8 print:px-6 print:py-6">
        {children}
      </div>
    </article>
  );
}
