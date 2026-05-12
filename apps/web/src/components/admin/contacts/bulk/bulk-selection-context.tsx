"use client";

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";

/**
 * Client-side selection state for the contacts surface.
 *
 * Two modes:
 *   - `explicit` — operator ticked specific rows. `selectedIds` is the
 *     canonical set.
 *   - `filtered` — operator hit "Select filtered set". The selection
 *     is the entire current filter result; `selectedIds` is empty (the
 *     server re-runs the filter at action time). `filteredCount` is a
 *     surface-level estimate (pass-through from the page · used for
 *     the toolbar copy).
 *
 * Selection is intentionally NOT persisted across reloads. Matches
 * Gmail / Notion / linear behaviour and keeps the URL clean.
 */

type Mode = "none" | "explicit" | "filtered";

interface BulkSelectionState {
  mode: Mode;
  selectedIds: Set<string>;
  filteredCount: number;
  totalOnPage: number;
}

interface BulkSelectionApi extends BulkSelectionState {
  toggle: (id: string) => void;
  selectPage: (ids: string[]) => void;
  clearPage: (ids: string[]) => void;
  selectFiltered: () => void;
  clear: () => void;
  isSelected: (id: string) => boolean;
  count: number;
  /** Encoded form-data fragment ids=<csv>. Empty when mode=filtered. */
  idsCsv: string;
}

const BulkSelectionContext = createContext<BulkSelectionApi | null>(null);

export function BulkSelectionProvider({
  children,
  filteredCount,
  totalOnPage,
}: {
  children: ReactNode;
  filteredCount: number;
  totalOnPage: number;
}) {
  const [mode, setMode] = useState<Mode>("none");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set());

  const toggle = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
    setMode((prevMode) => (prevMode === "filtered" ? "explicit" : (prevMode === "none" ? "explicit" : prevMode)));
  }, []);

  const selectPage = useCallback((ids: string[]) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      for (const id of ids) next.add(id);
      return next;
    });
    setMode("explicit");
  }, []);

  const clearPage = useCallback((ids: string[]) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      for (const id of ids) next.delete(id);
      return next;
    });
    setMode((prevMode) => (selectedIds.size > 0 ? prevMode : "none"));
  }, [selectedIds.size]);

  const selectFiltered = useCallback(() => {
    setSelectedIds(new Set());
    setMode("filtered");
  }, []);

  const clear = useCallback(() => {
    setSelectedIds(new Set());
    setMode("none");
  }, []);

  const value = useMemo<BulkSelectionApi>(() => {
    const count = mode === "filtered" ? filteredCount : selectedIds.size;
    return {
      mode,
      selectedIds,
      filteredCount,
      totalOnPage,
      toggle,
      selectPage,
      clearPage,
      selectFiltered,
      clear,
      isSelected: (id: string) => selectedIds.has(id),
      count,
      idsCsv: Array.from(selectedIds).join(","),
    };
  }, [mode, selectedIds, filteredCount, totalOnPage, toggle, selectPage, clearPage, selectFiltered, clear]);

  return <BulkSelectionContext.Provider value={value}>{children}</BulkSelectionContext.Provider>;
}

export function useBulkSelection(): BulkSelectionApi {
  const ctx = useContext(BulkSelectionContext);
  if (!ctx) {
    throw new Error("useBulkSelection must be used inside BulkSelectionProvider");
  }
  return ctx;
}
