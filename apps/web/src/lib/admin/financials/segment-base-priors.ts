/**
 * Cap-rate BASE · institutional segment priors (X4b · TRAMO 3b).
 *
 * The real CoStar transactions (snapshot.json · 661 deals) carry price,
 * €/key, rooms and the hotel SEGMENT (chain_scale) — but ZERO cap rates.
 * So the base CANNOT be "the median of comparable cap rates" (there are
 * none). Instead the base is an INSTITUTIONAL PRIOR per segment (known
 * European market bands, adjusted to the local prime), CALIBRATED so its
 * ordering is coherent with the real €/key per segment (more €/key →
 * lower cap). Each prior declares the €/key + transaction count that
 * back it — never a number without stated provenance.
 *
 * Agnostic: priors live in the editable policy keyed by country. A new
 * market brings its own priors + €/key backing. Nothing hardcodes Madrid
 * at the engine; the ES priors below are the seeded default.
 *
 * Double-count note: because the base is now segment-specific, the
 * separate Category adjustment (5★/4★/3★) is set to 0 in the policy —
 * "it is luxury" must not be priced twice (once in the base, once in a
 * category delta).
 */

export const SEGMENTS = [
  "luxury",
  "upper_upscale",
  "upscale",
  "upper_midscale",
  "midscale",
  "economy",
] as const;

export type SegmentId = (typeof SEGMENTS)[number];

export interface SegmentBasePrior {
  /** Base cap rate (% points) · the institutional prior for the segment. */
  base_pct: number;
  /** Market cap-rate band [low, high] · the rule's input. */
  band_low: number;
  band_high: number;
  /** €/key that backs/calibrates the prior (real transactions · median). */
  eur_per_key: number | null;
  /** Number of real transactions behind the €/key backing. */
  n_tx: number;
  /** Geographic level of the backing sample · cascade submarket→market→national. */
  geo_level: "submarket" | "market" | "national" | "uncalibrated";
  /**
   * Provenance of the cap value:
   *  - "expert_prior"        · European band + €/key ORDERING (level not yet
   *                            anchored to an implied-cap mirror).
   *  - "calibrated_from_kpi" · implied-cap mirror (segment ADR) confirms the
   *                            level within ±0.3pp · reinforced anchor.
   */
  provenance: "expert_prior" | "calibrated_from_kpi";
  /** Provenance label shown in the rationale. */
  source: string;
}

export type SegmentBasePriors = Record<SegmentId, SegmentBasePrior>;

/**
 * ES (Madrid) seeded priors · 2026-05.
 *
 * FIXING RULE (systematic · reproducible · same for all 6 segments):
 *   prior = midpoint(band) − 0.25pp = (band_low + band_high)/2 − 0.25.
 * "Lower half of the band" → moderate prime compression without the extreme.
 * Bands form a clean +0.5 ladder. €/key ordering (real · 53 Madrid deals)
 * confirms the ordering: luxury €720k > upper_upscale €423k > upscale €389k
 * > upper_midscale €287k > midscale €194k → cap↑ as €/key↓.
 *
 * The rule is uniform across all 6 segments — no exceptions, no overrides.
 */
