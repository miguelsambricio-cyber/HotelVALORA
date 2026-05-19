/**
 * Field-level confidence calculator (v1).
 *
 * Implements the institutional formula from architecture doc §3.1:
 *
 *   confidence = clamp(0, 1,
 *                  tier_weight × freshness_decay × validation_multiplier
 *                + agreement_bonus)
 *
 * Where:
 *   - tier_weight comes from `tier-registry` (per-field override
 *     allowed via `fieldAuthorityOverride`)
 *   - freshness_decay is linear: 1.0 at fetch_at, → 0.5 at fetch_at + 365 days
 *   - validation_multiplier is 1.0 on validation pass, 0.8 on fail
 *   - agreement_bonus is +0.10 per matching independent source, cap +0.25
 *   - manual override always pins to 1.0 (handled by conflict-resolver)
 */

import {
  fieldAuthorityOverride,
  getTier,
  type SourceKey,
} from "./tier-registry";

// ───────────────────────────────────────────────────────────────────────────
// Freshness
// ───────────────────────────────────────────────────────────────────────────

const ONE_YEAR_MS = 365 * 24 * 60 * 60 * 1000;

/**
 * Freshness decay. Returns 1.0 for "just fetched" and decays linearly
 * to 0.5 over 365 days. Anything older than 730 days clamps at 0.4.
 *
 * The decay is intentionally gentle — institutional hotel attributes
 * (name, rooms, brand, location) change rarely. The decay exists to
 * acknowledge gradual drift, not to penalise it harshly.
 */
export function freshnessDecay(fetchedAt: Date, now: Date = new Date()): number {
  const ageMs = Math.max(0, now.getTime() - fetchedAt.getTime());
  const ageYears = ageMs / ONE_YEAR_MS;
  if (ageYears <= 0) return 1.0;
  if (ageYears >= 2) return 0.4;
  // 0 → 1.0, 1y → 0.5, 2y → 0.4 (linear two-segment)
  if (ageYears <= 1) return 1.0 - 0.5 * ageYears;
  return 0.5 - 0.1 * (ageYears - 1);
}

// ───────────────────────────────────────────────────────────────────────────
// Validation multiplier
// ───────────────────────────────────────────────────────────────────────────

export interface ValidationOutcome {
  passed: boolean;
  /** Optional explanation surfaced into provenance. */
  detail?: string;
}

export function validationMultiplier(outcome: ValidationOutcome | undefined | null): number {
  if (!outcome) return 1.0;
  return outcome.passed ? 1.0 : 0.8;
}

// ───────────────────────────────────────────────────────────────────────────
// Agreement bonus (multi-source corroboration)
// ───────────────────────────────────────────────────────────────────────────

export interface CorroboratingSource {
  source: SourceKey;
  value: unknown;
  fetchedAt: Date;
}

/**
 * `+0.10 per matching independent source, cap +0.25` (arch doc §3.1).
 * Corroborating sources must be **distinct from the primary** AND must
 * agree with the primary value (caller passes only matching ones).
 *
 * Disagreement does not subtract — it routes through the conflict
 * resolver instead.
 */
export function agreementBonus(corroborating: readonly CorroboratingSource[]): number {
  const distinctSources = new Set(corroborating.map((c) => c.source));
  const bonus = 0.1 * distinctSources.size;
  return Math.min(0.25, bonus);
}

// ───────────────────────────────────────────────────────────────────────────
// Composite calculator
// ───────────────────────────────────────────────────────────────────────────

export interface FieldConfidenceInputs {
  fieldName: string;
  primarySource: SourceKey;
  fetchedAt: Date;
  validation?: ValidationOutcome | null;
  /** Other sources that independently agree with this value. */
  corroborating?: readonly CorroboratingSource[];
  /** If true, value is curator-pinned — confidence = 1.0 regardless. */
  manualOverride?: boolean;
  /** Current date (for freshness). Useful for tests + replay. */
  now?: Date;
}

export interface FieldConfidenceResult {
  confidence: number;
  breakdown: {
    tierWeight: number;
    fieldOverride: number | null;
    freshness: number;
    validation: number;
    agreementBonus: number;
    manualOverride: boolean;
    formula: string;
  };
}

export function computeFieldConfidence(inputs: FieldConfidenceInputs): FieldConfidenceResult {
  if (inputs.manualOverride) {
    return {
      confidence: 1.0,
      breakdown: {
        tierWeight: 1.0,
        fieldOverride: null,
        freshness: 1.0,
        validation: 1.0,
        agreementBonus: 0,
        manualOverride: true,
        formula: "manual_override → 1.0",
      },
    };
  }

  const tier = getTier(inputs.primarySource);
  const override = fieldAuthorityOverride(inputs.primarySource, inputs.fieldName);
  const tierWeight = override ?? tier.weight;
  const freshness = freshnessDecay(inputs.fetchedAt, inputs.now ?? new Date());
  const validation = validationMultiplier(inputs.validation);
  const bonus = agreementBonus(inputs.corroborating ?? []);

  const raw = tierWeight * freshness * validation + bonus;
  const confidence = Math.min(1, Math.max(0, raw));

  return {
    confidence: Math.round(confidence * 1000) / 1000,
    breakdown: {
      tierWeight,
      fieldOverride: override,
      freshness: Math.round(freshness * 1000) / 1000,
      validation,
      agreementBonus: bonus,
      manualOverride: false,
      formula: `${tierWeight.toFixed(2)} × ${freshness.toFixed(3)} × ${validation.toFixed(2)} + ${bonus.toFixed(2)} = ${confidence.toFixed(3)}`,
    },
  };
}
