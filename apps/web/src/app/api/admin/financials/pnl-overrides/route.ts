import { NextResponse, type NextRequest } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { requireOperator, OperatorDenied } from "@/lib/security/operator-guard";
import { PNL_DB_COLUMNS_VISIBLE, type PnlDbColumn } from "@/lib/admin/financials/pnl-line-mapping";

/**
 * POST /api/admin/financials/pnl-overrides
 *
 * FASE 3 sub-paso 4 · FIRST WRITE endpoint of the migration. Persists
 * operator overrides to `pnl_template_override` per the declarative-set
 * semantics agreed with the operator:
 *
 *   The request body declares the COMPLETE override set for the template.
 *   Server reconciles by UPSERTing the listed rows and DELETING any pre-
 *   existing overrides for the same template_id that are NOT in the body.
 *
 * Why declarative-set:
 *   - panelStateToOverrides() (sub-paso 1) only emits rows that DIFFER from
 *     the BD-effective base. If the operator edits a cell back to the base
 *     value, the diff drops it · the server then removes the stale override
 *     naturally · no client-side delete bookkeeping required.
 *   - Reset = empty array · server wipes all overrides for the template.
 *   - Idempotent: re-POSTing the same body produces the same final state.
 *
 * Auth: requireOperator() fail-closed · operator_email captured from the
 * session and persisted on every override row for audit trail. In
 * dev_permissive mode falls back to "dev@hotelvalora.local" so local
 * iteration works without a real session.
 *
 * Validation:
 *   - template_id MUST be a valid UUID and MUST exist in pnl_template
 *   - overrides[].line_item MUST be in PNL_DB_COLUMNS_VISIBLE (rejects
 *     hidden columns it_telecom_pct / staff_cost_memo_pct / rent_pct
 *     even if a caller bypasses the panel)
 *   - overrides[].override_value MUST be a finite number ∈ [0, 999.99]
 *     (numeric(5,2) BD constraint · negatives don't make sense for
 *     percentages)
 *   - No duplicate line_item entries
 *
 * Atomicity: 3 sequential supabase-js calls (verify template + delete-rest
 * + upsert). Race window between operators is tolerable today (one
 * operator) but the audit row records the full operation for forensics.
 * Future hardening: wrap in a Postgres stored procedure for full ACID.
 *
 * Audit: writes to ai_agent_runs with operation=pnl_override_save,
 * including upserted_count / removed_count / operator_email / template_id.
 * Audit failure does NOT fail the save (data succeeded already) but is
 * reported in the response as `warning`.
 *
 * Response shapes:
 *   200 → { ok, template_id, upserted_count, removed_count, operator_email, saved_at, warning? }
 *   400 → { ok: false, error: "bad_request", message }
 *   403 → { ok: false, error: "unauthorized" }
 *   404 → { ok: false, error: "template_not_found", template_id }
 *   500 → { ok: false, error: "db_*_failed" | "auth_failed", details }
 *
 * Nothing consumes this yet · sub-paso 5 hook is the first caller.
 */

export const dynamic = "force-dynamic";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const VALID_LINE_ITEMS: ReadonlySet<string> = new Set(PNL_DB_COLUMNS_VISIBLE);
const MAX_VALUE = 999.99; // numeric(5,2) BD constraint
const DEV_FALLBACK_EMAIL = "dev@hotelvalora.local";

interface OverrideInput {
  line_item: string;
  override_value: number;
  operator_reason?: string;
}

interface PostBody {
  template_id?: string;
  overrides?: OverrideInput[];
}

interface ValidatedOverride {
  line_item: PnlDbColumn;
  override_value: number;
  operator_reason: string;
}

function jsonNoStore(body: unknown, init?: ResponseInit): NextResponse {
  const res = NextResponse.json(body, init);
  res.headers.set("cache-control", "no-store, max-age=0");
  return res;
}

