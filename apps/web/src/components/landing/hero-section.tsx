/**
 * Hero section — server component.
 *
 * Interactivity is delegated to <HeroSearch /> (client boundary).
 * The static headline and body copy remain server-rendered.
 */

import { HeroSearch } from "./hero-search";

export function HeroSection() {
  return (
    <section className="landing-hero flex flex-col items-center justify-center px-6 relative z-20 bg-grid-dots bg-slate-100 py-8 md:py-[clamp(0.5rem,2vh,2.25rem)]">
      {/* Decorative ambient blobs · clipped to the hero by an INNER overflow
       *  layer (NOT the section) so the search dropdown can overflow the hero
       *  downward as a floating overlay without being clipped on mobile. */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
        <div className="absolute -bottom-48 -left-48 w-1/3 h-1/3 rounded-full bg-emerald-100/30 blur-[120px]" />
        <div className="absolute -top-48 -right-48 w-1/3 h-1/3 rounded-full bg-slate-200/40 blur-[120px]" />
      </div>

      {/* Headline — static, server-rendered.
       *  Desktop `md:mb-11` (vs base mb-5) opens the title→search air by raising
       *  the title: under the hero's justify-center, the equal `md:mb-6` added to
       *  the search below cancels the search's downward shift, so the search stays
       *  put and only the title rises. Mobile keeps base mb-5 (title stays at top). */}
      <div className="w-full max-w-5xl text-center mb-5 md:mb-[clamp(1rem,3.4vh,2.75rem)] relative z-10">
        {/* Fluid title — scales smoothly with viewport width instead of a hard
            text-3xl→text-5xl jump at md. 30px floor (mobile, unchanged) → 48px
            ceiling (≥1920) · ~41px at a 1366 laptop so the hero+cards fit at 100%. */}
        <h1 className="font-display font-extrabold text-[clamp(1.875rem,1.2rem+1.6vw,3rem)] text-forest-900 tracking-tight mb-3 leading-tight">
          VALORA HOTELES
          {/* Always break so the title is two clean lines on mobile AND desktop:
              "VALORA HOTELES" / "EN SEGUNDOS" (never the auto-wrap "… EN" / "SEGUNDOS"). */}
          <br />
          <span className="bg-gradient-to-br from-forest-900 to-forest-700 bg-clip-text text-transparent">
            EN SEGUNDOS
          </span>
        </h1>
        <p className="text-slate-500 text-sm md:text-base max-w-xl mx-auto font-light leading-relaxed">
          Análisis institucional y escenarios de inversión hotelera
        </p>
      </div>

      {/* Client boundary — search with autocomplete.
       *  Mobile `mt-6` lowers the search a touch (more title→search separation;
       *  title stays anchored at the top). Desktop `md:mt-2` keeps the original
       *  top gap; `md:mb-6` is the counterweight to the headline's `md:mb-11`
       *  (see above) so the desktop search position is unchanged. */}
      <HeroSearch className="w-full max-w-3xl relative z-10 mt-6 md:mt-2 md:mb-[clamp(0.5rem,1.9vh,1.5rem)]" />
    </section>
  );
}
