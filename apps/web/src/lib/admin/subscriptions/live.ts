import "server-only";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

/**
 * Server-side aggregator for `/user/admin/subscriptions` (Phase 2.D.4).
 *
 * Subscriptions are the terminal stage of the conversion arc — the
 * point where contacts become paying (or comped) users. Joins users +
 * campaigns so the operator sees provenance per row.
 */

export type SubscriptionTier =
  | "free" | "pro" | "premium" | "team" | "enterprise"
  | "top_promote" | "comped";

export type SubscriptionStatus =
  | "active" | "trialing" | "past_due" | "canceled" | "expired" | "incomplete";

export interface SubscriptionRow {
  id: string;
  user_id: string;
  user_email: string | null;
  user_full_name: string | null;
  tier: SubscriptionTier;
  status: SubscriptionStatus;
  current_period_start: string | null;
  current_period_end: string | null;
  cancel_at_period_end: boolean;
  expires_at: string | null;
  notes: string | null;
  assigned_by_email: string | null;
  source_campaign_id: string | null;
  source_campaign_name: string | null;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface SubscriptionKpis {
  total: number;
  active: number;
  trialing: number;
  past_due: number;
  canceled: number;
  expired: number;
  by_tier: Record<SubscriptionTier, number>;
  attributed_to_campaign: number;
  comped_active: number;
}

export interface SubscriptionsFilter {
  status?: SubscriptionStatus | "all";
  tier?: SubscriptionTier | "all";
  campaign_only?: boolean;
  search?: string;
  page?: number;
  page_size?: number;
  sort?: "recent" | "expires" | "tier" | "status";
}

function applyDefaults(f: SubscriptionsFilter): SubscriptionsFilter {
  return {
    status: f.status ?? "all",
    tier: f.tier ?? "all",
    campaign_only: f.campaign_only ?? false,
    search: f.search ?? "",
    page: f.page ?? 0,
    page_size: f.page_size ?? 50,
    sort: f.sort ?? "recent",
  };
}

interface RawSubscriptionSelect {
  id: string;
  user_id: string;
  tier: string;
  status: string;
  current_period_start: string | null;
  current_period_end: string | null;
  cancel_at_period_end: boolean;
  expires_at: string | null;
  notes: string | null;
  assigned_by_email: string | null;
  source_campaign_id: string | null;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  created_at: string;
  updated_at: string;
  users: { email: string; full_name: string | null } | null;
  campaigns: { name: string } | null;
}

export async function loadSubscriptions(rawFilter: SubscriptionsFilter = {}): Promise<{
  rows: SubscriptionRow[];
  total: number;
  filter: SubscriptionsFilter;
}> {
  const filter = applyDefaults(rawFilter);
  const sb = getSupabaseAdmin();

  let q = sb
    .from("subscriptions")
    .select(
      `id, user_id, tier, status, current_period_start, current_period_end,
       cancel_at_period_end, expires_at, notes, assigned_by_email,
       source_campaign_id, stripe_customer_id, stripe_subscription_id,
       created_at, updated_at,
       users:user_id ( email, full_name ),
       campaigns:source_campaign_id ( name )`,
      { count: "exact" },
    );

  if (filter.status && filter.status !== "all") q = q.eq("status", filter.status);
  if (filter.tier && filter.tier !== "all") q = q.eq("tier", filter.tier);
  if (filter.campaign_only) q = q.not("source_campaign_id", "is", null);

  switch (filter.sort) {
    case "expires": q = q.order("expires_at", { ascending: true, nullsFirst: false }); break;
    case "tier": q = q.order("tier", { ascending: true }); break;
    case "status": q = q.order("status", { ascending: true }); break;
    case "recent":
    default: q = q.order("created_at", { ascending: false }); break;
  }

  const page = filter.page ?? 0;
  const size = filter.page_size ?? 50;
  q = q.range(page * size, page * size + size - 1);

  const { data, error, count } = await q;
  if (error) {
    console.error("[subscriptions/live] query failed:", error.message);
    return { rows: [], total: 0, filter };
  }

  const raw = (data ?? []) as unknown as RawSubscriptionSelect[];
  let rows: SubscriptionRow[] = raw.map((s) => ({
    id: s.id,
    user_id: s.user_id,
    user_email: s.users?.email ?? null,
    user_full_name: s.users?.full_name ?? null,
    tier: s.tier as SubscriptionTier,
    status: s.status as SubscriptionStatus,
    current_period_start: s.current_period_start,
    current_period_end: s.current_period_end,
    cancel_at_period_end: s.cancel_at_period_end,
    expires_at: s.expires_at,
    notes: s.notes,
    assigned_by_email: s.assigned_by_email,
    source_campaign_id: s.source_campaign_id,
    source_campaign_name: s.campaigns?.name ?? null,
    stripe_customer_id: s.stripe_customer_id,
    stripe_subscription_id: s.stripe_subscription_id,
    created_at: s.created_at,
    updated_at: s.updated_at,
  }));

  if (filter.search?.trim()) {
    const term = filter.search.trim().toLowerCase();
    rows = rows.filter(
      (r) =>
        (r.user_email ?? "").toLowerCase().includes(term) ||
        (r.user_full_name ?? "").toLowerCase().includes(term),
    );
  }

  return { rows, total: count ?? rows.length, filter };
}

export async function loadSubscriptionKpis(): Promise<SubscriptionKpis> {
  const sb = getSupabaseAdmin();
  const tiers: SubscriptionTier[] = ["free", "pro", "premium", "team", "enterprise", "top_promote", "comped"];

  const counts = await Promise.all([
    sb.from("subscriptions").select("id", { count: "exact", head: true }),
    sb.from("subscriptions").select("id", { count: "exact", head: true }).eq("status", "active"),
    sb.from("subscriptions").select("id", { count: "exact", head: true }).eq("status", "trialing"),
    sb.from("subscriptions").select("id", { count: "exact", head: true }).eq("status", "past_due"),
    sb.from("subscriptions").select("id", { count: "exact", head: true }).eq("status", "canceled"),
    sb.from("subscriptions").select("id", { count: "exact", head: true }).eq("status", "expired"),
    sb.from("subscriptions").select("id", { count: "exact", head: true }).not("source_campaign_id", "is", null),
    sb.from("subscriptions").select("id", { count: "exact", head: true }).eq("tier", "comped").eq("status", "active"),
    ...tiers.map((t) =>
      sb.from("subscriptions").select("id", { count: "exact", head: true }).eq("tier", t),
    ),
  ]);

  const [total, active, trialing, past_due, canceled, expired, attributed_to_campaign, comped_active, ...tierCounts] = counts.map((q) => q.count ?? 0);
  const by_tier = Object.fromEntries(tiers.map((t, i) => [t, tierCounts[i]])) as Record<SubscriptionTier, number>;

  return { total, active, trialing, past_due, canceled, expired, by_tier, attributed_to_campaign, comped_active };
}


/**
 * For the assign-subscription form: list users who don't yet have an
 * active subscription. Keeps the picker focused on the actionable set.
 */
export async function loadAssignableUsers(limit = 200): Promise<Array<{ id: string; email: string; full_name: string | null }>> {
  const sb = getSupabaseAdmin();
  const { data: users } = await sb
    .from("users")
    .select("id, email, full_name")
    .order("created_at", { ascending: false })
    .limit(limit);
  return ((users ?? []) as Array<{ id: string; email: string; full_name: string | null }>);
}

export async function loadActiveCampaigns(limit = 200): Promise<Array<{ id: string; name: string }>> {
  const sb = getSupabaseAdmin();
  const { data } = await sb
    .from("campaigns")
    .select("id, name")
    .is("archived_at", null)
    .in("status", ["draft", "running"])
    .order("name", { ascending: true })
    .limit(limit);
  return ((data ?? []) as Array<{ id: string; name: string }>);
}
