import "server-only";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

/**
 * Server-side aggregator for the institutional relationship console
 * (Phase 2.C · /user/admin/contacts).
 *
 * Reads from the canonical Supabase tables (migration 0014):
 *   public.relationship_contacts       · canonical Master rows
 *   public.relationship_companies      · entities
 *   public.relationship_labels         · per-contact Gmail label edges
 *   public.relationship_health         · per-contact bounce + validity
 *   public.relationship_interactions   · per-company deal timeline
 *
 * Posture: service-role · zero RLS policies on these tables (anon /
 * authenticated revoked). Only this lib reads them; admin routes import
 * from here. No PII ever leaves the operator-controlled environment.
 */

export type RelationshipBand =
  | "active"
  | "warm"
  | "strategic"
  | "cold"
  | "dormant"
  | "invalid"
  | "";

export type EmailValidity = "valid" | "uncertain" | "invalid" | "";

export interface ContactRow {
  id: string;
  master_id: string;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  linkedin: string | null;
  title: string | null;
  role: string | null;
  company_name: string | null;
  investor_type: string | null;
  hotel_focus: string | null;
  geography: string | null;
  country: string | null;
  continent: string | null;
  latest_deal_stage: string | null;
  pipeline_state: string | null;
  last_activity_date: string | null;
  buyer_added_date: string | null;
  relationship_strength: number;
  collaboration_potential_score: number;
  relationship_band: RelationshipBand;
  email_validity: EmailValidity;
  email_directionality: string | null;
  inferred_relationship_stage: string | null;
  active_threads: number;
  last_email_date: string | null;
  bounce_count: number;
  flagged_for_correction: boolean;
  bucket: string;
  notes_consolidated: string | null;
  source_file: string | null;
  first_seen_batch_id: string | null;
  last_seen_batch_id: string | null;
  /** Gmail label list aggregated from relationship_labels (join). */
  labels: string[];
}

export interface ContactKpis {
  total: number;
  active: number;
  warm: number;
  strategic: number;
  cold_with_signal: number;
  dormant: number;
  invalid_or_flagged: number;
  investors: number;
  operators: number;
  lenders: number;
  brokers: number;
  family_offices: number;
  reits_socimis: number;
  recently_active_90d: number;
  bidirectional_threads: number;
}

/**
 * Filter contract · all optional · UI uses query-string state.
 *
 * Default filter (when nothing passed):
 *   bucket = 'active' AND email_validity != 'invalid' AND
 *   flagged_for_correction = false AND NOT (band = 'dormant' AND active_threads = 0)
 *
 * Operator can override with explicit values.
 */
export interface ContactsFilter {
  band?: RelationshipBand | "all";
  investor_type?: string | "all";
  bucket?: string | "all";
  search?: string;
  hide_invalid?: boolean;
  hide_dormant_no_signal?: boolean;
  recently_active_only?: boolean;
  page?: number;
  page_size?: number;
  sort?: "collab" | "strength" | "last_email" | "name";
}


function applyDefaultFilters(filter: ContactsFilter): ContactsFilter {
  return {
    band: filter.band ?? "all",
    investor_type: filter.investor_type ?? "all",
    bucket: filter.bucket ?? "active",
    search: filter.search ?? "",
    hide_invalid: filter.hide_invalid ?? true,
    hide_dormant_no_signal: filter.hide_dormant_no_signal ?? true,
    recently_active_only: filter.recently_active_only ?? false,
    page: filter.page ?? 0,
    page_size: filter.page_size ?? 50,
    sort: filter.sort ?? "collab",
  };
}


/**
 * Load contacts honouring filter state. Server-side · paginated.
 * Joins relationship_labels for the labels column.
 */
export async function loadContacts(rawFilter: ContactsFilter = {}): Promise<{
  rows: ContactRow[];
  total: number;
  filter: ContactsFilter;
}> {
  const filter = applyDefaultFilters(rawFilter);
  const sb = getSupabaseAdmin();

  let q = sb.from("relationship_contacts").select(
    "id, master_id, full_name, email, phone, linkedin, title, role, " +
    "company_name, investor_type, hotel_focus, geography, country, continent, " +
    "latest_deal_stage, pipeline_state, last_activity_date, buyer_added_date, " +
    "relationship_strength, collaboration_potential_score, relationship_band, " +
    "email_validity, email_directionality, inferred_relationship_stage, " +
    "active_threads, last_email_date, bounce_count, flagged_for_correction, " +
    "bucket, notes_consolidated, source_file, first_seen_batch_id, last_seen_batch_id",
    { count: "exact" },
  );

  // ── filters ───────────────────────────────────────────────────────────
  if (filter.band && filter.band !== "all") {
    q = q.eq("relationship_band", filter.band);
  }
  if (filter.investor_type && filter.investor_type !== "all") {
    q = q.eq("investor_type", filter.investor_type);
  }
  if (filter.bucket && filter.bucket !== "all") {
    q = q.eq("bucket", filter.bucket);
  }
  if (filter.hide_invalid) {
    q = q.neq("email_validity", "invalid").eq("flagged_for_correction", false);
  }
  if (filter.hide_dormant_no_signal) {
    // Hide dormant rows that have zero Gmail activity (the no-signal noise).
    // PostgREST `.or()` lets us OR conditions · we want:
    //   relationship_band != 'dormant' OR active_threads > 0
    q = q.or("relationship_band.neq.dormant,active_threads.gt.0");
  }
  if (filter.recently_active_only) {
    const ninetyDaysAgo = new Date(Date.now() - 90 * 86400_000).toISOString().slice(0, 10);
    q = q.gte("last_email_date", ninetyDaysAgo);
  }
  if (filter.search) {
    const term = filter.search.trim().toLowerCase();
    if (term) {
      // ilike across name + email + company
      q = q.or(
        `full_name.ilike.%${term}%,email_lower.ilike.%${term}%,company_name.ilike.%${term}%`,
      );
    }
  }

  // ── sort ──────────────────────────────────────────────────────────────
  switch (filter.sort) {
    case "strength":
      q = q.order("relationship_strength", { ascending: false, nullsFirst: false });
      break;
    case "last_email":
      q = q.order("last_email_date", { ascending: false, nullsFirst: false });
      break;
    case "name":
      q = q.order("full_name", { ascending: true });
      break;
    case "collab":
    default:
      q = q.order("collaboration_potential_score", { ascending: false, nullsFirst: false });
      q = q.order("relationship_strength", { ascending: false, nullsFirst: false });
      break;
  }

  // ── pagination ────────────────────────────────────────────────────────
  const page = filter.page ?? 0;
  const size = filter.page_size ?? 50;
  const from = page * size;
  const to = from + size - 1;
  q = q.range(from, to);

  const { data, error, count } = await q;
  if (error) {
    console.error("[contacts/live] query failed:", error.message);
    return { rows: [], total: 0, filter };
  }
  const contacts = (data ?? []) as unknown as Omit<ContactRow, "labels">[];

  // Fetch labels for this page only (efficient · max page_size lookups)
  const ids = contacts.map((c) => c.id);
  let labelsByContact: Record<string, string[]> = {};
  if (ids.length > 0) {
    const { data: labelData } = await sb
      .from("relationship_labels")
      .select("contact_id, label")
      .in("contact_id", ids);
    for (const row of (labelData ?? []) as Array<{ contact_id: string; label: string }>) {
      (labelsByContact[row.contact_id] ??= []).push(row.label);
    }
  }

  const rows: ContactRow[] = contacts.map((c) => ({
    ...c,
    labels: labelsByContact[c.id] ?? [],
  }));

  return { rows, total: count ?? rows.length, filter };
}


