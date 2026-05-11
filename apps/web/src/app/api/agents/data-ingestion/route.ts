import { NextResponse } from "next/server";
import { getSupabaseUser } from "@/lib/supabase/auth-helpers";
import { invoke } from "@/lib/ai-agents/core";
import { dataIngestionAgent } from "@/lib/ai-agents/agents/data-ingestion";

/**
 * Manual trigger for the Data Ingestion Agent.
 *
 * Auth: requires a Supabase-authenticated user. The agent uses that
 * user's UUID for `uploaded_excels.uploaded_by`, so the file is owned
 * by the operator who uploaded it (audit chain).
 *
 * Body (JSON):
 *   {
 *     "source_kind": "costar" | "str" | "excel" | "csv",
 *     "bucket":       "excel-uploads",
 *     "storage_path": "<user-uuid>/<timestamp>-<filename>.xlsx",
 *     "file_name":    "<filename>.xlsx",
 *     "size_bytes":   123456,
 *     "request_parse": false,            // if true, runs through approval gate
 *     "notes":        "optional"
 *   }
 *
 * Response: { ok, run_status, upload_id, gate_outcome }
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request): Promise<NextResponse> {
  const user = await getSupabaseUser();
  if (!user) {
    return NextResponse.json({ ok: false, error: "unauthenticated" }, { status: 401 });
  }

  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_json" }, { status: 400 });
  }

  const input = { ...body, uploader_user_id: user.id };

  try {
    const result = await invoke({
      agent: dataIngestionAgent,
      input,
      trigger: { kind: "manual", triggered_by: user.id },
    });
    return NextResponse.json({
      ok: result.status === "success" || result.status === "awaiting_approval",
      run_status: result.status,
      cost_usd: result.cost_usd,
      output: result.output,
      error: result.error_message,
    });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "agent crashed" },
      { status: 500 },
    );
  }
}
