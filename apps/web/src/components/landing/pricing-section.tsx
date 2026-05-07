import { CheckCircle2, BadgeCheck } from "lucide-react";
import { cn } from "@/lib/utils";

// ── Types ─────────────────────────────────────────────────────────────────────

type FeatureIconVariant = "check" | "verified";

interface PricingFeature {
  text: string;
  icon: FeatureIconVariant;
}

interface PricingPlan {
  id: string;
  label: string;
  name: string;
  subtitle?: string;
  features: PricingFeature[];
  ctaLabel: string;
  featured?: boolean;
}

// ── Data ──────────────────────────────────────────────────────────────────────

const PLANS: PricingPlan[] = [
  {
    id: "pro",
    label: "Profesional",
    name: "PRO",
    features: [
      { text: "Hotel Market overview", icon: "check" },
      { text: "Hotel Transactions", icon: "check" },
      { text: "Hotel Projects", icon: "check" },
      { text: "IRR Project", icon: "check" },
    ],
    ctaLabel: "Seleccionar",
  },
  {
    id: "free",
    label: "Recomendado",
    name: "GRATIS",
    subtitle: "Oferta por lanzamiento",
    features: [
      { text: "Executive Summary", icon: "verified" },
      { text: "Hotel Valuation", icon: "verified" },
      { text: "Algoritmo avanzado v4.0", icon: "verified" },
    ],
    ctaLabel: "EMPEZAR AHORA",
    featured: true,
  },
  {
    id: "premium",
    label: "institucional",
    name: "PREMIUM",
    features: [
      { text: "CAPEX & Renders", icon: "check" },
      { text: "P&L Forecast", icon: "check" },
      { text: "Financing strategy", icon: "check" },
      { text: "Underwriting & IRR Equity", icon: "check" },
    ],
    ctaLabel: "Seleccionar",
  },
];

// Decorative brand watermark — purely presentational, not indexed
const WATERMARK =
  "https://lh3.googleusercontent.com/aida/ADBb0uga57VKq-ZhZz7rDm7NUr25TcNmzrUgaGqjCTWjS-dYUvSOEiFj27qaLShLXGmEzG0F7wZCJQrlXZUdkbUwctQK9-4l9RgQiEqTqEZpXHSFqP19ZgwMxaV0J49-aaPfLKebfRogYJhZaFgbOOnlOSFD7QUkL2UopcGs9zI7wUp3XE5Co08bthebMJCj6ObdJARfRNt1yxKir_k8ZEWxuKF642Vyf0tO4jm00KoV65tJR6Xn-wtO5gfzieOeoqvumcY16pGSe9X82zw";

// ── Sub-components ────────────────────────────────────────────────────────────

function FeatureIcon({ variant }: { variant: FeatureIconVariant }) {
  return variant === "verified" ? (
    <BadgeCheck className="text-forest-900 shrink-0" size={20} />
  ) : (
    <CheckCircle2 className="text-forest-900 shrink-0" size={16} />
  );
}

function PricingCard({ plan }: { plan: PricingPlan }) {
  return (
    <div
      className={cn(
        "relative bg-white p-10 rounded-3xl group overflow-hidden transition-all",
        plan.featured
          ? "border-2 border-forest-900 shadow-2xl scale-105 z-20"
          : "border border-slate-200 shadow-sm hover:shadow-xl"
      )}
    >
      {/* Decorative brand watermark */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={WATERMARK}
        alt=""
        aria-hidden
        className={cn(
          "absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-4/5 pointer-events-none z-0",
          plan.featured ? "opacity-[0.05]" : "opacity-[0.03]"
        )}
      />

      <div className="relative z-10 flex flex-col h-full">
        {/* Plan header */}
        <div className="mb-8">
          {plan.featured ? (
            <span className="inline-block px-3 py-1 bg-forest-900 text-white text-[10px] font-bold tracking-[0.2em] rounded-full uppercase mb-4">
              {plan.label}
            </span>
          ) : (
            <span className="text-xs font-bold tracking-[0.3em] text-slate-400 uppercase">
              {plan.label}
            </span>
          )}
          <h3
            className={cn(
              "text-3xl font-extrabold text-forest-900",
              !plan.featured && "mt-2"
            )}
          >
            {plan.name}
          </h3>
          {plan.subtitle && (
            <p className="text-forest-700 font-semibold mt-1 opacity-70">
              {plan.subtitle}
            </p>
          )}
        </div>

        {/* Feature list */}
        <ul className="space-y-4 mb-10 flex-grow">
          {plan.features.map((feature) => (
            <li
              key={feature.text}
              className={cn(
                "flex items-center gap-3",
                plan.featured
                  ? "font-semibold text-slate-800"
                  : "font-medium text-slate-500"
              )}
            >
              <FeatureIcon variant={feature.icon} />
              {feature.text}
            </li>
          ))}
        </ul>

        {/* CTA */}
        <button
          type="button"
          className={cn(
            "w-full py-4 font-bold rounded-xl transition-all uppercase text-sm tracking-widest",
            plan.featured
              ? "bg-forest-900 text-white shadow-lg shadow-forest-900/20 hover:brightness-110"
              : "border-2 border-forest-900 text-forest-900 group-hover:bg-forest-900 group-hover:text-white"
          )}
        >
          {plan.ctaLabel}
        </button>
      </div>
    </div>
  );
}

// ── Section ───────────────────────────────────────────────────────────────────

export function PricingSection() {
  return (
    <section className="w-full bg-slate-50 py-24 px-8 border-t border-slate-200">
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-center">
          {PLANS.map((plan) => (
            <PricingCard key={plan.id} plan={plan} />
          ))}
        </div>
      </div>
    </section>
  );
}
