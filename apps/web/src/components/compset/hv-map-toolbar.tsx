"use client";

import { cn } from "@/lib/utils";

interface HVMapToolbarProps {
  className?: string;
  children: React.ReactNode;
}

/**
 * HVMapToolbar · bottom-right dock for HotelVALORA-owned map controls.
 *
 * Phase 2.E layout (2026-05-22 · operator-approved):
 *   · Top-LEFT     · AVUXI categories + heatmap legend
 *   · Top-RIGHT    · HV HotelsButton (toggles the right panel)
 *   · Right edge   · CompetitorPanel / AssetSelectionPanel (data panel)
 *                    · clamped vertically to clear top + bottom controls
 *   · Bottom-RIGHT · this toolbar · stacks zoom + CAPAS + future tools
 *
 * Children render in JSX order from TOP to BOTTOM (normal `flex-col`):
 *   <HVMapToolbar>
 *     <MapControls />   ← zoom +/- (rendered first · sits at the top)
 *     <CapasButton />   ← CAPAS (rendered last · sits at the bottom)
 *     <FutureTool />    ← any new tool plugged below CAPAS
 *   </HVMapToolbar>
 *
 * If we ever need new tools to push CAPAS upward instead, swap to
 * `flex-col-reverse` and the visual order flips automatically.
 */
export function HVMapToolbar({ className, children }: HVMapToolbarProps) {
  return (
    <div
      className={cn(
        "absolute right-4 bottom-4 z-30 flex flex-col gap-2",
        className,
      )}
    >
      {children}
    </div>
  );
}
