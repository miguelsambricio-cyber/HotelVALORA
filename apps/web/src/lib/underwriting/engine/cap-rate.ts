import type { EngineModule } from "./_types";
import type { UnderwritingComputed } from "../types";
import { DEFAULT_RATES_REGIME, SEEDED_HOTEL_COMPS, runDynamicCapRate } from "../cap-rate-engine";

/**
 * Module · cap_rate (entry + exit).
 *
 * Delegates to the Dynamic Cap Rate Engine (`lib/underwriting/cap-rate-engine`).
 * The engine runs the 5-layer architecture:
 *   1. Market Evidence    · seeded comps + rates regime + filtering
 *   2. Adjustment Policy  · category / size / renovation / operator /
 *                           macro / liquidity / scenario / side deltas
 *   3. Confidence         · 4 sub-scores → composite 0-100
 *   4. Rationale          · structured trace + narrative
 *   5. Override           · operator manual_override_pct, audit trail
 *
 * Entry vs Exit: the fixed +20 bps exit hedge was REMOVED (D4 · 2026-05-30).
 * Run on the same `inputs.asset`, entry and exit now resolve to the SAME cap.
 * The entry↔exit difference is driven by the asset's PROJECTED state at exit,
 * computed in `runForHotel` (`underwriting-runner.ts`); the report path pins
 * both caps via `inputs.acquisition.cap_rate` / `inputs.exit.cap_rate`
 * overrides so the exit IRR uses the dynamic exit yield. Standalone callers
 * that don't pin the exit cap get exit = entry (no spread).
 *
 * Block 7 swaps SEEDED_HOTEL_COMPS for a Supabase Intelligence Layer
 * query and adds a Cap Rate Policy Editor (admin) for tuning weights.
 */
export const capRateModule: EngineModule<"cap_rate"> = {
  key: "cap_rate",
  dependsOn: [],
  compute({ inputs }): UnderwritingComputed["cap_rate"] {
    const entryOverride = inputs.acquisition.cap_rate;
    const exitOverride = inputs.exit.cap_rate;

    const ratesRegime = {
      ...DEFAULT_RATES_REGIME,
      euribor_12m_pct: inputs.financing.euribor_12m_pct,
    };

    const entry = runDynamicCapRate({
      asset: inputs.asset,
      scenario_id: inputs.scenario_id,
      override: {
        enabled: !entryOverride.use_dynamic && entryOverride.manual_override_pct !== null,
        manual_value_pct: entryOverride.manual_override_pct ?? undefined,
        operator_rationale: "Operator-pinned entry yield · scenario default",
      },
      rates_regime: ratesRegime,
      comparables: SEEDED_HOTEL_COMPS,
      side: "entry",
    });

    const exit = runDynamicCapRate({
      asset: inputs.asset,
      scenario_id: inputs.scenario_id,
      override: {
        enabled: !exitOverride.use_dynamic && exitOverride.manual_override_pct !== null,
        manual_value_pct: exitOverride.manual_override_pct ?? undefined,
        operator_rationale: "Operator-pinned exit yield · terminal value lock",
      },
      rates_regime: ratesRegime,
      comparables: SEEDED_HOTEL_COMPS,
      side: "exit",
    });

    return {
      entry: { dynamic: entry, used_pct: entry.used_pct, source: entry.source },
      exit: { dynamic: exit, used_pct: exit.used_pct, source: exit.source },
    };
  },
};
