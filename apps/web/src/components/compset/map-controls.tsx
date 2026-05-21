"use client";

import { Layers, Plus, Minus } from "lucide-react";
import { cn } from "@/lib/utils";

interface MapControlsProps {
  className?: string;
  onZoomIn?: () => void;
  onZoomOut?: () => void;
  /** When provided, renders the Layers/Filters toggle button at the top
   *  of the control stack · click flips the parent's panel state. */
  layersPanelOpen?: boolean;
  onToggleLayersPanel?: () => void;
}

/**
 * Map controls stack · top-right (desktop) · top-left (mobile).
 *
 * Previously included two non-functional placeholder buttons (Compass +
 * Utensils). Now: a single Layers / Filters toggle (opens the legend
 * panel) plus the canonical zoom +/- pair. Keeps the working surface
 * minimal · maximizes the visible map area · matches institutional GIS
 * tooling convention (Bloomberg/CoStar terminal style).
 */
export function MapControls({
  className,
  onZoomIn,
  onZoomOut,
  layersPanelOpen = false,
  onToggleLayersPanel,
}: MapControlsProps) {
  return (
    <div className={cn("flex flex-col gap-2", className)}>
      {onToggleLayersPanel && (
        <button
          type="button"
          title={layersPanelOpen ? "Cerrar capas" : "Mostrar capas"}
          aria-label="Toggle map layers panel"
          aria-pressed={layersPanelOpen}
          aria-expanded={layersPanelOpen}
          onClick={onToggleLayersPanel}
          className={cn(
            "w-10 h-10 rounded-lg flex items-center justify-center shadow-sm transition-colors border",
            layersPanelOpen
              ? "bg-forest-900 text-white border-forest-900"
              : "glass-overlay text-forest-900 border-white/50 hover:bg-white"
          )}
        >
          <Layers size={18} />
        </button>
      )}

      <button
        type="button"
        title="Acercar"
        aria-label="Acercar"
        onClick={onZoomIn}
        className="w-10 h-10 glass-overlay rounded-lg flex items-center justify-center text-forest-900 shadow-sm hover:bg-white transition-colors border border-white/50"
      >
        <Plus size={20} />
      </button>

      <button
        type="button"
        title="Alejar"
        aria-label="Alejar"
        onClick={onZoomOut}
        className="w-10 h-10 glass-overlay rounded-lg flex items-center justify-center text-forest-900 shadow-sm hover:bg-white transition-colors border border-white/50"
      >
        <Minus size={20} />
      </button>
    </div>
  );
}
