import { LandingHeader } from "@/components/landing/landing-header";
import { HeroSection } from "@/components/landing/hero-section";
import { PricingSection } from "@/components/landing/pricing-section";
import { LandingFooter } from "@/components/landing/landing-footer";

export const metadata = {
  title: "HotelVALORA | Valora Hoteles en Segundos",
  description:
    "Análisis institucional y escenarios de inversión en activos hoteleros.",
};

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
