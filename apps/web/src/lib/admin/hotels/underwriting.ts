/**
 * Phase 3.b · institutional underwriting math.
 *
 * Pure functions over the snapshot data — no I/O. Each helper reflects
 * a back-of-envelope institutional method with explicit assumptions
 * surfaced in the result so the operator can see what's data vs
 * heuristic.
 *
 * NOT a full DCF engine — that's a separate piece (Phase 3.c). These
 * compute the "first 30-second read" institutional investors expect
 * from a hotel screening pass.
 */

import type { HotelRecord, MarketSnapshot, TransactionComparable } from "./snapshot-reader";

// ── Constants · operator-tunable assumptions ────────────────────────────────
// Multiples for the market-based valuation (RevPAR × rooms × multiple).
// 8-12× revenue is the institutional rule of thumb for stabilised hotels;
// adjust per chain scale when we wire operator overrides.
export const REVENUE_MULTIPLE_LOW = 8;
export const REVENUE_MULTIPLE_MID = 10;
export const REVENUE_MULTIPLE_HIGH = 12;
// Annualisation factor — assumes 365 stabilised days.
export const STABILISED_DAYS = 365;

// Chain scale tier rank — used for positioning logic.
const CHAIN_SCALE_ORDER: Record<string, number> = {
  luxury: 0,
  upper_upscale: 1,
  upscale: 2,
  upper_midscale: 3,
  midscale: 4,
  economy: 5,
};

// ── Method 1 · Market-based valuation ───────────────────────────────────────

export interface MarketBasedValuation {
  ok: boolean;
  reason?: string; // why ok=false
  annual_revenue_eur: number | null;
  value_low_eur: number | null;
  value_mid_eur: number | null;
  value_high_eur: number | null;
  value_per_key_low_eur: number | null;
  value_per_key_mid_eur: number | null;
  value_per_key_high_eur: number | null;
  revpar_source: "submarket" | "market" | null;
  revpar_eur: number | null;
  assumptions: {
    stabilised_days: number;
    multiple_low: number;
    multiple_mid: number;
    multiple_high: number;
  };
}

export function marketBasedValuation(
  hotel: HotelRecord,
  marketCtx: { market: MarketSnapshot | null; submarket: MarketSnapshot | null },
): MarketBasedValuation {
  const assumptions = {
    stabilised_days: STABILISED_DAYS,
    multiple_low: REVENUE_MULTIPLE_LOW,
    multiple_mid: REVENUE_MULTIPLE_MID,
    multiple_high: REVENUE_MULTIPLE_HIGH,
  };
  const empty = {
    ok: false,
    annual_revenue_eur: null,
    value_low_eur: null,
    value_mid_eur: null,
    value_high_eur: null,
    value_per_key_low_eur: null,
    value_per_key_mid_eur: null,
    value_per_key_high_eur: null,
    revpar_source: null,
    revpar_eur: null,
    assumptions,
  } as const;

  if (!hotel.rooms_count || hotel.rooms_count <= 0) {
    return { ...empty, reason: "rooms_count missing" };
  }
  // Prefer submarket RevPAR (closer to the asset's actual demand pool);
  // fall back to market.
  let revpar: number | null = null;
  let source: "submarket" | "market" | null = null;
  if (marketCtx.submarket?.revpar_12m && marketCtx.submarket.revpar_12m > 0) {
    revpar = marketCtx.submarket.revpar_12m;
    source = "submarket";
  } else if (marketCtx.market?.revpar_12m && marketCtx.market.revpar_12m > 0) {
    revpar = marketCtx.market.revpar_12m;
    source = "market";
  }
  if (revpar === null) {
    return { ...empty, reason: "market RevPAR unavailable for this geography" };
  }

  const annual_revenue = revpar * STABILISED_DAYS * hotel.rooms_count;
  const value_low = annual_revenue * REVENUE_MULTIPLE_LOW;
  const value_mid = annual_revenue * REVENUE_MULTIPLE_MID;
  const value_high = annual_revenue * REVENUE_MULTIPLE_HIGH;
  return {
    ok: true,
    annual_revenue_eur: annual_revenue,
    value_low_eur: value_low,
    value_mid_eur: value_mid,
    value_high_eur: value_high,
    value_per_key_low_eur: value_low / hotel.rooms_count,
    value_per_key_mid_eur: value_mid / hotel.rooms_count,
    value_per_key_high_eur: value_high / hotel.rooms_count,
    revpar_source: source,
    revpar_eur: revpar,
    assumptions,
  };
}

// ── Method 2 · Peer-comparable valuation ────────────────────────────────────

