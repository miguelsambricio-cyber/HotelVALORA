"use client";

// Premium-tier resolver.
//
// Resolution priority (first match wins):
//   1. `?tier=` query-string override — manual demo / QA testing knob
//   2. Authenticated user's tier from the global auth store
//   3. Default = "premium" — keeps the demo report fully usable for
//      anonymous visitors without forcing them through the login flow
//
// When real auth ships (Supabase / Clerk), step 2 starts returning the
// JWT-claim tier; this hook needs no change.

import { useSearchParams } from "next/navigation";
import { useAuthStore } from "@/lib/auth";
import type { Tier } from "@/lib/report/financials";

const VALID: Tier[] = ["free", "pro", "premium", "institutional"];
const DEFAULT_TIER: Tier = "premium";

export function useTier(): Tier {
  const params = useSearchParams();
  const authedUser = useAuthStore((s) => s.user);

  // 1. URL override
  const raw = params?.get("tier");
  if (raw) {
    const normalised = raw.toLowerCase() as Tier;
    if (VALID.includes(normalised)) return normalised;
  }

  // 2. Authenticated user
  if (authedUser) return authedUser.tier;

  // 3. Default
  return DEFAULT_TIER;
}

/** True iff the current tier may edit financial assumptions. */
export function canEditAssumptions(tier: Tier): boolean {
  return tier === "premium" || tier === "institutional";
}

/** True iff the current tier may view financial pages at all. */
export function canViewFinancials(tier: Tier): boolean {
  return tier !== "free";
}
