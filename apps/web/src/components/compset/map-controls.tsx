"use client";

import { Plus, Minus } from "lucide-react";
import { cn } from "@/lib/utils";

interface MapControlsProps {
  className?: string;
  onZoomIn?: () => void;
  onZoomOut?: () => void;
}

/**
 * Map zoom controls · always top-left.
 *
 * Phase 2.C.3 (2026-05-22) · CAPAS toggle button extracted to its own
 * `CapasButton` component so zoom and CAPAS can be positioned
 * independently (zoom top-left, CAPAS aligned to the AVUXI bar
 * top-right · they no longer share a control stack).
 */
export function MapControls({
  className,
  onZoomIn,
  onZoomOut,
}: MapControlsProps) {
  return (
    <div className={cn("flex flex-col gap-2", className)}>
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
