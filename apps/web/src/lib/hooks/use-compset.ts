"use client";

import { useState, useEffect } from "react";
import type {
  CompetitorHotel,
  MapLayer,
  MapLayerId,
  UseCompsetReturn,
} from "@/types/compset";
import {
  fetchCompset,
  DEFAULT_LAYERS,
  REFERENCE_HOTEL,
} from "@/lib/api/compset";

export function useCompset(referenceHotelId = "ref-001"): UseCompsetReturn {
  const [referenceHotel, setReferenceHotel] =
    useState<CompetitorHotel>(REFERENCE_HOTEL);
  const [competitors, setCompetitors] = useState<CompetitorHotel[]>([]);
  const [suggested, setSuggested] = useState<CompetitorHotel[]>([]);
  const [layers, setLayers] = useState<MapLayer[]>(DEFAULT_LAYERS);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [panelOpen, setPanelOpen] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);

    fetchCompset(referenceHotelId)
      .then(({ referenceHotel, competitors, suggested }) => {
        if (cancelled) return;
        setReferenceHotel(referenceHotel);
        setCompetitors(competitors);
        setSuggested(suggested);
        setError(null);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        // Clear any stale subject/competitors so the UI never shows a wrong
        // (placeholder) hotel behind the error — the subject failed to resolve.
        setCompetitors([]);
        setSuggested([]);
        setError(
          err instanceof Error ? err.message : "Error cargando compset"
        );
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [referenceHotelId]);

  function addCompetitor(hotel: CompetitorHotel) {
    setSuggested((prev) => prev.filter((h) => h.id !== hotel.id));
    setCompetitors((prev) => [...prev, hotel]);
  }

  function removeCompetitor(id: string) {
    const hotel = competitors.find((h) => h.id === id);
    if (!hotel) return;
    setCompetitors((prev) => prev.filter((h) => h.id !== id));
    setSuggested((prev) => [...prev, hotel]);
  }

  function toggleLayer(id: MapLayerId) {
    setLayers((prev) =>
      prev.map((l) => (l.id === id ? { ...l, enabled: !l.enabled } : l))
    );
  }

  return {
    referenceHotel,
    competitors,
    suggested,
    layers,
    isLoading,
    error,
    panelOpen,
    setPanelOpen,
    addCompetitor,
    removeCompetitor,
    toggleLayer,
  };
}
