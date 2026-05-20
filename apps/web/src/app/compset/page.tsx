import type { Metadata } from "next";
import { LandingHeader } from "@/components/landing/landing-header";
import { InstitutionalFooter } from "@/components/layout/institutional-footer";
import { CompsetMap } from "@/components/compset/compset-map";
import { CompsetPricing } from "@/components/compset/compset-pricing";
import {
  DEFAULT_MADRID_HOTEL_ID,
  findHotelById,
  findHotelByQuery,
} from "@/lib/data/madrid-hotels";

export const metadata: Metadata = {
  title: "Mapa de Competidores | HotelVALORA",
  description:
    "Selecciona el conjunto de competidores institucional para el análisis de valoración hotelera en Madrid.",
};

interface PageProps {
  /** Next 14 Server Components receive search params on first render. */
  searchParams?: { ref?: string; q?: string };
}

/**
 * /compset — institutional workflow step-2 of the valuation flow.
 *
 * Routing contract (post-Tier-2 restoration · 2026-05-20):
 *   · /compset                                   → default reference hotel (Bless Hotel Madrid)
 *   · /compset?ref=<madrid-hotel-id>             → explicit subject hotel from HeroSearch select
 *   · /compset?q=<free-text>                     → soft-match against canonical Madrid registry ·
 *                                                  best match seeds the subject · falls back to
 *                                                  default if no match
 *
 * The footer migrated from `LandingFooter` to `InstitutionalFooter`
 * (slim variant) so the compset surface shares the canonical
 * footer with library / admin / reports.
 */
export default function CompsetPage({ searchParams }: PageProps) {
  const refParam = searchParams?.ref?.trim() ?? "";
  const qParam = searchParams?.q?.trim() ?? "";

  // Resolution order:
  //   1. ?ref=<id> · exact lookup
  //   2. ?q=<text> · soft-match against canonical Madrid registry
  //   3. fallback · default hotel
  const resolvedHotelId =
    (refParam && findHotelById(refParam)?.id) ||
    (qParam && findHotelByQuery(qParam)?.id) ||
    DEFAULT_MADRID_HOTEL_ID;

  return (
    <div className="flex flex-col min-h-screen bg-slate-100 text-slate-800">
      <LandingHeader />

      <main className="flex-grow compset-main">
        <CompsetMap referenceHotelId={resolvedHotelId} />
        <CompsetPricing />
      </main>

      <InstitutionalFooter variant="slim" />
    </div>
  );
}
