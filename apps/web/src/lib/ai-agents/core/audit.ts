import "server-only";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import type {
  AgentId,
  AgentRunResult,
  RunContext,
  RunStatus,
  StepLog,
  TriggerMeta,
} from "./types";

/**
 * Audit shell — every agent invocation opens a run, accumulates step
 * logs, then closes the run with status + cost + token totals. The DB
 * row in `ai_agent_runs` is the replay surface: input + steps + output
 * + tokens + cost together let any past run be reconstructed.
 */

export async function openRun(
  agentId: AgentId,
  trigger: TriggerMeta,
  input: Record<string, unknown>,
): Promise<string> {
  const admin = getSupabaseAdmin();
  const { data, error } = await admin
    .from("ai_agent_runs")
    .insert({
      agent_id: agentId,
      trigger_kind: trigger.kind,
      triggered_by: trigger.triggered_by ?? null,
      triggering_event_id: trigger.event_id ?? null,
      triggering_agent_id: trigger.agent_id ?? null,
      status: "running",
      input: input as never,
      steps: [] as never,
    })
    .select("id")
    .single();
  if (error) throw new Error(`openRun failed: ${error.message}`);
  return data.id as string;
}

export async function closeRun(
  ctx: RunContext,
  status: RunStatus,
  result: Partial<AgentRunResult>,
): Promise<void> {
  const admin = getSupabaseAdmin();
  const { error } = await admin
    .from("ai_agent_runs")
    .update({
      status,
      run_completed_at: new Date().toISOString(),
      steps: ctx.steps as never,
      output: (result.output ?? null) as never,
      tokens_in: ctx.tokens_in,
      tokens_out: ctx.tokens_out,
      cost_usd: ctx.cost_usd,
      error_message: result.error_message ?? null,
      metadata: {
        durations_ms: Date.now() - ctx.started_at,
        events_emitted: ctx.events.length,
        memory_written: ctx.memory.length,
      } as never,
    })
    .eq("id", ctx.run_id);
  if (error) {
    console.error(
      `[ai-agents] closeRun failed for ${ctx.run_id}:`,
      error.message,
    );
  }
}

export function logStep(ctx: RunContext, step: StepLog): void {
  ctx.steps.push({ ...step, at: step.at ?? new Date().toISOString() });
}

export async function panicCloseRun(
  runId: string,
  errorMessage: string,
): Promise<void> {
  const admin = getSupabaseAdmin();
  await admin
    .from("ai_agent_runs")
    .update({
      status: "failed",
      run_completed_at: new Date().toISOString(),
      error_message: errorMessage.slice(0, 2000),
    })
    .eq("id", runId);
}
