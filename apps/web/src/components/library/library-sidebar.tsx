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
    <aside className="z-20 flex w-full flex-col gap-6 overflow-y-auto bg-white p-8 shadow-2xl md:w-[300px] md:shrink-0 lg:w-[320px]">
      <header>
        <h1 className="font-headline text-3xl font-extrabold uppercase tracking-tight text-forest-900">
          Favoritos
        </h1>
        <p className="mt-2 text-sm text-slate-600">
          Access your hotel valuations and collaborative insights
        </p>
      </header>

      <MapLegendCard />

      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <label
            htmlFor="library-search"
            className="text-[10px] font-bold uppercase tracking-widest text-slate-500"
          >
            Quick Filter
          </label>
          <div className="relative">
            <Search
              size={16}
              aria-hidden
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
              id="library-search"
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search saved hotels..."
              className="w-full rounded-xl border-none bg-slate-100 py-3 pl-10 pr-4 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-700/20"
            />
          </div>
        </div>

        <LibraryFilterTabs />
      </div>

      <div className="mt-auto flex flex-col gap-3 border-t border-slate-200 pt-6">
        <button
          type="button"
          onClick={() =>
            toast.info("New valuation flow coming soon", {
              description:
                "Upload Excel · Import CoStar · Underwriting workflow",
            })
          }
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-700 py-4 font-headline font-bold text-white transition-opacity hover:opacity-90 active:scale-[0.99]"
        >
          <PlusCircle size={16} aria-hidden />
          Create New Valuation
        </button>
      </div>
    </aside>
  );
}
