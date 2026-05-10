"use client";

import { Layers, Minus, Plus } from "lucide-react";

export interface InstitutionalMapControlsProps {
  onZoomIn?: () => void;
  onZoomOut?: () => void;
  onToggleLayers?: () => void;
}

/**
 * Top-right floating zoom + layers stack. Buttons are no-ops by default
 * — wire callbacks in once a real map provider lands. Each control is a
 * standalone, screen-reader-friendly button so keyboard users can drive
 * the map without a mouse.
 */
export function InstitutionalMapControls({
  onZoomIn,
  onZoomOut,
  onToggleLayers,
}: InstitutionalMapControlsProps) {
  return (
    <div className="pointer-events-auto absolute right-4 top-4 flex flex-col gap-1.5">
      <ControlButton onClick={onZoomIn} ariaLabel="Zoom in">
        <Plus size={16} aria-hidden className="text-forest-900" />
      </ControlButton>
      <ControlButton onClick={onZoomOut} ariaLabel="Zoom out">
        <Minus size={16} aria-hidden className="text-forest-900" />
      </ControlButton>
      <ControlButton
        onClick={onToggleLayers}
        ariaLabel="Toggle layers"
        className="mt-2"
      >
        <Layers size={16} aria-hidden className="text-forest-900" />
      </ControlButton>
    </div>
  );
}

function ControlButton({
  children,
  onClick,
  ariaLabel,
  className,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  ariaLabel: string;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={ariaLabel}
      className={[
        "rounded-lg bg-white p-2 shadow-md transition-colors hover:bg-slate-50",
        "focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-700/40",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {children}
    </button>
  );
}
