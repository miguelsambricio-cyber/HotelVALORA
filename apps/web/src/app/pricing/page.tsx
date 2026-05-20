import type { Metadata } from "next";
import Link from "next/link";
import { Check, Minus, Building2, Sparkles, ShieldCheck } from "lucide-react";
import { LandingHeader } from "@/components/landing/landing-header";
import { InstitutionalFooter } from "@/components/layout/institutional-footer";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Planes & Precios | HotelVALORA",
  description:
    "Suscripciones institucionales para inversores hoteleros · Free · Pro · Premium institucional.",
};

/* ─── Data ──────────────────────────────────────────────────────────────── */

interface Plan {
  id: "free" | "pro" | "premium";
  name: string;
  tier: string;
  headline: string;
  priceMajor: string;
  priceSuffix: string;
  description: string;
  ctaLabel: string;
  ctaHref: string;
  featured?: boolean;
}

const PLANS: Plan[] = [
  {
    id: "free",
    name: "FREE",
    tier: "Para empezar",
    headline: "Validación institucional",
    priceMajor: "0€",
    priceSuffix: "siempre",
    description:
      "Acceso a Executive Summary y Hotel Valuation para validar la plataforma con un hotel objetivo.",
    ctaLabel: "Empezar gratis",
    ctaHref: "/compset",
  },
  {
    id: "pro",
    name: "PRO",
    tier: "Profesional",
    headline: "Inteligencia de mercado completa",
    priceMajor: "Desde €149",
    priceSuffix: "/mes · facturación anual",
    description:
      "CompSet PRO · Market Overview · Transactions · Projects · IRR. Para asset managers y analistas.",
    ctaLabel: "Elegir Pro",
    ctaHref: "/register?plan=pro",
    featured: true,
  },
  {
    id: "premium",
    name: "PREMIUM",
    tier: "Institucional",
    headline: "Underwriting de capital",
    priceMajor: "Hablemos",
    priceSuffix: "contrato institucional",
    description:
      "Underwriting completo · IRR Equity · CAPEX & Renders · AI institucional · soporte dedicado.",
    ctaLabel: "Hablar con ventas",
    ctaHref: "/contact?topic=premium",
  },
];

interface FeatureRow {
  category: string;
  features: { label: string; free: boolean; pro: boolean; premium: boolean }[];
}

const FEATURES: FeatureRow[] = [
  {
    category: "Análisis básico",
    features: [
      { label: "Executive Summary",            free: true,  pro: true,  premium: true  },
      { label: "Hotel Valuation v4.0",         free: true,  pro: true,  premium: true  },
      { label: "Biblioteca pública",           free: true,  pro: true,  premium: true  },
      { label: "PDF export institucional",     free: true,  pro: true,  premium: true  },
    ],
  },
  {
    category: "Inteligencia profesional",
    features: [
      { label: "CompSet PRO · 4 competidores + 3 IA", free: false, pro: true, premium: true },
      { label: "Hotel Market Overview",        free: false, pro: true,  premium: true  },
      { label: "Hotel Transactions (M&A)",     free: false, pro: true,  premium: true  },
      { label: "Hotel Projects (CapEx)",       free: false, pro: true,  premium: true  },
      { label: "IRR Project",                  free: false, pro: true,  premium: true  },
      { label: "Multi-user · Team workspaces", free: false, pro: true,  premium: true  },
    ],
  },
  {
    category: "Underwriting institucional",
    features: [
      { label: "CAPEX & Renders",              free: false, pro: false, premium: true  },
      { label: "P&L Forecast",                 free: false, pro: false, premium: true  },
      { label: "Financing Strategy",           free: false, pro: false, premium: true  },
      { label: "Underwriting & IRR Equity",    free: false, pro: false, premium: true  },
      { label: "Hotel personalizado · CMS",    free: false, pro: false, premium: true  },
    ],
  },
  {
    category: "AI · Equipo · Soporte",
    features: [
      { label: "AI Imágenes institucionales",  free: false, pro: false, premium: true  },
      { label: "Chatbot P&L Premium",          free: false, pro: false, premium: true  },
      { label: "Onboarding dedicado",          free: false, pro: false, premium: true  },
      { label: "SLA institucional 99.95%",     free: false, pro: false, premium: true  },
    ],
  },
];

