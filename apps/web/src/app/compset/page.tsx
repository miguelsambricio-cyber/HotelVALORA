import type { Metadata } from "next";
import { LandingHeader } from "@/components/landing/landing-header";
import { InstitutionalFooter } from "@/components/layout/institutional-footer";
import { CompsetMap } from "@/components/compset/compset-map";
import { CompsetPricing } from "@/components/compset/compset-pricing";
import { findHotelById, findHotelByQuery } from "@/lib/data/madrid-hotels";

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
 * /compset — institutional workflow · two modes:
 *
 *   EXPLORE MODE · bare `/compset` (no `?ref`, no resolvable `?q`)
 *     · map renders ALL Madrid hotels as uniform pins
 *     · ExploreHelper card explains the flow
 *     · click any pin → popup → "Iniciar análisis →" → /compset?ref=<id>
 *
 *   ANALYSIS MODE · /compset?ref=<id>  or  /compset?q=<text-that-matches>
 *     · subject hotel + 4 active competitors + 3 AI-suggested
 *     · CompetitorPanel on the right edge
 *     · "Continuar" CTA in pricing band → /report/executive-summary?ref=<id>
 *
 * The mode is decided server-side from the resolved hotel id · the
 * client component receives `mode` as an explicit prop so there's
 * no client-side flicker between states.
 */
export default function CompsetPage({ searchParams }: PageProps) {
  const refParam = searchParams?.ref?.trim() ?? "";
  const qParam = searchParams?.q?.trim() ?? "";

  // Resolution order:
  //   1. ?ref=<id>     · exact lookup
  //   2. ?q=<text>     · soft-match against canonical Madrid registry
  //   3. (none/no-match) · null · activates EXPLORE mode
  const resolvedHotelId =
    (refParam && findHotelById(refParam)?.id) ||
    (qParam && findHotelByQuery(qParam)?.id) ||
    null;

  const mode = resolvedHotelId ? "analysis" : "explore";

  return (
    <div className="flex flex-col min-h-screen bg-slate-100 text-slate-800">
      <LandingHeader />

      <main className="flex-grow compset-main">
        <CompsetMap
          mode={mode}
          referenceHotelId={resolvedHotelId ?? undefined}
        />
        <CompsetPricing referenceHotelId={resolvedHotelId ?? undefined} />
      </main>

      <InstitutionalFooter variant="slim" />
    </div>
  );
}
