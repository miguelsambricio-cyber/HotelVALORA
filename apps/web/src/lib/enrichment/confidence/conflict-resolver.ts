/**
 * Conflict resolver (v1).
 *
 * Implements the institutional overwrite policy from architecture
 * doc §4.4. Given:
 *   - the current canonical value (with its confidence)
 *   - the new candidate value (with its confidence)
 * decides whether the canonical row is updated, the new value is
 * shelved as provenance only, or the disagreement is routed to a
 * review queue.
 *
 *   new_conf ≥ existing_conf + 0.10        → AUTO_SUPERSEDE (update canonical)
 *   new_conf within ±0.10 of existing      → CONFLICT       (record provenance, route to review)
 *   new_conf < existing_conf − 0.10        → ABSORB         (record provenance only, canonical untouched)
 *   existing has manual_override pin       → PRESERVE       (provenance recorded, never supersede)
 *   identical values (deep-equal)          → REINFORCE      (no canonical change; counts toward agreement bonus next pass)
 */

// ───────────────────────────────────────────────────────────────────────────
// Inputs / outputs
// ───────────────────────────────────────────────────────────────────────────

export interface FieldValueWithConfidence {
  value: unknown;
  confidence: number;
  /** True if the existing canonical value is curator-pinned. */
  manualOverride?: boolean;
}

export type ConflictResolution =
  | "AUTO_SUPERSEDE"
  | "CONFLICT"
  | "ABSORB"
  | "PRESERVE"
  | "REINFORCE"
  | "ADOPT"; // existing is null — new value is adopted unconditionally

export interface ConflictResolutionResult {
  resolution: ConflictResolution;
  /** True when canonical should be updated to the new value. */
  shouldUpdateCanonical: boolean;
  /** True when this disagreement should land in the review queue. */
  shouldEnqueueReview: boolean;
  /** Resulting value to persist into canonical (existing or new). */
  resolvedValue: unknown;
  /** Resulting confidence for canonical (existing or new). */
  resolvedConfidence: number;
  /** Diff fields for audit_log. */
  diff: {
    before: { value: unknown; confidence: number };
    after: { value: unknown; confidence: number };
  };
  rationale: string;
}

// ───────────────────────────────────────────────────────────────────────────
// Resolver
// ───────────────────────────────────────────────────────────────────────────

const TIE_BAND = 0.1;

function isNullish(v: unknown): boolean {
  return v === null || v === undefined;
}

function deepEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (typeof a !== typeof b) return false;
  if (a === null || b === null) return false;
  if (typeof a === "object") {
    try {
      return JSON.stringify(a) === JSON.stringify(b);
    } catch {
      return false;
    }
  }
  return false;
}

/**
 * Resolve a conflict between the existing canonical field-value and a
 * new candidate field-value.
 */