const TRUST_SIGNALS = [
  {
    icon: Building2,
    headline: "Plataforma institucional",
    body: "Diseñada para fondos, family offices, banca de inversión y asset managers hoteleros en España y LATAM.",
  },
  {
    icon: ShieldCheck,
    headline: "Datos y privacidad",
    body: "Datos almacenados en Supabase EU-Central · RLS · encriptación at-rest · soberanía europea garantizada.",
  },
  {
    icon: Sparkles,
    headline: "AI con humano en el loop",
    body: "Agentes operacionales con permisos, memoria, auditoría y aprobación humana antes de cualquier write.",
  },
];

/* ─── Page ──────────────────────────────────────────────────────────────── */

export default function PricingPage() {
  return (
    <div className="flex flex-col min-h-screen bg-slate-100 text-slate-800">
      <LandingHeader />

      <main className="flex-grow">
        <PricingHero />
        <PricingCards />
        <ComparisonMatrix />
        <TrustStrip />
      </main>

      <InstitutionalFooter variant="slim" />
    </div>
  );
}

/* ─── Hero ──────────────────────────────────────────────────────────────── */

function PricingHero() {
  return (
    <section className="border-b border-slate-200 bg-white">
      <div className="max-w-5xl mx-auto px-6 md:px-8 py-12 md:py-16 text-center">
        <p className="text-[10px] font-bold tracking-[0.28em] text-slate-500 uppercase">
          Suscripciones institucionales
        </p>
        <h1 className="font-display font-extrabold text-3xl md:text-5xl text-forest-900 tracking-tight mt-3">
          Planes & Precios
        </h1>
        <p className="mt-4 max-w-2xl mx-auto text-sm md:text-base text-slate-500 font-light leading-relaxed">
          Empieza gratis para validar la plataforma · Escala a Pro cuando necesites
          inteligencia de mercado completa · Activa Premium para underwriting institucional
          con IRR Equity y AI.
        </p>
      </div>
    </section>
  );
}

/* ─── Plan cards ────────────────────────────────────────────────────────── */

function PricingCards() {
  return (
    <section
      aria-label="Planes"
      className="bg-slate-50 border-b border-slate-200"
    >
      <div className="max-w-7xl mx-auto px-6 md:px-8 py-10 md:py-14">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8 items-stretch">
          {PLANS.map((plan) => (
            <PlanCard key={plan.id} plan={plan} />
          ))}
        </div>
      </div>
    </section>
  );
}

function PlanCard({ plan }: { plan: Plan }) {
  return (
    <article
      id={plan.id}
      aria-label={`Plan ${plan.name}`}
      className={cn(
        "relative bg-white p-6 rounded-2xl flex flex-col transition-all",
        plan.featured
          ? "border-2 border-forest-900 shadow-xl scale-[1.02] z-10"
          : "border border-slate-200 shadow-sm hover:shadow-md"
      )}
    >
      {/* Tier eyebrow */}
      <div className="mb-4">
        {plan.featured ? (
          <span className="inline-block px-2.5 py-0.5 bg-forest-900 text-white text-[9px] font-bold tracking-[0.2em] rounded-full uppercase">
            {plan.tier}
          </span>
        ) : (
          <span className="block text-[10px] font-bold tracking-[0.28em] text-slate-400 uppercase">
            {plan.tier}
          </span>
        )}

        <h2 className="text-3xl font-extrabold text-forest-900 tracking-tight mt-2">
          {plan.name}
        </h2>
        <p className="text-xs text-slate-500 mt-1 font-medium">{plan.headline}</p>
      </div>

      {/* Price */}
      <div className="mb-5 pb-5 border-b border-slate-100">
        <div className="font-display font-extrabold text-3xl md:text-4xl text-forest-900 tracking-tight leading-none">
          {plan.priceMajor}
        </div>
        <p className="text-[11px] text-slate-400 mt-1 font-medium">{plan.priceSuffix}</p>
      </div>

      {/* Description */}
      <p className="text-sm text-slate-600 leading-relaxed mb-6 flex-grow">
        {plan.description}
      </p>

      {/* CTA */}
      <Link
        href={plan.ctaHref}
        className={cn(
          "block w-full py-2.5 text-center font-bold rounded-lg transition-all uppercase text-[11px] tracking-[0.18em]",
          plan.featured
            ? "bg-forest-900 text-white shadow-md shadow-forest-900/20 hover:brightness-110"
            : "border-2 border-forest-900 text-forest-900 hover:bg-forest-900 hover:text-white"
        )}
      >
        {plan.ctaLabel}
      </Link>
    </article>
  );
}

