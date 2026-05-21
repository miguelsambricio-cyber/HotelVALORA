import type { IntegrationDescriptor } from "./types";
import type { PlatformIntegrationDescriptor } from "./platform-registry";

/**
 * Hero-KPI unified status taxonomy.
 *
 * The Integrations admin surface uses two registries with different
 * shapes (rich `IntegrationDescriptor` for intelligence feeds vs.
 * `PlatformIntegrationDescriptor` for the platform layers). This file
 * is the single classifier that maps either descriptor onto the 5
 * executive-dashboard buckets the operator sees on the hero strip:
 *
 *   LIVE      · fully operational + autonomous
 *   PARTIAL   · works end-to-end but depends on manual workflows,
 *               exports, placeholders, BETA paths, or incomplete
 *               automation. Includes operator-managed integrations
 *               that have no cron / scheduled refresh.
 *   NOT WIRED · operator-account exists or env scaffolded but no
 *               active code path calls
 *   FAIL      · currently failing health checks (signal === 'error')
 *   PLANNED   · roadmap only · no account or no env
 *
 * Counting rule for "operator-managed + no cron = PARTIAL":
 *   The user's PARTIAL bucket includes manual workflows and exports.
 *   Datasite drops, Google Contacts CSV, Gmail JSONL exports all qualify
 *   even when the integration is "functionally live" — the operator has
 *   to keep refreshing it by hand. Setting this rule centrally avoids
 *   editing the per-card status in the layer detail (cards still say
 *   "live" for those entries; the hero shows them as PARTIAL — the
 *   right granularity for each layer).
 */

export type UnifiedStatus = "live" | "partial" | "not_wired" | "fail" | "planned";

export interface UnifiedCounts {
  total: number;
  live: number;
  partial: number;
  not_wired: number;
  fail: number;
  planned: number;
}

/** Classifier for intelligence-source descriptors (the rich card). */
export function classifyIntelligenceSource(s: IntegrationDescriptor): UnifiedStatus {
  if (s.signal === "error" || s.connection === "failing") return "fail";
  if (!s.enabled) return "planned";
  if (s.signal === "warn") return "partial";
  if (
    s.connection === "awaiting_credentials" ||
    s.connection === "session_expired" ||
    s.connection === "degraded"
  ) {
    return "partial";
  }
  if (s.connection === "not_configured") return "not_wired";
  if (s.connection === "operational") {
    const hasRuns =
      s.health.lastRunStatus === "success" || (s.health.runsSuccess7d ?? 0) > 0;
    return hasRuns ? "live" : "partial";
  }
  return "partial";
}

/** Classifier for platform-integration descriptors. */
export function classifyPlatformIntegration(p: PlatformIntegrationDescriptor): UnifiedStatus {
  if (p.signal === "error") return "fail";
  if (p.status === "planned") return "planned";
  if (p.status === "configured_not_wired") return "not_wired";
  if (p.status === "partial") return "partial";
  // "testing" rolls up to the PARTIAL bucket for the hero KPI (it's
  // wired on one surface but not in production yet). The card itself
  // still displays the raw "Testing" status via the detail sheet.
  if (p.status === "testing") return "partial";
  // status === "live" · operator-managed without cron → still PARTIAL
  // per the executive definition (manual workflows + exports count).
  if (p.operatorManaged && p.cronDependencies.length === 0) {
    return "partial";
  }
  return "live";
}

/**
 * Tally the 6 executive-dashboard KPI buckets across both registries.
 * `TOTAL` is the sum (not a separate bucket) — surfaces use it as the
 * denominator for the hero card.
 */
export function computeUnifiedCounts(
  intelligence: IntegrationDescriptor[],
  platform: PlatformIntegrationDescriptor[],
): UnifiedCounts {
  const intel = intelligence.map(classifyIntelligenceSource);
  const plat = platform.map(classifyPlatformIntegration);
  const all = [...intel, ...plat];
  return {
    total: all.length,
    live: all.filter((s) => s === "live").length,
    partial: all.filter((s) => s === "partial").length,
    not_wired: all.filter((s) => s === "not_wired").length,
    fail: all.filter((s) => s === "fail").length,
    planned: all.filter((s) => s === "planned").length,
  };
}
