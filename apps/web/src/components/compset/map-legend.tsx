"use client";

import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import type { MapLayer, MapLayerId } from "@/types/compset";

interface LayerToggleProps {
  enabled: boolean;
}

function LayerToggle({ enabled }: LayerToggleProps) {
  return (
    <div className="relative inline-flex items-center flex-shrink-0" aria-hidden>
      <div
        className={cn(
          "w-7 h-4 rounded-full transition-colors",
          enabled ? "bg-forest-900" : "bg-slate-200"
        )}
      />
      <div
        className={cn(
          "absolute w-3 h-3 bg-white rounded-full shadow-sm transition-transform",
          enabled ? "translate-x-3.5" : "translate-x-0.5"
        )}
      />
    </div>
  );
}

interface MapLegendProps {
  layers: MapLayer[];
  onToggleLayer: (id: MapLayerId) => void;
  /** When provided, renders a close (×) button in the header · the
   *  parent flips its `layersPanelOpen` state. */
  onClose?: () => void;
  className?: string;
}

/**
 * Layers panel · institutional legend with on-demand visibility.
 *
 * QA #002 closure: previously a permanent bottom-left chrome that
 * always occupied ~200x180 px of the map surface. Now rendered on
 * demand from the top-right Layers/Filters button so the map's useful
 * area is maximised.
 *
 * Content unchanged (pin-color keys + 3 layer toggles · Hotel Ref ·
 * CompSet · Heatmap · Líneas de Metro · Centro Histórico).
 */
export function MapLegend({ layers, onToggleLayer, onClose, className }: MapLegendProps) {
  return (
    <div
      role="dialog"
      aria-label="Capas y leyenda del mapa"
      className={cn(
        "glass-overlay rounded-lg shadow-lg border border-white/50 min-w-[220px] overflow-hidden",
        className
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

      {/* Body · pin legend + toggleable layers */}
      <div className="p-3 space-y-2">
        <div className="flex items-center gap-3">
          <span className="w-3 h-3 rounded-full bg-forest-900 flex-shrink-0" />
          <span className="text-xs font-semibold text-forest-900">Hotel Ref</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="w-3 h-3 rounded-full bg-blue-600 flex-shrink-0" />
          <span className="text-xs font-semibold text-forest-900">CompSet</span>
        </div>

        <div className="border-t border-forest-900/10 my-1" />

        {layers.map((layer) => (
          <button
            key={layer.id}
            type="button"
            onClick={() => onToggleLayer(layer.id)}
            aria-pressed={layer.enabled}
            className="flex items-center justify-between gap-3 w-full cursor-pointer group pt-1"
          >
            <div className="flex items-center gap-3">
              {layer.id === "heatmap" && (
                <span
                  className="w-3 h-3 rounded-full flex-shrink-0"
                  style={{
                    background: "radial-gradient(circle, #fbbf24, #d97706)",
                  }}
                />
              )}
              {layer.id === "metro" && (
                <span className="w-4 h-0.5 bg-red-500 flex-shrink-0" />
              )}
              {layer.id === "historico" && (
                <span className="w-4 h-4 border border-forest-900 border-dashed bg-forest-900/5 rounded-sm flex-shrink-0" />
              )}
              <span className="text-xs font-semibold text-forest-900">
                {layer.label}
              </span>
            </div>
            <LayerToggle enabled={layer.enabled} />
          </button>
        ))}
      </div>
    </div>
  );
}
