import "server-only";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

/**
 * Server-side aggregator for the `/user/admin/users` operational
 * console (Phase 2.D.1). HOTELVALORA's contacts base feeds growth;
 * `users` is who actually made it through the funnel.
 *
 * Conversion arc (system thesis):
 *   contact → invited → onboarded → active → premium / top-promote
 *
 * Joins:
 *   public.users
 *     ↪ public.organizations         (current_organization_id)
 *     ↪ public.subscriptions          (latest row per user)
 *     ↪ public.relationship_contacts  (linked_contact_id · provenance)
 *
 * Posture: service-role · RLS revoked from anon/authenticated. Same
 * pattern as `lib/admin/contacts/live.ts`.
 */

export type InvitationStatus =
  | "invited"
  | "onboarding"
  | "active"
  | "inactive"
  | "churn_risk";

export type UserTier = "free" | "pro" | "premium" | "team" | "enterprise";

export interface UserRow {
  id: string;
  email: string;
  full_name: string | null;
  role: string;
  tier: UserTier;
  invitation_status: InvitationStatus;
  promo_code: string | null;
  relationship_owner_email: string | null;
  current_organization_id: string | null;
  organization_name: string | null;
  organization_plan: string | null;
  linked_contact_id: string | null;
  linked_contact_master_id: string | null;
  linked_contact_full_name: string | null;
  linked_contact_company: string | null;
  subscription_tier: string | null;
  subscription_status: string | null;
  subscription_current_period_end: string | null;
  last_seen_at: string | null;
  created_at: string;
}

export interface UserKpis {
  total: number;
  invited: number;
  onboarding: number;
  active: number;
  inactive: number;
  churn_risk: number;
  free: number;
  pro: number;
  premium: number;
  team_enterprise: number;
  linked_from_contacts: number;
  active_subscriptions: number;
}

export interface UsersFilter {
  invitation_status?: InvitationStatus | "all";
  tier?: UserTier | "all";
  linked_only?: boolean;
  search?: string;
  page?: number;
  page_size?: number;
  sort?: "recent" | "last_seen" | "name" | "tier";
}

function applyDefaults(filter: UsersFilter): UsersFilter {
  return {
    invitation_status: filter.invitation_status ?? "all",
    tier: filter.tier ?? "all",
    linked_only: filter.linked_only ?? false,
    search: filter.search ?? "",
    page: filter.page ?? 0,
    page_size: filter.page_size ?? 50,
    sort: filter.sort ?? "recent",
  };
}

/**
 * The Supabase nested-select shape — keeps types narrow without
 * fighting the generic PostgREST overload.
 */
interface RawUserSelect {
  id: string;
  email: string;
  full_name: string | null;
  role: string;
  tier: string;
  invitation_status: string;
  promo_code: string | null;
  relationship_owner_email: string | null;
  current_organization_id: string | null;
  linked_contact_id: string | null;
  last_seen_at: string | null;
  created_at: string;
  organizations: { name: string | null; plan: string | null } | null;
  relationship_contacts: { master_id: string | null; full_name: string | null; company_name: string | null } | null;
  subscriptions: Array<{ tier: string; status: string; current_period_end: string | null; created_at: string }> | null;
}

