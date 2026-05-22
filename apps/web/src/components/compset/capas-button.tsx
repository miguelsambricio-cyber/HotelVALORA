"use client";

import { Layers } from "lucide-react";
import { cn } from "@/lib/utils";

interface CapasButtonProps {
  open: boolean;
  onToggle: () => void;
  className?: string;
}

/**
 * Standalone CAPAS button · Phase 2.C.3 (2026-05-22).
 *
 * Visually aligns with the AVUXI horizontal button strip (top-right of
 * the map) but lives in its OWN DOM tree (HV-owned · NOT injected into
 * AVUXI's container). Positioning is the consumer's responsibility ·
 * `compset-map.tsx` places it just below AVUXI's strip so the two bars
 * never overlap.
 */
export function CapasButton({ open, onToggle, className }: CapasButtonProps) {
  return (
    <button
      type="button"
      title={open ? "Cerrar capas" : "Mostrar capas"}
      aria-label="Toggle map layers panel"
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
      <Layers size={18} />
    </button>
  );
}
