import { NextRequest, NextResponse } from "next/server";
import { enrichHotel } from "@/lib/enrichment/enrich-hotel";

/**
 * Admin · pilot enrichment endpoint. Accepts a JSON body with a list of
 * canonical UUIDs (max 10) and runs `enrichHotel` for each in sequence.
 *
 * Auth: Bearer INGESTION_AUDIT_TOKEN (reuses the existing token already
 * provisioned on Vercel · no new env var needed).
 *
 * Returns a per-hotel result with sources called, fields updated, and
 * errors. Pilot-only · the sweep + cron lands in a separate commit.
 */

export const dynamic = "force-dynamic";
export const maxDuration = 300; // 5 min · Vercel Hobby max

const MAX_BATCH = 10;

interface PilotBody {
  canonical_ids?: string[];
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  // ── Auth ──
  const expected = process.env.INGESTION_AUDIT_TOKEN;
  if (!expected) {
    return NextResponse.json(
      { ok: false, error: "INGESTION_AUDIT_TOKEN env var not set on server" },
      { status: 500 },
    );
  }
  const authHeader = req.headers.get("authorization") ?? "";
  const presented = authHeader.toLowerCase().startsWith("bearer ")
    ? authHeader.slice(7).trim()
    : "";
  if (!presented || presented !== expected) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  // ── Body parse ──
  let body: PilotBody;
  try {
    body = (await req.json()) as PilotBody;
  } catch {
    return NextResponse.json({ ok: false, error: "invalid JSON body" }, { status: 400 });
  }
  const ids = Array.isArray(body.canonical_ids) ? body.canonical_ids.filter((s) => typeof s === "string") : [];
  if (ids.length === 0) {
    return NextResponse.json({ ok: false, error: "canonical_ids required" }, { status: 400 });
  }
  if (ids.length > MAX_BATCH) {
    return NextResponse.json(
      { ok: false, error: `max ${MAX_BATCH} canonical_ids per call` },
      { status: 400 },
    );
  }

  // ── Run ──
  const started_at = new Date().toISOString();
  const results = [];
  for (const id of ids) {
    try {
      results.push(await enrichHotel(id));
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      results.push({
        canonical_id: id,
        hotel_name: "—",
        ok: false,
        sources_called: [],
        fields_updated: [],
        errors: [{ source: "enrichHotel", code: "UNCAUGHT", message }],
        stats: { restaurants_count: null, meeting_rooms_count: null, photos_persisted: 0, google_phone: null },
        duration_ms: 0,
      });
    }
  }

  return NextResponse.json({
    ok: true,
    started_at,
    finished_at: new Date().toISOString(),
    count: results.length,
    results,
  });
}
