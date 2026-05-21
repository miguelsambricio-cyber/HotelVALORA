"use client";

/**
 * <HVMap> · institutional map workspace shell · Phase 1 scaffolding.
 *
 * Foundation of the 4-layer composition documented in
 * `docs/maps/avuxi-integration-architecture.md` (Mapbox · AVUXI · CoStar
 * · HotelValora). Operator-approved 2026-05-21.
 *
 * Phase 1 contract (this version):
 *   · Thin section wrapper · same render output as the legacy section
 *     used in `<CompsetMap>` and `<ReportMap>` today
 *   · Mounts `<AvuxiOverlay enabled={false} />` as a no-op sibling ·
 *     reserves the Phase 2 swap point without changing behavior
 *   · Accepts children freely · callers compose <CompsetMapGL> + their
 *     own controls + their own right-edge panel as before
 *   · NO state · NO data fetching · pure presentational shell
 *
 * Phase 2+ will:
 *   · Wire AVUXI through `<AvuxiOverlay enabled={true}>` once the
 *     reference implementation at /experiment-avuxi is lifted in
 *   · Replace the legacy `<MapHeatmapLayer>` + `<MapMetroLayer>` mounts
 *     in caller composition with AVUXI's worldwide overlay
 *
 * Production surfaces touched in Phase 1: NONE. /compset · /report/* ·
 * /library/* unchanged. Operators green-light migration of each surface
 * individually in Phase 1b commits.
 */

import { cn } from "@/lib/utils";
import { AvuxiOverlay } from "./avuxi-overlay";

export type HVMapMode = "explore" | "analysis" | "report-embed";

export interface HVMapProps {
  /** Workspace mode · drives parent-level composition decisions (which
   *  side panel to render · which viewport behavior to apply). Today
   *  the shell itself does not branch on mode; the parent surface
   *  decides what to put inside `children`. */
  mode: HVMapMode;
  /** Phase 2+ feature flag · when true, mounts the AVUXI overlay.
   *  Today the overlay component is a stub that renders nothing
   *  regardless of the flag. */
  avuxi?: boolean;
  /** Inner content · typically the Mapbox <Map> tree + the right-edge
   *  panel (CompetitorPanel / AssetSelectionPanel / none for report-embed). */
  children: React.ReactNode;
  /** Optional override · defaults preserve the `compset-map-container`
   *  + `bg-slate-200` legacy contract used by the CSS height calcs in
   *  `apps/web/src/app/globals.css`. */
  className?: string;
  /** Accessible label for the section element. */
  ariaLabel?: string;
}

/**
 * Phase 1 scaffolding · same JSX shape as the legacy section wrapper.
 * Callers (CompsetMap · ReportMap) can adopt this incrementally without
 * any visual change. The single value-add today is the `<AvuxiOverlay>`
 * mount point that Phase 2 will activate.
 */
export function HVMap({
  mode: _mode,
  avuxi = false,
  className,
  ariaLabel,
  children,
}: HVMapProps) {
  return (
    <section
      aria-label={ariaLabel}
      className={cn(
        "relative w-full overflow-hidden compset-map-container bg-slate-200",
        className,
      )}
    >
      {children}
      {/* Phase 2+ swap point · today renders nothing regardless of flag */}
      <AvuxiOverlay enabled={avuxi} />
    </section>
  );
}

export { AvuxiOverlay } from "./avuxi-overlay";
export type { AvuxiOverlayProps } from "./avuxi-overlay";
