/**
 * HotelVALORA Score → cap-rate adjustment (X4b · TRAMO 3 · factor Score).
 *
 * A better hotel (location / comfort / perceived quality) earns a LOWER cap
 * rate (less perceived risk → buyers pay more for its NOI); a worse one a
 * HIGHER cap. The adjustment is RELATIVE TO THE HOTEL'S OWN COMPSET, not to a
 * global mean — the same absolute score earns a premium only when it stands
 * out against its actual competitors. Agnostic: every market brings its own
 * compset (scales to 190 markets with no code change).
 *
 * Quality score = HotelVALORA Score v1 WITHOUT the Class component (Class
 * overlaps the cap rate's category factor → would double-count). The six
 * guest/location sub-scores are re-normalised exactly as v1 does.
 *
 * STEPPED + ASYMMETRIC mapping (deliberate · Mike):
 *   z = (quality_hotel − mean_compset) / σ_eff   (σ_eff = max(σ_compset, σ_floor))
 *   steps = how many σ-cuts |z| clears (sigma_cuts = [c1, c2, c3])
 *   premium (z>0): −steps · premium_step_pp   (steps of 0.10 → 0/−0.10/−0.20/−0.30)
 *   penalty (z<0): +steps · penalty_step_pp   (steps of 0.05 → 0/+0.05/+0.10/+0.15)
 *   clamped at ±caps. The result is ALWAYS one of the 7 clean values incl. 0,
 *   so the cap rate never shows ragged figures like −0.1873%.
 * Asymmetry is intentional: hotel excellence is scarce and the market prices
 * it with a LARGER premium (up to −0.30) than the discount it applies to
 * mediocre assets (up to +0.15). σ_floor caps over-sensitivity when a compset
 * is very homogeneous (and avoids divide-by-zero when σ = 0).
 *
 * Never penalise for MISSING data:
 *   · hotel without a computable score        → 0 · "sin ajuste por Score"
 *   · compset without enough scored peers (<N) → 0 · "compset sin score"
 */

// v1 weights MINUS the Class component (Class is handled by the category factor).
export const SCORE_QUALITY_WEIGHTS = {
  location_score: 0.30,
  comfort_score: 0.20,
  cleanliness_score: 0.15,
  staff_score: 0.10,
  value_score: 0.10,
  facilities_score: 0.05,
} as const;

export type QualityComponentKey = keyof typeof SCORE_QUALITY_WEIGHTS;

export type QualityComponents = Partial<Record<QualityComponentKey, number | null | undefined>>;

/**
 * Composite quality score (0–10) over the six non-Class components,
 * re-normalising weights over the components actually present. Returns null
 * when no component is available (so callers show "—", never a fake 0).
 */
export function qualityScore(c: QualityComponents): number | null {
  let sum = 0;
  let weightTotal = 0;
  for (const key of Object.keys(SCORE_QUALITY_WEIGHTS) as QualityComponentKey[]) {
    const v = c[key];
    if (typeof v === "number" && Number.isFinite(v)) {
      sum += v * SCORE_QUALITY_WEIGHTS[key];
      weightTotal += SCORE_QUALITY_WEIGHTS[key];
    }
  }
  if (weightTotal === 0) return null;
  return Math.round((sum / weightTotal) * 100) / 100;
}

export interface ScoreAdjustmentPolicy {
  /** Max PREMIUM (cap tightening · stored positive · applied as −bound) · default 0.30. */
  max_premium_pp: number;
  /** Max PENALTY (cap widening · applied as +bound) · default 0.15. */
  max_penalty_pp: number;
  /** Premium step granularity (pp) · default 0.10 → 0 / −0.10 / −0.20 / −0.30. */
  premium_step_pp: number;
  /** Penalty step granularity (pp) · default 0.05 → 0 / +0.05 / +0.10 / +0.15. */
  penalty_step_pp: number;
  /** σ-distance cuts that trigger step 1, 2, 3 (in compset σ) · default [0.67, 1.33, 2.0]. */
  sigma_cuts: number[];
  /** Min σ used for z (avoids over-sensitivity / divide-by-zero on homogeneous compsets) · default 0.30. */
  sigma_floor: number;
  /** Minimum scored peers in the compset for a reliable pivot/dispersion · default 4. */
  min_compset_n: number;
}

