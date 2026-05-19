"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

/**
 * Underwriting edit-mode store · in-page layout + copy customization.
 *
 * Two-tier state model (mirrors the admin/financials draft-overrides pattern):
 *   · `saved*` — committed values · persisted to localStorage
 *   · `draft*` — pending edits in the current session · in-memory only
 *
 * The operator enters edit mode, drags / edits / hides, and either Saves
 * (commit draft → saved → localStorage) or Discards (drop draft).
 *
 * Card identity = stable string id chosen by the section (e.g. "rooms",
 * "asking-price"). The store never invents ids; sections register them
 * via `registerGrid(gridId, defaultOrder)` on mount so a brand-new tile
 * lands at the end of the list automatically and is visible by default.
 */

const STORAGE_KEY = "underwriting:layout:v1";

export type CardOrders = Record<string, string[]>;
export type CardHidden = Record<string, string[]>;
export type TextOverrides = Record<string, string>;

interface PersistedState {
  savedOrders: CardOrders;
  savedHidden: CardHidden;
  savedTexts: TextOverrides;
  savedAt: number | null;
}

interface EditModeState extends PersistedState {
  // Volatile state — never persisted
  editMode: boolean;
  draftOrders: CardOrders;
  draftHidden: CardHidden;
  draftTexts: TextOverrides;

  // Actions
  toggleEditMode: () => void;
  registerGrid: (gridId: string, defaultOrder: string[]) => void;
  moveCard: (gridId: string, fromIdx: number, toIdx: number) => void;
  hideCard: (gridId: string, cardId: string) => void;
  unhideAll: () => void;
  unhideGrid: (gridId: string) => void;
  setText: (textId: string, value: string) => void;
  commit: () => void;
  discard: () => void;
  resetAll: () => void;
}

function uniqueOrdered(arr: string[]): string[] {
  const seen = new Set<string>();
  return arr.filter((x) => (seen.has(x) ? false : (seen.add(x), true)));
}

/** Merge a default order with a saved one — drops removed ids, appends new ids at end. */
function reconcileOrder(defaultOrder: string[], savedOrder: string[] | undefined): string[] {
  if (!savedOrder || savedOrder.length === 0) return [...defaultOrder];
  const knownIds = new Set(defaultOrder);
  const kept = savedOrder.filter((id) => knownIds.has(id));
  const appended = defaultOrder.filter((id) => !kept.includes(id));
  return uniqueOrdered([...kept, ...appended]);
}

