/**
 * RapidAPI Booking — configuration contract (v1).
 *
 * Defines the env var contract and the operating mode for the client.
 * No env reads happen at module load time — `loadConfig()` is called
 * explicitly by callers, who decide whether to crash on missing vars
 * (live mode) or tolerate them (dry-run mode).
 */

import type { ClientMode } from "./types";

export interface BookingRapidApiConfig {
  mode: ClientMode;
  apiKey: string | null;
  host: string;
  baseUrl: string;
  tier: "basic" | "pro_10k" | "pro_25k" | "ultra" | "mega" | "unknown";
  dailyBudget: number;
  monthlyBudget: number;
  /** Optional override for the destination_id when scoping Madrid sweeps. */
  madridDestinationId: string | null;
  /** Conservative client-side RPS ceiling derived from tier. */
  practicalRps: number;
}

const TIER_PRACTICAL_RPS: Record<BookingRapidApiConfig["tier"], number> = {
  basic: 0.5,
  pro_10k: 2,
  pro_25k: 3,
  ultra: 5,
  mega: 10,
  unknown: 1,
};

/**
 * Load configuration from environment. In dry-run mode, missing env vars
 * are tolerated (apiKey defaults to null, budgets default to 0).
 */
export function loadConfig(
  env: NodeJS.ProcessEnv | Record<string, string | undefined>,
  modeOverride?: ClientMode,
): BookingRapidApiConfig {
  const mode: ClientMode = modeOverride ?? ((env.RAPIDAPI_BOOKING_MODE as ClientMode) || "dry-run");

  const apiKey = env.RAPIDAPI_BOOKING_KEY ?? null;
  const host = env.RAPIDAPI_BOOKING_HOST ?? "booking-com15.p.rapidapi.com";
  const baseUrl = env.RAPIDAPI_BOOKING_BASE_URL ?? `https://${host}`;
  const tier = (env.RAPIDAPI_BOOKING_TIER as BookingRapidApiConfig["tier"]) ?? "unknown";
  const dailyBudget = parseInt(env.RAPIDAPI_BOOKING_DAILY_BUDGET ?? "0", 10);
  const monthlyBudget = parseInt(env.RAPIDAPI_BOOKING_MONTHLY_BUDGET ?? "0", 10);
  const madridDestinationId = env.RAPIDAPI_BOOKING_MADRID_DEST_ID ?? null;

  if (mode === "live" && !apiKey) {
    throw new Error(
      "[booking-rapidapi] Live mode requires RAPIDAPI_BOOKING_KEY env var.",
    );
  }

  return {
    mode,
    apiKey,
    host,
    baseUrl,
    tier,
    dailyBudget,
    monthlyBudget,
    madridDestinationId,
    practicalRps: TIER_PRACTICAL_RPS[tier] ?? TIER_PRACTICAL_RPS.unknown,
  };
}

/**
 * Convert tier to the per-hotel call budget assumption. Used by capacity
 * planning during sweep scheduling.
 */
export function tierMonthlyQuota(tier: BookingRapidApiConfig["tier"]): number {
  switch (tier) {
    case "basic":
      return 500;
    case "pro_10k":
      return 10_000;
    case "pro_25k":
      return 25_000;
    case "ultra":
      return 50_000;
    case "mega":
      return 250_000;
    default:
      return 0;
  }
}
