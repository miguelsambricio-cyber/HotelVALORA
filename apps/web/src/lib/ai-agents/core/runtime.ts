import "server-only";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import type {
  AgentConfig,
  AgentDefinition,
  AgentId,
  AgentRunResult,
  RunContext,
  TriggerMeta,
} from "./types";
import { closeRun, logStep, openRun, panicCloseRun } from "./audit";
import { flush as flushEvents } from "./events";
import { persistMemory } from "./memory";
import { clearPermissionCache } from "./permissions";

/**
 * The single entry point for every agent invocation.
 *
 * Contract:
 *   1. opens an ai_agent_runs row (status='running'), records the input
 *   2. loads ai_agents.config and exposes it to the agent
 *   3. delegates to the agent's `run(input, ctx)` function
 *   4. flushes events + memory + closes the run with cost / token totals
 *   5. NEVER throws — all errors land in the closed row's error_message
 *
 * The agent itself stays thin. The runtime is the deterministic shell;
 * the agent is the "what to do" inside it.
 */

interface InvokeOptions {
  agent: AgentDefinition;
  input?: Record<string, unknown>;
  trigger: TriggerMeta;
}

export async function invoke(opts: InvokeOptions): Promise<AgentRunResult> {
  const { agent, trigger } = opts;
  const input = opts.input ?? {};

  const config = await loadAgentConfig(agent.id);
  if (!config.enabled) {
    return {
      status: "cancelled",
      steps: [
        {
          step: "preflight",
          status: "denied",
          reason: "agent_disabled",
          at: new Date().toISOString(),
        },
      ],
      events: [],
      memory: [],
      cost_usd: 0,
      tokens_in: 0,
      tokens_out: 0,
      error_message: "Agent disabled — flip ai_agents.enabled=true to activate.",
    };
  }

  let runId: string;
  try {
    runId = await openRun(agent.id, trigger, input);
  } catch (err) {
    console.error(`[ai-agents] could not open run for ${agent.id}:`, err);
    throw err; // openRun failure means the DB is unhealthy — bubble up
  }

  clearPermissionCache(agent.id);

  const ctx: RunContext = {
    run_id: runId,
    agent_id: agent.id,
    trigger,
    config: config.config,
    steps: [],
    events: [],
    memory: [],
    cost_usd: 0,
    tokens_in: 0,
    tokens_out: 0,
    started_at: Date.now(),
  };

  logStep(ctx, {
    step: "preflight",
    status: "ok",
    meta: {
      trigger: trigger.kind,
      tier: config.config.tier,
      daily_cost_usd_cap: config.config.daily_cost_usd_cap,
    },
  });

  let finalStatus: AgentRunResult["status"] = "success";
  let output: Record<string, unknown> | undefined;
  let errorMessage: string | undefined;

  try {
    const result = await agent.run(input, ctx);
    output = result.output;
  } catch (err) {
    finalStatus = "failed";
    errorMessage = err instanceof Error ? err.message : String(err);
    logStep(ctx, {
      step: "agent_run",
      status: "failed",
      reason: errorMessage,
    });
  }

  if (ctx.steps.some((s) => s.status === "awaiting_approval")) {
    finalStatus = "awaiting_approval";
  } else if (
    finalStatus === "success" &&
    ctx.steps.some((s) => s.status === "failed" || s.status === "denied")
  ) {
    finalStatus = "partial";
  }

  try {
    await flushEvents(ctx.events);
    await persistMemory(agent.id, ctx.memory);
  } catch (err) {
    console.error(`[ai-agents] flush failed for ${runId}:`, err);
  }

  try {
    await closeRun(ctx, finalStatus, { output, error_message: errorMessage });
  } catch (err) {
    console.error(`[ai-agents] closeRun failed for ${runId}:`, err);
    await panicCloseRun(runId, errorMessage ?? "closeRun failed").catch(() => {});
  }

  return {
    status: finalStatus,
    output,
    steps: ctx.steps,
    events: ctx.events,
    memory: ctx.memory,
    cost_usd: ctx.cost_usd,
    tokens_in: ctx.tokens_in,
    tokens_out: ctx.tokens_out,
    error_message: errorMessage,
  };
}

async function loadAgentConfig(
  agentId: AgentId,
): Promise<{ enabled: boolean; config: AgentConfig }> {
  const admin = getSupabaseAdmin();
  const { data, error } = await admin
    .from("ai_agents")
    .select("enabled, config")
    .eq("id", agentId)
    .single();
  if (error || !data) {
    throw new Error(`agent ${agentId} not registered in ai_agents`);
  }
  return {
    enabled: Boolean(data.enabled),
    config: (data.config ?? {}) as AgentConfig,
  };
}
