/**
 * Supabase writer (v1).
 *
 * Executes intended writes against the real Supabase project. Uses a
 * type-only import of `@supabase/supabase-js` to avoid runtime
 * coupling at module load — callers inject the actual client.
 *
 * Phase 1: code lands and type-checks but is NOT invoked at runtime
 * (migration 0024 not yet applied; caller has no live client wired in).
 *
 * Transaction model:
 *   - Each `persist(jobResult)` call is one logical transaction at the
 *     row-set level.
 *   - Supabase REST does not expose multi-table transactions natively
 *     in the JS client; we approximate this with ordered writes plus
 *     compensating-action paths. For true atomicity post-Phase-A, we
 *     migrate to a `pg-rpc` function that does the full row-set in
 *     one call.
 *
 * For now: ordered writes with logged failures. The execution report
 * captures every error so the operator can replay.
 */

import { planIntendedWrites } from "./intended-writes";
import type {
  EnrichmentWriter,
  IntendedWrite,
  WriterReport,
} from "./types";
import type { JobExecutionResult } from "../orchestrator/types";
import type { SourceKey } from "../confidence/tier-registry";

// ───────────────────────────────────────────────────────────────────────────
// Narrow client shape (structural — works with @supabase/supabase-js)
// ───────────────────────────────────────────────────────────────────────────

export interface SupabaseWriteClient {
  from(table: string): {
    insert(values: Record<string, unknown> | Record<string, unknown>[]): Promise<{
      data: Record<string, unknown>[] | null;
      error: { message: string } | null;
    }>;
    upsert(values: Record<string, unknown> | Record<string, unknown>[], options?: {
      onConflict?: string;
    }): Promise<{ data: Record<string, unknown>[] | null; error: { message: string } | null }>;
    update(values: Record<string, unknown>): {
      eq(column: string, value: string | number): Promise<{
        data: Record<string, unknown>[] | null;
        error: { message: string } | null;
      }>;
    };
  };
}

// ───────────────────────────────────────────────────────────────────────────
// Writer
// ───────────────────────────────────────────────────────────────────────────

export interface SupabaseWriterOptions {
  source: SourceKey;
  /** Now-clock; used for ISO timestamps. */
  now?: () => Date;
  /** Payload hash for the source_record row. */
  payloadHash?: string;
  /** When true, errors are caught and logged into the report; persist()
   *  still returns successfully so caller can decide next steps.
   *  When false, the first error throws. */
  continueOnError?: boolean;
}

export class SupabaseWriter implements EnrichmentWriter {
  readonly mode = "supabase" as const;

  constructor(
    private readonly client: SupabaseWriteClient,
    private readonly opts: SupabaseWriterOptions,
  ) {}

  async persist(result: JobExecutionResult, runId: string | null): Promise<WriterReport> {
    const start = Date.now();
    const now = this.opts.now ? this.opts.now() : new Date();
    const sourceId = String(result.draft?.booking_hotel_id ?? "unknown");
    const payloadHash = this.opts.payloadHash ?? `runtime::${sourceId}::${now.toISOString().slice(0, 10)}`;

    const intendedWrites = planIntendedWrites({
      result,
      runId,
      payloadHash,
      sourceId,
      source: this.opts.source,
      now,
    });

    const errors: WriterReport["errors"] = [];
    let executed = 0;
    let skipped = 0;
    let resolvedHotelId: string | null = null;
    let resolvedSourceRecordId: string | null = null;

    for (const w of intendedWrites) {
      if (!w.effective) {
        skipped++;
        continue;
      }
      try {
        const id = await this.executeOne(w, resolvedHotelId, resolvedSourceRecordId);
        if (w.kind === "source_record.insert" && id) resolvedSourceRecordId = id;
        if (w.kind === "canonical.upsert" && id) resolvedHotelId = id;
        executed++;
      } catch (err) {
        errors.push({ ordinal: w.ordinal, message: err instanceof Error ? err.message : String(err) });
        if (!this.opts.continueOnError) {
          break;
        }
      }
    }

    return {
      jobId: result.job.id,
      intendedWrites,
      executedCount: executed,
      skippedCount: skipped,
      errors,
      durationMs: Date.now() - start,
      mode: "supabase",
    };
  }

  // ───────────────────────────────────────────────────────────────────────
  // Per-write executor — returns the new row id when relevant
  // ───────────────────────────────────────────────────────────────────────

  private async executeOne(
    w: IntendedWrite,
    hotelId: string | null,
    sourceRecordId: string | null,
  ): Promise<string | null> {
    switch (w.kind) {
      case "source_record.insert": {
        const row = {
          source: w.source,
          source_id: w.sourceId,
          payload_hash: w.payloadHash,
          fetched_at: w.fetchedAt,
          fetch_status: w.fetchStatus,
          ttl_expires_at: w.ttlExpiresAt,
          enrichment_run_id: w.enrichmentRunId,
        };
        const { data, error } = await this.client.from("hotel_source_record").insert(row);
        if (error) throw new Error(error.message);
        return (data?.[0]?.id as string | undefined) ?? null;
      }
      case "canonical.upsert": {
        const draft = w.draft;
        const row = {
          ...draft,
          block_key: w.blockKey,
        };
        const { data, error } = await this.client
          .from("hotel_canonical")
          .upsert(row as Record<string, unknown>, { onConflict: w.conflictKey });
        if (error) throw new Error(error.message);
        return (data?.[0]?.id as string | undefined) ?? null;
      }
      case "field_provenance.insert": {
        const row = {
          hotel_id: w.hotelId ?? hotelId,
          field_name: w.fieldName,
          value: w.value,
          source: w.source,
          source_record_id: w.sourceRecordId ?? sourceRecordId,
          confidence: w.confidence,
          fetched_at: w.fetchedAt,
        };
        const { error } = await this.client.from("hotel_field_provenance").insert(row);
        if (error) throw new Error(error.message);
        return null;
      }
      case "duplicate_candidate.insert": {
        const row = {
          hotel_a_id: w.hotelAId,
          hotel_b_id: w.hotelBId,
          score: w.score,
          tier: w.tier,
          components: w.components,
        };
        const { error } = await this.client.from("hotel_duplicate_candidate").insert(row);
        if (error) throw new Error(error.message);
        return null;
      }
      case "enrichment_run.update": {
        const { error } = await this.client.from("hotel_enrichment_run").update(w.patch).eq("id", w.runId);
        if (error) throw new Error(error.message);
        return null;
      }
      case "audit_event": {
        const row = {
          event_type: w.eventType,
          hotel_id: w.hotelId ?? hotelId,
          before_state: w.beforeState,
          after_state: w.afterState,
          meta: w.meta,
        };
        // audit_log table is owned by apps/api (migration 0005). Adapt
        // shape if needed at integration time.
        const { error } = await this.client.from("audit_log").insert(row);
        if (error) throw new Error(error.message);
        return null;
      }
      default: {
        const exhaustive: never = w;
        void exhaustive;
        return null;
      }
    }
  }
}
