"use client";

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";

/**
 * Phase 2.D.6 · Client-side selection for /user/admin/users.
 * Same shape as the contacts equivalent — duplicated rather than
 * shared so the two surfaces can evolve independently. Modes:
 *   explicit  — operator ticked specific rows; Set<string> of user ids
 *   filtered  — operator picked "Select all filtered"; server re-runs
 *               the users-page filter at action time
 */

type Mode = "none" | "explicit" | "filtered";

interface BulkSelectionApi {
  mode: Mode;
  selectedIds: Set<string>;
  filteredCount: number;
  totalOnPage: number;
  toggle: (id: string) => void;
  selectPage: (ids: string[]) => void;
  clearPage: (ids: string[]) => void;
  selectFiltered: () => void;
  clear: () => void;
  isSelected: (id: string) => boolean;
  count: number;
  idsCsv: string;
}

const Ctx = createContext<BulkSelectionApi | null>(null);

export function UsersBulkSelectionProvider({
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
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
    setMode((p) => (p === "filtered" ? "explicit" : (p === "none" ? "explicit" : p)));
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
  }, []);

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

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useUsersBulkSelection(): BulkSelectionApi {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useUsersBulkSelection must be used inside UsersBulkSelectionProvider");
  return ctx;
}
