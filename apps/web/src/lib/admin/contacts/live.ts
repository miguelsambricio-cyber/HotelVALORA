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
  company_id: string | null;
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
  last_bounce_date: string | null;
  flagged_for_correction: boolean;
  bucket: string;
  notes_consolidated: string | null;
  source_file: string | null;
  first_seen_batch_id: string | null;
  last_seen_batch_id: string | null;
  /** Phase 2.D.1 · operational growth fields */
  linked_user_id: string | null;
  contact_invitation_status: string;
  last_contacted_at: string | null;
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
    "company_id, company_name, investor_type, hotel_focus, geography, country, continent, " +
    "latest_deal_stage, pipeline_state, last_activity_date, buyer_added_date, " +
    "relationship_strength, collaboration_potential_score, relationship_band, " +
    "email_validity, email_directionality, inferred_relationship_stage, " +
    "active_threads, last_email_date, bounce_count, last_bounce_date, flagged_for_correction, " +
    "bucket, notes_consolidated, source_file, first_seen_batch_id, last_seen_batch_id, " +
    "linked_user_id, contact_invitation_status, last_contacted_at",
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


// ─── Detail drawer ─────────────────────────────────────────────────────

export type TimelineEventKind =
  | "gmail_last_touch"
  | "gmail_bounce"
  | "label_attached"
  | "datasite_buyer_added"
  | "datasite_initial_contact"
  | "datasite_teaser_sent"
  | "datasite_nda_initial_sent"
  | "datasite_nda_signed"
  | "datasite_nda_executed"
  | "datasite_cim_sent"
  | "datasite_ioi_process_letter"
  | "datasite_ioi_received"
  | "datasite_loi_process_letter"
  | "datasite_loi_received"
  | "datasite_management_presentation"
  | "datasite_revised_bid_received"
  | "datasite_declined"
  | "datasite_last_activity";

export interface TimelineEvent {
  kind: TimelineEventKind;
  date: string;
  label: string;
  detail?: string | null;
  /** "gmail" · "datasite" · "labels" — source-of-truth bucket */
  source: "gmail" | "datasite" | "labels";
}

export interface PeerContact {
  id: string;
  full_name: string | null;
  title: string | null;
  email: string | null;
  relationship_band: string | null;
  collaboration_potential_score: number;
}

export interface ContactDetail {
  contact: ContactRow;
  company: {
    id: string;
    name: string | null;
    investor_type_canonical: string | null;
    investor_subtype: string | null;
    tier: string | null;
    industry: string | null;
    hotel_focus: string | null;
    fund_size: string | null;
    investment_preference: string | null;
    investment_min: string | null;
    investment_max: string | null;
    continent: string | null;
    location: string | null;
    description: string | null;
    external_notes: string | null;
    internal_notes: string | null;
  } | null;
  interactions: {
    declined_date: string | null;
    declined_reason: string | null;
    declined_comments: string | null;
    last_activity_comments: string | null;
    latest_deal_stage: string | null;
    pipeline_state: string | null;
  } | null;
  health: {
    email_validity: string;
    bounce_count: number;
    last_bounce_date: string | null;
    bounce_reasons: unknown;
    flagged_for_correction: boolean;
    suggested_replacement_email: string | null;
    inferred_correct_company: string | null;
    last_health_check_at: string;
  } | null;
  timeline: TimelineEvent[];
  peers: PeerContact[];
  /** activity density · count of dated events from interactions + labels + gmail */
  activity_density: number;
  /** Phase 2.D.1 · contact → user link if the contact has onboarded */
  linked_user: {
    id: string;
    email: string;
    full_name: string | null;
    invitation_status: string;
    tier: string;
    role: string;
    last_seen_at: string | null;
    created_at: string;
  } | null;
  /** Phase 2.D.1 · total invitation events ever sent to this contact */
  invitation_count: number;
}

/**
 * Single-contact detail for the side panel · used by `/user/admin/contacts?selected=<id>`.
 *
 * Composes:
 *   - the contact row itself
 *   - the company row (FK)
 *   - the company's interaction timeline (Datasite stage dates)
 *   - the contact's Gmail labels
 *   - the contact's email-health row
 *   - peer contacts in the same company
 *   - a synthesised chronological event timeline (Gmail + Datasite + labels)
 *
 * Returns `null` when the contact id is unknown — the page renders the
 * list without a drawer in that case.
 */