export function resolveFieldConflict(
  existing: FieldValueWithConfidence | null,
  candidate: FieldValueWithConfidence,
): ConflictResolutionResult {
  // Case 0 — Existing is null: adopt unconditionally
  if (existing === null || isNullish(existing.value)) {
    return {
      resolution: "ADOPT",
      shouldUpdateCanonical: true,
      shouldEnqueueReview: false,
      resolvedValue: candidate.value,
      resolvedConfidence: candidate.confidence,
      diff: {
        before: { value: existing?.value ?? null, confidence: existing?.confidence ?? 0 },
        after: { value: candidate.value, confidence: candidate.confidence },
      },
      rationale: "existing_was_null → adopt_candidate",
    };
  }

  // Case 1 — Existing has manual override pin: never supersede
  if (existing.manualOverride) {
    return {
      resolution: "PRESERVE",
      shouldUpdateCanonical: false,
      shouldEnqueueReview: false,
      resolvedValue: existing.value,
      resolvedConfidence: existing.confidence,
      diff: {
        before: { value: existing.value, confidence: existing.confidence },
        after: { value: existing.value, confidence: existing.confidence },
      },
      rationale: "manual_override_pin → preserve_existing",
    };
  }

  // Case 2 — Values are deeply equal: reinforce
  if (deepEqual(existing.value, candidate.value)) {
    // Confidence may rise via agreement bonus on the *new* fetch's
    // calculator; here we simply keep the higher of the two as the new
    // canonical confidence (no value change).
    const resolvedConfidence = Math.max(existing.confidence, candidate.confidence);
    return {
      resolution: "REINFORCE",
      shouldUpdateCanonical: resolvedConfidence > existing.confidence,
      shouldEnqueueReview: false,
      resolvedValue: existing.value,
      resolvedConfidence,
      diff: {
        before: { value: existing.value, confidence: existing.confidence },
        after: { value: existing.value, confidence: resolvedConfidence },
      },
      rationale: "values_equal → reinforce_confidence",
    };
  }

  const delta = candidate.confidence - existing.confidence;

  // Case 3 — Candidate is decisively higher: supersede
  if (delta >= TIE_BAND) {
    return {
      resolution: "AUTO_SUPERSEDE",
      shouldUpdateCanonical: true,
      shouldEnqueueReview: false,
      resolvedValue: candidate.value,
      resolvedConfidence: candidate.confidence,
      diff: {
        before: { value: existing.value, confidence: existing.confidence },
        after: { value: candidate.value, confidence: candidate.confidence },
      },
      rationale: `delta=${delta.toFixed(3)} ≥ ${TIE_BAND} → auto_supersede`,
    };
  }

  // Case 4 — Candidate is decisively lower: absorb (record only)
  if (delta <= -TIE_BAND) {
    return {
      resolution: "ABSORB",
      shouldUpdateCanonical: false,
      shouldEnqueueReview: false,
      resolvedValue: existing.value,
      resolvedConfidence: existing.confidence,
      diff: {
        before: { value: existing.value, confidence: existing.confidence },
        after: { value: existing.value, confidence: existing.confidence },
      },
      rationale: `delta=${delta.toFixed(3)} ≤ -${TIE_BAND} → absorb_candidate_no_canonical_change`,
    };
  }

  // Case 5 — Tie band (±0.10): conflict → review queue
  return {
    resolution: "CONFLICT",
    shouldUpdateCanonical: false,
    shouldEnqueueReview: true,
    resolvedValue: existing.value,
    resolvedConfidence: existing.confidence,
    diff: {
      before: { value: existing.value, confidence: existing.confidence },
      after: { value: candidate.value, confidence: candidate.confidence },
    },
    rationale: `delta=${delta.toFixed(3)} within ±${TIE_BAND} → enqueue_review_queue`,
  };
}

// ───────────────────────────────────────────────────────────────────────────
// Quality-tier computation
// ───────────────────────────────────────────────────────────────────────────

export type QualityTier = "gold" | "silver" | "bronze" | "quarantined";

export interface QualityTierInputs {
  tier0Complete: boolean;
  tier1Pct: number;
  tier2Pct: number;
  corroboratingSourcesPerField: Record<string, number>;
}

/**
 * Compute the post-enrichment quality tier per architecture doc §6.3.
 *
 *   gold        T0 8/8 AND avg T1 conf ≥ 0.85 implied (we proxy via
 *               t1_pct=1.0 strict AND ≥2 independent sources on ≥3 fields)
 *   silver      T0 8/8 AND t1_pct ≥ 0.70 AND t2_pct ≥ 0.60
 *   bronze      T0 8/8 AND t1_pct ≥ 0.90
 *   quarantined otherwise
 */
export function computeQualityTier(inputs: QualityTierInputs): QualityTier {
  if (!inputs.tier0Complete) return "quarantined";

  const fieldsWithMultipleSources = Object.values(inputs.corroboratingSourcesPerField).filter(
    (n) => n >= 2,
  ).length;

  if (inputs.tier1Pct >= 0.99 && inputs.tier2Pct >= 0.85 && fieldsWithMultipleSources >= 3) {
    return "gold";
  }
  if (inputs.tier1Pct >= 0.7 && inputs.tier2Pct >= 0.6) {
    return "silver";
  }
  if (inputs.tier1Pct >= 0.9) {
    return "bronze";
  }
  if (inputs.tier1Pct >= 0.5) {
    return "bronze";
  }
  return "quarantined";
}
