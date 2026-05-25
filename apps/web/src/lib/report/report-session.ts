import "server-only";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { resolveCanonicalIdAny } from "@/lib/report/canonical-reader";

/**
 * Report session persistence — the source of truth for "which canonical
 * hotel is this report about" across the 10 /report/[reportId]/<section>
 * pages.
 *
 * Replaces the URL-pass-through `?ref=<slug>` pattern that fell through to
 * mock when CompSet emitted slugs the resolver couldn't map. After this
 * change, the report identifier is a `hotel_report.id` UUID that:
 *   - lives in a real Supabase row (table created in migration 0030)
 *   - travels as a route param `[reportId]`
 *   - survives navigation between the 10 pages
 *   - is shareable, bookmarkeable, PDF-anchored
 *
 * A2 dedup policy: one row per (canonical_id, owner_user_id, day).
 * Reopening the same hotel the same day reuses the row instead of
 * creating a new one — keeps the library / map clean.
 *
 * Service-role client because:
 *   - We need predictable insert behavior independent of the visitor's
 *     auth state (showcase mode = anonymous).
 *   - The RLS policy on hotel_report allows anon public-insert today, but
 *     using service-role here keeps the bootstrap path stable when auth
 *     flips on and RLS tightens.
 */

export interface HotelReportRow {
  id: string;
  canonical_id: string;
  report_date: string; // YYYY-MM-DD
  tier_snapshot: string | null;
  input_params: Record<string, unknown>;
  owner_user_id: string | null;
  created_at: string;
  last_viewed_at: string;
}

interface CreateOrGetParams {
  /** Any input the resolver accepts: UUID, h_<hex>, or slug. */
  input: string | null | undefined;
  /** Logged-in user id, or null for anonymous showcase mode. */
  ownerUserId?: string | null;
  /** Optional input traceability (e.g. { original_ref: "bless-hotel-madrid" }). */
  inputParams?: Record<string, unknown>;
  /** Optional tier snapshot at creation time. */
  tierSnapshot?: string | null;
}

interface CreateOrGetResult {
  report_id: string;
  canonical_id: string;
  reused: boolean;
}

type AdminClient = ReturnType<typeof getSupabaseAdmin>;

function todayIsoDate(): string {
  // YYYY-MM-DD in UTC. Day boundary aligned to UTC so two requests at
  // 23:50 Madrid + 00:10 Madrid the next day still produce different
  // bucket rows · acceptable trade-off for the operator's audit-of-day
  // semantics. If operator wants Europe/Madrid boundary, swap to a
  // tz-aware date function.
  return new Date().toISOString().slice(0, 10);
}

async function selectExisting(
  sb: AdminClient,
  canonical_id: string,
  report_date: string,
  ownerUserId: string | null,
): Promise<HotelReportRow | null> {
  // The unique index on hotel_report is an expression index using
  // COALESCE(owner_user_id, '0000…'::uuid). For SELECT we branch on
  // ownerUserId so the planner can use the index efficiently when set
  // and falls back to the partial when null.
  const client = sb as unknown as {
    from: (t: string) => {
      select: (cols: string) => {
        eq: (col: string, val: string) => {
          eq: (col: string, val: string) => {
            is: (col: string, val: null) => {
              maybeSingle: () => Promise<{ data: HotelReportRow | null; error: unknown }>;
            };
            eq: (col: string, val: string) => {
              maybeSingle: () => Promise<{ data: HotelReportRow | null; error: unknown }>;
            };
          };
        };
      };
    };
  };

  const base = client.from("hotel_report").select("*").eq("canonical_id", canonical_id).eq("report_date", report_date);
  const res = ownerUserId === null
    ? await base.is("owner_user_id", null).maybeSingle()
    : await base.eq("owner_user_id", ownerUserId).maybeSingle();
  if (res.error) return null;
  return res.data;
}

