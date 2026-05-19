/**
 * Writer types (v1).
 *
 * Translates a `JobExecutionResult` (orchestrator output) into an
 * ordered list of intended-write operations. Each operation targets a
 * specific table in migration 0024.
 *
 * Two writer implementations consume these:
 *   1. `DryRunWriter` — captures the intended writes for review,
 *      without executing them. Used in tests, demos, and the
 *      operator review gate.
 *   2. `SupabaseWriter` — executes the writes against the real
 *      Supabase project, in a single transaction per job result.
 *
 * The interface is intentionally narrow: a list of typed operations,
 * one transaction boundary, one report back.
 */

import type { CanonicalHotelDraft } from "../providers/booking-rapidapi/map-to-canonical";
import type { JobExecutionResult } from "../orchestrator/types";

// ───────────────────────────────────────────────────────────────────────────
// Intended-write taxonomy
// ───────────────────────────────────────────────────────────────────────────

export type IntendedWrite =
  | CanonicalUpsertWrite
  | SourceRecordInsertWrite
  | FieldProvenanceInsertWrite
  | DuplicateCandidateInsertWrite
  | EnrichmentRunUpdateWrite
  | AuditEventWrite;

export interface BaseWrite {
  /** Order in the transaction. Lower = earlier. */
  ordinal: number;
  /** Whether this write should occur. False entries are captured for
   *  audit/review but skipped by the executor. */
  effective: boolean;
  rationale: string;
}

export interface CanonicalUpsertWrite extends BaseWrite {
  kind: "canonical.upsert";
  /** Conflict target — typically `booking_hotel_id`. */
  conflictKey: "booking_hotel_id" | "google_place_id";
  draft: CanonicalHotelDraft;
  /** App-computed block_key — persisted into the new column. */
  blockKey: string;
}

export interface SourceRecordInsertWrite extends BaseWrite {
  kind: "source_record.insert";
  source: string;
  sourceId: string;
  payloadHash: string;
  fetchedAt: string; // ISO
  fetchStatus: "ok" | "parsed_with_warnings" | "parse_failed" | "rate_limited" | "not_found" | "auth_blocked";
  ttlExpiresAt: string; // ISO
  enrichmentRunId: string | null;
  /** Whether to attach the raw payload jsonb. Always true for canonical writes; can be false in tests. */
  includePayload: boolean;
}

export interface FieldProvenanceInsertWrite extends BaseWrite {
  kind: "field_provenance.insert";
  hotelId: string | null; // null when canonical row does not yet exist (caller resolves post-upsert)
  fieldName: string;
  value: unknown;
  source: string;
  sourceRecordId: string | null;
  confidence: number;
  fetchedAt: string; // ISO
}

export interface DuplicateCandidateInsertWrite extends BaseWrite {
  kind: "duplicate_candidate.insert";
  hotelAId: string;
  hotelBId: string;
  score: number;
  tier: "auto_merge" | "needs_review" | "likely_duplicate";
  components: Record<string, number>;
}

export interface EnrichmentRunUpdateWrite extends BaseWrite {
  kind: "enrichment_run.update";
  runId: string;
  patch: {
    hotelsSeen?: number;
    hotelsInserted?: number;
    hotelsUpdated?: number;
    fieldsUpdated?: number;
    errorsCount?: number;
    completedAt?: string;
    status?: "running" | "completed" | "failed" | "partial" | "budget_exceeded";
  };
}

export interface AuditEventWrite extends BaseWrite {
  kind: "audit_event";
  eventType: string; // dotted notation: 'hotel.canonical.field_updated' etc.
  hotelId: string | null;
  beforeState: unknown;
  afterState: unknown;
  meta: Record<string, unknown>;
}

// ───────────────────────────────────────────────────────────────────────────
// Writer report
// ───────────────────────────────────────────────────────────────────────────

export interface WriterReport {
  jobId: string;
  intendedWrites: IntendedWrite[];
  executedCount: number;
  skippedCount: number;
  errors: Array<{ ordinal: number; message: string }>;
  durationMs: number;
  mode: "dry-run" | "supabase";
}

// ───────────────────────────────────────────────────────────────────────────
// Writer contract
// ───────────────────────────────────────────────────────────────────────────

export interface EnrichmentWriter {
  readonly mode: "dry-run" | "supabase";
  /**
   * Execute the planned writes for a single JobExecutionResult.
   * In dry-run mode, writes are captured but not sent.
   * In supabase mode, writes are wrapped in a transaction.
   */
  persist(result: JobExecutionResult, runId: string | null): Promise<WriterReport>;
}
