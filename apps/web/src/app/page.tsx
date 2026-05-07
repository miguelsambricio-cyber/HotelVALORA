import type { Metadata } from "next";
import { LandingHeader } from "@/components/landing/landing-header";
import { HeroSection } from "@/components/landing/hero-section";
import { PricingSection } from "@/components/landing/pricing-section";
import { LandingFooter } from "@/components/landing/landing-footer";

export const metadata: Metadata = {
  title: "HotelVALORA | Valora Hoteles en Segundos",
  description:
    "Análisis institucional y escenarios de inversión en activos hoteleros.",
  openGraph: {
    title: "HotelVALORA | Valora Hoteles en Segundos",
    description:
      "Análisis institucional y escenarios de inversión en activos hoteleros.",
    type: "website",
  },
};

/**
 * Public landing page — server component.
 *
 * Renders outside the (dashboard) route group so it has no sidebar/header shell.
 * Interactive islands (search bar, mobile nav) are client components.
 */
export default function LandingPage() {
  return (
    <div className="flex flex-col min-h-screen bg-slate-100 text-slate-800 selection:bg-forest-900/20 selection:text-forest-900">
      <LandingHeader />
      <HeroSection />
      <PricingSection />
      <LandingFooter />
    </div>
  );
}
