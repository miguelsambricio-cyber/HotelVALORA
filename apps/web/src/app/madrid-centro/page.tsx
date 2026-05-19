import type { Metadata } from "next";
import Link from "next/link";
import { AppHeader } from "@/components/layout/app-header";
import { InstitutionalFooter } from "@/components/layout/institutional-footer";
import {
  getMadridCentroHotels,
  type HotelProfile,
} from "@/lib/hotels/madrid-centro-registry";

export const metadata: Metadata = {
  title: "Madrid Centro · Institutional Showcase · HotelVALORA",
  description:
    "Madrid Centro institutional underwriting showcase · select a curated hotel to inspect its end-to-end memorandum (engine 0.2.0).",
};

interface PageProps {
  searchParams?: { q?: string };
}

/**
 * /madrid-centro
 *
 * Entry point for the end-to-end institutional integration. Curated
 * Madrid Centro hotels · each card links to the underwriting memo
 * resolved against that hotel's input deltas (engine 0.2.0).
 *
 * Accepts an optional `?q=<query>` param · routed in by the landing
 * HeroSearch when the operator searches from the home page (so
 * "Madrid Centro" lands here populated instead of on an empty
 * /assets/hotels FastAPI dashboard table). Soft-matches the 3 hotels
 * by display name / submarket · falls back to ALL hotels when no
 * match · never an empty surface.
 *
 * Boundary: this route is ADDITIVE · does not touch any frozen
 * underwriting / deploy-hardening surface. Reuses AppHeader +
 * InstitutionalFooter + the underwriting renderer downstream.
 */
export default function MadridCentroLanding({ searchParams }: PageProps) {
  const allHotels = getMadridCentroHotels();
  const rawQuery = (searchParams?.q ?? "").trim();
  const query = rawQuery.toLowerCase();

  const matches = query.length === 0
    ? allHotels
    : allHotels.filter(matchesQuery(query));

  const showFallback = query.length > 0 && matches.length === 0;
  const hotels = showFallback ? allHotels : matches;

  return (
    <div className="flex min-h-screen flex-col bg-[#f6f8f7]">
      <AppHeader />

      <main className="mx-auto w-full max-w-[1400px] flex-1 px-6 py-10 lg:px-10">
        <header className="mb-8">
          <p className="font-headline text-[10px] font-bold uppercase tracking-[0.24em] text-slate-500">
            Institutional Showcase
          </p>
          <h1 className="mt-2 font-headline text-3xl font-extrabold tracking-tight text-forest-900">
            Madrid Centro · Hotel Portfolio
          </h1>
          {rawQuery.length > 0 && (
            <p className="mt-3 inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1 font-mono text-[10.5px] text-slate-700">
              <span className="font-headline font-bold uppercase tracking-[0.22em] text-slate-500">
                Search
              </span>
              <span className="font-bold text-forest-900">“{rawQuery}”</span>
              {showFallback && (
                <span className="text-slate-500">
                  · no direct match · showing all institutional hotels
                </span>
              )}
              {!showFallback && matches.length < allHotels.length && (
                <span className="text-slate-500">
                  · {matches.length} of {allHotels.length} match
                </span>
              )}
              <Link
                href="/madrid-centro"
                className="ml-1 text-slate-500 underline-offset-4 hover:underline hover:text-slate-900"
                aria-label="Clear search"
              >
                ×
              </Link>
            </p>
          )}
          <p className="mt-3 max-w-2xl font-mono text-[13px] leading-relaxed text-slate-700">
            Three curated assets to exercise the end-to-end HotelVALORA flow ·
            Centro 4★ · Salamanca 5★ · Chamberí 5★ Boutique. Select a hotel to
            inspect its institutional underwriting memorandum (engine 0.2.0 ·
            8 sections · live cap-rate engine).
          </p>
          <p className="mt-3 max-w-2xl font-mono text-[9.5px] italic leading-relaxed text-slate-500">
            Illustrative institutional dataset · Live market intelligence
            integration in progress. Hotel identities are anonymised
            references · not real transactions.
          </p>
        </header>

        <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {hotels.map((hotel) => (
            <li
              key={hotel.id}
              className="group flex h-full flex-col rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-shadow hover:shadow-md"
            >
              <Link
                href={`/madrid-centro/${hotel.id}/full-report`}
                className="block"
              >
                <p className="font-headline text-[9.5px] font-bold uppercase tracking-[0.22em] text-slate-500">
                  {hotel.submarket}
                </p>
                <h2 className="mt-2 font-headline text-lg font-extrabold leading-tight tracking-tight text-forest-900">
                  {hotel.display_name}
                </h2>

                <dl className="mt-4 grid grid-cols-2 gap-2 border-t border-slate-100 pt-3 font-mono text-[10.5px]">
                  <div>
                    <dt className="text-slate-500">Keys</dt>
                    <dd className="font-bold text-slate-900">{hotel.rooms}</dd>
                  </div>
                  <div>
                    <dt className="text-slate-500">Category</dt>
                    <dd className="font-bold text-slate-900">
                      {hotel.category.replace("star", "★")}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-slate-500">GBA</dt>
                    <dd className="font-bold text-slate-900">
                      {(hotel.total_sqm / 1000).toFixed(1).replace(".", ",")} km²
                    </dd>
                  </div>
                  <div>
                    <dt className="text-slate-500">State</dt>
                    <dd className="font-bold text-slate-900 capitalize">
                      {hotel.state.replace("_", " ")}
                    </dd>
                  </div>
                </dl>

                <p className="mt-4 line-clamp-3 font-mono text-[11px] leading-relaxed text-slate-700">
                  {hotel.positioning}
                </p>
              </Link>

              <div className="mt-4 flex items-center gap-4 border-t border-slate-100 pt-3">
                <Link
                  href={`/madrid-centro/${hotel.id}/full-report`}
                  className="inline-flex items-center gap-1 font-headline text-[10px] font-bold uppercase tracking-[0.22em] text-[#005db7] underline-offset-4 hover:underline"
                >
                  Open institutional report →
                </Link>
                <Link
                  href={`/madrid-centro/${hotel.id}`}
                  className="ml-auto font-headline text-[10px] font-bold uppercase tracking-[0.22em] text-slate-500 underline-offset-4 hover:underline hover:text-slate-700"
                >
                  Underwriting only ↗
                </Link>
              </div>
            </li>
          ))}
        </ul>
      </main>

      <InstitutionalFooter variant="slim" />
    </div>
  );
}

/**
 * Soft-match · lowercase substring match on display_name and submarket.
 * Returns a predicate compatible with Array.filter.
 *
 * Examples:
 *   "madrid"        → 3 matches (all hotels are in Madrid)
 *   "madrid centro" → 1 match (only Centro Reference)
 *   "salamanca"     → 1 match
 *   "boutique"      → 1 match
 *   "tokyo"         → 0 matches (caller falls back to ALL hotels)
 */
function matchesQuery(qLowercase: string): (h: HotelProfile) => boolean {
  return (h) => {
    const name = h.display_name.toLowerCase();
    const submarket = h.submarket.toLowerCase();
    return name.includes(qLowercase) || submarket.includes(qLowercase);
  };
}
