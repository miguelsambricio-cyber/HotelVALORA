import { NextResponse } from "next/server";
import { z } from "zod";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

/**
 * Audit-chain unification endpoint.
 *
 * The Python CLI at `services/transactions/scripts/ingest.py` POSTs a run
 * summary here after every successful execution. The cloud handler writes
 * a matching `ai_agent_runs` row per processed file (so the DB becomes the
 * single audit lens across the operator-side and cloud-side halves of the
 * Data Ingestion Agent), emits a `data_ingestion_staged` event so QA /
 * Monitoring can react, and returns the new run IDs back to the CLI for
 * cross-reference.
 *
 * Auth: shared secret `INGESTION_AUDIT_TOKEN` via Authorization: Bearer.
 *       This is the same posture as the cron routes — no Supabase Auth
 *       because the CLI runs on the operator's machine, not in a browser.
 *
 * The cloud is a DOWNSTREAM mirror. If the CLI cannot reach this endpoint,
 * the local run is still authoritative (MASTER + INGESTION_LOG + logs/jsonl
 * are the source of truth). The CLI soft-fails on network/auth issues and
 * prints a hint; it does NOT roll back the local commit.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const FileOutcomeSchema = z.object({
  python_ingestion_id: z.string().uuid(),
  target: z.enum(["transactions", "projects"]),
  source_file: z.string().min(1).max(255),
  started_at: z.string(),
  completed_at: z.string(),
  outcome: z.enum(["success", "partial", "failed"]),
  operator_email: z.string().email(),
  normalization_version: z.string().max(20),
  rows_seen: z.number().int().nonnegative(),
  rows_inserted: z.number().int().nonnegative(),
  rows_updated: z.number().int().nonnegative().default(0),
  rows_skipped: z.number().int().nonnegative(),
  rows_flagged_review: z.number().int().nonnegative(),
  rows_failed: z.number().int().nonnegative(),
  review_reasons: z.array(z.string()).default([]),
  failed_reasons: z.array(z.string()).default([]),
  error_message: z.string().max(2000).optional(),
});

const PayloadSchema = z.object({
  python_ingestion_runs: z.array(FileOutcomeSchema).min(1).max(100),
});

type FileOutcome = z.infer<typeof FileOutcomeSchema>;

function assertAuth(req: Request): NextResponse | null {
  const expected = process.env.INGESTION_AUDIT_TOKEN;
  const header = req.headers.get("authorization");
  if (!expected) {
    if (process.env.VERCEL_ENV === "production") {
      return NextResponse.json(
        { ok: false, error: "INGESTION_AUDIT_TOKEN unset on a production deployment" },
        { status: 401 },
      );
    }
    console.warn(
      "[audit-sync] INGESTION_AUDIT_TOKEN unset — allowing in non-production",
    );
    return null;
  }
  if (header !== `Bearer ${expected}`) {
    return NextResponse.json({ ok: false, error: "unauthorised" }, { status: 401 });
  }
  return null;
}

interface CloudRunReceipt {
  python_ingestion_id: string;
  ai_agent_run_id: string;
  ai_event_id: string | null;
}

async function recordRun(outcome: FileOutcome): Promise<CloudRunReceipt> {
  const admin = getSupabaseAdmin();

  const stepsSummary = [
    {
      step: "cli_audit_received",
      status: "ok",
      at: new Date().toISOString(),
      meta: {
        source_file: outcome.source_file,
        target: outcome.target,
        python_ingestion_id: outcome.python_ingestion_id,
        rows_seen: outcome.rows_seen,
        rows_inserted: outcome.rows_inserted,
        rows_skipped: outcome.rows_skipped,
        rows_flagged_review: outcome.rows_flagged_review,
        rows_failed: outcome.rows_failed,
      },
    },
  ];

  const { data: run, error: runErr } = await admin
    .from("ai_agent_runs")
    .insert({
      agent_id: "data_ingestion",
      trigger_kind: "manual",
      status: outcome.outcome,
      run_started_at: outcome.started_at,
      run_completed_at: outcome.completed_at,
      input: {
        trigger: "cli",
        target: outcome.target,
        source_file: outcome.source_file,
        operator_email: outcome.operator_email,
      } as never,
      output: {
        rows_seen: outcome.rows_seen,
        rows_inserted: outcome.rows_inserted,
        rows_updated: outcome.rows_updated,
        rows_skipped: outcome.rows_skipped,
        rows_flagged_review: outcome.rows_flagged_review,
        rows_failed: outcome.rows_failed,
        review_reasons: outcome.review_reasons,
        failed_reasons: outcome.failed_reasons,
      } as never,
      steps: stepsSummary as never,
      tokens_in: 0,
      tokens_out: 0,
      cost_usd: 0,
      error_message: outcome.error_message ?? null,
      metadata: {
        python_ingestion_id: outcome.python_ingestion_id,
        normalization_version: outcome.normalization_version,
        source: "cli_audit_sync",
      } as never,
    })
    .select("id")
    .single();

  if (runErr || !run) {
    throw new Error(`ai_agent_runs insert: ${runErr?.message ?? "no row"}`);
  }

  const { data: evt, error: evtErr } = await admin
    .from("ai_events")
    .insert({
      kind: "custom",
      source: "agent:data_ingestion:cli",
      payload: {
        kind: "data_ingestion_staged",
        target: outcome.target,
        source_file: outcome.source_file,
        outcome: outcome.outcome,
        run_id: run.id,
        python_ingestion_id: outcome.python_ingestion_id,
        rows_inserted: outcome.rows_inserted,
        rows_flagged_review: outcome.rows_flagged_review,
        rows_failed: outcome.rows_failed,
      } as never,
    })
    .select("id")
    .single();

  if (evtErr) {
    // Event emit failure is not fatal — the run row is recorded.
    console.warn(`[audit-sync] ai_events insert failed: ${evtErr.message}`);
  }

  return {
    python_ingestion_id: outcome.python_ingestion_id,
    ai_agent_run_id: run.id as string,
    ai_event_id: (evt?.id as string | undefined) ?? null,
  };
}

export async function POST(req: Request): Promise<NextResponse> {
  const unauth = assertAuth(req);
  if (unauth) return unauth;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_json" }, { status: 400 });
  }

  const parsed = PayloadSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        ok: false,
        error: "invalid_payload",
        issues: parsed.error.errors.map((e) => ({
          path: e.path.join("."),
          message: e.message,
        })),
      },
      { status: 400 },
    );
  }

  const receipts: CloudRunReceipt[] = [];
  const failures: Array<{ python_ingestion_id: string; error: string }> = [];

  for (const outcome of parsed.data.python_ingestion_runs) {
    try {
      const r = await recordRun(outcome);
      receipts.push(r);
    } catch (err) {
      failures.push({
        python_ingestion_id: outcome.python_ingestion_id,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  const status = failures.length === 0 ? 200 : receipts.length === 0 ? 500 : 207;
  return NextResponse.json(
    {
      ok: failures.length === 0,
      cloud_runs: receipts,
      failures,
    },
    { status },
  );
}
