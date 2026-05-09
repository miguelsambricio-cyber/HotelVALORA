// Underwriting scenario type + display labels.
//
// Three preset profiles drive the entire 5-year forecast: each one is a
// complete (occupancy delta + ADR growth) tuple per year. The active
// scenario lives on `PLAssumptions.activeScenario` (per-hotel state) — the
// calc layer reads `SCENARIO_PRESETS[activeScenario]` from
// `lib/report/financials/assumptions.ts` to get the per-year drivers.

export type UnderwritingScenario = "downside" | "base" | "upside";

/** Display labels — short, committee-grade, used directly by the UI. */
export const SCENARIO_LABELS: Record<UnderwritingScenario, string> = {
  downside: "Down",
  base: "Base",
  upside: "Up",
};

export const SCENARIO_OPTIONS: { id: UnderwritingScenario; label: string }[] = [
  { id: "downside", label: SCENARIO_LABELS.downside },
  { id: "base", label: SCENARIO_LABELS.base },
  { id: "upside", label: SCENARIO_LABELS.upside },
];