function badRequest(message: string): NextResponse {
  return jsonNoStore({ ok: false, error: "bad_request", message }, { status: 400 });
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  // ── 1 · Operator gate ────────────────────────────────────────────────
  let ctx;
  try {
    ctx = await requireOperator();
  } catch (err) {
    if (err instanceof OperatorDenied) {
      return jsonNoStore({ ok: false, error: "unauthorized" }, { status: 403 });
    }
    return jsonNoStore(
      { ok: false, error: "auth_failed", details: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    );
  }
  const operatorEmail = ctx.email ?? DEV_FALLBACK_EMAIL;

  // ── 2 · Parse body ───────────────────────────────────────────────────
  let body: PostBody;
  try {
    body = (await req.json()) as PostBody;
  } catch {
    return badRequest("invalid JSON body");
  }

  if (typeof body.template_id !== "string" || !UUID_RE.test(body.template_id)) {
    return badRequest("template_id is required and must be a UUID");
  }
  const templateId = body.template_id;
  if (!Array.isArray(body.overrides)) {
    return badRequest("overrides array is required (empty array allowed for reset)");
  }

  // ── 3 · Validate every override ──────────────────────────────────────
  const overrides: ValidatedOverride[] = [];
  const seen = new Set<string>();
  for (let i = 0; i < body.overrides.length; i++) {
    const o = body.overrides[i];
    if (!o || typeof o !== "object") {
      return badRequest(`overrides[${i}] must be an object`);
    }
    if (typeof o.line_item !== "string" || !VALID_LINE_ITEMS.has(o.line_item)) {
      return badRequest(`overrides[${i}].line_item "${o.line_item}" not in panel-visible columns set`);
    }
    if (seen.has(o.line_item)) {
      return badRequest(`overrides[${i}].line_item "${o.line_item}" duplicated`);
    }
    if (typeof o.override_value !== "number" || !Number.isFinite(o.override_value)) {
      return badRequest(`overrides[${i}].override_value must be a finite number`);
    }
    if (o.override_value < 0 || o.override_value > MAX_VALUE) {
      return badRequest(`overrides[${i}].override_value ${o.override_value} out of range [0, ${MAX_VALUE}]`);
    }
    seen.add(o.line_item);
    overrides.push({
      line_item: o.line_item as PnlDbColumn,
      override_value: Math.round(o.override_value * 100) / 100, // clamp to 2 decimals
      operator_reason:
        typeof o.operator_reason === "string" && o.operator_reason.trim().length > 0
          ? o.operator_reason.trim()
          : "admin panel save",
    });
  }

  // ── 4 · Verify template exists ───────────────────────────────────────
  const sb = getSupabaseAdmin();
  const { data: tpl, error: tplErr } = await sb
    .from("pnl_template")
    .select("id")
    .eq("id", templateId)
    .maybeSingle();
  if (tplErr) {
    return jsonNoStore(
      { ok: false, error: "db_query_failed", details: tplErr.message },
      { status: 500 },
    );
  }
  if (!tpl) {
    return jsonNoStore(
      { ok: false, error: "template_not_found", template_id: templateId },
      { status: 404 },
    );
  }

  // ── 5 · Delete pre-existing overrides not present in the body ────────
  const lineItemsKept = overrides.map((o) => o.line_item);
  let removed_count = 0;

  if (lineItemsKept.length === 0) {
    // Reset: wipe all overrides for the template
    const delRes = await sb
      .from("pnl_template_override")
      .delete({ count: "exact" })
      .eq("template_id", templateId);
    if (delRes.error) {
      return jsonNoStore(
        { ok: false, error: "db_delete_failed", details: delRes.error.message },
        { status: 500 },
      );
    }
    removed_count = delRes.count ?? 0;
  } else {
    // Selective: remove overrides whose line_item is NOT in the new set
    const inList = `(${lineItemsKept.map((li) => `"${li}"`).join(",")})`;
    const delRes = await sb
      .from("pnl_template_override")
      .delete({ count: "exact" })
      .eq("template_id", templateId)
      .not("line_item", "in", inList);
    if (delRes.error) {
      return jsonNoStore(
        { ok: false, error: "db_delete_failed", details: delRes.error.message },
        { status: 500 },
      );
    }
    removed_count = delRes.count ?? 0;
  }

  // ── 6 · Upsert the new override set ──────────────────────────────────
  let upserted_count = 0;
  if (overrides.length > 0) {
    const nowIso = new Date().toISOString();
    const rows = overrides.map((o) => ({
      template_id: templateId,
      line_item: o.line_item,
      override_value: o.override_value,
      operator_email: operatorEmail,
      operator_reason: o.operator_reason,
      updated_at: nowIso,
    }));
    const upRes = await sb
      .from("pnl_template_override")
      .upsert(rows, { onConflict: "template_id,line_item", count: "exact" });
    if (upRes.error) {
      return jsonNoStore(
        { ok: false, error: "db_upsert_failed", details: upRes.error.message },
        { status: 500 },
      );
    }
    upserted_count = upRes.count ?? rows.length;
  }

  // ── 7 · Audit row (best-effort · save already succeeded) ─────────────
  let warning: string | undefined;
  const auditRes = await sb.from("ai_agent_runs").insert({
    agent_id: "data_ingestion",
    trigger_kind: "manual",
    status: "success",
    run_completed_at: new Date().toISOString(),
    metadata: {
      operation: "pnl_override_save",
      source: "admin_panel_pnl",
      template_id: templateId,
      operator_email: operatorEmail,
      upserted_count,
      removed_count,
      line_items_upserted: lineItemsKept,
      mode: ctx.mode,
    },
  });
  if (auditRes.error) {
    warning = `audit_row_failed: ${auditRes.error.message}`;
  }

  return jsonNoStore({
    ok: true,
    template_id: templateId,
    upserted_count,
    removed_count,
    operator_email: operatorEmail,
    saved_at: new Date().toISOString(),
    ...(warning ? { warning } : {}),
  });
}
