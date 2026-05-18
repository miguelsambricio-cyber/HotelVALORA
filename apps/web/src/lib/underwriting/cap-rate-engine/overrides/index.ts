import type { CapRateOverride } from "../types";

/**
 * Override Layer.
 *
 * Operators MUST be able to override the engine recommendation in any
 * institutional underwriting workflow. The override is captured with
 * full audit trail · the delta vs the engine recommendation is exposed
 * so committees see both numbers.
 */
export function buildOverride(
  override: { enabled: boolean; manual_value_pct?: number; operator_rationale?: string; operator_email?: string },
  recommendedPct: number,
): CapRateOverride {
  if (!override.enabled || override.manual_value_pct === undefined) {
    return { enabled: false };
  }
  const manual = override.manual_value_pct;
  return {
    enabled: true,
    manual_value_pct: manual,
    operator_rationale: override.operator_rationale,
    operator_email: override.operator_email,
    applied_at: new Date().toISOString(),
    delta_vs_recommended_pct: Math.round((manual - recommendedPct) * 100) / 100,
  };
}
