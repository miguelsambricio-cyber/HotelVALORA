"use client";

import dynamic from "next/dynamic";
import { useCompset }     from "@/lib/hooks/use-compset";
import { useMapViewport } from "@/hooks/maps/use-map-viewport";
import { MapControls }    from "@/components/compset/map-controls";
import { MapLegend }      from "@/components/compset/map-legend";
import { cn }             from "@/lib/utils";
import type { CompsetMapGLProps } from "@/components/maps/compset-map-gl";

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
    <section
      aria-label="Mapa de ubicación y CompSet"
      className={cn(
        "relative w-full overflow-hidden bg-slate-200 compset-map-container",
        className
      )}
    >
      {/* Map GL */}
      <div className="absolute inset-0 z-0">
        <CompsetMapGL
          viewState={viewState}
          onViewStateChange={setViewState}
          referenceHotel={referenceHotel}
          competitors={competitors}
          suggested={suggested}
          layers={layers}
        />
      </div>

      {/* Zoom controls — top-right */}
      <MapControls
        className="absolute right-4 top-4 z-30"
        onZoomIn={zoomIn}
        onZoomOut={zoomOut}
      />

      {/* Layer legend — bottom-left */}
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
    </section>
  );
}