export async function loadContactDetail(contactId: string): Promise<ContactDetail | null> {
  const sb = getSupabaseAdmin();

  const { data: contactRow, error: contactErr } = await sb
    .from("relationship_contacts")
    .select(
      "id, master_id, full_name, email, phone, linkedin, title, role, " +
      "company_id, company_name, investor_type, hotel_focus, geography, country, continent, " +
      "latest_deal_stage, pipeline_state, last_activity_date, buyer_added_date, " +
      "relationship_strength, collaboration_potential_score, relationship_band, " +
      "email_validity, email_directionality, inferred_relationship_stage, " +
      "active_threads, last_email_date, bounce_count, last_bounce_date, " +
      "flagged_for_correction, bucket, notes_consolidated, source_file, " +
      "first_seen_batch_id, last_seen_batch_id, " +
      "linked_user_id, contact_invitation_status, last_contacted_at",
    )
    .eq("id", contactId)
    .maybeSingle();
  if (contactErr || !contactRow) {
    if (contactErr) console.error("[contacts/live] detail fetch failed:", contactErr.message);
    return null;
  }
  const contact = contactRow as unknown as Omit<ContactRow, "labels">;

  // Parallel fan-out: company · interactions · labels · health · peers · linked user · invitation count
  const [companyR, interactionsR, labelsR, healthR, peersR, linkedUserR, invitesR] = await Promise.all([
    contact.company_id
      ? sb.from("relationship_companies")
          .select("id, name, investor_type_canonical, investor_subtype, tier, industry, hotel_focus, fund_size, investment_preference, investment_min, investment_max, continent, location, description, external_notes, internal_notes")
          .eq("id", contact.company_id)
          .maybeSingle()
      : Promise.resolve({ data: null, error: null }),
    contact.company_id
      ? sb.from("relationship_interactions")
          .select("declined_date, declined_reason, declined_comments, last_activity_comments, latest_deal_stage, pipeline_state, buyer_added_date, initial_contact_date, teaser_sent_date, nda_initial_sent_date, nda_signed_date, nda_executed_date, cim_sent_date, ioi_process_letter_date, ioi_bid_received_date, loi_process_letter_date, loi_bid_received_date, management_presentation_date, revised_bid_received_date, last_activity_date")
          .eq("company_id", contact.company_id)
          .maybeSingle()
      : Promise.resolve({ data: null, error: null }),
    sb.from("relationship_labels")
      .select("label, inferred_stage, created_at")
      .eq("contact_id", contactId),
    sb.from("relationship_health")
      .select("email_validity, bounce_count, last_bounce_date, bounce_reasons, flagged_for_correction, suggested_replacement_email, inferred_correct_company, last_health_check_at")
      .eq("contact_id", contactId)
      .maybeSingle(),
    contact.company_id
      ? sb.from("relationship_contacts")
          .select("id, full_name, title, email, relationship_band, collaboration_potential_score")
          .eq("company_id", contact.company_id)
          .neq("id", contactId)
          .order("collaboration_potential_score", { ascending: false, nullsFirst: false })
          .order("relationship_strength", { ascending: false, nullsFirst: false })
          .limit(8)
      : Promise.resolve({ data: [], error: null }),
    contact.linked_user_id
      ? sb.from("users")
          .select("id, email, full_name, invitation_status, tier, role, last_seen_at, created_at")
          .eq("id", contact.linked_user_id)
          .maybeSingle()
      : Promise.resolve({ data: null, error: null }),
    sb.from("contact_invitations")
      .select("id", { count: "exact", head: true })
      .eq("contact_id", contactId),
  ]);

  const company = (companyR.data ?? null) as ContactDetail["company"];
  const inter = (interactionsR.data ?? null) as (ContactDetail["interactions"] & {
    buyer_added_date: string | null;
    initial_contact_date: string | null;
    teaser_sent_date: string | null;
    nda_initial_sent_date: string | null;
    nda_signed_date: string | null;
    nda_executed_date: string | null;
    cim_sent_date: string | null;
    ioi_process_letter_date: string | null;
    ioi_bid_received_date: string | null;
    loi_process_letter_date: string | null;
    loi_bid_received_date: string | null;
    management_presentation_date: string | null;
    revised_bid_received_date: string | null;
    last_activity_date: string | null;
  }) | null;
  const labelRows = (labelsR.data ?? []) as Array<{ label: string; inferred_stage: string | null; created_at: string }>;
  const labels = labelRows.map((r) => r.label);
  const health = (healthR.data ?? null) as ContactDetail["health"];
  const peers = (peersR.data ?? []) as unknown as PeerContact[];
  const linked_user = (linkedUserR.data ?? null) as ContactDetail["linked_user"];
  const invitation_count = invitesR.count ?? 0;

  // ── Compose chronological event timeline ────────────────────────────
  const events: TimelineEvent[] = [];
  if (contact.last_email_date) {
    events.push({
      kind: "gmail_last_touch",
      date: contact.last_email_date,
      label: "Gmail · last touch",
      detail: contact.email_directionality
        ? `${contact.active_threads} active thread${contact.active_threads === 1 ? "" : "s"} · ${contact.email_directionality}`
        : null,
      source: "gmail",
    });
  }
  if (contact.last_bounce_date && contact.bounce_count > 0) {
    events.push({
      kind: "gmail_bounce",
      date: contact.last_bounce_date,
      label: "Gmail · bounce detected",
      detail: `${contact.bounce_count} bounce${contact.bounce_count === 1 ? "" : "s"} · email validity ${contact.email_validity ?? "uncertain"}`,
      source: "gmail",
    });
  }
  for (const row of labelRows) {
    events.push({
      kind: "label_attached",
      date: row.created_at,
      label: `Gmail label · ${row.label}`,
      detail: row.inferred_stage ? `inferred stage: ${row.inferred_stage}` : null,
      source: "labels",
    });
  }
  if (inter) {
    const datasiteEvents: Array<[string | null, TimelineEventKind, string]> = [
      [inter.buyer_added_date, "datasite_buyer_added", "Datasite · buyer added"],
      [inter.initial_contact_date, "datasite_initial_contact", "Datasite · initial contact"],
      [inter.teaser_sent_date, "datasite_teaser_sent", "Datasite · teaser sent"],
      [inter.nda_initial_sent_date, "datasite_nda_initial_sent", "Datasite · NDA sent"],
      [inter.nda_signed_date, "datasite_nda_signed", "Datasite · NDA signed"],
      [inter.nda_executed_date, "datasite_nda_executed", "Datasite · NDA executed"],
      [inter.cim_sent_date, "datasite_cim_sent", "Datasite · CIM sent"],
      [inter.ioi_process_letter_date, "datasite_ioi_process_letter", "Datasite · IOI process letter"],
      [inter.ioi_bid_received_date, "datasite_ioi_received", "Datasite · IOI bid received"],
      [inter.loi_process_letter_date, "datasite_loi_process_letter", "Datasite · LOI process letter"],
      [inter.loi_bid_received_date, "datasite_loi_received", "Datasite · LOI bid received"],
      [inter.management_presentation_date, "datasite_management_presentation", "Datasite · management presentation"],
      [inter.revised_bid_received_date, "datasite_revised_bid_received", "Datasite · revised bid received"],
      [inter.declined_date, "datasite_declined", "Datasite · declined"],
      [inter.last_activity_date, "datasite_last_activity", "Datasite · last activity"],
    ];
    for (const [date, kind, label] of datasiteEvents) {
      if (!date) continue;
      const detail =
        kind === "datasite_declined" && (inter.declined_reason || inter.declined_comments)
          ? [inter.declined_reason, inter.declined_comments].filter(Boolean).join(" · ")
          : kind === "datasite_last_activity" && inter.last_activity_comments
            ? inter.last_activity_comments
            : null;
      events.push({ kind, date, label, detail, source: "datasite" });
    }
  }
  events.sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));

  const activity_density = events.length;

  const contactWithLabels: ContactRow = { ...contact, labels };

  return {
    contact: contactWithLabels,
    company,
    interactions: inter
      ? {
          declined_date: inter.declined_date,
          declined_reason: inter.declined_reason,
          declined_comments: inter.declined_comments,
          last_activity_comments: inter.last_activity_comments,
          latest_deal_stage: inter.latest_deal_stage,
          pipeline_state: inter.pipeline_state,
        }
      : null,
    health,
    timeline: events,
    peers,
    activity_density,
    linked_user,
    invitation_count,
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
