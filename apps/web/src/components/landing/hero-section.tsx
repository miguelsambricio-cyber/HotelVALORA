"use client";

import { useState } from "react";
import { Search, Map } from "lucide-react";

export function HeroSection() {
  const [query, setQuery] = useState("");

  return (
    <section className="flex-grow flex flex-col items-center justify-start px-6 relative overflow-hidden bg-grid-dots bg-slate-100 pt-24 pb-32">
      {/* Decorative ambient blobs */}
      <div className="pointer-events-none absolute -bottom-48 -left-48 w-1/3 h-1/3 rounded-full bg-emerald-100/30 blur-[120px]" />
      <div className="pointer-events-none absolute -top-48 -right-48 w-1/3 h-1/3 rounded-full bg-slate-200/40 blur-[120px]" />

      {/* Headline */}
      <div className="w-full max-w-5xl text-center mb-16 relative z-10">
        <h1 className="font-display font-extrabold text-5xl md:text-7xl text-forest-900 tracking-tight mb-6 leading-tight">
          VALORA HOTELES{" "}
          <br className="hidden md:block" />
          <span className="bg-gradient-to-br from-forest-900 to-forest-700 bg-clip-text text-transparent">
            EN SEGUNDOS
          </span>
        </h1>
        <p className="text-slate-500 text-lg md:text-xl max-w-2xl mx-auto font-light leading-relaxed">
          Análisis institucional y escenarios de inversión en activos hoteleros
        </p>
      </div>

      {/* Search bar */}
      <div className="w-full max-w-4xl relative z-10 mt-12">
        <div className="backdrop-blur-md bg-white/60 border border-white/80 p-2 rounded-2xl shadow-[0_32px_64px_-12px_rgba(6,44,28,0.08)]">
          <div className="flex flex-col md:flex-row gap-2 bg-white/40 rounded-xl overflow-hidden p-1">
            <label className="flex-grow flex items-center px-6 py-4">
              <Search className="text-slate-400 mr-4 shrink-0" size={20} />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="w-full bg-transparent border-none focus:ring-0 outline-none text-lg font-medium placeholder:text-slate-400 text-slate-800"
                placeholder="Nombre o dirección del hotel..."
                aria-label="Buscar hotel"
              />
            </label>
            <div className="flex gap-2 p-1">
              <button
                type="button"
                aria-label="Buscar en mapa"
                className="flex items-center justify-center aspect-square md:px-6 bg-slate-100 text-slate-600 rounded-xl font-bold hover:bg-slate-200 transition-all"
              >
                <Map size={20} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