export interface ScoreContext {
  /** Subject hotel quality score (0–10) · null when not computable. */
  hotel_quality: number | null;
  /** Compset PEERS' quality scores (subject excluded). */
  compset_qualities: number[];
}

export type ScoreAdjustmentStatus = "applied" | "no_hotel_score" | "compset_insufficient";

export interface ScoreAdjustmentResult {
  /** Cap-rate delta in percentage points · one of the clean steps incl. 0. */
  adjustment_pp: number;
  status: ScoreAdjustmentStatus;
  /** Human label for the report/panel breakdown. */
  label: string;
  /** Compset mean quality (pivot) · null when not computable. */
  pivot: number | null;
  /** Compset quality stddev (population · raw) · null when not applied. */
  stddev: number | null;
  /** Signed step count applied (− premium · + penalty) · 0 when in-band. */
  steps: number;
  /** z-score used (gap / σ_eff) · null when not applied. */
  z: number | null;
  /** Scored peers used. */
  n: number;
}

function mean(xs: number[]): number {
  return xs.reduce((a, b) => a + b, 0) / xs.length;
}

function populationStdDev(xs: number[], mu: number): number {
  return Math.sqrt(xs.reduce((acc, x) => acc + (x - mu) ** 2, 0) / xs.length);
}

export function computeScoreCapAdjustment(
  ctx: ScoreContext,
  policy: ScoreAdjustmentPolicy,
): ScoreAdjustmentResult {
  const q = ctx.hotel_quality;
  if (q === null || !Number.isFinite(q)) {
    return { adjustment_pp: 0, status: "no_hotel_score", label: "sin ajuste por Score", pivot: null, stddev: null, steps: 0, z: null, n: 0 };
  }

  const peers = ctx.compset_qualities.filter((x) => typeof x === "number" && Number.isFinite(x));
  if (peers.length < policy.min_compset_n) {
    return {
      adjustment_pp: 0,
      status: "compset_insufficient",
      label: "compset sin score",
      pivot: peers.length > 0 ? Math.round(mean(peers) * 100) / 100 : null,
      stddev: null,
      steps: 0,
      z: null,
      n: peers.length,
    };
  }

  const pivot = mean(peers);
  const stddev = populationStdDev(peers, pivot);
  const sigmaEff = Math.max(stddev, policy.sigma_floor);
  const z = (q - pivot) / sigmaEff;
  const absZ = Math.abs(z);

  // How many σ-cuts does |z| clear → step count (capped by the side's max steps).
  const cuts = [...policy.sigma_cuts].sort((a, b) => a - b);
  const cutsCleared = cuts.filter((c) => absZ >= c - 1e-9).length;

  const isPremium = z > 0;
  const stepPp = isPremium ? policy.premium_step_pp : policy.penalty_step_pp;
  const capPp = isPremium ? policy.max_premium_pp : policy.max_penalty_pp;
  const maxSteps = stepPp > 0 ? Math.round(capPp / stepPp) : 0;
  const steps = Math.min(cutsCleared, maxSteps);

  const magnitude = Math.min(steps * stepPp, capPp);
  const adjustment_pp = (isPremium ? -magnitude : magnitude) + 0; // +0 normalizes −0

  const direction = adjustment_pp < 0 ? "mejor que compset" : adjustment_pp > 0 ? "peor que compset" : "en línea con compset";
  return {
    adjustment_pp: Math.round(adjustment_pp * 100) / 100,
    status: "applied",
    label: `Score ${q.toFixed(1)} vs compset ${(Math.round(pivot * 100) / 100).toFixed(1)} · ${direction}`,
    pivot: Math.round(pivot * 100) / 100,
    stddev: Math.round(stddev * 100) / 100,
    steps: isPremium ? -steps : steps,
    z: Math.round(z * 100) / 100,
    n: peers.length,
  };
}
