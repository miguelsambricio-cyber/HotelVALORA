"use client";

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
  className?: string;
}

export function MapLegend({ layers, onToggleLayer, className }: MapLegendProps) {
  return (
    <div
      className={cn(
        "glass-overlay p-4 rounded-lg shadow-lg border border-white/50 min-w-[200px]",
        className
      )}
    >
      <div className="space-y-2">
        {/* Static legend items */}
        <div className="flex items-center gap-3">
          <span className="w-3 h-3 rounded-full bg-forest-900 flex-shrink-0" />
          <span className="text-xs font-semibold text-forest-900">Hotel Ref</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="w-3 h-3 rounded-full bg-blue-600 flex-shrink-0" />
          <span className="text-xs font-semibold text-forest-900">CompSet</span>
        </div>

        <div className="border-t border-forest-900/10 my-1" />

        {/* Toggleable layers */}
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
