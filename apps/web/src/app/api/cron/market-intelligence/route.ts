import { NextResponse } from "next/server";
import { invoke } from "@/lib/ai-agents/core";
import { marketIntelligenceAgent } from "@/lib/ai-agents/agents/market-intelligence";
import { assertCron } from "@/lib/cron-auth";

/**
 * Daily Market Intelligence cron — fires 30 minutes after the ingestion
 * cron so the news window is hydrated. Reads recent market_news,
 * aggregates, writes a memory snapshot, emits a `custom` event.
 *
 * Schedule:  20 8 * * *  UTC  ≈ 09:20 / 10:20 Madrid
 * Auth:      Bearer CRON_SECRET
 */

export const runtime = "nodejs";
export const maxDuration = 120;
export const dynamic = "force-dynamic";

export async function GET(req: Request): Promise<NextResponse> {
  const unauth = assertCron(req);
  if (unauth) return unauth;
  try {
    const result = await invoke({
      agent: marketIntelligenceAgent,
      trigger: { kind: "cron" },
    });
    return NextResponse.json({
      ok: result.status === "success" || result.status === "partial",
      status: result.status,
      cost_usd: result.cost_usd,
      output: result.output,
    });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "agent crashed" },
      { status: 500 },
    );
  }
}
