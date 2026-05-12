import "server-only";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

/**
 * Phase 2.D.5 · Read-side helpers for the /invite/<token> landing.
 *
 * The token IS the invitation row uuid (assigned at bulk-invite send
 * time in Phase 2.D.3). Lookups are direct primary-key reads.
 *
 * Posture: service-role · this surface is public (the operator wants
 * recipients to land here from the email) so it can't be gated by
 * `requireOperator`. Token unguessability + status-based gates +
 * deterministic state transitions are the security model.
 */

export interface InvitationLanding {
  id: string;
  status:
    | "pending" | "sent" | "delivered" | "opened" | "clicked"
    | "bounced" | "accepted" | "declined" | "converted"
    | "revoked" | "expired";
  invited_email: string;
  promo_code: string | null;
  default_subscription_tier: string | null;
  sent_at: string | null;
  expires_at: string | null;
  invited_by_email: string | null;
  /** True when expires_at is set AND in the past */
  is_expired: boolean;
  contact: {
    id: string;
    full_name: string | null;
    email: string | null;
    company_name: string | null;
    investor_type: string | null;
    /** Already linked to a user — acceptance still works but flips state directly */
    linked_user_id: string | null;
  } | null;
  campaign: {
    id: string;
    name: string;
    kind: string;
  } | null;
}

const READABLE_STATUSES = [
  "pending", "sent", "delivered", "opened", "clicked",
  "accepted", "declined", "converted", "bounced", "revoked", "expired",
] as const;

export async function loadInvitationLanding(token: string): Promise<InvitationLanding | null> {
  // Reject obviously bad input fast so we don't burn a roundtrip on
  // every garbage scanner hit.
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(token)) {
    return null;
  }
  const sb = getSupabaseAdmin();
  const { data, error } = await sb
    .from("contact_invitations")
    .select(
      `id, status, invited_email, promo_code, default_subscription_tier,
       sent_at, expires_at, invited_by_email,
       relationship_contacts:contact_id (
         id, full_name, email, company_name, investor_type, linked_user_id
       ),
       campaigns:campaign_id ( id, name, kind )`,
    )
    .eq("id", token)
    .maybeSingle();
  if (error || !data) return null;
  const raw = data as unknown as {
    id: string;
    status: string;
    invited_email: string;
    promo_code: string | null;
    default_subscription_tier: string | null;
    sent_at: string | null;
    expires_at: string | null;
    invited_by_email: string | null;
    relationship_contacts: { id: string; full_name: string | null; email: string | null; company_name: string | null; investor_type: string | null; linked_user_id: string | null } | null;
    campaigns: { id: string; name: string; kind: string } | null;
  };
  if (!READABLE_STATUSES.includes(raw.status as (typeof READABLE_STATUSES)[number])) {
    return null;
  }

  const is_expired = raw.expires_at !== null && new Date(raw.expires_at).getTime() < Date.now();

  return {
    id: raw.id,
    status: raw.status as InvitationLanding["status"],
    invited_email: raw.invited_email,
    promo_code: raw.promo_code,
    default_subscription_tier: raw.default_subscription_tier,
    sent_at: raw.sent_at,
    expires_at: raw.expires_at,
    invited_by_email: raw.invited_by_email,
    is_expired,
    contact: raw.relationship_contacts ? {
      id: raw.relationship_contacts.id,
      full_name: raw.relationship_contacts.full_name,
      email: raw.relationship_contacts.email,
      company_name: raw.relationship_contacts.company_name,
      investor_type: raw.relationship_contacts.investor_type,
      linked_user_id: raw.relationship_contacts.linked_user_id,
    } : null,
    campaign: raw.campaigns ? {
      id: raw.campaigns.id,
      name: raw.campaigns.name,
      kind: raw.campaigns.kind,
    } : null,
  };
}

/**
 * Stamp `status='opened'` once when the recipient first visits the
 * landing. Idempotent — only flips from 'sent'/'delivered'/'pending'.
 * Writes one activity_log row.
 */
export async function markInvitationOpened(invitationId: string): Promise<void> {
  const sb = getSupabaseAdmin();
  const { data: current } = await sb
    .from("contact_invitations")
    .select("status, contact_id")
    .eq("id", invitationId)
    .maybeSingle();
  if (!current) return;
  const c = current as { status: string; contact_id: string };
  if (!["pending", "sent", "delivered"].includes(c.status)) return;

  await sb
    .from("contact_invitations")
    .update({ status: "opened" } as never)
    .eq("id", invitationId);

  await sb.from("activity_log").insert({
    actor_id: null,
    entity_id: c.contact_id,
    entity_type: "relationship_contact",
    action: "invitation.opened",
    metadata: { invitation_id: invitationId },
  });
}
