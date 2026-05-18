import type {
  AssetState,
  CompTransaction,
  ExcludedComp,
  LiquidityMetrics,
  MarketEvidence,
  RatesRegime,
} from "../types";
import type { AssetBasics, StarCategory } from "../../types";

/**
 * Evidence layer.
 *
 * Pure function · given the asset context, the comp universe, and the
 * macro rates regime, returns a frozen MarketEvidence record. NO policy
 * logic here · the next layer (adjustments) consumes this evidence
 * deterministically.
 *
 * Filtering rules (in order):
 *   1. Drop comps with stale data (> 36 months)
 *   2. Prefer comps in same SUBMARKET. If <3 in submarket, broaden to MARKET.
 *      If <3 in market, broaden to NATIONAL.
 *   3. Drop comps with category gap > 1 star (e.g. 3* asset → drop 5* comps)
 *   4. Drop comps with size gap > 5× (e.g. 80-key asset → drop 500-key comps)
 *
 * Every exclusion is captured in `comparables_excluded` with the
 * specific rule for audit-grade traceability.
 */

const STALE_DAYS = 36 * 30; // ~36 months
const SIZE_RATIO_MAX = 5;

export function buildMarketEvidence(
  asset: AssetBasics,
  comps: CompTransaction[],
  ratesRegime: RatesRegime,
  asOfDate: string,
): MarketEvidence {
  const asOf = new Date(asOfDate);
  const excluded: ExcludedComp[] = [];
  const passedFilters: CompTransaction[] = [];

  // Pass 1 · staleness + category gap + size gap
  for (const c of comps) {
    const ageDays = Math.floor((asOf.getTime() - new Date(c.transaction_date).getTime()) / (1000 * 60 * 60 * 24));
    if (ageDays > STALE_DAYS) {
      excluded.push({ transaction_id: c.transaction_id, reason: `stale · ${Math.round(ageDays / 30)} months > 36-month cutoff` });
      continue;
    }
    if (Math.abs(starOrder(c.category) - starOrder(asset.category)) > 1) {
      excluded.push({ transaction_id: c.transaction_id, reason: `category gap · ${c.category} vs target ${asset.category}` });
      continue;
    }
    const sizeRatio = c.rooms > asset.rooms ? c.rooms / asset.rooms : asset.rooms / c.rooms;
    if (sizeRatio > SIZE_RATIO_MAX) {
      excluded.push({ transaction_id: c.transaction_id, reason: `size gap · ${c.rooms} keys vs target ${asset.rooms} (${sizeRatio.toFixed(1)}×)` });
      continue;
    }
    passedFilters.push(c);
  }

  // Pass 2 · scope narrowing · submarket → market → national
  let inScope = passedFilters.filter((c) => normalize(c.submarket) === normalize(asset.submarket));
  let scopeLabel = `submarket "${asset.submarket}"`;
  if (inScope.length < 3) {
    const broadened = passedFilters.filter((c) => normalize(c.market) === normalize(asset.market));
    for (const c of broadened) {
      if (!inScope.includes(c)) {
        // Mark out-of-submarket but in-market as "broadened scope" (not strictly excluded)
        // but keep them in scope so we have enough data.
      }
    }
    if (broadened.length >= 3) {
      inScope = broadened;
      scopeLabel = `market "${asset.market}"`;
    } else {
      inScope = passedFilters; // national fallback
      scopeLabel = "national fallback (insufficient regional comps)";
    }
  }

  // Track comps excluded by Pass 2 scope narrowing
  for (const c of passedFilters) {
    if (!inScope.includes(c)) {
      excluded.push({ transaction_id: c.transaction_id, reason: `outside scope · ${scopeLabel}` });
    }
  }

  const submarketMatchCount = passedFilters.filter((c) => normalize(c.submarket) === normalize(asset.submarket)).length;
  const categoryMatchCount = inScope.filter((c) => c.category === asset.category).length;

  // Derived stats
  const caps = inScope.map((c) => c.cap_rate_pct).sort((a, b) => a - b);
  const median = caps.length ? quantile(caps, 0.5) : 0;
  const p25 = caps.length ? quantile(caps, 0.25) : 0;
  const p75 = caps.length ? quantile(caps, 0.75) : 0;
  const mean = caps.length ? caps.reduce((a, b) => a + b, 0) / caps.length : 0;
  const stddev = caps.length ? Math.sqrt(caps.reduce((acc, v) => acc + (v - mean) ** 2, 0) / caps.length) : 0;

  const dates = inScope.map((c) => c.transaction_date).sort();
  const mostRecent = dates.length ? dates[dates.length - 1] : null;
  const oldest = dates.length ? dates[0] : null;

  const liquidity = computeLiquidity(inScope, asOf);

  return {
    context: {
      market: asset.market,
      submarket: asset.submarket,
      category: asset.category,
      rooms: asset.rooms,
      state: asset.state as AssetState,
      as_of_date: asOfDate,
    },
    comparables_in_scope: inScope,
    comparables_excluded: excluded,
    rates_regime: ratesRegime,

    comp_count: inScope.length,
    median_cap_pct: round3(median),
    mean_cap_pct: round3(mean),
    p25_cap_pct: round3(p25),
    p75_cap_pct: round3(p75),
    stddev_cap_pct: round3(stddev),
    spread_p75_p25_pct: round3(p75 - p25),

    most_recent_date: mostRecent,
    oldest_in_scope_date: oldest,

    liquidity_metrics: liquidity,
  };
}

// ─── Helpers ─────────────────────────────────────────────────────────

function starOrder(c: StarCategory): number {
  return c === "5star" ? 5 : c === "4star" ? 4 : 3;
}

function normalize(s: string): string {
  return s.trim().toLowerCase();
}

function quantile(sorted: number[], q: number): number {
  if (sorted.length === 0) return 0;
  if (sorted.length === 1) return sorted[0];
  const pos = (sorted.length - 1) * q;
  const base = Math.floor(pos);
  const rest = pos - base;
  return sorted[base + 1] !== undefined
    ? sorted[base] + rest * (sorted[base + 1] - sorted[base])
    : sorted[base];
}

function computeLiquidity(comps: CompTransaction[], asOf: Date): LiquidityMetrics {
  const ms12m = 365 * 24 * 60 * 60 * 1000;
  const ms24m = 2 * ms12m;
  let t12 = 0;
  let t24 = 0;
  let v12 = 0;
  let v24 = 0;
  for (const c of comps) {
    const ageMs = asOf.getTime() - new Date(c.transaction_date).getTime();
    if (ageMs <= ms12m) { t12++; v12 += c.price_total_eur; }
    if (ageMs <= ms24m) { t24++; v24 += c.price_total_eur; }
  }
  return {
    transactions_last_12m: t12,
    transactions_last_24m: t24,
    total_volume_last_12m_eur: v12,
    total_volume_last_24m_eur: v24,
  };
}

function round3(n: number): number {
  return Math.round(n * 1000) / 1000;
}
