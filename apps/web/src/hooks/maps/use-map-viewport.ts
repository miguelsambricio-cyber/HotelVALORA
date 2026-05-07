"use client";

import { useState, useCallback } from "react";
import type { MapViewport } from "@/lib/maps/types";
import { DEFAULT_VIEWPORT } from "@/lib/maps/map-config";

export interface UseMapViewportReturn {
  viewState: MapViewport;
  setViewState: (vs: MapViewport) => void;
  zoomIn: () => void;
  zoomOut: () => void;
}

export function useMapViewport(
  initial: Partial<MapViewport> = {}
): UseMapViewportReturn {
  const [viewState, setViewState] = useState<MapViewport>({
    ...DEFAULT_VIEWPORT,
    ...initial,
  });

  const zoomIn = useCallback(() => {
    setViewState((v) => ({ ...v, zoom: Math.min(v.zoom + 1, 22) }));
  }, []);

  const zoomOut = useCallback(() => {
    setViewState((v) => ({ ...v, zoom: Math.max(v.zoom - 1, 0) }));
  }, []);

  return { viewState, setViewState, zoomIn, zoomOut };
}
