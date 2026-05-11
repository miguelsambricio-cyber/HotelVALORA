import "server-only";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import type { AgentConfig, AgentId, RunContext } from "./types";
import { logStep } from "./audit";

/**
 * Cost guardrail layer.
 *
 * Phase 2 uses regex-only Tier 1 agents so spend is ~0. The architecture
 * is in place ahead of LLM activation (Phase 3+). Two checks:
 *
 *   1. preflight(agent_id, config) — called before an LLM step. Sums
 *      today's spend across ai_agent_runs and rejects if the agent's
 *      daily_cost_usd_cap would be exceeded.
 *
 *   2. account(ctx, delta) — called after an LLM step. Adds the call's
 *      cost to the running totals on the in-memory ctx. The audit shell
 *      writes the totals back to ai_agent_runs at run close.
 *
 * Spend is sourced from ai_agent_runs.cost_usd (already on the schema).
 * No new table needed.
 */

const DEFAULT_DAILY_CAP_USD = 0.1;
const DEFAULT_MONTHLY_CAP_USD = 2.0;

export interface BudgetSnapshot {
  agent_id: AgentId;
  today_usd: number;
  month_usd: number;
  daily_cap_usd: number;
  monthly_cap_usd: number;
  daily_pct: number;
  monthly_pct: number;
  remaining_today_usd: number;
}

export async function getBudgetSnapshot(
  agentId: AgentId,
  config: AgentConfig,
): Promise<BudgetSnapshot> {
  const admin = getSupabaseAdmin();
  const dailyCap = config.daily_cost_usd_cap ?? DEFAULT_DAILY_CAP_USD;
  const monthlyCap = config.monthly_cost_usd_cap ?? DEFAULT_MONTHLY_CAP_USD;
  const now = new Date();
  const dayStart = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
  ).toISOString();
  const monthStart = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1),
  ).toISOString();

  const [{ data: dayRows }, { data: monthRows }] = await Promise.all([
    admin
      .from("ai_agent_runs")
      .select("cost_usd")
      .eq("agent_id", agentId)
      .gte("run_started_at", dayStart),
    admin
      .from("ai_agent_runs")
      .select("cost_usd")
      .eq("agent_id", agentId)
      .gte("run_started_at", monthStart),
  ]);

  const today = (dayRows ?? []).reduce(
    (acc, r) => acc + Number(r.cost_usd ?? 0),
    0,
  );
  const month = (monthRows ?? []).reduce(
    (acc, r) => acc + Number(r.cost_usd ?? 0),
    0,
  );

  return {
    agent_id: agentId,
    today_usd: today,
    month_usd: month,
    daily_cap_usd: dailyCap,
    monthly_cap_usd: monthlyCap,
    daily_pct: dailyCap > 0 ? today / dailyCap : 0,
    monthly_pct: monthlyCap > 0 ? month / monthlyCap : 0,
    remaining_today_usd: Math.max(0, dailyCap - today),
  };
}

/**
 * Block an LLM-bearing step if the run would exceed the daily cap.
 * Returns true if the step can proceed; false if it should be skipped.
 *
 * Emits a `cost_cap_warning` event when the cap is hit. The audit step
 * shows `denied / budget_exceeded` so the run record reflects why.
 */
export async function preflight(
  ctx: RunContext,
  estimatedCostUsd: number,
): Promise<boolean> {
  if (estimatedCostUsd <= 0) return true;
  const snap = await getBudgetSnapshot(ctx.agent_id, ctx.config);
  const projected = snap.today_usd + ctx.cost_usd + estimatedCostUsd;
  if (projected > snap.daily_cap_usd) {
    logStep(ctx, {
      step: "budget_preflight",
      status: "denied",
      reason: "budget_exceeded",
      meta: {
        estimated_usd: estimatedCostUsd,
        projected_today_usd: projected,
        daily_cap_usd: snap.daily_cap_usd,
      },
    });
    ctx.events.push({
      kind: "cost_cap_warning",
      source: "core.budget",
      payload: {
        agent_id: ctx.agent_id,
        run_id: ctx.run_id,
        projected_today_usd: projected,
        daily_cap_usd: snap.daily_cap_usd,
      },
    });
    return false;
  }
  return true;
}

export function account(
  ctx: RunContext,
  delta: { cost_usd: number; tokens_in?: number; tokens_out?: number; model?: string },
): void {
  ctx.cost_usd += delta.cost_usd;
  ctx.tokens_in += delta.tokens_in ?? 0;
  ctx.tokens_out += delta.tokens_out ?? 0;
  logStep(ctx, {
    step: "budget_account",
    status: "ok",
    meta: {
      cost_usd: delta.cost_usd,
      tokens_in: delta.tokens_in,
      tokens_out: delta.tokens_out,
      model: delta.model,
    },
  });
}
