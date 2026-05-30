/**
 * Implied-cap sanity mirror (X4b · TRAMO 3b · prior validation tool).
 *
 * PERMANENT validation mechanism (not one-shot): for any market, estimate
 * the USALI after-replacement NOI of a transacted hotel and divide by the
 * REAL price paid → an IMPLIED cap rate. Aggregated by segment, the median
 * implied cap is a sanity MIRROR for the institutional `segment_base_priors`.
 * It is NOT a new base source (avoids circularity) — the prior stays what the
 * engine uses; the implied cap only validates it.
 *
 * Re-run it whenever more transactions or new markets land (the priors of ANY
 * market are validated the same way).
 *
 * NOI quality caveat (load-bearing): the estimate is only as good as the ADR.
 * With a SUBMARKET-BLENDED ADR (one ADR for all segments in a submarket), the
 * NOI is ∝ rooms only, so the implied cap collapses to an inverse transform of
 * €/key and is BIASED for segments whose real ADR diverges from the blend
 * (luxury ADR ≫ blend → NOI understated → implied cap understated). A reliable
 * per-segment anchor needs SEGMENT-LEVEL ADR (CoStar by class). Until then a
 * prior is `expert_prior` (calibrated by €/key ORDERING), not
 * `calibrated_from_kpi`.
 */

export interface UsaliShares {
  /** Rooms revenue as a share of total revenue (e.g. 0.675). */
  rooms_revenue_pct: number;
  /** EBITDA as a share of total revenue (e.g. 0.232). */
  ebitda_pct: number;
  /** FF&E reserve as a share of total revenue (e.g. 0.040). */
  ffe_reserve_pct: number;
}

export interface ImpliedCapInput {
  rooms: number;
  price_eur: number;
  /** ADR (€) · segment-level when available, else submarket-blended (caveat). */
  adr: number;
  /** Occupancy (0–1). */
  occupancy: number;
  usali: UsaliShares;
}

/**
 * USALI after-replacement NOI (€) from rooms × ADR × occ × 365 grossed up by
 * the rooms-revenue share, then × (EBITDA − FF&E) shares. Mirrors the
 * methodology's `ebitdaAfterReplacement`.
 */
export function estimateNoiAfterReplacement(args: {
  rooms: number; adr: number; occupancy: number; usali: UsaliShares;
}): number {
  const roomsRevenue = args.rooms * args.adr * args.occupancy * 365;
  const totalRevenue = args.usali.rooms_revenue_pct > 0 ? roomsRevenue / args.usali.rooms_revenue_pct : 0;
  return totalRevenue * (args.usali.ebitda_pct - args.usali.ffe_reserve_pct);
}

/** Implied cap rate (% points) = NOI(after-replacement) / price × 100. */
export function impliedCapPct(input: ImpliedCapInput): number | null {
  if (!input.price_eur || input.price_eur <= 0 || !input.rooms || !input.adr) return null;
  const noi = estimateNoiAfterReplacement(input);
  return Math.round((noi / input.price_eur) * 100 * 100) / 100;
}

export interface ImpliedCapSegmentSummary {
  segment: string;
  n: number;
  median_pct: number | null;
  min_pct: number | null;
  max_pct: number | null;
}

function median(xs: number[]): number {
  const s = [...xs].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}

/** Aggregate per-transaction implied caps into per-segment medians. */
export function summarizeImpliedCapBySegment(
  rows: Array<{ segment: string; implied_cap_pct: number | null }>,
): ImpliedCapSegmentSummary[] {
  const by = new Map<string, number[]>();
  for (const r of rows) {
    if (r.implied_cap_pct === null || !Number.isFinite(r.implied_cap_pct)) continue;
    if (!by.has(r.segment)) by.set(r.segment, []);
    by.get(r.segment)!.push(r.implied_cap_pct);
  }
  return [...by.entries()].map(([segment, caps]) => ({
    segment,
    n: caps.length,
    median_pct: caps.length ? Math.round(median(caps) * 100) / 100 : null,
    min_pct: caps.length ? Math.round(Math.min(...caps) * 100) / 100 : null,
    max_pct: caps.length ? Math.round(Math.max(...caps) * 100) / 100 : null,
  }));
}
