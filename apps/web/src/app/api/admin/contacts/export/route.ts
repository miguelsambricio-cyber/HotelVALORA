import { NextResponse, type NextRequest } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { requireOperator, OperatorDenied } from "@/lib/security/operator-guard";

export const dynamic = "force-dynamic";

/**
 * Phase 2.D.3 · CSV export for the bulk-export-csv action.
 *
 * Same selection contract as the bulk action toolbar:
 *   sel_mode=explicit  + ids=<csv>           → exact IDs (≤ 200)
 *   sel_mode=filtered  + filter_qs=<encoded> → re-run the filter
 *
 * Gated by `requireOperator()` (fail-closed). Streams a single CSV
 * body with a stable column order and ISO-8601 dates. No PII filter —
 * the operator already sees this data in the table.
 */

const COLUMNS: Array<keyof CsvRow> = [
  "master_id",
  "full_name",
  "email",
  "phone",
  "linkedin",
  "title",
  "role",
  "company_name",
  "investor_type",
  "country",
  "continent",
  "relationship_band",
  "relationship_strength",
  "collaboration_potential_score",
  "email_validity",
  "bounce_count",
  "suppressed_outreach",
  "contact_invitation_status",
  "last_contacted_at",
  "relationship_owner_email",
  "tags",
  "bucket",
  "latest_deal_stage",
  "pipeline_state",
  "last_activity_date",
];

interface CsvRow {
  master_id: string | null;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  linkedin: string | null;
  title: string | null;
  role: string | null;
  company_name: string | null;
  investor_type: string | null;
  country: string | null;
  continent: string | null;
  relationship_band: string | null;
  relationship_strength: number | null;
  collaboration_potential_score: number | null;
  email_validity: string | null;
  bounce_count: number | null;
  suppressed_outreach: boolean | null;
  contact_invitation_status: string | null;
  last_contacted_at: string | null;
  relationship_owner_email: string | null;
  tags: string[] | null;
  bucket: string | null;
  latest_deal_stage: string | null;
  pipeline_state: string | null;
  last_activity_date: string | null;
}

const MAX_EXPORT = 500;

export async function GET(req: NextRequest): Promise<Response> {
  try {
    await requireOperator();
  } catch (err) {
    if (err instanceof OperatorDenied) {
      return NextResponse.json({ error: "unauthorized" }, { status: 403 });
    }
    throw err;
  }

  const sb = getSupabaseAdmin();
  const url = new URL(req.url);
  const mode = url.searchParams.get("sel_mode") ?? "explicit";

  let ids: string[] = [];
  if (mode === "filtered") {
    const raw = url.searchParams.get("filter_qs") ?? "";
    ids = await resolveFilteredIds(sb, new URLSearchParams(raw));
  } else {
    const raw = url.searchParams.get("ids") ?? "";
    ids = raw.split(",").map((s) => s.trim()).filter(Boolean).slice(0, MAX_EXPORT);
  }
  if (ids.length === 0) {
    return new Response("master_id,full_name,email\n", {
      status: 200,
      headers: csvHeaders(),
    });
  }

  const { data, error } = await sb
    .from("relationship_contacts")
    .select(COLUMNS.join(", "))
    .in("id", ids)
    .is("deleted_at", null)
    .limit(MAX_EXPORT);
  if (error) {
    return NextResponse.json({ error: "query_failed" }, { status: 500 });
  }

  const rows = (data ?? []) as unknown as CsvRow[];
  const body = renderCsv(rows);
  return new Response(body, { status: 200, headers: csvHeaders() });
}

async function resolveFilteredIds(
  sb: ReturnType<typeof getSupabaseAdmin>,
  params: URLSearchParams,
): Promise<string[]> {
  let q = sb.from("relationship_contacts").select("id");
  const band = params.get("band");
  const investorType = params.get("investor_type");
  const bucket = params.get("bucket") ?? "active";
  const hideInvalid = params.get("hide_invalid") !== "1";
  const recentlyActiveOnly = params.get("recently_active_only") === "1";
  const search = params.get("search")?.trim().toLowerCase() ?? "";

  if (band && band !== "all") q = q.eq("relationship_band", band);
  if (investorType && investorType !== "all") q = q.eq("investor_type", investorType);
  if (bucket && bucket !== "all") q = q.eq("bucket", bucket);
  if (hideInvalid) q = q.neq("email_validity", "invalid").eq("flagged_for_correction", false);
  q = q.or("relationship_band.neq.dormant,active_threads.gt.0");
  if (recentlyActiveOnly) {
    const ninety = new Date(Date.now() - 90 * 86_400_000).toISOString().slice(0, 10);
    q = q.gte("last_email_date", ninety);
  }
  if (search) {
    q = q.or(`full_name.ilike.%${search}%,email_lower.ilike.%${search}%,company_name.ilike.%${search}%`);
  }
  q = q.is("deleted_at", null).limit(MAX_EXPORT);
  const { data } = await q;
  return (data ?? []).map((r: { id: string }) => r.id);
}

function csvHeaders(): Record<string, string> {
  const ts = new Date().toISOString().replace(/[:.]/g, "-");
  return {
    "Content-Type": "text/csv; charset=utf-8",
    "Content-Disposition": `attachment; filename="hotelvalora-contacts-${ts}.csv"`,
    "Cache-Control": "no-store",
  };
}

function renderCsv(rows: CsvRow[]): string {
  const lines = [COLUMNS.join(",")];
  for (const r of rows) {
    lines.push(COLUMNS.map((c) => csvField(r[c])).join(","));
  }
  return lines.join("\n");
}

function csvField(v: unknown): string {
  if (v === null || v === undefined) return "";
  if (Array.isArray(v)) return csvField(v.join("|"));
  const s = String(v);
  // RFC 4180 — quote when comma, quote, newline or CR present.
  if (/[",\n\r]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}
