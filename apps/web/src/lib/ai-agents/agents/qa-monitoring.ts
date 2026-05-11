import "server-only";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import {
  emitEvent,
  escalate,
  logStep,
  requirePermission,
  type AgentDefinition,
  type RunContext,
} from "../core";

/**
 * QA / Monitoring Agent — Phase 2 / Tier 1 / read-only across the platform.
 *
 * Runs hourly. Each invocation produces a "health snapshot" probe that:
 *
 *   1. Counts recent ingestion failures (last 24h)
 *   2. Counts recent agent run failures (last 24h)
 *   3. Counts pending human reviews older than 24h ("stuck approvals")
 *   4. Aggregates Tier-1 agent daily cost vs cap (cost-cap warnings)
 *   5. Stores snapshot in ai_memory (scope=agent_global)
 *   6. Escalates via monitoring.escalate.email when thresholds are
 *      crossed — cooldown protected so a flapping condition does not
 *      spam the operator inbox.
 *
 * Side effects: ai_memory writes (own scope), ai_events emits, Resend
 * sends (only when threshold + cooldown allow). NO writes to anything
 * else.
 */

const STUCK_APPROVAL_HOURS = 24;
const COST_WARNING_PCT = 0.8; // escalate at 80% of daily cap

type Severity = "info" | "warning" | "critical";

interface HealthSnapshot {
  at: string;
  ingestion: { last_24h_failures: number; last_24h_partial: number };
  agents: { last_24h_failed_runs: number; last_24h_total_runs: number };
  approvals: { stuck_count: number };
  cost: Array<{ agent_id: string; today_usd: number; cap_usd: number; pct: number }>;
  notes: string[];
}

async function takeSnapshot(ctx: RunContext): Promise<HealthSnapshot> {
  await requirePermission(ctx, "table", "news_ingestion_runs", "select");
  await requirePermission(ctx, "table", "ai_agent_runs", "select");
  await requirePermission(ctx, "table", "ai_human_review", "select");
  await requirePermission(ctx, "table", "ai_agents", "select");

  const admin = getSupabaseAdmin();
  const day = new Date(Date.now() - 86400_000).toISOString();
  const dayStart = new Date(
    Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth(), new Date().getUTCDate()),
  ).toISOString();
  const stuckSince = new Date(Date.now() - STUCK_APPROVAL_HOURS * 3600_000).toISOString();

  const [
    { data: ingestionFailed },
    { data: ingestionPartial },
    { data: agentFailed },
    { data: agentAll },
    { data: stuck },
    { data: agents },
    { data: todayRuns },
  ] = await Promise.all([
    admin.from("news_ingestion_runs").select("id", { count: "exact", head: false }).eq("status", "failed").gte("run_started_at", day),
    admin.from("news_ingestion_runs").select("id", { count: "exact", head: false }).eq("status", "partial").gte("run_started_at", day),
    admin.from("ai_agent_runs").select("id").eq("status", "failed").gte("run_started_at", day),
    admin.from("ai_agent_runs").select("id").gte("run_started_at", day),
    admin.from("ai_human_review").select("id").eq("status", "pending").lte("created_at", stuckSince),
    admin.from("ai_agents").select("id, config").in("status", ["beta", "active"]),
    admin.from("ai_agent_runs").select("agent_id, cost_usd").gte("run_started_at", dayStart),
  ]);

  const costsByAgent: Record<string, number> = {};
  (todayRuns ?? []).forEach((r) => {
    const a = String(r.agent_id);
    costsByAgent[a] = (costsByAgent[a] ?? 0) + Number(r.cost_usd ?? 0);
  });

  const cost: HealthSnapshot["cost"] = (agents ?? []).map((a) => {
    const cap =
      ((a.config as Record<string, unknown> | null)?.daily_cost_usd_cap as number | undefined) ?? 0.1;
    const today = costsByAgent[String(a.id)] ?? 0;
    return {
      agent_id: String(a.id),
      today_usd: today,
      cap_usd: cap,
      pct: cap > 0 ? today / cap : 0,
    };
  });

  return {
    at: new Date().toISOString(),
    ingestion: {
      last_24h_failures: (ingestionFailed ?? []).length,
      last_24h_partial: (ingestionPartial ?? []).length,
    },
    agents: {
      last_24h_failed_runs: (agentFailed ?? []).length,
      last_24h_total_runs: (agentAll ?? []).length,
    },
    approvals: { stuck_count: (stuck ?? []).length },
    cost,
    notes: [],
  };
}

