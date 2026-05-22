"use client";

import {
  X,
  Mountain,
  Utensils,
  ShoppingBag,
  Wine,
  TrainFront,
  Landmark,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type {
  HeatmapCategory,
  MapLayer,
  MapLayerId,
} from "@/types/compset";

/**
 * CAPAS panel · Phase 2.C (2026-05-22 · operator-approved Option A).
 *
 * Single HotelVALORA control surface · AVUXI native UI is CSS-hidden in
 * CompsetMapGL · this panel is the only end-user driver.
 *
 * Structure:
 *
 *   HEATMAP DE ATRACCIÓN
 *     · Master toggle "Heatmap de Atracción"
 *     · When ON, radio of 5 AVUXI categories:
 *         Demanda Turística · Gastronomía · Shopping · Nightlife ·
 *         Transporte público
 *
 *   MOVILIDAD
 *     · Metro (separate toggle · drives AVUXI metro layer)
 *
 *   ZONIFICACIÓN
 *     · Centro Histórico (HV-native MapPolygonLayer · independent of AVUXI)
 *
 * AVUXI free-tier exposes a single heatmap category at a time. The
 * radio honours that constraint instead of pretending 5 toggles can
 * coexist.
 */

interface LayerToggleProps {
  enabled: boolean;
}

function LayerToggle({ enabled }: LayerToggleProps) {
  return (
    <div className="relative inline-flex items-center flex-shrink-0" aria-hidden>
      <div
        className={cn(
          "w-7 h-4 rounded-full transition-colors",
          enabled ? "bg-forest-900" : "bg-slate-200",
        )}
      />
      <div
        className={cn(
          "absolute w-3 h-3 bg-white rounded-full shadow-sm transition-transform",
          enabled ? "translate-x-3.5" : "translate-x-0.5",
        )}
      />
    </div>
  );
}

interface MapLegendProps {
  layers: MapLayer[];
  onToggleLayer: (id: MapLayerId) => void;
  onSetHeatmapCategory: (category: HeatmapCategory) => void;
  /** When provided, renders a close (×) button in the header. */
  onClose?: () => void;
  className?: string;
}

interface HeatmapCategoryDef {
  id: HeatmapCategory;
  label: string;
  Icon: LucideIcon;
}

const HEATMAP_CATEGORIES: HeatmapCategoryDef[] = [
  { id: "sightseeing", label: "Demanda Turística",  Icon: Mountain },
  { id: "eating",      label: "Gastronomía",        Icon: Utensils },
  { id: "shopping",    label: "Shopping",           Icon: ShoppingBag },
  { id: "nightlife",   label: "Nightlife",          Icon: Wine },
  { id: "transport",   label: "Transporte público", Icon: TrainFront },
];

export function MapLegend({
  layers,
  onToggleLayer,
  onSetHeatmapCategory,
  onClose,
  className,
}: MapLegendProps) {
  const heatmap = layers.find((l) => l.id === "heatmap");
  const metro = layers.find((l) => l.id === "metro");
  const historico = layers.find((l) => l.id === "historico");

  const heatmapCategory: HeatmapCategory =
    heatmap && heatmap.id === "heatmap" ? heatmap.category : "sightseeing";

  return (
    <div
      role="dialog"
      aria-label="Capas y leyenda del mapa"
      className={cn(
        "glass-overlay rounded-lg shadow-lg border border-white/50 min-w-[260px] overflow-hidden",
        className,
      )}
    >
      {/* Header · eyebrow + close */}
      <div className="px-4 py-2.5 border-b border-forest-900/10 flex items-center justify-between">
        <p className="text-[10px] font-bold tracking-[0.2em] text-slate-500 uppercase">
          Capas
        </p>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar panel de capas"
            className="text-slate-400 hover:text-slate-700 transition-colors -mr-1"
          >
            <X size={14} />
          </button>
        )}
      </div>

      {/* Body */}
      <div className="p-3 space-y-3">
        {/* Static pin legend */}
        <div className="space-y-1.5">
          <div className="flex items-center gap-3">
            <span className="w-3 h-3 rounded-full bg-forest-900 flex-shrink-0" />
            <span className="text-xs font-semibold text-forest-900">Hotel Ref</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="w-3 h-3 rounded-full bg-blue-600 flex-shrink-0" />
            <span className="text-xs font-semibold text-forest-900">CompSet</span>
          </div>
        </div>

        {/* HEATMAP DE ATRACCIÓN · master toggle + radio when ON */}
        {heatmap && (
          <section>
            <p className="text-[9px] font-bold tracking-[0.22em] text-slate-500 uppercase mb-1.5">
              Heatmap de Atracción
            </p>
            <button
              type="button"
              onClick={() => onToggleLayer("heatmap")}
              aria-pressed={heatmap.enabled}
              className="flex items-center justify-between gap-3 w-full cursor-pointer group py-0.5"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <Mountain
                  size={13}
                  className={cn(
                    "flex-shrink-0",
                    heatmap.enabled ? "text-forest-900" : "text-slate-400",
                  )}
                />
                <span className="text-xs font-semibold text-forest-900 truncate">
                  {heatmap.label}
                </span>
              </div>
              <LayerToggle enabled={heatmap.enabled} />
            </button>

            {/* Radio · only when master toggle is ON */}
            {heatmap.enabled && (
              <div className="mt-2 pl-1 space-y-0.5 border-l border-forest-900/10 ml-2">
                {HEATMAP_CATEGORIES.map(({ id, label, Icon }) => {
                  const isActive = heatmapCategory === id;
                  return (
                    <button
                      key={id}
                      type="button"
                      onClick={() => onSetHeatmapCategory(id)}
                      aria-pressed={isActive}
                      className={cn(
                        "flex items-center gap-2 w-full px-2 py-1 rounded-sm transition-colors text-left",
                        isActive
                          ? "bg-forest-900/8 text-forest-900"
                          : "text-slate-500 hover:bg-forest-900/4 hover:text-forest-900",
                      )}
                    >
                      <span
                        className={cn(
                          "w-2 h-2 rounded-full flex-shrink-0 border-[1.5px]",
                          isActive
                            ? "bg-forest-900 border-forest-900"
                            : "bg-transparent border-slate-400",
                        )}
                      />
                      <Icon
                        size={12}
                        className={cn(
                          "flex-shrink-0",
                          isActive ? "text-forest-900" : "text-slate-400",
                        )}
                      />
                      <span className="text-[11px] font-semibold truncate">
                        {label}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </section>
        )}

        {/* MOVILIDAD · Metro */}
        {metro && (
          <section>
            <p className="text-[9px] font-bold tracking-[0.22em] text-slate-500 uppercase mb-1.5">
              Movilidad
            </p>
            <button
              type="button"
              onClick={() => onToggleLayer("metro")}
              aria-pressed={metro.enabled}
              className="flex items-center justify-between gap-3 w-full cursor-pointer group py-0.5"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <TrainFront
                  size={13}
                  className={cn(
                    "flex-shrink-0",
                    metro.enabled ? "text-forest-900" : "text-slate-400",
                  )}
                />
                <span className="text-xs font-semibold text-forest-900 truncate">
                  {metro.label}
                </span>
              </div>
              <LayerToggle enabled={metro.enabled} />
            </button>
          </section>
        )}

        {/* ZONIFICACIÓN · HV-native · independent of AVUXI */}
        {historico && (
          <section>
            <p className="text-[9px] font-bold tracking-[0.22em] text-slate-500 uppercase mb-1.5">
              Zonificación
            </p>
            <button
              type="button"
              onClick={() => onToggleLayer("historico")}
              aria-pressed={historico.enabled}
              className="flex items-center justify-between gap-3 w-full cursor-pointer group py-0.5"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <Landmark
                  size={13}
                  className={cn(
                    "flex-shrink-0",
                    historico.enabled ? "text-forest-900" : "text-slate-400",
                  )}
                />
                <span className="text-xs font-semibold text-forest-900 truncate">
                  {historico.label}
                </span>
              </div>
              <LayerToggle enabled={historico.enabled} />
            </button>
          </section>
        )}
      </div>
    </div>
  );
}