export const SEGMENT_BASE_PRIORS_ES: SegmentBasePriors = {
  luxury:         { base_pct: 4.75, band_low: 4.5, band_high: 5.5, eur_per_key: 719_801, n_tx: 11, geo_level: "market", provenance: "expert_prior", source: "Regla: (4,5+5,5)/2−0,25=4,75 · banda EU · orden €/llave Madrid n=11" },
  upper_upscale:  { base_pct: 5.25, band_low: 5.0, band_high: 6.0, eur_per_key: 422_705, n_tx: 11, geo_level: "market", provenance: "expert_prior", source: "Regla: (5,0+6,0)/2−0,25=5,25 · banda EU · orden €/llave Madrid n=11" },
  upscale:        { base_pct: 5.75, band_low: 5.5, band_high: 6.5, eur_per_key: 388_650, n_tx: 20, geo_level: "market", provenance: "expert_prior", source: "Regla: (5,5+6,5)/2−0,25=5,75 · banda EU · orden €/llave Madrid n=20" },
  upper_midscale: { base_pct: 6.25, band_low: 6.0, band_high: 7.0, eur_per_key: 287_007, n_tx: 3,  geo_level: "market", provenance: "expert_prior", source: "Regla: (6,0+7,0)/2−0,25=6,25 · banda EU · orden €/llave Madrid n=3" },
  midscale:       { base_pct: 6.75, band_low: 6.5, band_high: 7.5, eur_per_key: 193_764, n_tx: 3,  geo_level: "market", provenance: "expert_prior", source: "Regla: (6,5+7,5)/2−0,25=6,75 · banda EU · orden €/llave Madrid n=3" },
  economy:        { base_pct: 7.25, band_low: 7.0, band_high: 8.0, eur_per_key: null,    n_tx: 2,  geo_level: "market", provenance: "expert_prior", source: "Regla: (7,0+8,0)/2−0,25=7,25 · banda EU · sin €/llave n=2" },
};

/** The systematic fixing rule · prior = midpoint(band) − 0.25pp. */
export function priorFromBand(bandLow: number, bandHigh: number): number {
  return Math.round(((bandLow + bandHigh) / 2 - 0.25) * 100) / 100;
}

export const SEGMENT_BASE_PRIORS_BY_COUNTRY: Record<string, SegmentBasePriors> = {
  ES: SEGMENT_BASE_PRIORS_ES,
};

/** Star → segment fallback when chain_scale is absent (conservative · labelled). */
export function segmentFromStar(category: "3star" | "4star" | "5star"): SegmentId {
  return category === "5star" ? "upper_upscale" : category === "4star" ? "upscale" : "midscale";
}

/** Normalize a raw chain_scale string to a known SegmentId (or null). */
export function normalizeSegment(raw: string | null | undefined): SegmentId | null {
  if (!raw) return null;
  const s = raw.trim().toLowerCase().replace(/[\s-]+/g, "_");
  return (SEGMENTS as readonly string[]).includes(s) ? (s as SegmentId) : null;
}

export interface ResolvedSegmentBase {
  base_pct: number;
  segment: SegmentId;
  /** True when chain_scale resolved directly · false when star→segment fallback. */
  segment_from_chain_scale: boolean;
  prior: SegmentBasePrior | null;
  label: string;
}

/**
 * Resolve the cap-rate base for an asset from the segment priors.
 * Prefers chain_scale (6-level); falls back to star→segment (labelled);
 * falls back to `fallbackPct` when no priors exist for the segment.
 */
export function resolveSegmentBase(args: {
  segment?: string | null;
  category: "3star" | "4star" | "5star";
  priors: SegmentBasePriors | null;
  fallbackPct: number;
}): ResolvedSegmentBase {
  const direct = normalizeSegment(args.segment);
  const segment = direct ?? segmentFromStar(args.category);
  const prior = args.priors ? args.priors[segment] : null;
  if (!prior) {
    return {
      base_pct: args.fallbackPct,
      segment,
      segment_from_chain_scale: direct !== null,
      prior: null,
      label: `Base ${args.fallbackPct.toFixed(2)}% · prior sin calibrar (sin priors de segmento) · ${segment}`,
    };
  }
  const calib = prior.geo_level === "uncalibrated" || prior.eur_per_key === null
    ? "sin calibrar"
    : `calibrado €${prior.eur_per_key.toLocaleString("es-ES")}/llave (${prior.geo_level}) · n=${prior.n_tx}`;
  const via = direct !== null ? segment : `${segment} (por estrellas · sin chain_scale)`;
  return {
    base_pct: prior.base_pct,
    segment,
    segment_from_chain_scale: direct !== null,
    prior,
    label: `Base ${prior.base_pct.toFixed(2)}% · segmento ${via} · ${calib}`,
  };
}
