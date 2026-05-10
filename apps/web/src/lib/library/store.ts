"use client";

import { create } from "zustand";
import type {
  LibraryLayerState,
  LibraryLegendState,
} from "@/types/library";

// Library page state — legend toggles, layer toggles, search, and the
// currently selected report. In-memory only by design: this surface is
// purely per-session UX state. Saved-vs-promoted membership lives
// server-side (future API), not here.
//
// Note: the FAVORITOS / TOP segmented control is no longer in this
// store — it became route-driven (favorites-map ↔ top-map) and lives
// in `library-filter-tabs.tsx` via `usePathname`.

interface LibraryUIState {
  legend: LibraryLegendState;
  layers: LibraryLayerState;
  searchQuery: string;
  selectedReportId: string | null;

  toggleLegend: (key: keyof LibraryLegendState) => void;
  toggleLayer: (key: keyof LibraryLayerState) => void;
  setSearchQuery: (q: string) => void;
  setSelectedReportId: (id: string | null) => void;
}

const DEFAULT_LEGEND: LibraryLegendState = {
  saved: true,
  community: true,
  topPromote: true,
};

const DEFAULT_LAYERS: LibraryLayerState = {
  heatmap: false,
  metroLines: false,
  historicCenter: false,
};

export const useLibraryStore = create<LibraryUIState>((set) => ({
  legend: DEFAULT_LEGEND,
  layers: DEFAULT_LAYERS,
  searchQuery: "",
  selectedReportId: null,

  toggleLegend: (key) =>
    set((s) => ({ legend: { ...s.legend, [key]: !s.legend[key] } })),
  toggleLayer: (key) =>
    set((s) => ({ layers: { ...s.layers, [key]: !s.layers[key] } })),
  setSearchQuery: (q) => set({ searchQuery: q }),
  setSelectedReportId: (id) => set({ selectedReportId: id }),
}));
