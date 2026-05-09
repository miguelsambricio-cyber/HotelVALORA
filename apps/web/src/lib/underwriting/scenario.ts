// Underwriting scenario type + display labels.
//
// Per Lectura A (institutional underwriting model): no active "selected"
// scenario at the global level. Each scenario is an independent growth
// parameter the analyst tunes — the calc layer uses the base/Mercado rate
// for the live P&L; downside / upside rates are stored for future
// sensitivity views (committee scenario comparison, IRR bands, etc.).
//
// The type stays here as the canonical underwriting vocabulary so that the
// future Underwriting IRR / debt service / sensitivity modules speak the
// same language.

export type UnderwritingScenario = "downside" | "base" | "upside";

/** Display labels — UI never exposes the internal english terms. */
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
