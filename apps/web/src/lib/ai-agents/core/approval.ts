import "server-only";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import type { AgentId, RunContext } from "./types";
import { logStep } from "./audit";

/**
 * Manual approval gate.
 *
 * Dormant in Phase 2 — Tier 1 agents (Market Intelligence, Data
 * Ingestion, QA / Monitoring) operate inside a permission set that does
 * not include any tool with `is_destructive` or `requires_human_approval`
 * (except `costar.exports.parse` which is held back behind this flow
 * until Excel ingest is hardened).
 *
 * The runtime calls `gate()` before executing a tool. If the tool or
 * the agent's `approval_required_for` config flags the action, the
 * gate inserts an `ai_human_review` row, marks the run
 * `awaiting_approval`, and returns `paused` — the caller short-circuits
 * out of the step loop and returns control. A future admin UI (or SQL
 * update) flips `ai_human_review.status` to 'approved' / 'rejected';
 * an explicit re-trigger of the agent then resumes from the same step.
 *
 * NO auto-resume in Phase 2 — re-runs are explicit. Phase 3 wires the
 * reactive resume via Supabase Realtime on ai_human_review.
 */

export type GateOutcome =
  | { decision: "allowed" }
  | { decision: "paused"; review_id: string }
  | { decision: "denied"; reason: string };

interface ToolFlags {
  is_destructive: boolean;
  requires_human_approval: boolean;
}

async function loadToolFlags(toolId: string): Promise<ToolFlags | null> {
  const admin = getSupabaseAdmin();
  const { data } = await admin
    .from("ai_tools")
    .select("is_destructive, requires_human_approval")
    .eq("id", toolId)
    .maybeSingle();
  if (!data) return null;
  return {
    is_destructive: Boolean(data.is_destructive),
    requires_human_approval: Boolean(data.requires_human_approval),
  };
}

/**
 * Inspect a planned tool invocation. Returns `allowed` (proceed),
 * `paused` (run goes to awaiting_approval), or `denied` (tool unknown
 * or explicitly blocked).
 *
 * The caller is responsible for short-circuiting on non-`allowed`.
 */
export async function gate(
  ctx: RunContext,
  toolId: string,
  proposedInput: Record<string, unknown>,
  reason?: string,
): Promise<GateOutcome> {
  const flags = await loadToolFlags(toolId);
  if (!flags) {
    logStep(ctx, {
      step: "approval_gate",
      tool_id: toolId,
      status: "denied",
      reason: "tool_unknown",
    });
    return { decision: "denied", reason: "tool_unknown" };
  }

  const agentApprovalList = ctx.config.approval_required_for ?? [];
  const agentForcesApproval = agentApprovalList.includes(toolId);
  const needsApproval =
    flags.is_destructive ||
    flags.requires_human_approval ||
    agentForcesApproval;

  if (!needsApproval) {
    logStep(ctx, {
      step: "approval_gate",
      tool_id: toolId,
      status: "ok",
      meta: { gate: "auto-allow" },
    });
    return { decision: "allowed" };
  }

  const reviewId = await openHumanReview(
    ctx.agent_id,
    ctx.run_id,
    toolId,
    proposedInput,
    reason ?? (flags.is_destructive ? "destructive_tool" : "approval_required"),
  );

  await markRunAwaitingApproval(ctx.run_id);

  logStep(ctx, {
    step: "approval_gate",
    tool_id: toolId,
    status: "awaiting_approval",
    reason: reason ?? "approval_required",
    meta: { review_id: reviewId },
  });

  ctx.events.push({
    kind: "human_approval_needed",
    source: `agent:${ctx.agent_id}`,
    payload: {
      review_id: reviewId,
      run_id: ctx.run_id,
      tool_id: toolId,
      reason: reason ?? "approval_required",
    },
  });

  return { decision: "paused", review_id: reviewId };
}

async function openHumanReview(
  agentId: AgentId,
  runId: string,
  toolId: string,
  proposedInput: Record<string, unknown>,
  reason: string,
): Promise<string> {
  const admin = getSupabaseAdmin();
  const expires = new Date();
  expires.setUTCDate(expires.getUTCDate() + 7);
  const { data, error } = await admin
    .from("ai_human_review")
    .insert({
      run_id: runId,
      agent_id: agentId,
      reason,
      status: "pending",
      proposed_action: {
        tool_id: toolId,
        input: proposedInput,
      } as never,
      expires_at: expires.toISOString(),
    })
    .select("id")
    .single();
  if (error) throw new Error(`openHumanReview: ${error.message}`);
  return data.id as string;
}

async function markRunAwaitingApproval(runId: string): Promise<void> {
  const admin = getSupabaseAdmin();
  await admin
    .from("ai_agent_runs")
    .update({ status: "awaiting_approval" })
    .eq("id", runId);
}
