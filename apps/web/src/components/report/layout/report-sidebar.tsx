"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronDown, ChevronRight } from "lucide-react";
import { SECTION_GROUPS, REPORT_SECTIONS, getSectionHref } from "@/lib/report/sections";
import type { ReportSectionGroup } from "@/types/report";
import { cn } from "@/lib/utils";

interface ReportSidebarProps {
  reportId: string;
  className?: string;
}

export function ReportSidebar({ reportId, className }: ReportSidebarProps) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState<Set<ReportSectionGroup>>(new Set());

  function toggleGroup(group: ReportSectionGroup) {
    setCollapsed((prev) => {
      const next = new Set(prev);
      next.has(group) ? next.delete(group) : next.add(group);
      return next;
    });
  }

  return (
    <nav
      aria-label="Secciones del informe"
      className={cn("flex flex-col gap-0.5 py-3", className)}
    >
      {SECTION_GROUPS.map((group) => {
        const isCollapsed = collapsed.has(group.id);
        const sections = REPORT_SECTIONS.filter((s) =>
          group.sections.includes(s.id)
        );
        const isGroupActive = sections.some((s) =>
          pathname.includes(`/${s.id}`)
        );

        return (
          <div key={group.id}>
            {/* Group toggle */}
            <button
              type="button"
              onClick={() => toggleGroup(group.id)}
              className={cn(
                "w-full flex items-center justify-between px-4 py-2 text-[11px] font-semibold uppercase tracking-wider transition-colors",
                isGroupActive ? "text-forest-700" : "text-slate-400 hover:text-slate-600"
              )}
            >
              {group.label}
              {isCollapsed ? (
                <ChevronRight size={11} className="flex-shrink-0" />
              ) : (
                <ChevronDown size={11} className="flex-shrink-0" />
              )}
            </button>

            {/* Section links */}
            {!isCollapsed && (
              <ul className="mb-1">
                {sections.map((section) => {
                  const href = getSectionHref(reportId, section.id);
                  const isActive = pathname.endsWith(`/${section.id}`);

                  return (
                    <li key={section.id}>
                      <Link
                        href={href}
                        aria-current={isActive ? "page" : undefined}
                        className={cn(
                          "flex items-center gap-3 px-3 py-2 mx-2 rounded-lg text-sm transition-colors",
                          isActive
                            ? "bg-forest-700/10 text-forest-700 font-semibold"
                            : "text-slate-600 hover:bg-slate-100 hover:text-slate-800"
                        )}
                      >
                        <span
                          className={cn(
                            "flex-shrink-0 w-5 h-5 rounded-full text-[10px] font-bold flex items-center justify-center leading-none",
                            isActive
                              ? "bg-forest-700 text-white"
                              : "bg-slate-200 text-slate-500"
                          )}
                        >
                          {section.number}
                        </span>
                        <span className="truncate">{section.shortLabel}</span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        );
      })}
    </nav>
  );
}
