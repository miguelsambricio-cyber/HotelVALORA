/**
 * Pricing section specific to the compset workflow page.
 *
 * The featured "Continuar" CTA is hotel-aware: when a subject hotel is
 * confirmed (analysis mode), the link carries `?ref=<id>` through to
 * the executive summary so the report opens already-bound to that
 * subject. In explore mode (no subject) the CTA targets the bare
 * executive summary (mock fallback) so the demo never dead-ends.
 *
 * Pro / Premium "Seleccionar" CTAs target `/pricing` (the institutional
 * comparison surface · phase 1.4 of QA #001 entry flow).
 */

import { PricingCard } from "@/components/ui/pricing-card";
import type { PricingPlan } from "@/types/hotel-search";

interface CompsetPricingProps {
  /** Subject hotel id when in analysis mode · drives the featured CTA target. */
  referenceHotelId?: string;
}

function buildCompsetPlans(referenceHotelId?: string): PricingPlan[] {
  const continueHref = referenceHotelId
    ? `/report/executive-summary?ref=${encodeURIComponent(referenceHotelId)}`
    : "/report/executive-summary";

  return [
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
      href: "/pricing#pro",
    },
    {
      id: "free",
      tier: "Recomendado",
      name: "GRATIS",
      subtitle: "Oferta por lanzamiento",
      features: [
        { text: "CompSET automático",      icon: "verified" },
        { text: "Biblioteca Pública",      icon: "verified" },
        { text: "Algoritmo avanzado v4.0", icon: "verified" },
      ],
      ctaLabel: "Continuar",
      href: continueHref,
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
      href: "/pricing#premium",
    },
  ];
}

export function CompsetPricing({ referenceHotelId }: CompsetPricingProps = {}) {
  const plans = buildCompsetPlans(referenceHotelId);

  return (
    <section
      aria-label="Planes y precios"
      className="w-full bg-slate-50 border-t border-slate-200 compset-monetization"
    >
      <div className="max-w-7xl mx-auto px-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8 items-center">
          {plans.map((plan) => (
            <PricingCard key={plan.id} plan={plan} />
          ))}
        </div>
      </div>
    </section>
  );
}
