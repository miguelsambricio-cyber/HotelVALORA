"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const TABS = [
  {
    id: "favoritos",
    label: "FAVORITOS",
    href: "/library/favorites-map",
    activePaths: ["/library/favorites-map", "/library/favorites-list"],
  },
  {
    id: "top",
    label: "TOP",
    href: "/library/top-map",
    activePaths: ["/library/top-map", "/library/top-list"],
  },
] as const;

/**
 * Two-button segmented navigation sitting underneath the search input.
 * Each tab is a Link — switching tabs swaps the page (favorites-map ↔
 * top-map). Active state is computed from `usePathname()`, so the
 * highlight stays correct after deep-linking, refresh, or back/forward
 * navigation. Shared sidebar legend / layer / search state lives in
 * the library store and persists across the swap.
 */
export function LibraryFilterTabs() {
  const pathname = usePathname();

  return (
    <nav className="flex gap-2" aria-label="Library view">
      {TABS.map((tab) => {
        const active =
          tab.activePaths.some((p) => pathname?.startsWith(p) ?? false) ??
          false;
        return (
          <Link
            key={tab.id}
            href={tab.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex-1 rounded-md border py-1.5 text-center font-headline text-[10px] font-black uppercase tracking-widest transition-colors",
              active
                ? "border-slate-900 bg-slate-900 text-white"
                : "border-slate-200 bg-white text-slate-900 hover:bg-slate-50",
            )}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
