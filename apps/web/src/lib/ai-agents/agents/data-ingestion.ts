import "server-only";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { z } from "zod";
import {
  approvalGate,
  emitEvent,
  logStep,
  requirePermission,
  type AgentDefinition,
} from "../core";

/**
 * Data Ingestion Agent — Phase 2 / Tier 1 / manual trigger only.
 *
 * Accepts a structured payload describing a CoStar / STR / Excel dump
 * the operator has uploaded. The Phase 2 contract is intentionally a
 * dry-run validator:
 *
 *   - shape-check the payload (zod)
 *   - record the upload in uploaded_excels (status='received')
 *   - if any destructive tool (e.g. costar.exports.parse) is requested,
 *     route it through the approval gate — returns paused, not actioned
 *   - emit a `custom` event so QA Monitoring can flag the upload
 *
 * Phase 3 will wire actual parser execution + write-through to
 * staging tables once the operator approves the gated tool calls.
 */

const PayloadSchema = z.object({
  source_kind: z.enum(["costar", "str", "excel", "csv"]),
  bucket: z.string().min(1).max(80).default("excel-uploads"),
  storage_path: z.string().min(1).max(500),
  file_name: z.string().min(1).max(255),
  size_bytes: z.number().int().nonnegative().optional(),
  uploader_user_id: z.string().uuid(),
  request_parse: z.boolean().default(false),
  notes: z.string().max(1000).optional(),
});

export type DataIngestionInput = z.infer<typeof PayloadSchema>;

export const dataIngestionAgent: AgentDefinition = {
  id: "data_ingestion",
  async run(input, ctx) {
    const parsed = PayloadSchema.safeParse(input);
    if (!parsed.success) {
      logStep(ctx, {
        step: "validate_payload",
        status: "failed",
        reason: parsed.error.errors[0]?.message ?? "invalid_payload",
      });
      throw new Error(
        `invalid payload: ${parsed.error.errors[0]?.message ?? "shape_mismatch"}`,
      );
    }
    const payload = parsed.data;

    logStep(ctx, {
      step: "validate_payload",
      status: "ok",
      meta: { source_kind: payload.source_kind, file_name: payload.file_name },
    });

    await requirePermission(ctx, "table", "uploaded_excels", "insert");
    const admin = getSupabaseAdmin();
    const { data: row, error } = await admin
      .from("uploaded_excels")
      .insert({
        uploaded_by: payload.uploader_user_id,
        bucket: payload.bucket,
        storage_path: payload.storage_path,
        file_name: payload.file_name,
        size_bytes: payload.size_bytes ?? null,
        status: "queued",
        parsed_summary: payload.notes
          ? ({ notes: payload.notes, source_kind: payload.source_kind } as never)
          : ({ source_kind: payload.source_kind } as never),
      })
      .select("id")
      .single();

    if (error) {
      logStep(ctx, {
        step: "stage_upload",
        status: "failed",
        reason: error.message,
      });
      throw new Error(`uploaded_excels insert: ${error.message}`);
    }

    logStep(ctx, {
      step: "stage_upload",
      status: "ok",
      meta: { upload_id: row.id },
    });

    let gate_outcome: string | undefined;
    if (payload.request_parse) {
      const outcome = await approvalGate(
        ctx,
        "costar.exports.parse",
        {
          upload_id: row.id,
          bucket: payload.bucket,
          storage_path: payload.storage_path,
          source_kind: payload.source_kind,
        },
        "Operator requested execution of CoStar/Excel parser",
      );
      gate_outcome = outcome.decision;
      if (outcome.decision === "paused") {
        return {
          output: {
            upload_id: row.id,
            staged: true,
            parse_requested: true,
            gate: outcome,
          },
        };
      }
      if (outcome.decision === "denied") {
        // tool unknown or blocked — surface in step log; run continues
        logStep(ctx, {
          step: "parse_request",
          status: "denied",
          reason: outcome.reason,
        });
      }
    }

    emitEvent(ctx, "custom", {
      kind: "data_ingestion_staged",
      upload_id: row.id,
      source_kind: payload.source_kind,
      file_name: payload.file_name,
      gate_outcome,
    });

    return {
      output: {
        upload_id: row.id,
        staged: true,
        parse_requested: payload.request_parse,
        gate: gate_outcome ?? null,
      },
    };
  },
};
