"use client";

import { PlusCircle, Search } from "lucide-react";
import { toast } from "sonner";
import { useLibraryStore } from "@/lib/library/store";
import { MapLegendCard } from "./map-legend-card";
import { LibraryFilterTabs } from "./library-filter-tabs";

/**
 * Left sidebar of /library/favorites-map.
 *
 *   ┌─ Title ─────────────────────────────────┐
 *   │ FAVORITOS                               │
 *   │ Access your saved hotel valuations …    │
 *   ├─ Legend card ───────────────────────────┤
 *   │ • Saved Reports / Comunidad / Top …     │
 *   │ ─                                       │
 *   │ • Heatmap / Líneas de Metro / Centro …  │
 *   ├─ Quick filter ──────────────────────────┤
 *   │ [Search saved hotels…]                  │
 *   │ [FAVORITOS] [TOP]                       │
 *   ├─ ⋮ pushed-bottom CTA ───────────────────┤
 *   │ [+ Create New Valuation]                │
 *   └─────────────────────────────────────────┘
 *
 * The bottom CTA is a mock action today — emits a sonner toast. Future
 * iteration: open a flyout offering "New blank valuation / Upload Excel
 * / Import CoStar / Underwriting workflow".
 */
export function LibrarySidebar() {
  const searchQuery = useLibraryStore((s) => s.searchQuery);
  const setSearchQuery = useLibraryStore((s) => s.setSearchQuery);

  return (
    <aside className="z-20 flex w-full flex-col gap-4 overflow-y-auto border-r border-slate-200 bg-white p-5 shadow-xl md:w-[264px] md:shrink-0 lg:w-[288px]">
      <header>
        <h1 className="font-headline text-2xl font-extrabold uppercase tracking-tight text-forest-900">
          Favoritos
        </h1>
        <p className="mt-1.5 text-[13px] leading-snug text-slate-600">
          Access your hotel valuations and collaborative insights
        </p>
      </header>

      <MapLegendCard />

      <div className="flex flex-col gap-3">
        <div className="flex flex-col gap-1.5">
          <label
            htmlFor="library-search"
            className="text-[10px] font-bold uppercase tracking-widest text-slate-500"
          >
            Quick Filter
          </label>
          <div className="relative">
            <Search
              size={14}
              aria-hidden
              className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
              id="library-search"
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search saved hotels..."
              className="w-full rounded-lg border-none bg-slate-100 py-2 pl-8 pr-3 text-[13px] placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-700/20"
            />
          </div>
        </div>

        <LibraryFilterTabs />
      </div>

      <div className="mt-auto flex flex-col gap-2 border-t border-slate-200 pt-4">
        <button
          type="button"
          onClick={() =>
            toast.info("New valuation flow coming soon", {
              description:
                "Upload Excel · Import CoStar · Underwriting workflow",
            })
          }
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-blue-700 py-2.5 font-headline text-[13px] font-bold text-white transition-opacity hover:opacity-90 active:scale-[0.99]"
        >
          <PlusCircle size={14} aria-hidden />
          Create New Valuation
        </button>
      </div>
    </aside>
  );
}
