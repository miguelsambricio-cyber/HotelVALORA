import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { enrichHotel } from "@/lib/enrichment/enrich-hotel";

/**
 * Daily cron · refreshes hotels with stale or absent enrichment.
 *
 * Selection criteria:
 *   - last_enriched_at IS NULL (never enriched), OR
 *   - last_enriched_at < NOW() - 30 days (stale signature, possible
 *     CDN URL expiry on Booking photos · refresh keeps the gallery live).
 *
 * Ordered by oldest-first so the never-enriched corpus drains before
 * the 30-day refresh cohort starts cycling.
 *
 * Auth: Vercel auto-injects `Authorization: Bearer <CRON_SECRET>` on
 * scheduled invocations. The route additionally accepts the same secret
 * via INGESTION_AUDIT_TOKEN for manual operator triggers.
 *
 * Time budget: 300s maxDuration · at ~12s/hotel avg (with internal 5 RPS
 * rate-limit) we batch 20 hotels per run · margin for slow Booking
 * responses + DB round trips.
 */

export const dynamic = "force-dynamic";
export const maxDuration = 300;

const BATCH_SIZE = 20;

function isAuthorized(req: NextRequest): boolean {
  const cronSecret = process.env.CRON_SECRET;
  const auditToken = process.env.INGESTION_AUDIT_TOKEN;
  const header = req.headers.get("authorization") ?? "";
  const presented = header.toLowerCase().startsWith("bearer ")
    ? header.slice(7).trim()
    : "";
  if (cronSecret && presented === cronSecret) return true;
  if (auditToken && presented === auditToken) return true;
  return false;
}

interface CandidateRow {
  id: string;
  last_enriched_at: string | null;
}

export async function GET(req: NextRequest): Promise<NextResponse> {
  if (!isAuthorized(req)) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  const t0 = Date.now();
  const sb = getSupabaseAdmin() as unknown as {
    from: (t: string) => {
      select: (cols: string) => {
        or: (filter: string) => {
          order: (col: string, opts: { ascending: boolean; nullsFirst: boolean }) => {
            limit: (n: number) => Promise<{ data: CandidateRow[] | null; error: unknown }>;
          };
        };
      };
    };
  };

  // Pick stale or never-enriched · oldest first · cap to BATCH_SIZE
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const sel = await sb
    .from("hotel_canonical")
    .select("id,last_enriched_at")
    .or(`last_enriched_at.is.null,last_enriched_at.lt.${thirtyDaysAgo}`)
    .order("last_enriched_at", { ascending: true, nullsFirst: true })
    .limit(BATCH_SIZE);

  if (sel.error || !sel.data) {
    return NextResponse.json(
      { ok: false, error: "DB select failed", details: String(sel.error) },
      { status: 500 },
    );
  }

  const candidates = sel.data;
  if (candidates.length === 0) {
    return NextResponse.json({
      ok: true,
      message: "No stale hotels to refresh",
      count: 0,
      duration_ms: Date.now() - t0,
    });
  }

  // Run sequentially · the worker has its own 5 RPS internal limit
  const results = [];
  for (const c of candidates) {
    try {
      const r = await enrichHotel(c.id);
      results.push({
        canonical_id: c.id,
        ok: r.ok,
        fields_updated_count: r.fields_updated.length,
        errors_count: r.errors.length,
        was_null: c.last_enriched_at === null,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      results.push({
        canonical_id: c.id,
        ok: false,
        fields_updated_count: 0,
        errors_count: 1,
        was_null: c.last_enriched_at === null,
        uncaught: message,
      });
    }
  }

  const ok_count = results.filter((r) => r.ok).length;
  return NextResponse.json({
    ok: true,
    processed: results.length,
    ok_count,
    failed_count: results.length - ok_count,
    duration_ms: Date.now() - t0,
    results,
  });
}
