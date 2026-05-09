// Global underwriting scenario state.
//
// Single source of truth for the analytical lens applied across the entire
// financial model: P&L, Underwriting IRR, debt service / DSCR, exit cap,
// and sensitivity analyses all read from this store.
//
// UI labels are localised at the component layer (e.g. ScenarioToggle shows
// "Conservador / Mercado / Optimista") — the canonical internal terms stay
// `downside / base / upside` so the calc layer is language-agnostic.
//
// Implementation: Zustand. The hook is consumed exclusively by client
// components; server components may import the type but must not call the
// hook (would error at runtime).

import { create } from "zustand";

export type UnderwritingScenario = "downside" | "base" | "upside";

interface ScenarioState {
  scenario: UnderwritingScenario;
  setScenario: (next: UnderwritingScenario) => void;
}

export const useScenarioStore = create<ScenarioState>()((set) => ({
  scenario: "base",
  setScenario: (scenario) => set({ scenario }),
}));

/** Convenience hook — equivalent to `useScenarioStore()` but typed as a tuple. */
export function useScenario(): [
  UnderwritingScenario,
  (next: UnderwritingScenario) => void,
] {
  const scenario = useScenarioStore((s) => s.scenario);
  const setScenario = useScenarioStore((s) => s.setScenario);
  return [scenario, setScenario];
}

/** Display labels — used by ScenarioToggle and any read-only readouts. */
export const SCENARIO_LABELS: Record<UnderwritingScenario, string> = {
  downside: "Conservador",
  base: "Mercado",
  upside: "Optimista",
};

export const SCENARIO_OPTIONS: { id: UnderwritingScenario; label: string }[] = [
  { id: "downside", label: SCENARIO_LABELS.downside },
  { id: "base", label: SCENARIO_LABELS.base },
  { id: "upside", label: SCENARIO_LABELS.upside },
];
