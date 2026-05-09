"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { REPORT_SECTIONS, getSectionHref } from "@/lib/report/sections";
import type { ReportSubItem } from "@/types/report";
import { cn } from "@/lib/utils";

// Sidebar driven by the canonical sections.ts registry. The Stitch visual
// (sticky panel, glass card, numbered top-level + indented sub-anchors) is
// preserved exactly. Adding a new top-level link is a one-line registry edit.

function resolveSubHref(parentHref: string, sub: ReportSubItem): string {
  // Absolute paths and full URLs pass through; bare hashes are resolved
  // against the parent section href.
  if (sub.href.startsWith("/") || sub.href.startsWith("http")) return sub.href;
  if (sub.href.startsWith("#")) return `${parentHref}${sub.href}`;
  return sub.href;
}

/**
 * Returns the index of the active sub-item, or -1 when none is active.
 *
 *   1. Prefer a sub-route (no hash) whose path matches the current pathname —
 *      this is the deterministic case (Asset Analysis: Hotel personalizado /
 *      CAPEX live on different routes).
 *   2. Otherwise, fall back to the FIRST hash-anchor sub-item whose parent
 *      path matches the current pathname. This avoids highlighting every
 *      hash-anchor at once on pages where all sub-items share the same route
 *      (Market Overview: #country / #market / #submarket / #class all live
 *      on /report/market-overview). Without scroll-spy, the first sub-anchor
 *      is the institutional default.
 */
function getActiveSubIdx(
  currentPath: string,
  parentHref: string,
  subItems: ReportSubItem[],
): number {
  for (let i = 0; i < subItems.length; i++) {
    const resolved = resolveSubHref(parentHref, subItems[i]);
    const [pathPart, hash] = resolved.split("#");
    if (!hash && currentPath === pathPart) return i;
  }
  for (let i = 0; i < subItems.length; i++) {
    const resolved = resolveSubHref(parentHref, subItems[i]);
    const [pathPart, hash] = resolved.split("#");
    if (hash && currentPath === pathPart) return i;
  }
  return -1;
}

export function ReportSidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-64 hidden lg:block shrink-0 sticky top-28 self-start max-h-[calc(100vh-8rem)] overflow-y-auto print:hidden bg-slate-100/80 rounded-2xl p-5 border border-slate-200 shadow-sm">
      <div className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-4 px-2">
        Navigation
      </div>

      <nav className="space-y-2">
        {REPORT_SECTIONS.map((section) => {
          const sectionHref = getSectionHref(section.id);
          // Top-level highlight when the path matches the section route
          // exactly OR when any sub-route under the section is active.
          const isExact = pathname === sectionHref;
          const isUnder =
            pathname.startsWith(`${sectionHref}/`) ||
            (section.subItems?.some((s) =>
              pathname === resolveSubHref(sectionHref, s).split("#")[0],
            ) ??
              false);
          const isActive = isExact || isUnder;
          const label = `${section.number}. ${section.label}`;

          if (section.subItems && section.subItems.length > 0) {
            const activeSubIdx = getActiveSubIdx(
              pathname,
              sectionHref,
              section.subItems,
            );

            return (
              <div key={section.id} className="space-y-1">
                <Link
                  href={sectionHref}
                  className={cn(
                    "flex items-center px-3 py-2 text-sm font-bold font-headline rounded-lg transition-colors",
                    isActive
                      ? "text-emerald-900 bg-emerald-100/50 shadow-sm"
                      : "text-slate-600 hover:text-emerald-900 hover:bg-slate-200/50",
                  )}
                >
                  {label}
                </Link>
                <div className="flex flex-col gap-1.5 pl-4 ml-3 border-l-2 border-slate-200">
                  {section.subItems.map((sub, idx) => {
                    const resolved = resolveSubHref(sectionHref, sub);
                    const subActive = idx === activeSubIdx;
                    return (
                      <Link
                        key={sub.href}
                        href={resolved}
                        className={cn(
                          "text-xs transition-colors",
                          subActive
                            ? "text-emerald-900 font-bold"
                            : "text-slate-500 font-semibold hover:text-emerald-800",
                        )}
                      >
                        {sub.label}
                      </Link>
                    );
                  })}
                </div>
              </div>
            );
          }

          return (
            <Link
              key={section.id}
              href={sectionHref}
              className={cn(
                "flex items-center px-3 py-2 text-sm font-bold font-headline rounded-lg transition-colors",
                isActive
                  ? "text-emerald-900 bg-emerald-100/50 shadow-sm"
                  : "text-slate-600 hover:text-emerald-900 hover:bg-slate-200/50",
              )}
            >
              {label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