/**
 * KPIs strip · 6 + 8 totem counts. Computed via parallel queries so the
 * page renders without waterfalls.
 */
export async function loadContactKpis(): Promise<ContactKpis> {
  const sb = getSupabaseAdmin();

  // All counts use count='exact' with limit=0 (head=true is the PostgREST
  // pattern for count-only queries in supabase-js).

  const ninetyDaysAgo = new Date(Date.now() - 90 * 86400_000).toISOString().slice(0, 10);

  const queries = await Promise.all([
    // total
    sb.from("relationship_contacts").select("id", { count: "exact", head: true }),
    // by band
    sb.from("relationship_contacts").select("id", { count: "exact", head: true }).eq("relationship_band", "active"),
    sb.from("relationship_contacts").select("id", { count: "exact", head: true }).eq("relationship_band", "warm"),
    sb.from("relationship_contacts").select("id", { count: "exact", head: true }).eq("relationship_band", "strategic"),
    sb.from("relationship_contacts").select("id", { count: "exact", head: true }).eq("relationship_band", "cold").gt("active_threads", 0),
    sb.from("relationship_contacts").select("id", { count: "exact", head: true }).eq("relationship_band", "dormant"),
    sb.from("relationship_contacts").select("id", { count: "exact", head: true }).or("email_validity.eq.invalid,flagged_for_correction.eq.true"),
    // by investor type
    sb.from("relationship_contacts").select("id", { count: "exact", head: true }).in("investor_type", ["Investor","Family Office","Fund","REIT/SOCIMI","Institutional Investor","Sovereign Wealth","Pension Fund"]),
    sb.from("relationship_contacts").select("id", { count: "exact", head: true }).in("investor_type", ["Operator","Hotel Chain","Brand"]),
    sb.from("relationship_contacts").select("id", { count: "exact", head: true }).eq("investor_type", "Lender"),
    sb.from("relationship_contacts").select("id", { count: "exact", head: true }).eq("investor_type", "Broker"),
    sb.from("relationship_contacts").select("id", { count: "exact", head: true }).eq("investor_type", "Family Office"),
    sb.from("relationship_contacts").select("id", { count: "exact", head: true }).eq("investor_type", "REIT/SOCIMI"),
    // recent activity
    sb.from("relationship_contacts").select("id", { count: "exact", head: true }).gte("last_email_date", ninetyDaysAgo),
    sb.from("relationship_contacts").select("id", { count: "exact", head: true }).eq("email_directionality", "bidirectional"),
  ]);

  const [
    total, active, warm, strategic, cold_with_signal, dormant, invalid_or_flagged,
    investors, operators, lenders, brokers, family_offices, reits_socimis,
    recently_active_90d, bidirectional_threads,
  ] = queries.map((q) => q.count ?? 0);

  return {
    total, active, warm, strategic, cold_with_signal, dormant, invalid_or_flagged,
    investors, operators, lenders, brokers, family_offices, reits_socimis,
    recently_active_90d, bidirectional_threads,
  };
}


/**
 * Distinct investor types found in the DB · used to populate the filter
 * dropdown with real values rather than a hard-coded list.
 */
export async function loadInvestorTypes(): Promise<string[]> {
  const sb = getSupabaseAdmin();
  // PostgREST doesn't expose DISTINCT directly · we fetch the column and
  // dedupe client-side. 4500 contacts × short string = trivial payload.
  const { data } = await sb
    .from("relationship_contacts")
    .select("investor_type")
    .not("investor_type", "is", null)
    .limit(10000);
  const set = new Set<string>();
  for (const r of (data ?? []) as Array<{ investor_type: string | null }>) {
    if (r.investor_type) set.add(r.investor_type);
  }
  return Array.from(set).sort((a, b) => a.localeCompare(b));
}
