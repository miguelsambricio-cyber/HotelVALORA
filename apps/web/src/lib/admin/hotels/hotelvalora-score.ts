import type { HotelReferenceRecord } from "./types";

/**
 * HotelVALORA institutional composite score · 0–10 scale.
 *
 * Replaces the CoStar `score_costar` as the primary "how good is this
 * asset" headline on the registry. Combines guest-experience signals
 * (Booking sub-scores) with structural class adjustment so a 4★ chain
 * hotel and a 5★ luxury independent both score on the same axis.
 *
 * Formula (v1 · 2026-05-14):
 *   weighted_avg(
 *     location_score    × 0.30,
 *     comfort_score     × 0.20,
 *     cleanliness_score × 0.15,
 *     staff_score       × 0.10,
 *     value_score       × 0.10,
 *     facilities_score  × 0.05,
 *     class_score       × 0.10,
 *   )
 *
 * Where class_score is a 0–10 mapping of chain_scale (luxury=10 down to
 * economy=2). When any sub-score is missing we re-normalise the weights
 * over what's present so a partial profile still gets a sensible composite.
 *
 * Returns null when zero signals are available (so the UI shows "—"
 * instead of a fake 0).
 *
 * Future v2 candidates:
 *   - distance_to_center penalty
 *   - YoY market RevPAR adjustment
 *   - operator-quality multiplier (Marriott vs unknown)
 * Kept v1 simple and explainable.
 */

const CLASS_SCORE: Record<string, number> = {
  luxury: 10,
  upper_upscale: 8.5,
  upscale: 7,
  upper_midscale: 5.5,
  midscale: 4,
  economy: 2.5,
};

interface WeightedInput {
  value: number | null | undefined;
  weight: number;
}

function _composite(inputs: WeightedInput[]): number | null {
  let sum = 0;
  let weightTotal = 0;
  for (const i of inputs) {
    if (typeof i.value === "number" && Number.isFinite(i.value)) {
      sum += i.value * i.weight;
      weightTotal += i.weight;
    }
  }
  if (weightTotal === 0) return null;
  return sum / weightTotal;
}

export interface HotelVALORAScoreBreakdown {
  /** 0–10 composite score · null when no inputs available */
  score: number | null;
  /** Per-component contribution map so the UI can show the breakdown on hover */
  inputs: Array<{ label: string; value: number | null; weight: number; contributing: boolean }>;
  /** Confidence proxy · fraction of total weight that had a populated input */
  weight_coverage: number;
}

export function computeHotelVALORAScore(
  hotel: HotelReferenceRecord,
): HotelVALORAScoreBreakdown {
  const p = hotel.profile;
  const classScore = hotel.chain_scale ? CLASS_SCORE[hotel.chain_scale] ?? null : null;

  const components: Array<{ label: string; value: number | null | undefined; weight: number }> = [
    { label: "Location", value: p?.location_score, weight: 0.30 },
    { label: "Comfort", value: p?.comfort_score, weight: 0.20 },
    { label: "Cleanliness", value: p?.cleanliness_score, weight: 0.15 },
    { label: "Staff", value: p?.staff_score, weight: 0.10 },
    { label: "Value", value: p?.value_score, weight: 0.10 },
    { label: "Facilities", value: p?.facilities_score, weight: 0.05 },
    { label: "Class", value: classScore, weight: 0.10 },
  ];

  const score = _composite(
    components.map((c) => ({ value: c.value ?? null, weight: c.weight })),
  );
  const totalWeight = components.reduce((s, c) => s + c.weight, 0);
  const populatedWeight = components.reduce(
    (s, c) => s + (typeof c.value === "number" && Number.isFinite(c.value) ? c.weight : 0),
    0,
  );

  return {
    score: score !== null ? Math.round(score * 100) / 100 : null,
    inputs: components.map((c) => ({
      label: c.label,
      value: typeof c.value === "number" ? c.value : null,
      weight: c.weight,
      contributing: typeof c.value === "number" && Number.isFinite(c.value),
    })),
    weight_coverage: totalWeight > 0 ? populatedWeight / totalWeight : 0,
  };
}
