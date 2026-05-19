/**
 * Dry-run writer (v1).
 *
 * Captures intended writes for inspection without executing them.
 * Used in:
 *   - Operator review gate (sample output JSON files)
 *   - Automated tests (golden fixtures)
 *   - The orchestrator's `recorded-fixture` runs to validate
 *     end-to-end behaviour before live mode lands.
 */

import { planIntendedWrites } from "./intended-writes";
import type { EnrichmentWriter, WriterReport } from "./types";
import type { JobExecutionResult } from "../orchestrator/types";
import type { SourceKey } from "../confidence/tier-registry";

export interface DryRunWriterOptions {
  source: SourceKey;
  payloadHash?: string;
  /** Source identifier (e.g., booking_hotel_id). Captured into the
   *  source_record write. Default: pulled from result.draft.booking_hotel_id. */
  sourceId?: string;
  /** Now-clock; used for ISO timestamps. */
  now?: () => Date;
}

export class DryRunWriter implements EnrichmentWriter {
  readonly mode = "dry-run" as const;
  /** Append-only log of all writes captured so far (across multiple persist calls). */
  readonly captured: WriterReport[] = [];

  constructor(private readonly opts: DryRunWriterOptions) {}

  async persist(result: JobExecutionResult, runId: string | null): Promise<WriterReport> {
    const start = Date.now();
    const now = this.opts.now ? this.opts.now() : new Date();
    const sourceId = this.opts.sourceId ?? String(result.draft?.booking_hotel_id ?? "unknown");
    const payloadHash = this.opts.payloadHash ?? `dry-run-hash::${sourceId}`;

    const intendedWrites = planIntendedWrites({
      result,
      runId,
      payloadHash,
      sourceId,
      source: this.opts.source,
      now,
    });

    const report: WriterReport = {
      jobId: result.job.id,
      intendedWrites,
      executedCount: 0,
      skippedCount: intendedWrites.length,
      errors: [],
      durationMs: Date.now() - start,
      mode: "dry-run",
    };
    this.captured.push(report);
    return report;
  }

  /** Convenience: aggregate counts across all captured reports. */
  summary(): {
    totalJobs: number;
    totalIntendedWrites: number;
    byKind: Record<string, number>;
  } {
    const byKind: Record<string, number> = {};
    let totalIntendedWrites = 0;
    for (const r of this.captured) {
      for (const w of r.intendedWrites) {
        byKind[w.kind] = (byKind[w.kind] ?? 0) + 1;
        totalIntendedWrites++;
      }
    }
    return {
      totalJobs: this.captured.length,
      totalIntendedWrites,
      byKind,
    };
  }
}
