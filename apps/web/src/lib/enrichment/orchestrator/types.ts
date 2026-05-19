/**
 * Orchestrator types (v1).
 *
 * Models the runtime contract between the queue layer, the provider
 * client, the dedup engine, the confidence calculator, and the writer.
 *
 * Phase 1 surface: dry-run only. No DB writes; no HTTP fetches. The
 * runner returns a `JobExecutionResult` for every job, which the
 * caller inspects or persists at its discretion.
 */

import type { SourceKey } from "../confidence/tier-registry";
import type { DedupEvaluation, DedupTier } from "../dedup/engine";
import type { CanonicalHotelDraft } from "../providers/booking-rapidapi/map-to-canonical";
import type { ConflictResolution } from "../confidence/conflict-resolver";

// ───────────────────────────────────────────────────────────────────────────
// Job
// ───────────────────────────────────────────────────────────────────────────

export type JobType =
  | "discover"
  | "enrich"
  | "refresh"
  | "conflict_recheck"
  | "fallback_dispatch";

export interface EnrichmentJob {
  id: string;
  type: JobType;
  source: SourceKey;
  hotelId?: string | null;
  priority: number; // 1 (highest) – 9 (lowest)
  scheduledFor: Date;
  attemptCount: number;
  dedupKey: string;
  params: Record<string, unknown>;
  createdAt: Date;
}

// ───────────────────────────────────────────────────────────────────────────
// Error classification (sidecar §6.1)
// ───────────────────────────────────────────────────────────────────────────

export type ErrorClass =
  | "NETWORK"
  | "QUOTA_DAILY"
  | "QUOTA_MONTHLY"
  | "RATE_BURST"
  | "AUTH"
  | "PLAN_LIMIT"
  | "PAYLOAD_PARTIAL"
  | "GEO_MISMATCH"
  | "DUPLICATE"
  | "STALE_LISTING"
  | "ALIAS_DRIFT"
  | "EMPTY_PAGE"
  | "SCHEMA_DRIFT"
  | "VALIDATION"
  | "BUDGET_EXCEEDED"
  | "PARSE"
  | "UNKNOWN";

export interface ClassifiedError {
  class: ErrorClass;
  retryable: boolean;
  message: string;
  /** When the next retry should be attempted. null if terminal. */
  retryAfter?: Date | null;
}

// ───────────────────────────────────────────────────────────────────────────
// Execution result
// ───────────────────────────────────────────────────────────────────────────

export type JobOutcome =
  | "completed"
  | "completed_with_warnings"
  | "scheduled_retry"
  | "routed_to_dlq"
  | "circuit_breaker_open"
  | "dry_run_no_call"
  | "fixture_not_found"
  | "fallback_required"
  | "excluded_by_filter";  // accommodation_type marked exclude=true in registry

export interface PerFieldOutcome {
  field: string;
  resolution: ConflictResolution;
  shouldUpdateCanonical: boolean;
  shouldEnqueueReview: boolean;
  beforeValue: unknown;
  afterValue: unknown;
  beforeConfidence: number;
  afterConfidence: number;
  rationale: string;
}

export interface JobExecutionResult {
  job: EnrichmentJob;
  outcome: JobOutcome;
  /** Populated when the job succeeded — the canonical draft produced. */
  draft?: CanonicalHotelDraft | null;
  /** Dedup evaluation against the in-memory or staging canonical store. */
  dedup?: DedupEvaluation | null;
  /** Per-field conflict resolution outcomes (post-dedup decision). */
  fieldOutcomes?: PerFieldOutcome[];
  /** Coverage counts post-resolution. */
  preCoverage?: { tier0: number; tier1: number; tier2: number };
  /** Recommended dedup decision after engine + override. */
  dedupDecision?: DedupTier | null;
  error?: ClassifiedError;
  warnings: string[];
  durationMs: number;
  completedAt: Date;
}

// ───────────────────────────────────────────────────────────────────────────
// Execution context
// ───────────────────────────────────────────────────────────────────────────

/**
 * Runtime context handed to the runner. In Phase 1 dry-run, the
 * `canonicalStore` is an in-memory list. In Phase 3+, it becomes a
 * Supabase-backed reader. Same contract.
 */
export interface ExecutionContext {
  fetchSourceData: (job: EnrichmentJob) => Promise<unknown>;
  canonicalStore: {
    /** Return rows with the same block_key. */
    findByBlockKey(blockKey: string): readonly CanonicalHotelDraft[];
    /** Return canonical row by booking_hotel_id (or other ext id) if present. */
    findByExternalId(idType: string, id: string): CanonicalHotelDraft | null;
    /** Write the draft (no-op in dry-run if not provided). */
    upsert?(draft: CanonicalHotelDraft): void;
  };
  now: () => Date;
  /** Mode of operation. `dry-run` skips all writes. */
  mode: "dry-run" | "recorded-fixture" | "live";
}
