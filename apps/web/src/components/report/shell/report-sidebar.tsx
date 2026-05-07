"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { REPORT_NAV_ITEMS } from "@/lib/report/report-nav";
import { cn } from "@/lib/utils";

// Matches the Stitch sidebar exactly — sticky, w-64, hidden on mobile.
export function ReportSidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-64 hidden lg:block shrink-0 sticky top-28 self-start max-h-[calc(100vh-8rem)] overflow-y-auto print:hidden bg-slate-100/80 rounded-2xl p-5 border border-slate-200 shadow-sm">
      <div className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-4 px-2">
        Navigation
      </div>

      <nav className="space-y-2">
        {REPORT_NAV_ITEMS.map((item) => {
          const isActive = pathname === item.href;
          const label = `${item.number}. ${item.label}`;

          if (item.subItems && item.subItems.length > 0) {
            return (
              <div key={item.number} className="space-y-1">
                <Link
                  href={item.href}
                  className={cn(
                    "flex items-center px-3 py-2 text-sm font-bold font-headline rounded-lg transition-colors",
                    isActive
                      ? "text-emerald-900 bg-emerald-100/50 shadow-sm"
                      : "text-slate-600 hover:text-emerald-900 hover:bg-slate-200/50"
                  )}
                >
                  {label}
                </Link>
                <div className="flex flex-col gap-1.5 pl-4 ml-3 border-l-2 border-slate-200">
                  {item.subItems.map((sub) => (
                    <Link
                      key={sub.label}
                      href={sub.href}
                      className="text-xs font-semibold text-slate-500 hover:text-emerald-800 transition-colors"
                    >
                      {sub.label}
                    </Link>
                  ))}
                </div>
              </div>
            );
          }

          return (
            <Link
              key={item.number}
              href={item.href}
              className={cn(
                "flex items-center px-3 py-2 text-sm font-bold font-headline rounded-lg transition-colors",
                isActive
                  ? "text-emerald-900 bg-emerald-100/50 shadow-sm"
                  : "text-slate-600 hover:text-emerald-900 hover:bg-slate-200/50"
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
