import type { Metadata } from "next";
import { LandingHeader } from "@/components/landing/landing-header";
import { LandingFooter } from "@/components/landing/landing-footer";
import { CompsetMap } from "@/components/compset/compset-map";
import { CompsetPricing } from "@/components/compset/compset-pricing";

export const metadata: Metadata = {
  title: "Mapa de Competidores | HotelVALORA",
  description: "Selecciona el conjunto de competidores para el análisis de valoración.",
};

/**
 * Compset page — step 2 of the valuation workflow.
 *
 * Layout mirrors the landing page (no dashboard shell).
 * The map section is fully client-side; the pricing section is server-rendered.
 */
export default function CompsetPage() {
  return (
    <div className="flex flex-col min-h-screen bg-slate-100 text-slate-800">
      <LandingHeader />

      <main className="flex-grow compset-main">
        {/* Interactive map with competitor pins + panel */}
        <CompsetMap />

        {/* Pricing / plan selection — server component, reuses PricingCard */}
        <CompsetPricing />
      </main>

      <LandingFooter />
    </div>
  );
}
