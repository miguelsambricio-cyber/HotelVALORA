"use client";

import { cn } from "@/lib/utils";

interface HVMapToolbarProps {
  className?: string;
  children: React.ReactNode;
}

/**
 * HVMapToolbar · bottom-left dock for HotelVALORA-owned map controls.
 *
 * Map layout architecture (2026-05-22 · operator-approved):
 *   · Mapbox owns top-left          · zoom + future compass/pitch/geolocate
 *   · AVUXI owns top-right          · native horizontal strip + heatmap legend
 *   · Right edge mid-vertical hosts data panels (CompetitorPanel /
 *     AssetSelectionPanel) · clamped top-16 ↔ bottom-16 so it never
 *     covers the AVUXI strip above or the HV toolbar below
 *   · HV owns bottom-left           · this component · the toolbar
 *
 * Children stack with `flex-col-reverse` so the FIRST JSX child sits at
 * the BOTTOM of the visual stack · later children stack UPWARD. This
 * keeps the anchor (e.g. CapasButton) at a stable bottom position as
 * new tools are added · adding a new tool only inserts above existing
 * ones · zero layout churn for existing buttons.
 *
 * Future tools (measure · search · filter · export · etc.) plug in as
 * additional children without touching this component or the rest of
 * the map layout.
 */
export function HVMapToolbar({ className, children }: HVMapToolbarProps) {
  return (
    <div
      className={cn(
        "absolute left-4 bottom-4 z-30 flex flex-col-reverse gap-2",
        className,
      )}
    >
      {children}
    </div>
  );
}
