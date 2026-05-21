"use client";

/**
 * Embedded report-map widget.
 *
 * Phase 1b migration (operator-approved 2026-05-21) · adopts the
 * `<HVMap mode="report-embed">` shell from
 * `apps/web/src/components/maps/hv-map/index.tsx`.
 *
 * Visual output is byte-equal to the pre-migration version:
 *   · same <section> wrapper with `compset-map-container bg-slate-200`
 *   · same CompsetMapGL inside an absolute inset-0 div
 *   · same MapControls top-right (right-4 top-4)
 *   · same MapLegend bottom-left (left-4 bottom-4)
 *   · same error toast positioning
 *
 * Net new (zero behavior impact):
 *   · `<AvuxiOverlay enabled={false}>` mounted by HVMap · renders null
 *     in Phase 1 · reserves the Phase 2 swap point
 *
 * /compset · CompsetMap · /experiment-avuxi all UNTOUCHED · per
 * operator directive.
 */

import dynamic from "next/dynamic";
import { useCompset }     from "@/lib/hooks/use-compset";
import { useMapViewport } from "@/hooks/maps/use-map-viewport";
import { MapControls }    from "@/components/compset/map-controls";
import { MapLegend }      from "@/components/compset/map-legend";
import { HVMap }          from "@/components/maps/hv-map";
import type { CompsetMapGLProps } from "@/components/maps/compset-map-gl";

// Phase 2 feature flag · same env var as /compset · default OFF.
const AVUXI_ENABLED = process.env.NEXT_PUBLIC_AVUXI_ENABLED === "true";

const CompsetMapGL = dynamic<CompsetMapGLProps>(
  () => import("@/components/maps/compset-map-gl").then((m) => m.CompsetMapGL),
  {
    ssr: false,
    loading: () => <div className="w-full h-full bg-slate-200 animate-pulse" />,
  }
);

interface ReportMapProps {
  referenceHotelId?: string;
  className?: string;
}

export function ReportMap({ referenceHotelId, className }: ReportMapProps) {
  const {
    referenceHotel,
    competitors,
    suggested,
    layers,
    error,
    toggleLayer,
  } = useCompset(referenceHotelId);

  const { viewState, setViewState, zoomIn, zoomOut } = useMapViewport();

  return (
    <HVMap
      mode="report-embed"
      ariaLabel="Mapa de ubicación y CompSet"
      className={className}
    >
      {/* Map GL · same absolute inset-0 z-0 contract as before */}
      <div className="absolute inset-0 z-0">
        <CompsetMapGL
          viewState={viewState}
          onViewStateChange={setViewState}
          referenceHotel={referenceHotel}
          competitors={competitors}
          suggested={suggested}
          layers={layers}
          avuxi={AVUXI_ENABLED}
        />
      </div>

      {/* Zoom controls — top-right (unchanged positioning) */}
      <MapControls
        className="absolute right-4 top-4 z-30"
        onZoomIn={zoomIn}
        onZoomOut={zoomOut}
      />

      {/* Layer legend — bottom-left (unchanged positioning) */}
      <MapLegend
        layers={layers}
        onToggleLayer={toggleLayer}
        className="absolute left-4 bottom-4 z-30"
      />

      {error && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-40 bg-red-50 text-red-700 text-xs font-semibold px-4 py-2 rounded-lg border border-red-200 shadow">
          {error}
        </div>
      )}
    </HVMap>
  );
}