export async function loadUsers(rawFilter: UsersFilter = {}): Promise<{
  rows: UserRow[];
  total: number;
  filter: UsersFilter;
}> {
  const filter = applyDefaults(rawFilter);
  const sb = getSupabaseAdmin();

  let q = sb
    .from("users")
    .select(
      `id, email, full_name, role, tier, invitation_status, promo_code,
       relationship_owner_email, current_organization_id, linked_contact_id,
       last_seen_at, created_at,
       organizations:current_organization_id ( name, plan ),
       relationship_contacts:linked_contact_id ( master_id, full_name, company_name ),
       subscriptions ( tier, status, current_period_end, created_at )`,
      { count: "exact" },
    );

  if (filter.invitation_status && filter.invitation_status !== "all") {
    q = q.eq("invitation_status", filter.invitation_status);
  }
  if (filter.tier && filter.tier !== "all") {
    q = q.eq("tier", filter.tier);
  }
  if (filter.linked_only) {
    q = q.not("linked_contact_id", "is", null);
  }
  if (filter.search?.trim()) {
    const term = filter.search.trim().toLowerCase();
    q = q.or(`email.ilike.%${term}%,full_name.ilike.%${term}%`);
  }

  switch (filter.sort) {
    case "last_seen":
      q = q.order("last_seen_at", { ascending: false, nullsFirst: false });
      break;
    case "name":
      q = q.order("full_name", { ascending: true, nullsFirst: false });
      break;
    case "tier":
      q = q.order("tier", { ascending: true });
      break;
    case "recent":
    default:
      q = q.order("created_at", { ascending: false });
      break;
  }

  const page = filter.page ?? 0;
  const size = filter.page_size ?? 50;
  q = q.range(page * size, page * size + size - 1);

  const { data, error, count } = await q;
  if (error) {
    console.error("[users/live] query failed:", error.message);
    return { rows: [], total: 0, filter };
  }

  const raw = (data ?? []) as unknown as RawUserSelect[];
  const rows: UserRow[] = raw.map((u) => {
    // Subscriptions can be an array (per-user list) — pick the most
    // recent row deterministically by `created_at`.
    const subs = (u.subscriptions ?? []).slice().sort(
      (a, b) => (a.created_at < b.created_at ? 1 : a.created_at > b.created_at ? -1 : 0),
    );
    const sub = subs[0] ?? null;
    return {
      id: u.id,
      email: u.email,
      full_name: u.full_name,
      role: u.role,
      tier: u.tier as UserTier,
      invitation_status: u.invitation_status as InvitationStatus,
      promo_code: u.promo_code,
      relationship_owner_email: u.relationship_owner_email,
      current_organization_id: u.current_organization_id,
      organization_name: u.organizations?.name ?? null,
      organization_plan: u.organizations?.plan ?? null,
      linked_contact_id: u.linked_contact_id,
      linked_contact_master_id: u.relationship_contacts?.master_id ?? null,
      linked_contact_full_name: u.relationship_contacts?.full_name ?? null,
      linked_contact_company: u.relationship_contacts?.company_name ?? null,
      subscription_tier: sub?.tier ?? null,
      subscription_status: sub?.status ?? null,
      subscription_current_period_end: sub?.current_period_end ?? null,
      last_seen_at: u.last_seen_at,
      created_at: u.created_at,
    };
  });

  return { rows, total: count ?? rows.length, filter };
}

export async function loadUserKpis(): Promise<UserKpis> {
  const sb = getSupabaseAdmin();

  const queries = await Promise.all([
    sb.from("users").select("id", { count: "exact", head: true }),
    sb.from("users").select("id", { count: "exact", head: true }).eq("invitation_status", "invited"),
    sb.from("users").select("id", { count: "exact", head: true }).eq("invitation_status", "onboarding"),
    sb.from("users").select("id", { count: "exact", head: true }).eq("invitation_status", "active"),
    sb.from("users").select("id", { count: "exact", head: true }).eq("invitation_status", "inactive"),
    sb.from("users").select("id", { count: "exact", head: true }).eq("invitation_status", "churn_risk"),
    sb.from("users").select("id", { count: "exact", head: true }).eq("tier", "free"),
    sb.from("users").select("id", { count: "exact", head: true }).eq("tier", "pro"),
    sb.from("users").select("id", { count: "exact", head: true }).eq("tier", "premium"),
    sb.from("users").select("id", { count: "exact", head: true }).in("tier", ["team", "enterprise"]),
    sb.from("users").select("id", { count: "exact", head: true }).not("linked_contact_id", "is", null),
    sb.from("subscriptions").select("id", { count: "exact", head: true }).eq("status", "active"),
  ]);

  const [
    total, invited, onboarding, active, inactive, churn_risk,
    free, pro, premium, team_enterprise, linked_from_contacts,
    active_subscriptions,
  ] = queries.map((q) => q.count ?? 0);

  return {
    total, invited, onboarding, active, inactive, churn_risk,
    free, pro, premium, team_enterprise, linked_from_contacts,
    active_subscriptions,
  };
}
