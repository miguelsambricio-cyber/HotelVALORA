"use client";

import { cn } from "@/lib/utils";
import { useLibraryStore } from "@/lib/library/store";
import type { LibraryFilterTab } from "@/types/library";

const TABS: { id: LibraryFilterTab; label: string }[] = [
  { id: "favoritos", label: "FAVORITOS" },
  { id: "top", label: "TOP" },
];

/**
 * Two-button segmented filter sitting underneath the search input.
 * Reads & writes the active tab via the library store so the rest of
 * the page (map markers, side lists) can react without prop drilling.
 */
export function LibraryFilterTabs() {
  const filterTab = useLibraryStore((s) => s.filterTab);
  const setFilterTab = useLibraryStore((s) => s.setFilterTab);

  return (
    <div className="flex gap-2" role="tablist" aria-label="Library filter">
      {TABS.map((tab) => {
        const active = tab.id === filterTab;
        return (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => setFilterTab(tab.id)}
            className={cn(
              "flex-1 rounded-lg border py-2 font-headline text-[10px] font-black uppercase tracking-widest transition-colors",
              active
                ? "border-slate-900 bg-slate-900 text-white"
                : "border-slate-200 bg-white text-slate-900 hover:bg-slate-50",
            )}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}
