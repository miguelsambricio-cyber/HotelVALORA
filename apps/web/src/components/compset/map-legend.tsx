"use client";

import { X, Landmark } from "lucide-react";
import { cn } from "@/lib/utils";
import type { MapLayer, MapLayerId } from "@/types/compset";

/**
 * CAPAS panel · Phase 2.C.3 (2026-05-22).
 *
 * Single section "HOTELVALORA" listing the three HV-owned items:
 *   · Hotel Ref          (legend · forest-900 dot · static)
 *   · CompSet            (legend · blue dot · static)
 *   · Centro Histórico   (HV-native polygon · toggleable)
 *
 * AVUXI categories are managed exclusively via AVUXI's own native UI
 * (top-right horizontal strip on the map). This panel does NOT mirror,
 * sync, or shadow AVUXI state in any way.
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

export function MapLegend({
  layers,
  onToggleLayer,
  onClose,
  className,
}: MapLegendProps) {
  const historico = layers.find((l) => l.id === "historico");

  return (
    <div
      role="dialog"
      aria-label="Capas HotelVALORA"
      className={cn(
        "glass-overlay rounded-lg shadow-lg border border-white/50 min-w-[220px] overflow-hidden",
        className,
      )}
    >
      {/* Header · close-only · the section title lives in the body */}
      {onClose && (
        <div className="px-3 py-1.5 border-b border-forest-900/10 flex items-center justify-end">
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar panel de capas"
            className="text-slate-400 hover:text-slate-700 transition-colors"
          >
            <X size={14} />
          </button>
        </div>
      )}

      {/* Single HOTELVALORA section */}
      <div className="p-3">
        <p className="text-[9px] font-bold tracking-[0.22em] text-slate-500 uppercase mb-2">
          HotelValora
        </p>

        <div className="space-y-1.5">
          {/* Hotel Ref · static legend */}
          <div className="flex items-center gap-3 py-0.5">
            <span className="w-3 h-3 rounded-full bg-forest-900 flex-shrink-0" />
            <span className="text-xs font-semibold text-forest-900">Hotel Ref</span>
          </div>

          {/* CompSet · static legend */}
          <div className="flex items-center gap-3 py-0.5">
            <span className="w-3 h-3 rounded-full bg-blue-600 flex-shrink-0" />
            <span className="text-xs font-semibold text-forest-900">CompSet</span>
          </div>

          {/* Centro Histórico · toggleable HV-native polygon */}
          {historico && (
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
          )}
        </div>
      </div>
    </div>
  );
}
