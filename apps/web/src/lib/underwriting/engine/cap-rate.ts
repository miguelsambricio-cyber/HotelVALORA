import type { EngineModule } from "./_types";
import type { DynamicCapRateResult, UnderwritingComputed } from "../types";

/**
 * Module · cap_rate (entry + exit).
 * BLOCK 6 wires the CORE IP · MarketEvidence · AdjustmentLogic ·
 * ConfidenceEngine · OverrideLayer. Until then this module emits a
 * placeholder that honours the operator override so downstream modules
 * have a deterministic input to depend on.
 */

const PLACEHOLDER_DYNAMIC: DynamicCapRateResult = {
  recommended_pct: 0,
  band: { low_pct: 0, high_pct: 0 },
  base_pct: 0,
  evidence: {
    comp_count: 0,
    median_pct: 0,
    p25_pct: 0,
    p75_pct: 0,
    stddev_pct: 0,
    most_recent_date: null,
  },
  adjustments: [],
  confidence: { level: "low", reasons: ["Block 6 not yet implemented · returning placeholder"] },
};

export const capRateModule: EngineModule<"cap_rate"> = {
  key: "cap_rate",
  dependsOn: [],
  compute({ inputs }): UnderwritingComputed["cap_rate"] {
    const entryOverride = inputs.acquisition.cap_rate.manual_override_pct ?? 0;
    const exitOverride = inputs.exit.cap_rate.manual_override_pct ?? 0;
    return {
      entry: {
        dynamic: PLACEHOLDER_DYNAMIC,
        used_pct: entryOverride,
        source: inputs.acquisition.cap_rate.use_dynamic ? "dynamic" : "override",
      },
      exit: {
        dynamic: PLACEHOLDER_DYNAMIC,
        used_pct: exitOverride,
        source: inputs.exit.cap_rate.use_dynamic ? "dynamic" : "override",
      },
    };
  },
};