function deriveEscalations(snap: HealthSnapshot): Array<{
  severity: Severity;
  subject: string;
  summary: string;
  dedup_key: string;
}> {
  const out: Array<{ severity: Severity; subject: string; summary: string; dedup_key: string }> = [];

  if (snap.ingestion.last_24h_failures > 0) {
    out.push({
      severity: snap.ingestion.last_24h_failures >= 3 ? "critical" : "warning",
      subject: `${snap.ingestion.last_24h_failures} ingestion failure(s) in last 24h`,
      summary: `Last 24h news_ingestion_runs: ${snap.ingestion.last_24h_failures} failed, ${snap.ingestion.last_24h_partial} partial.\nCheck /dev/intelligence-test for source-level detail.`,
      dedup_key: `ingestion_failure_24h`,
    });
  }

  if (snap.agents.last_24h_failed_runs >= 3) {
    out.push({
      severity: "warning",
      subject: `${snap.agents.last_24h_failed_runs} agent runs failed in last 24h`,
      summary: `Across all Tier-1 agents: ${snap.agents.last_24h_failed_runs} failed of ${snap.agents.last_24h_total_runs} total.\nReview ai_agent_runs where status='failed' for error_message.`,
      dedup_key: `agent_failures_24h`,
    });
  }

  if (snap.approvals.stuck_count > 0) {
    out.push({
      severity: "info",
      subject: `${snap.approvals.stuck_count} approval(s) pending > ${STUCK_APPROVAL_HOURS}h`,
      summary: `ai_human_review rows with status='pending' older than ${STUCK_APPROVAL_HOURS}h: ${snap.approvals.stuck_count}.\nReview at /dev/ai-ops once it ships.`,
      dedup_key: `stuck_approvals`,
    });
  }

  snap.cost.forEach((c) => {
    if (c.pct >= COST_WARNING_PCT) {
      out.push({
        severity: c.pct >= 1 ? "critical" : "warning",
        subject: `Agent ${c.agent_id} at ${(c.pct * 100).toFixed(0)}% of daily cap`,
        summary: `Today's spend: $${c.today_usd.toFixed(4)} of $${c.cap_usd.toFixed(4)} cap.\nRaise the cap in ai_agents.config.daily_cost_usd_cap if this is expected.`,
        dedup_key: `cost_cap:${c.agent_id}`,
      });
    }
  });

  return out;
}

export const qaMonitoringAgent: AgentDefinition = {
  id: "qa_monitoring",
  async run(_input, ctx) {
    const snapshot = await takeSnapshot(ctx);
    logStep(ctx, {
      step: "snapshot_taken",
      status: "ok",
      meta: {
        ingestion_failures: snapshot.ingestion.last_24h_failures,
        agent_failures: snapshot.agents.last_24h_failed_runs,
        stuck_approvals: snapshot.approvals.stuck_count,
      },
    });

    try {
      await requirePermission(ctx, "table", "ai_memory", "insert");
      ctx.memory.push({
        scope: "agent_global",
        content: `health_snapshot:${snapshot.at}`,
        importance_score: 0.6,
        meta: snapshot as unknown as Record<string, unknown>,
      });
    } catch {
      // silent — snapshot still emitted via output
    }

    const escalations = deriveEscalations(snapshot);
    const sent: string[] = [];

    for (const e of escalations) {
      const result = await escalate(ctx, {
        severity: e.severity,
        subject: e.subject,
        summary: e.summary,
        dedup_key: e.dedup_key,
        meta: { snapshot_at: snapshot.at },
      });
      if (result.sent) {
        sent.push(e.dedup_key);
        emitEvent(ctx, "system_alert", {
          severity: e.severity,
          subject: e.subject,
          dedup_key: e.dedup_key,
        });
      }
    }

    // Always emit a health_check_failed marker if any failure thresholds tripped
    if (snapshot.ingestion.last_24h_failures > 0 || snapshot.agents.last_24h_failed_runs > 0) {
      emitEvent(ctx, "health_check_failed", {
        ingestion_failures: snapshot.ingestion.last_24h_failures,
        agent_failures: snapshot.agents.last_24h_failed_runs,
      });
    }

    return {
      output: {
        snapshot,
        escalations_sent: sent,
        escalations_evaluated: escalations.length,
      },
    };
  },
};
