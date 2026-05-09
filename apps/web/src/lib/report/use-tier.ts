"use client";

// Premium-tier resolver.
//
// Today: defaults to PREMIUM with `?tier=free|pro|premium` query-string
// override for manual testing of each gating state.
// Tomorrow: read from auth context / session cookie / GET /api/v1/me.

import { useSearchParams } from "next/navigation";
import type { Tier } from "@/lib/report/financials";

const VALID: Tier[] = ["FREE", "PRO", "PREMIUM"];
const DEFAULT_TIER: Tier = "PREMIUM";

export function useTier(): Tier {
  const params = useSearchParams();
  const raw = params?.get("tier");
  if (!raw) return DEFAULT_TIER;
  const upper = raw.toUpperCase() as Tier;
  return VALID.includes(upper) ? upper : DEFAULT_TIER;
}

/** True iff the current tier may edit financial assumptions. */
export function canEditAssumptions(tier: Tier): boolean {
  return tier === "PREMIUM";
}

/** True iff the current tier may view the page at all. */
export function canViewFinancials(tier: Tier): boolean {
  return tier === "PRO" || tier === "PREMIUM";
}
