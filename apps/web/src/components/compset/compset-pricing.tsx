/**
 * Pricing section specific to the compset workflow page.
 * Uses the shared <PricingCard> component with compset-specific plan features.
 */

import { PricingCard } from "@/components/ui/pricing-card";
import type { PricingPlan } from "@/types/hotel-search";

const COMPSET_PLANS: PricingPlan[] = [
  {
    id: "pro",
    tier: "Profesional",
    name: "PRO",
    features: [
      { text: "Hotel Asset Info",      icon: "check" },
      { text: "CompSET PRO",           icon: "check" },
      { text: "Hotel Market overview", icon: "check" },
      { text: "Informe Privado",       icon: "check" },
    ],
    ctaLabel: "Seleccionar",
    href: "/register?plan=pro",
  },
  {
    id: "free",
    tier: "Recomendado",
    name: "GRATIS",
    subtitle: "Oferta por lanzamiento",
    features: [
      { text: "CompSET automático",    icon: "verified" },
      { text: "Biblioteca Pública",    icon: "verified" },
      { text: "Algoritmo avanzado v4.0", icon: "verified" },
    ],
    ctaLabel: "Continuar",
    href: "/report",
    featured: true,
  },
  {
    id: "premium",
    tier: "Institucional",
    name: "PREMIUM",
    features: [
      { text: "Hotel Personalizado",   icon: "check" },
      { text: "CompSET Premium",       icon: "check" },
      { text: "AI Imágenes",           icon: "check" },
      { text: "Chatbot P&L Premium",   icon: "check" },
    ],
    ctaLabel: "Seleccionar",
    href: "/register?plan=premium",
  },
];

export function CompsetPricing() {
  return (
    <section
      aria-label="Planes y precios"
      className="w-full bg-slate-50 border-t border-slate-200 compset-monetization"
    >
      <div className="max-w-7xl mx-auto px-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8 items-center">
          {COMPSET_PLANS.map((plan) => (
            <PricingCard key={plan.id} plan={plan} />
          ))}
        </div>
      </div>
    </section>
  );
}
