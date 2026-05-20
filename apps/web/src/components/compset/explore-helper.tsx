"use client";

import { Building2, MapPinned } from "lucide-react";
import { cn } from "@/lib/utils";

interface ExploreHelperProps {
  /** Total number of hotels visible on the map · drives the headline counter. */
  hotelCount: number;
  className?: string;
}

/**
 * Right-edge overlay shown on bare `/compset` (institutional explore
 * mode). Replaces the `<CompetitorPanel />` of analysis mode. The card
 * explains the flow without prescribing: click any pin → popup with
 * KPIs + "Iniciar análisis" CTA → /compset?ref=<hotel.id>.
 *
 * Mirrors the panel's geometry (w-[min(288px,…)] md:w-72 · glass-overlay
 * shell · same z-index band) so the explore/analysis transition feels
 * structural · not stylistic.
 */
export function ExploreHelper({ hotelCount, className }: ExploreHelperProps) {
  return (
    <div className={cn("flex h-full pointer-events-none", className)}>
      <div className="w-[min(288px,calc(100vw-72px))] md:w-72 glass-overlay border border-white/50 rounded-xl shadow-xl overflow-hidden pointer-events-auto flex flex-col">
        {/* Header */}
        <div className="px-4 py-3 border-b border-slate-200/60 flex-shrink-0">
          <p className="text-[10px] font-bold tracking-[0.2em] text-slate-400 uppercase">
            Modo Exploración
          </p>
          <div className="flex items-center gap-2 mt-1">
            <MapPinned size={14} className="text-forest-900 flex-shrink-0" />
            <p className="text-xs font-bold text-forest-900">
              Universo institucional Madrid
            </p>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3 min-h-0">
          <div className="flex items-baseline gap-2">
            <span className="font-display text-3xl font-extrabold text-forest-900 tracking-tight leading-none">
              {hotelCount}
            </span>
            <span className="text-[10px] font-bold tracking-[0.18em] text-slate-500 uppercase">
              hoteles disponibles
            </span>
          </div>

          <p className="text-xs text-slate-600 leading-relaxed">
            Selecciona un hotel del mapa para iniciar el análisis competitivo.
            El sistema generará automáticamente el CompSet de 4 competidores
            más 3 sugerencias por IA.
          </p>

          <div className="rounded-lg border border-slate-200/80 bg-white/50 px-3 py-2.5 space-y-2">
            <p className="text-[9px] font-bold tracking-[0.22em] text-slate-400 uppercase">
              Flow institucional
            </p>
            <ol className="space-y-1.5 text-[11px] text-slate-700">
              <li className="flex items-start gap-2">
                <span className="font-bold text-forest-900 leading-none mt-0.5">1.</span>
                <span>Explora el universo de hoteles en el mapa</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="font-bold text-forest-900 leading-none mt-0.5">2.</span>
                <span>Click en un pin · revisa KPIs en el popup</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="font-bold text-forest-900 leading-none mt-0.5">3.</span>
                <span>"Iniciar análisis →" genera el CompSet automático</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="font-bold text-forest-900 leading-none mt-0.5">4.</span>
                <span>Underwriting institucional listo</span>
              </li>
            </ol>
          </div>
        </div>

        {/* Footer */}
        <div className="px-4 py-3 border-t border-slate-200/60 flex-shrink-0 flex items-center gap-2 bg-slate-50/60">
          <Building2 size={12} className="text-slate-400 flex-shrink-0" />
          <p className="text-[10px] text-slate-500 leading-snug">
            Cobertura Tier-2 · ampliación a 250+ hoteles en curso
          </p>
        </div>
      </div>
    </div>
  );
}
