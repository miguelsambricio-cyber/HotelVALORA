"use client";

import Link from "next/link";
import { Map, Settings, SlidersHorizontal } from "lucide-react";
import { toast } from "sonner";
import type { LibraryReport } from "@/types/library";
import { FavoritesTable } from "./favorites-table";

/**
 * /library/top-list main column. Same architecture as
 * `FavoritesListContent` — header bar (badge + title + subtitle + map
 * back-link / filters / settings actions) + the institutional reports
 * table — but switches the table on its REF column and overrides the
 * page-specific copy. Sidebar, shell, footer remain byte-identical.
 */
export function TopReportsListContent({
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
            Top Reports
          </h1>
          <p className="text-[13px] leading-snug text-slate-500">
            Promoted institutional hotel opportunities and underwriting
            intelligence.
          </p>
        </div>
        <nav className="flex items-center gap-2" aria-label="View actions">
          <Link
            href="/library/top-map"
            aria-label="Switch to map view"
            className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-forest-900 shadow-sm transition-colors hover:bg-slate-50"
          >
            <Map size={18} aria-hidden />
          </Link>
          <button
            type="button"
            aria-label="Filters"
            disabled
            className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-forest-400 shadow-sm cursor-not-allowed opacity-60"
            title="Filtros — disponible próximamente"
          >
            <SlidersHorizontal size={18} aria-hidden />
          </button>
          <button
            type="button"
            aria-label="List settings"
            disabled
            className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-forest-400 shadow-sm cursor-not-allowed opacity-60"
            title="Configuración · disponible próximamente"
          >
            <Settings size={18} aria-hidden />
          </button>
        </nav>
      </header>

      <FavoritesTable showReferenceColumn initialReports={initialReports} />
    </section>
  );
}
