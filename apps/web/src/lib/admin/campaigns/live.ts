import "server-only";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

/**
 * Server-side aggregator for `/user/admin/campaigns` (Phase 2.D.4).
 *
 * Campaigns are the activation layer of the funnel:
 *   contact → INVITED via campaign → onboarded user → subscriber
 *
 * Reads from public.campaigns and joins counts from
 * public.contact_invitations + public.subscriptions to surface
 * per-campaign conversion metrics in a single roundtrip.
 *
 * Posture: service-role · zero RLS policies on the new admin surfaces.
 */

export type CampaignStatus = "draft" | "running" | "paused" | "completed" | "archived";
export type CampaignKind =
  | "investor_outreach"
  | "operator_onboarding"
  | "beta_invite"
  | "top_promote_rollout"
  | "lender_campaign"
  | "newsletter"
  | "partnership"
  | "custom";

export interface CampaignRow {
  id: string;
  slug: string;
  name: string;
  kind: CampaignKind;
  status: CampaignStatus;
  owner_email: string | null;
  description: string | null;
  channel: string;
  target_audience: string | null;
  notes: string | null;
  conversion_target: number | null;
  archived_at: string | null;
  created_by_email: string | null;
  created_at: string;
  updated_at: string;
  /** Pending + sent + opened + clicked invitations counted as "active". */
  invitations_active: number;
  /** status='accepted' or 'converted' */
  invitations_converted: number;
  /** bounced / declined */
  invitations_failed: number;
  /** Active subscriptions sourced from this campaign */
  subscriptions_active: number;
}

export interface CampaignKpis {
  total: number;
  running: number;
  draft: number;
  paused: number;
  completed: number;
  archived: number;
  invitations_total: number;
  invitations_sent: number;
  invitations_converted: number;
  subscriptions_attributed: number;
}

export interface CampaignsFilter {
  status?: CampaignStatus | "all";
  kind?: CampaignKind | "all";
  archived?: "include" | "exclude";
  search?: string;
  page?: number;
  page_size?: number;
  sort?: "recent" | "name" | "status";
}

function applyDefaults(filter: CampaignsFilter): CampaignsFilter {
  return {
    status: filter.status ?? "all",
    kind: filter.kind ?? "all",
    archived: filter.archived ?? "exclude",
    search: filter.search ?? "",
    page: filter.page ?? 0,
    page_size: filter.page_size ?? 50,
    sort: filter.sort ?? "recent",
  };
}

export async function loadCampaigns(rawFilter: CampaignsFilter = {}): Promise<{
  rows: CampaignRow[];
  total: number;
  filter: CampaignsFilter;
}> {
  const filter = applyDefaults(rawFilter);
  const sb = getSupabaseAdmin();

  let q = sb
    .from("campaigns")
    .select(
      "id, slug, name, kind, status, owner_email, description, channel, " +
      "target_audience, notes, conversion_target, archived_at, created_by_email, " +
      "created_at, updated_at",
      { count: "exact" },
    );

  if (filter.archived === "exclude") q = q.is("archived_at", null);
  if (filter.status && filter.status !== "all") q = q.eq("status", filter.status);
  if (filter.kind && filter.kind !== "all") q = q.eq("kind", filter.kind);
  if (filter.search?.trim()) {
    const term = filter.search.trim().toLowerCase();
    q = q.or(`name.ilike.%${term}%,slug.ilike.%${term}%`);
  }

  switch (filter.sort) {
    case "name": q = q.order("name", { ascending: true }); break;
    case "status": q = q.order("status", { ascending: true }); break;
    case "recent":
    default: q = q.order("created_at", { ascending: false }); break;
  }

  const page = filter.page ?? 0;
  const size = filter.page_size ?? 50;
  q = q.range(page * size, page * size + size - 1);

  const { data, error, count } = await q;
  if (error) {
    console.error("[campaigns/live] query failed:", error.message);
    return { rows: [], total: 0, filter };
  }

  const raw = (data ?? []) as unknown as Array<Omit<CampaignRow, "invitations_active" | "invitations_converted" | "invitations_failed" | "subscriptions_active">>;
  if (raw.length === 0) return { rows: [], total: count ?? 0, filter };

  // Parallel rollup: per-campaign invitation buckets + active subs
  const campaignIds = raw.map((r) => r.id);
  const [invitationsR, subsR] = await Promise.all([
    sb.from("contact_invitations")
      .select("campaign_id, status")
      .in("campaign_id", campaignIds),
    sb.from("subscriptions")
      .select("source_campaign_id, status")
      .in("source_campaign_id", campaignIds)
      .eq("status", "active"),
  ]);

  const invRows = (invitationsR.data ?? []) as Array<{ campaign_id: string | null; status: string }>;
  const subRows = (subsR.data ?? []) as Array<{ source_campaign_id: string | null }>;

  const rows: CampaignRow[] = raw.map((c) => {
    const inv = invRows.filter((i) => i.campaign_id === c.id);
    const sub = subRows.filter((s) => s.source_campaign_id === c.id);
    return {
      ...c,
      invitations_active: inv.filter((i) => ["pending", "sent", "delivered", "opened", "clicked"].includes(i.status)).length,
      invitations_converted: inv.filter((i) => ["accepted", "converted"].includes(i.status)).length,
      invitations_failed: inv.filter((i) => ["bounced", "declined"].includes(i.status)).length,
      subscriptions_active: sub.length,
    };
  });

  return { rows, total: count ?? rows.length, filter };
}

