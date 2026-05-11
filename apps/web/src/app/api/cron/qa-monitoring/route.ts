import { NextResponse } from "next/server";
import { invoke } from "@/lib/ai-agents/core";
import { qaMonitoringAgent } from "@/lib/ai-agents/agents/qa-monitoring";
import { assertCron } from "@/lib/cron-auth";

/**
 * Hourly health probe cron.
 *
 * Schedule:  0 * * * *  UTC  (every hour, top of the hour)
 * Auth:      Bearer CRON_SECRET
 *
 * Side effects:
 *   - takes a read-only snapshot of ingestion + agent runs + approval queue + cost
 *   - writes a snapshot row to ai_memory (own scope)
 *   - escalates via Resend (with cooldown) when thresholds tripped
 *
 * Never writes outside ai_memory + ai_events. Idempotent across multiple
 * cron firings within the cooldown window.
 */

export const runtime = "nodejs";
export const maxDuration = 60;
export const dynamic = "force-dynamic";

export async function GET(req: Request): Promise<NextResponse> {
  const unauth = assertCron(req);
  if (unauth) return unauth;
  try {
    const result = await invoke({
      agent: qaMonitoringAgent,
      trigger: { kind: "cron" },
    });
    return NextResponse.json({
      ok: result.status === "success" || result.status === "partial",
      status: result.status,
      output: result.output,
    });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "agent crashed" },
      { status: 500 },
    );
  }
}