export interface PeerBasedValuation {
  ok: boolean;
  reason?: string;
  n_peers_used: number;
  peer_price_per_key_p25_eur: number | null;
  peer_price_per_key_median_eur: number | null;
  peer_price_per_key_p75_eur: number | null;
  value_low_eur: number | null;
  value_mid_eur: number | null;
  value_high_eur: number | null;
}

function percentile(sorted: number[], p: number): number | null {
  if (sorted.length === 0) return null;
  if (sorted.length === 1) return sorted[0];
  const idx = (sorted.length - 1) * p;
  const lo = Math.floor(idx);
  const hi = Math.ceil(idx);
  if (lo === hi) return sorted[lo];
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (idx - lo);
}

export function peerBasedValuation(
  hotel: HotelRecord,
  comparables: TransactionComparable[],
): PeerBasedValuation {
  const empty = {
    ok: false,
    n_peers_used: 0,
    peer_price_per_key_p25_eur: null,
    peer_price_per_key_median_eur: null,
    peer_price_per_key_p75_eur: null,
    value_low_eur: null,
    value_mid_eur: null,
    value_high_eur: null,
  } as const;
  if (!hotel.rooms_count || hotel.rooms_count <= 0) {
    return { ...empty, reason: "rooms_count missing" };
  }
  // Only use peers in the same submarket OR same market — global cross-market
  // €/key would be misleading. Require a computable price_per_key_eur.
  const peers = comparables
    .filter(
      (t) =>
        (t.matched_via === "same_submarket" || t.matched_via === "same_market" || t.matched_via === "same_hotel") &&
        typeof t.price_per_key_eur === "number" &&
        t.price_per_key_eur > 0,
    )
    .map((t) => t.price_per_key_eur as number);
  if (peers.length < 3) {
    return {
      ...empty,
      n_peers_used: peers.length,
      reason: `only ${peers.length} peer transaction${peers.length === 1 ? "" : "s"} with €/key (need ≥ 3)`,
    };
  }
  const sorted = [...peers].sort((a, b) => a - b);
  const p25 = percentile(sorted, 0.25)!;
  const median = percentile(sorted, 0.5)!;
  const p75 = percentile(sorted, 0.75)!;
  return {
    ok: true,
    n_peers_used: peers.length,
    peer_price_per_key_p25_eur: p25,
    peer_price_per_key_median_eur: median,
    peer_price_per_key_p75_eur: p75,
    value_low_eur: p25 * hotel.rooms_count,
    value_mid_eur: median * hotel.rooms_count,
    value_high_eur: p75 * hotel.rooms_count,
  };
}

// ── Market positioning ──────────────────────────────────────────────────────

export interface MarketPositioning {
  chain_scale_tier_rank: number | null; // 0=luxury .. 5=economy
  chain_scale_label: string | null;
  submarket_revpar_vs_market_pct: number | null; // null when missing data
  hotel_in_premium_submarket: boolean | null;
}

export function marketPositioning(
  hotel: HotelRecord,
  marketCtx: { market: MarketSnapshot | null; submarket: MarketSnapshot | null },
): MarketPositioning {
  const tier =
    hotel.chain_scale && CHAIN_SCALE_ORDER[hotel.chain_scale] !== undefined
      ? CHAIN_SCALE_ORDER[hotel.chain_scale]
      : null;

  let submarketIndex: number | null = null;
  if (
    marketCtx.submarket?.revpar_12m &&
    marketCtx.market?.revpar_12m &&
    marketCtx.market.revpar_12m > 0
  ) {
    submarketIndex = marketCtx.submarket.revpar_12m / marketCtx.market.revpar_12m;
  }

  return {
    chain_scale_tier_rank: tier,
    chain_scale_label: hotel.chain_scale ? hotel.chain_scale.replace(/_/g, " ") : null,
    submarket_revpar_vs_market_pct: submarketIndex,
    hotel_in_premium_submarket:
      submarketIndex === null ? null : submarketIndex > 1.05,
  };
}

// ── Pretty-print helpers ────────────────────────────────────────────────────

export function fmtEurM(eur: number | null): string {
  if (eur === null || !Number.isFinite(eur)) return "—";
  if (Math.abs(eur) >= 1_000_000) return `€${(eur / 1_000_000).toFixed(1)}M`;
  if (Math.abs(eur) >= 1_000) return `€${(eur / 1_000).toFixed(0)}K`;
  return `€${eur.toFixed(0)}`;
}

export function fmtEurPerKey(eur: number | null): string {
  if (eur === null || !Number.isFinite(eur)) return "—";
  return `€${Math.round(eur).toLocaleString()}/key`;
}
