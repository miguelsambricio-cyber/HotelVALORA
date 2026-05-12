"use client";

import Link from "next/link";
import { Map, Settings, SlidersHorizontal } from "lucide-react";
import { toast } from "sonner";
import type { LibraryReport } from "@/types/library";
import { FavoritesTable } from "./favorites-table";

/**
 * /library/favorites-list main column.
 *
 *   ┌────────────────────────── header bar ──────────────────────────┐
 *   │ • INSTITUTIONAL GRADE                          [map] [filt] [⚙] │
 *   │ FAVORITOS                                                      │
 *   │ Consolidated technical analysis of high-priority hotel assets. │
 *   ├──────────────────── institutional table card ──────────────────┤
 *   │ ⊞ sticky thead + sticky first column + h-scroll grid           │
 *   │ ⊞ pagination footer                                            │
 *   └────────────────────────────────────────────────────────────────┘
 *
 * The map icon links back to /library/favorites-map; the filter and
 * settings icons are mock actions today — they emit a sonner toast.
 */
export function FavoritesListContent({
  initialReports,
}: { initialReports?: LibraryReport[] } = {}) {
  return (
    <section className="flex min-w-0 flex-1 flex-col gap-4 overflow-hidden p-5">
      <header className="flex items-end justify-between gap-4">
        <div className="flex flex-col gap-1.5">
          <span className="inline-flex w-fit items-center gap-1.5 rounded bg-forest-900 px-2 py-0.5 font-headline text-[10px] font-bold uppercase tracking-widest text-lime-300">
            Institutional Grade
          </span>
          <h1 className="font-headline text-3xl font-extrabold uppercase tracking-tighter text-forest-900">
            Favoritos
          </h1>
          <p className="text-[13px] leading-snug text-slate-500">
            Consolidated technical analysis of high-priority hotel assets.
          </p>
        </div>
        <nav className="flex items-center gap-2" aria-label="View actions">
          <Link
            href="/library/favorites-map"
            aria-label="Switch to map view"
            className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-forest-900 shadow-sm transition-colors hover:bg-slate-50"
          >
            <Map size={18} aria-hidden />
          </Link>
          <button
            type="button"
            aria-label="Filters"
            onClick={() => toast.message("Filters panel coming soon")}
            className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-forest-900 shadow-sm transition-colors hover:bg-slate-50"
          >
            <SlidersHorizontal size={18} aria-hidden />
          </button>
          <button
            type="button"
            aria-label="List settings"
            onClick={() =>
              toast.message("List view settings coming soon", {
                description:
                  "Column visibility · Density · Saved searches · Export.",
              })
            }
            className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-forest-900 shadow-sm transition-colors hover:bg-slate-50"
          >
            <Settings size={18} aria-hidden />
          </button>
        </nav>
      </header>

      <FavoritesTable initialReports={initialReports} />
    </section>
  );
}
