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

export type HVMapMode = "explore" | "analysis" | "report-embed";

export interface HVMapProps {
  /** Workspace mode · informational · parent surface decides composition. */
  mode: HVMapMode;
  /** Inner content · typically the Mapbox <Map> tree + side panels.
   *  When Phase 2 is enabled, the `<CompsetMapGL>` child mounts
   *  `<AvuxiOverlay>` itself inside `<Map>` (needs `useMap()` context). */
  children: React.ReactNode;
  /** Optional override · defaults preserve the `compset-map-container`
   *  + `bg-slate-200` legacy contract used by CSS height calcs. */
  className?: string;
  /** Accessible label for the section element. */
  ariaLabel?: string;
}

/**
 * Phase 1 scaffolding · same JSX shape as the legacy section wrapper.
 * Callers (CompsetMap · ReportMap) adopt this without any visual change.
 *
 * Phase 2 update (2026-05-22): the AVUXI overlay is no longer mounted
 * here as a sibling. It must live INSIDE the Mapbox `<Map>` to access
 * the `useMap()` context, so `<CompsetMapGL>` mounts it directly as a
 * child of `<Map>`. The HVMap shell stays a pure section wrapper.
 */
export function HVMap({
  mode: _mode,
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
    </section>
  );
}

export { AvuxiOverlay } from "./avuxi-overlay";
export type { AvuxiOverlayProps } from "./avuxi-overlay";