export const useEditModeStore = create<EditModeState>()(
  persist(
    (set, get) => ({
      // ── Persisted slice ──────────────────────────────────────────
      savedOrders: {},
      savedHidden: {},
      savedTexts: {},
      savedAt: null,

      // ── Volatile slice ───────────────────────────────────────────
      editMode: false,
      draftOrders: {},
      draftHidden: {},
      draftTexts: {},

      // ── Actions ──────────────────────────────────────────────────
      toggleEditMode: () => {
        const next = !get().editMode;
        if (next) {
          // Entering edit mode → seed drafts from saved
          set({
            editMode: true,
            draftOrders: { ...get().savedOrders },
            draftHidden: cloneHidden(get().savedHidden),
            draftTexts: { ...get().savedTexts },
          });
        } else {
          // Leaving without Save → drop drafts
          set({
            editMode: false,
            draftOrders: {},
            draftHidden: {},
            draftTexts: {},
          });
        }
      },

      registerGrid: (gridId, defaultOrder) => {
        const { savedOrders, draftOrders, editMode } = get();
        const savedReconciled = reconcileOrder(defaultOrder, savedOrders[gridId]);
        const patch: Partial<EditModeState> = {};
        if ((savedOrders[gridId]?.length ?? 0) !== savedReconciled.length) {
          patch.savedOrders = { ...savedOrders, [gridId]: savedReconciled };
        }
        if (editMode) {
          const draftReconciled = reconcileOrder(defaultOrder, draftOrders[gridId]);
          patch.draftOrders = { ...draftOrders, [gridId]: draftReconciled };
        }
        if (Object.keys(patch).length > 0) set(patch);
      },

      moveCard: (gridId, fromIdx, toIdx) => {
        const { draftOrders, savedOrders } = get();
        const current = draftOrders[gridId] ?? savedOrders[gridId];
        if (!current) return;
        if (fromIdx === toIdx || fromIdx < 0 || toIdx < 0) return;
        if (fromIdx >= current.length || toIdx >= current.length) return;
        const next = [...current];
        const [removed] = next.splice(fromIdx, 1);
        next.splice(toIdx, 0, removed);
        set({ draftOrders: { ...draftOrders, [gridId]: next } });
      },

      hideCard: (gridId, cardId) => {
        const { draftHidden } = get();
        const current = draftHidden[gridId] ?? [];
        if (current.includes(cardId)) return;
        set({ draftHidden: { ...draftHidden, [gridId]: [...current, cardId] } });
      },

      unhideAll: () => {
        const { draftHidden } = get();
        // Reset every known grid's draftHidden to [] (so commit clears them)
        const next: CardHidden = {};
        for (const gridId of Object.keys(draftHidden)) next[gridId] = [];
        set({ draftHidden: next });
      },

      unhideGrid: (gridId) => {
        const { draftHidden } = get();
        if (!draftHidden[gridId] || draftHidden[gridId].length === 0) return;
        set({ draftHidden: { ...draftHidden, [gridId]: [] } });
      },

      setText: (textId, value) => {
        const { draftTexts } = get();
        set({ draftTexts: { ...draftTexts, [textId]: value } });
      },

      commit: () => {
        const { draftOrders, draftHidden, draftTexts, savedOrders, savedHidden, savedTexts } = get();
        set({
          savedOrders: { ...savedOrders, ...draftOrders },
          savedHidden: { ...savedHidden, ...draftHidden },
          savedTexts: { ...savedTexts, ...draftTexts },
          savedAt: Date.now(),
          draftOrders: {},
          draftHidden: {},
          draftTexts: {},
          editMode: false,
        });
      },

      discard: () => {
        set({
          draftOrders: {},
          draftHidden: {},
          draftTexts: {},
          editMode: false,
        });
      },

      resetAll: () => {
        set({
          savedOrders: {},
          savedHidden: {},
          savedTexts: {},
          savedAt: null,
          draftOrders: {},
          draftHidden: {},
          draftTexts: {},
          editMode: false,
        });
      },
    }),
    {
      name: STORAGE_KEY,
      partialize: (state): PersistedState => ({
        savedOrders: state.savedOrders,
        savedHidden: state.savedHidden,
        savedTexts: state.savedTexts,
        savedAt: state.savedAt,
      }),
    },
  ),
);

function cloneHidden(src: CardHidden): CardHidden {
  const out: CardHidden = {};
  for (const [k, v] of Object.entries(src)) out[k] = [...v];
  return out;
}

// ─── Selectors / helpers ────────────────────────────────────────────

/** Returns the current effective order for a grid (draft if editing, otherwise saved). */
export function selectOrder(
  state: EditModeState,
  gridId: string,
  defaultOrder: string[],
): string[] {
  const draft = state.draftOrders[gridId];
  if (state.editMode && draft) return reconcileOrder(defaultOrder, draft);
  const saved = state.savedOrders[gridId];
  if (saved) return reconcileOrder(defaultOrder, saved);
  return defaultOrder;
}

/** Returns the effective text for an id, or the fallback default. */
export function selectText(
  state: EditModeState,
  textId: string,
  defaultText: string,
): string {
  if (state.editMode && textId in state.draftTexts) return state.draftTexts[textId];
  if (textId in state.savedTexts) return state.savedTexts[textId];
  return defaultText;
}

/** Count of hidden cards in the active draft / saved state across all grids. */
export function selectHiddenCount(state: EditModeState): number {
  const src = state.editMode ? state.draftHidden : state.savedHidden;
  let n = 0;
  for (const arr of Object.values(src)) n += arr.length;
  return n;
}

/** True if there are pending edits (draft differs from saved). */
export function selectDirty(state: EditModeState): boolean {
  if (!state.editMode) return false;
  for (const [k, v] of Object.entries(state.draftTexts)) {
    if (state.savedTexts[k] !== v) return true;
  }
  for (const [gridId, order] of Object.entries(state.draftOrders)) {
    const saved = state.savedOrders[gridId] ?? [];
    if (saved.length !== order.length) return true;
    for (let i = 0; i < order.length; i++) {
      if (saved[i] !== order[i]) return true;
    }
  }
  for (const [gridId, hidden] of Object.entries(state.draftHidden)) {
    const saved = state.savedHidden[gridId] ?? [];
    if (saved.length !== hidden.length) return true;
    const setSaved = new Set(saved);
    for (const id of hidden) if (!setSaved.has(id)) return true;
  }
  // Also catch the case where a previously saved-hidden card was un-hidden
  for (const [gridId, saved] of Object.entries(state.savedHidden)) {
    const draft = state.draftHidden[gridId] ?? [];
    if (saved.length !== draft.length) return true;
  }
  return false;
}
