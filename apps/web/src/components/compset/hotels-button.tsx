"use client";

import { Building2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface HotelsButtonProps {
  open: boolean;
  onToggle: () => void;
  className?: string;
}

/**
 * Standalone trigger for the CompSet hotel-selection right panel.
 *
 * Phase 2.E (2026-05-22 · operator layout) · sits at the map's top-right
 * corner · single unambiguous entry point to open / close the
 * CompetitorPanel (analysis) or AssetSelectionPanel (explore). The
 * panel's built-in pull-tab is suppressed via `hideToggle` on the
 * panel so the user always uses this button.
 */
export function HotelsButton({ open, onToggle, className }: HotelsButtonProps) {
  return (
    <button
      type="button"
      title={open ? "Cerrar selección de hoteles" : "Abrir selección de hoteles"}
      aria-label="Toggle hotel selection panel"
      aria-pressed={open}
      aria-expanded={open}
      onClick={onToggle}
      className={cn(
        "w-10 h-10 rounded-lg flex items-center justify-center shadow-sm transition-colors border",
        open
          ? "bg-forest-900 text-white border-forest-900"
          : "glass-overlay text-forest-900 border-white/50 hover:bg-white",
        className,
      )}
    >
      <Building2 size={18} />
    </button>
  );
}
