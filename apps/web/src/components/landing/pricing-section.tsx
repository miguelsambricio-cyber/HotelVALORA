/**
 * Pricing section — server component.
 *
 * Data lives here as a module-level constant. To drive this from the API,
 * replace `PLANS` with an async fetch and mark the component async.
 */

import { PricingCard } from "@/components/ui/pricing-card";
import type { PricingPlan } from "@/types/hotel-search";

const PLANS: PricingPlan[] = [
  {
    id: "pro",
    tier: "Profesional",
    name: "PRO",
    features: [
      { text: "Hotel Market overview",  icon: "check" },
      { text: "Hotel Transactions",      icon: "check" },
      { text: "Hotel Projects",          icon: "check" },
      { text: "IRR Project",             icon: "check" },
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
      { text: "Executive Summary",        icon: "verified" },
      { text: "Hotel Valuation",          icon: "verified" },
      { text: "Algoritmo avanzado v4.0",  icon: "verified" },
    ],
    ctaLabel: "EMPEZAR AHORA",
    href: "/register",
    featured: true,
  },
  {
    id: "premium",
    tier: "institucional",
    name: "PREMIUM",
    features: [
      { text: "CAPEX & Renders",           icon: "check" },
      { text: "P&L Forecast",              icon: "check" },
      { text: "Financing strategy",         icon: "check" },
      { text: "Underwriting & IRR Equity",  icon: "check" },
    ],
    ctaLabel: "Seleccionar",
    href: "/register?plan=premium",
  },
];

export function PricingSection() {
  return (
    <section
      aria-label="Planes y precios"
      className="w-full bg-slate-50 border-t border-slate-200 landing-pricing"
    >
      <div className="max-w-7xl mx-auto px-6 md:px-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8 items-center">
          {PLANS.map((plan) => (
            <PricingCard key={plan.id} plan={plan} />
          ))}
        </div>
      </div>
    </section>
  );
}
