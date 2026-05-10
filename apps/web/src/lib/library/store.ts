"use client";

import { create } from "zustand";
import type {
  LibraryFilterTab,
  LibraryLayerState,
  LibraryLegendState,
} from "@/types/library";

// Library page state — legend toggles, layer toggles, filter tab, search,
// selected report id. In-memory only by design: this surface is purely
// per-session UX state. Saved-vs-promoted membership lives server-side
// (future API), not here.

interface LibraryUIState {
  legend: LibraryLegendState;
  layers: LibraryLayerState;
  filterTab: LibraryFilterTab;
  searchQuery: string;
  selectedReportId: string | null;

  toggleLegend: (key: keyof LibraryLegendState) => void;
  toggleLayer: (key: keyof LibraryLayerState) => void;
  setFilterTab: (tab: LibraryFilterTab) => void;
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
  filterTab: "favoritos",
  searchQuery: "",
  selectedReportId: null,

  toggleLegend: (key) =>
    set((s) => ({ legend: { ...s.legend, [key]: !s.legend[key] } })),
  toggleLayer: (key) =>
    set((s) => ({ layers: { ...s.layers, [key]: !s.layers[key] } })),
  setFilterTab: (tab) => set({ filterTab: tab }),
  setSearchQuery: (q) => set({ searchQuery: q }),
  setSelectedReportId: (id) => set({ selectedReportId: id }),
}));
