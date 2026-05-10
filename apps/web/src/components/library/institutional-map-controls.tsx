"use client";

import Link from "next/link";
import { Layers, LayoutList, Minus, Plus } from "lucide-react";

export interface InstitutionalMapControlsProps {
  onZoomIn?: () => void;
  onZoomOut?: () => void;
  onToggleLayers?: () => void;
  /** When set, renders a list-view link button between zoom-out and layers. */
  listViewHref?: string;
}

/**
 * Top-right floating zoom + layers stack. Buttons are no-ops by default
 * — wire callbacks in once a real map provider lands. Each control is a
 * standalone, screen-reader-friendly button so keyboard users can drive
 * the map without a mouse.
 *
 * `listViewHref` adds a list-view Link button immediately under zoom-out
 * — the canonical map ↔ list toggle on /library/favorites-map.
 */
export function InstitutionalMapControls({
  onZoomIn,
  onZoomOut,
  onToggleLayers,
  listViewHref,
}: InstitutionalMapControlsProps) {
  return (
    <div className="pointer-events-auto absolute right-4 top-4 flex flex-col gap-1.5">
      <ControlButton onClick={onZoomIn} ariaLabel="Zoom in">
        <Plus size={16} aria-hidden className="text-forest-900" />
      </ControlButton>
      <ControlButton onClick={onZoomOut} ariaLabel="Zoom out">
        <Minus size={16} aria-hidden className="text-forest-900" />
      </ControlButton>
      {listViewHref && (
        <ControlLink href={listViewHref} ariaLabel="Switch to list view">
          <LayoutList size={16} aria-hidden className="text-forest-900" />
        </ControlLink>
      )}
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

const CONTROL_CLASSES =
  "rounded-lg bg-white p-2 shadow-md transition-colors hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-700/40";

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
      className={[CONTROL_CLASSES, className].filter(Boolean).join(" ")}
    >
      {children}
    </button>
  );
}

function ControlLink({
  href,
  children,
  ariaLabel,
  className,
}: {
  href: string;
  children: React.ReactNode;
  ariaLabel: string;
  className?: string;
}) {
  return (
    <Link
      href={href}
      aria-label={ariaLabel}
      className={[CONTROL_CLASSES, "flex items-center justify-center", className]
        .filter(Boolean)
        .join(" ")}
    >
      {children}
    </Link>
  );
}