export async function loadCampaignKpis(): Promise<CampaignKpis> {
  const sb = getSupabaseAdmin();

  const queries = await Promise.all([
    sb.from("campaigns").select("id", { count: "exact", head: true }).is("archived_at", null),
    sb.from("campaigns").select("id", { count: "exact", head: true }).eq("status", "running"),
    sb.from("campaigns").select("id", { count: "exact", head: true }).eq("status", "draft"),
    sb.from("campaigns").select("id", { count: "exact", head: true }).eq("status", "paused"),
    sb.from("campaigns").select("id", { count: "exact", head: true }).eq("status", "completed"),
    sb.from("campaigns").select("id", { count: "exact", head: true }).not("archived_at", "is", null),
    sb.from("contact_invitations").select("id", { count: "exact", head: true }),
    sb.from("contact_invitations").select("id", { count: "exact", head: true }).in("status", ["sent", "delivered", "opened", "clicked"]),
    sb.from("contact_invitations").select("id", { count: "exact", head: true }).in("status", ["accepted", "converted"]),
    sb.from("subscriptions").select("id", { count: "exact", head: true }).not("source_campaign_id", "is", null).eq("status", "active"),
  ]);

  const [total, running, draft, paused, completed, archived, invitations_total, invitations_sent, invitations_converted, subscriptions_attributed] = queries.map((q) => q.count ?? 0);

  return {
    total, running, draft, paused, completed, archived,
    invitations_total, invitations_sent, invitations_converted, subscriptions_attributed,
  };
}


export interface CampaignDetail extends CampaignRow {
  invitations: Array<{
    id: string;
    contact_id: string;
    invited_email: string;
    status: string;
    sent_at: string | null;
    responded_at: string | null;
    promo_code: string | null;
    default_subscription_tier: string | null;
    created_at: string;
  }>;
  attributed_subscriptions: Array<{
    id: string;
    user_id: string;
    tier: string;
    status: string;
    expires_at: string | null;
    assigned_by_email: string | null;
    created_at: string;
  }>;
}

export async function loadCampaignDetail(campaignId: string): Promise<CampaignDetail | null> {
  const sb = getSupabaseAdmin();
  const { data: c, error } = await sb
    .from("campaigns")
    .select(
      "id, slug, name, kind, status, owner_email, description, channel, " +
      "target_audience, notes, conversion_target, archived_at, created_by_email, " +
      "created_at, updated_at",
    )
    .eq("id", campaignId)
    .maybeSingle();
  if (error || !c) return null;
  const base = c as unknown as Omit<CampaignRow, "invitations_active" | "invitations_converted" | "invitations_failed" | "subscriptions_active">;

  const [invR, subR] = await Promise.all([
    sb.from("contact_invitations")
      .select("id, contact_id, invited_email, status, sent_at, responded_at, promo_code, default_subscription_tier, created_at")
      .eq("campaign_id", campaignId)
      .order("created_at", { ascending: false })
      .limit(200),
    sb.from("subscriptions")
      .select("id, user_id, tier, status, expires_at, assigned_by_email, created_at")
      .eq("source_campaign_id", campaignId)
      .order("created_at", { ascending: false })
      .limit(100),
  ]);

  const invitations = (invR.data ?? []) as CampaignDetail["invitations"];
  const attributed_subscriptions = (subR.data ?? []) as CampaignDetail["attributed_subscriptions"];

  return {
    ...base,
    invitations_active: invitations.filter((i) => ["pending", "sent", "delivered", "opened", "clicked"].includes(i.status)).length,
    invitations_converted: invitations.filter((i) => ["accepted", "converted"].includes(i.status)).length,
    invitations_failed: invitations.filter((i) => ["bounced", "declined"].includes(i.status)).length,
    subscriptions_active: attributed_subscriptions.filter((s) => s.status === "active").length,
    invitations,
    attributed_subscriptions,
  };
}
