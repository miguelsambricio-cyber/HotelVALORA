"use client";

import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { getAdjacentSections, getSectionHref } from "@/lib/report/sections";
import type { ReportSectionId } from "@/types/report";
import { cn } from "@/lib/utils";

interface SectionNavProps {
  reportId: string;
  currentSectionId: ReportSectionId;
  className?: string;
}

export function SectionNav({ reportId, currentSectionId, className }: SectionNavProps) {
  const { prev, next } = getAdjacentSections(currentSectionId);

  if (!prev && !next) return null;

  return (
    <div className={cn("flex items-center justify-between pt-8 mt-8 border-t border-slate-200 print:hidden", className)}>
      {prev ? (
        <Link
          href={getSectionHref(reportId, prev.id)}
          className="flex items-center gap-2 text-sm text-slate-500 hover:text-forest-700 transition-colors group"
        >
          <ChevronLeft size={16} className="group-hover:-translate-x-0.5 transition-transform" />
          <span>
            <span className="text-xs text-slate-400 block leading-none mb-0.5">Anterior</span>
            {prev.shortLabel}
          </span>
        </Link>
      ) : (
        <div />
      )}

      {next ? (
        <Link
          href={getSectionHref(reportId, next.id)}
          className="flex items-center gap-2 text-sm text-slate-500 hover:text-forest-700 transition-colors group text-right"
        >
          <span>
            <span className="text-xs text-slate-400 block leading-none mb-0.5">Siguiente</span>
            {next.shortLabel}
          </span>
          <ChevronRight size={16} className="group-hover:translate-x-0.5 transition-transform" />
        </Link>
      ) : (
        <div />
      )}
    </div>
  );
}
