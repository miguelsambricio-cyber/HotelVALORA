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

const VALID: Tier[] = ["free", "pro", "premium", "team", "enterprise"];
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
  return tier === "premium" || tier === "team" || tier === "enterprise";
}

/** True iff the current tier may view financial pages at all. */
export function canViewFinancials(tier: Tier): boolean {
  return tier !== "free";
}

// ─── Section-level tier matrix (operator directive 2026-05-25) ──────────────
//
//   FREE     · Executive Summary only · everything else hidden
//   PRO      · all main sections visible READ-ONLY · CAPEX/financial structure/
//              exit scenarios/renders HIDDEN
//   PREMIUM  · everything visible · editable

export function canSeeAssetAnalysis(tier: Tier): boolean { return tier !== "free"; }
export function canSeeCompetitiveSet(tier: Tier): boolean { return tier !== "free"; }
export function canSeeMarketOverview(tier: Tier): boolean { return tier !== "free"; }
export function canSeeFinancialsPL(tier: Tier): boolean { return tier !== "free"; }
export function canSeeUnderwriting(tier: Tier): boolean { return tier !== "free"; }

/** CAPEX detail · Premium-only. */
export function canSeeCapexDetail(tier: Tier): boolean {
  return tier === "premium" || tier === "team" || tier === "enterprise";
}
/** Financial Structure / Debt modelling detail · Premium-only. */
export function canSeeFinancialStructure(tier: Tier): boolean {
  return tier === "premium" || tier === "team" || tier === "enterprise";
}
/** Exit Scenarios detail · Premium-only. */
export function canSeeExitScenarios(tier: Tier): boolean {
  return tier === "premium" || tier === "team" || tier === "enterprise";
}
/** Premium 3D renders / marketing assets · Premium-only. */
export function canSeeRenders(tier: Tier): boolean {
  return tier === "premium" || tier === "team" || tier === "enterprise";
}

/** True iff the FREE tier · trigger upgrade CTAs in shared shells. */
export function isFreeTier(tier: Tier): boolean { return tier === "free"; }
