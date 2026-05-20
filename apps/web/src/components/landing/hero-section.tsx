/**
 * Hero section — server component.
 *
 * Interactivity is delegated to <HeroSearch /> (client boundary).
 * The static headline and body copy remain server-rendered.
 */

import { HeroSearch } from "./hero-search";

export function HeroSection() {
  return (
    <section className="landing-hero flex-shrink-0 flex flex-col items-center justify-center px-6 relative overflow-hidden bg-grid-dots bg-slate-100 py-8 md:py-10">
      {/* Decorative ambient blobs */}
      <div className="pointer-events-none absolute -bottom-48 -left-48 w-1/3 h-1/3 rounded-full bg-emerald-100/30 blur-[120px]" />
      <div className="pointer-events-none absolute -top-48 -right-48 w-1/3 h-1/3 rounded-full bg-slate-200/40 blur-[120px]" />

      {/* Headline — static, server-rendered */}
      <div className="w-full max-w-5xl text-center mb-5 relative z-10">
        <h1 className="font-display font-extrabold text-3xl md:text-5xl text-forest-900 tracking-tight mb-3 leading-tight">
          VALORA HOTELES{" "}
          <br className="hidden md:block" />
          <span className="bg-gradient-to-br from-forest-900 to-forest-700 bg-clip-text text-transparent">
            EN SEGUNDOS
          </span>
        </h1>
        <p className="text-slate-500 text-sm md:text-base max-w-xl mx-auto font-light leading-relaxed">
          Análisis institucional y escenarios de inversión en activos hoteleros
        </p>
      </div>

      {/* Client boundary — search with autocomplete */}
      <HeroSearch className="w-full max-w-3xl relative z-10 mt-2" />
    </section>
  );
}
