import { NextResponse } from "next/server";
import { runAllSources } from "@/lib/intelligence/ingest";
import { assertCron } from "@/lib/cron-auth";

/**
 * Daily ingestion cron — runs every enabled source serially, writes
 * results to news_ingestion_runs + market_news, returns a JSON summary.
 *
 * Schedule:  48 7 * * *  UTC  ≈ 08:48 Madrid winter / 09:48 Madrid summer
 * Auth:      Bearer CRON_SECRET (Vercel Cron injects it automatically)
 *
 * Operator manual re-trigger:
 *   curl -H "authorization: Bearer $CRON_SECRET" \
 *        https://hotelvalora.com/api/cron/hospitality-intel
 */

export const runtime = "nodejs";
export const maxDuration = 300;
export const dynamic = "force-dynamic";

export async function GET(req: Request): Promise<NextResponse> {
  const unauth = assertCron(req);
  if (unauth) return unauth;
  try {
    const result = await runAllSources();
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    return NextResponse.json(
      {
        ok: false,
        error: err instanceof Error ? err.message : "ingestion crashed",
      },
      { status: 500 },
    );
  }
}
