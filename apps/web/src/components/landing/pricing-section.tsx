/**
 * Pricing section — server component.
 *
 * Data lives here as a module-level constant. To drive this from the API,
 * replace `PLANS` with an async fetch and mark the component async.
 */

import Link from "next/link";
import { PricingCard } from "@/components/ui/pricing-card";
import type { PricingPlan } from "@/types/hotel-search";
import { cn } from "@/lib/utils";

/**
 * Routing contract (post-QA #001 entry-flow wiring):
 *
 *   Pro / Premium "Seleccionar"  → /pricing#<plan-id>
 *     (institutional subscription comparison surface · plan-jump anchor)
 *
 *   Free "EMPEZAR AHORA"         → /compset
 *     (no hotel context yet at landing → kick off the institutional flow
 *      at the explore map · user picks a subject hotel → analysis mode →
 *      "Continuar" → /report/executive-summary?ref=<id>)
 */
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
    href: "/pricing#pro",
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
    href: "/compset",
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
    href: "/pricing#premium",
  },
];

export function PricingSection() {
  return (
    <section
      aria-label="Planes y precios"
      className="w-full bg-slate-50 border-t border-slate-200 landing-pricing"
    >
      <div className="max-w-7xl mx-auto px-6 md:px-8">
        {/* Desktop · full feature cards (unchanged) */}
        <div className="hidden md:grid md:grid-cols-3 gap-6 lg:gap-8 items-center">
          {PLANS.map((plan) => (
            <PricingCard key={plan.id} plan={plan} />
          ))}
        </div>

        {/* Mobile · compact rows · tier + name + button, NO features.
         *  Whole row + button share ONE destination = plan.href (same as
         *  desktop · Mike-confirmed): GRATIS → /compset (start the flow ·
         *  the free plan isn't "contracted", it's used), Pro → /pricing#pro,
         *  Premium → /pricing#premium. GRATIS is the featured row (accent
         *  border + "Recomendado" badge + filled "Empezar ahora"); Pro/Premium
         *  outline "Seleccionar". (Mike's req #2 · the 3 fit without scroll.) */}
        <ul className="md:hidden flex flex-col gap-2.5" aria-label="Planes y precios">
          {PLANS.map((plan) => {
            const featured = Boolean(plan.featured);
            return (
              <li key={plan.id}>
                <Link
                  href={plan.href}
                  aria-label={`Plan ${plan.name}`}
                  className={cn(
                    "flex items-center justify-between gap-3 rounded-xl bg-white px-4 py-3 transition-transform active:scale-[0.99]",
                    featured
                      ? "border-2 border-forest-900 shadow-md"
                      : "border border-slate-200 shadow-sm",
                  )}
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-base font-extrabold tracking-tight text-forest-900">
                        {plan.name}
                      </span>
                      {featured && (
                        <span className="inline-block rounded-full bg-forest-900 px-2 py-0.5 text-[8.5px] font-bold uppercase tracking-[0.16em] text-white">
                          Recomendado
                        </span>
                      )}
                    </div>
                    <span className="mt-0.5 block truncate text-[11px] font-medium uppercase tracking-wider text-slate-400">
                      {plan.tier}
                    </span>
                  </div>
                  <span
                    className={cn(
                      "shrink-0 rounded-lg px-3.5 py-2 text-[11px] font-bold uppercase tracking-[0.14em]",
                      featured
                        ? "bg-forest-900 text-white shadow-sm"
                        : "border-2 border-forest-900 text-forest-900",
                    )}
                  >
                    {featured ? "Empezar ahora" : "Seleccionar"}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