async function touchLastViewed(sb: AdminClient, report_id: string): Promise<void> {
  const client = sb as unknown as {
    from: (t: string) => {
      update: (payload: Record<string, unknown>) => {
        eq: (col: string, val: string) => Promise<{ error: unknown }>;
      };
    };
  };
  await client.from("hotel_report").update({ last_viewed_at: new Date().toISOString() }).eq("id", report_id);
}

async function insertNew(
  sb: AdminClient,
  canonical_id: string,
  report_date: string,
  ownerUserId: string | null,
  inputParams: Record<string, unknown>,
  tierSnapshot: string | null,
): Promise<HotelReportRow | null> {
  const client = sb as unknown as {
    from: (t: string) => {
      insert: (payload: Record<string, unknown>) => {
        select: (cols: string) => {
          single: () => Promise<{ data: HotelReportRow | null; error: { code?: string; message?: string } | null }>;
        };
      };
    };
  };
  const res = await client
    .from("hotel_report")
    .insert({
      canonical_id,
      report_date,
      owner_user_id: ownerUserId,
      input_params: inputParams,
      tier_snapshot: tierSnapshot,
    })
    .select("*")
    .single();
  if (res.error) {
    // 23505 = unique violation · concurrent create-or-get race · the
    // peer just inserted the same dedup tuple. Re-SELECT to return it.
    if (res.error.code === "23505") {
      return selectExisting(sb, canonical_id, report_date, ownerUserId);
    }
    console.error("[hotel_report] insert failed:", res.error.message ?? String(res.error));
    return null;
  }
  return res.data;
}

/**
 * Resolve any input (UUID, h_<hex>, slug) to a canonical hotel and
 * return / create the hotel_report row for today. Returns null when
 * the input does not resolve to any canonical hotel.
 */
export async function createOrGetReport(
  params: CreateOrGetParams,
): Promise<CreateOrGetResult | null> {
  const canonical_id = await resolveCanonicalIdAny(params.input);
  if (!canonical_id) return null;

  const report_date = todayIsoDate();
  const ownerUserId = params.ownerUserId ?? null;
  const inputParams = params.inputParams ?? {};
  const tierSnapshot = params.tierSnapshot ?? null;
  const sb = getSupabaseAdmin();

  const existing = await selectExisting(sb, canonical_id, report_date, ownerUserId);
  if (existing) {
    await touchLastViewed(sb, existing.id);
    return { report_id: existing.id, canonical_id, reused: true };
  }

  const inserted = await insertNew(sb, canonical_id, report_date, ownerUserId, inputParams, tierSnapshot);
  if (!inserted) return null;
  return { report_id: inserted.id, canonical_id, reused: false };
}

/**
 * Load a hotel_report row by id. Returns null when the row does not
 * exist or has been deleted. Used by every /report/[reportId]/<section>
 * page.tsx to resolve `params.reportId` → `canonical_id` for the
 * existing canonical-mapper pipeline.
 */
export async function getReportById(report_id: string): Promise<HotelReportRow | null> {
  if (!report_id) return null;
  // Defensive: only attempt the lookup if it looks like a UUID. The
  // [reportId] segment can match any string, so a typoed URL like
  // /report/executive-summary/... (legacy URL hitting the new tree)
  // would arrive here as report_id="executive-summary" → skip.
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(report_id)) {
    return null;
  }
  const sb = getSupabaseAdmin() as unknown as {
    from: (t: string) => {
      select: (cols: string) => {
        eq: (col: string, val: string) => {
          maybeSingle: () => Promise<{ data: HotelReportRow | null; error: unknown }>;
        };
      };
    };
  };
  const res = await sb.from("hotel_report").select("*").eq("id", report_id).maybeSingle();
  if (res.error || !res.data) return null;
  // Touch last_viewed_at (fire-and-forget).
  touchLastViewed(getSupabaseAdmin(), res.data.id).catch(() => {});
  return res.data;
}
