"use client";

import { X, Mountain, Utensils, TrainFront, Landmark, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import type { MapLayer, MapLayerId } from "@/types/compset";

/**
 * CAPAS panel · institutional 4-toggle layer control surface · Phase 2
 * (2026-05-22 · operator-approved with adjustments).
 *
 * Structure:
 *   Static legend (no toggles):
 *     · Hotel Ref
 *     · CompSet
 *
 *   DEMANDA TURÍSTICA (radio · only one heatmap at a time):
 *     · Demanda Turística (heatmap id → AVUXI Sightseeing)
 *     · Gastronomía       (eating  id → AVUXI Eating)
 *
 *   MOVILIDAD:
 *     · Conectividad      (metro id → AVUXI transport + metro)
 *
 *   ZONIFICACIÓN:
 *     · Centro Histórico  (historico id → HV-native MapPolygonLayer · UNCHANGED)
 *
 * AVUXI native UI hidden via CSS in <AvuxiOverlay>. CAPAS is the only
 * end-user control surface. Centro Histórico is fully independent of
 * AVUXI · same rendering path as today · unaffected by feature flag.
 *
 * Radio behavior: when the user toggles Demanda Turística ON, Gastronomía
 * is automatically toggled OFF (and vice versa). Honest about AVUXI's
 * free-tier single-category-at-a-time reality.
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
  /** When provided, renders a close (×) button in the header. */
  onClose?: () => void;
  className?: string;
}

const ICON_FOR_LAYER: Record<MapLayerId, LucideIcon> = {
  heatmap:   Mountain,    // Demanda Turística (Sightseeing)
  eating:    Utensils,    // Gastronomía (Eating)
  metro:     TrainFront,  // Conectividad (Transport)
  historico: Landmark,    // Centro Histórico (HV-native)
};

export function MapLegend({ layers, onToggleLayer, onClose, className }: MapLegendProps) {
  const findLayer = (id: MapLayerId) => layers.find((l) => l.id === id);

  // Radio behavior for heatmap toggles · activating one deactivates the other.
  function handleHeatmapRadio(targetId: "heatmap" | "eating") {
    const target = findLayer(targetId);
    const other = findLayer(targetId === "heatmap" ? "eating" : "heatmap");
    if (!target) return;
    // If turning ON and the other is currently ON, turn the other OFF first
    if (!target.enabled && other?.enabled) {
      onToggleLayer(other.id);
    }
    onToggleLayer(targetId);
  }

  const heatmap = findLayer("heatmap");
  const eating = findLayer("eating");
  const metro = findLayer("metro");
  const historico = findLayer("historico");

  return (
    <div
      role="dialog"
      aria-label="Capas y leyenda del mapa"
      className={cn(
        "glass-overlay rounded-lg shadow-lg border border-white/50 min-w-[240px] overflow-hidden",
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

        {/* DEMANDA TURÍSTICA · radio group */}
        {(heatmap || eating) && (
          <section>
            <p className="text-[9px] font-bold tracking-[0.22em] text-slate-500 uppercase mb-1.5">
              Demanda Turística
            </p>
            <div className="space-y-1">
              {heatmap && (
                <ToggleRow
                  layer={heatmap}
                  Icon={ICON_FOR_LAYER.heatmap}
                  onClick={() => handleHeatmapRadio("heatmap")}
                />
              )}
              {eating && (
                <ToggleRow
                  layer={eating}
                  Icon={ICON_FOR_LAYER.eating}
                  onClick={() => handleHeatmapRadio("eating")}
                />
              )}
            </div>
          </section>
        )}

        {/* MOVILIDAD */}
        {metro && (
          <section>
            <p className="text-[9px] font-bold tracking-[0.22em] text-slate-500 uppercase mb-1.5">
              Movilidad
            </p>
            <ToggleRow
              layer={metro}
              Icon={ICON_FOR_LAYER.metro}
              onClick={() => onToggleLayer("metro")}
            />
          </section>
        )}

        {/* ZONIFICACIÓN · HV-native · independent of AVUXI */}
        {historico && (
          <section>
            <p className="text-[9px] font-bold tracking-[0.22em] text-slate-500 uppercase mb-1.5">
              Zonificación
            </p>
            <ToggleRow
              layer={historico}
              Icon={ICON_FOR_LAYER.historico}
              onClick={() => onToggleLayer("historico")}
            />
          </section>
        )}
      </div>
    </div>
  );
}

interface ToggleRowProps {
  layer: MapLayer;
  Icon: LucideIcon;
  onClick: () => void;
}

function ToggleRow({ layer, Icon, onClick }: ToggleRowProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={layer.enabled}
      className="flex items-center justify-between gap-3 w-full cursor-pointer group py-0.5"
    >
      <div className="flex items-center gap-2.5 min-w-0">
        <Icon size={13} className={cn(
          "flex-shrink-0",
          layer.enabled ? "text-forest-900" : "text-slate-400",
        )} />
        <span className="text-xs font-semibold text-forest-900 truncate">
          {layer.label}
        </span>
      </div>
      <LayerToggle enabled={layer.enabled} />
    </button>
  );
}