/* ─── Comparison matrix ─────────────────────────────────────────────────── */

function ComparisonMatrix() {
  return (
    <section
      aria-label="Comparativa de capacidades"
      className="bg-white border-b border-slate-200"
    >
      <div className="max-w-7xl mx-auto px-6 md:px-8 py-12 md:py-16">
        <h2 className="font-display font-extrabold text-2xl md:text-3xl text-forest-900 tracking-tight mb-2">
          Comparativa institucional
        </h2>
        <p className="text-sm text-slate-500 mb-8">
          Capacidades incluidas en cada plan · scroll horizontal en móvil para detalle.
        </p>

        <div className="overflow-x-auto -mx-6 px-6 md:mx-0 md:px-0">
          <table className="w-full text-left border-collapse min-w-[640px]">
            <thead>
              <tr className="border-b-2 border-slate-200">
                <th className="py-4 pr-4 text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500 w-1/2">
                  Capacidad
                </th>
                <th className="py-4 px-3 text-[11px] font-bold uppercase tracking-[0.18em] text-slate-700 text-center">
                  Free
                </th>
                <th className="py-4 px-3 text-[11px] font-bold uppercase tracking-[0.18em] text-forest-900 text-center">
                  Pro
                </th>
                <th className="py-4 px-3 text-[11px] font-bold uppercase tracking-[0.18em] text-forest-900 text-center">
                  Premium
                </th>
              </tr>
            </thead>
            <tbody>
              {FEATURES.map((group) => (
                <FeatureGroup key={group.category} group={group} />
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}

function FeatureGroup({ group }: { group: FeatureRow }) {
  return (
    <>
      <tr className="bg-slate-50">
        <td colSpan={4} className="py-2.5 px-3 text-[10px] font-bold tracking-[0.22em] text-slate-500 uppercase">
          {group.category}
        </td>
      </tr>
      {group.features.map((f) => (
        <tr key={f.label} className="border-b border-slate-100">
          <td className="py-3 pr-4 text-sm text-slate-700">{f.label}</td>
          <td className="py-3 px-3 text-center"><FeatureCell on={f.free} /></td>
          <td className="py-3 px-3 text-center"><FeatureCell on={f.pro} /></td>
          <td className="py-3 px-3 text-center"><FeatureCell on={f.premium} /></td>
        </tr>
      ))}
    </>
  );
}

function FeatureCell({ on }: { on: boolean }) {
  return on ? (
    <Check size={18} className="text-forest-900 inline-block" aria-label="Incluido" />
  ) : (
    <Minus size={16} className="text-slate-300 inline-block" aria-label="No incluido" />
  );
}

/* ─── Trust strip ───────────────────────────────────────────────────────── */

function TrustStrip() {
  return (
    <section
      aria-label="Confianza y soberanía de datos"
      className="bg-slate-50"
    >
      <div className="max-w-7xl mx-auto px-6 md:px-8 py-10 md:py-14">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {TRUST_SIGNALS.map((signal) => (
            <article
              key={signal.headline}
              className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm"
            >
              <signal.icon size={20} className="text-forest-900" aria-hidden />
              <h3 className="text-sm font-bold text-forest-900 mt-3 tracking-tight">
                {signal.headline}
              </h3>
              <p className="text-xs text-slate-500 leading-relaxed mt-1.5">
                {signal.body}
              </p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
