import type { Metadata } from "next";
import { LandingHeader } from "@/components/landing/landing-header";
import { InstitutionalFooter } from "@/components/layout/institutional-footer";
import { CompsetMap } from "@/components/compset/compset-map";
import { CompsetPricing } from "@/components/compset/compset-pricing";
import { findCorpusBySlug, findCorpusByQuery } from "@/lib/hotels/corpus-reader";

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
export default async function CompsetPage({ searchParams }: PageProps) {
  const refParam = searchParams?.ref?.trim() ?? "";
  const qParam = searchParams?.q?.trim() ?? "";

  // Resolution against the REAL 226-hotel corpus · hotel_canonical:
  //   - ?ref=<slug> that RESOLVES        → analysis (that hotel)
  //   - ?ref=<slug> that does NOT resolve → analysis with the bad slug, so the
  //     client fetch 404s and surfaces a VISIBLE error (an explicit ref to a
  //     non-existent hotel is a dead link · the user gets a clear error, never
  //     a silent default).
  //   - ?q=<text> (no ref) that soft-matches → analysis
  //   - everything else (no ref, vague/empty q) → EXPLORE
  // NEVER a default hotel (no silent Bless). The same slug drives the report,
  // so the compset subject and the report subject are identical by construction.
  let subject = null;
  let refBroken = false;
  if (refParam) {
    subject = await findCorpusBySlug(refParam);
    refBroken = subject === null;
  } else if (qParam) {
    subject = await findCorpusByQuery(qParam);
  }
  const resolvedHotelId = subject?.slug ?? (refBroken ? refParam : null);
  const mode = subject || refBroken ? "analysis" : "explore";

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
