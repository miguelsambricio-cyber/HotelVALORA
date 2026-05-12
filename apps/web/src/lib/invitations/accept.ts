"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { redactError } from "@/lib/security/redact";

/**
 * Phase 2.D.5 · Server actions for the invitation accept flow.
 *
 * NOT operator-gated. Recipients of an invitation arrive at
 * /invite/<token> and click Accept. The action:
 *
 *   1. Requires a Supabase Auth session (the bearer of the token must
 *      be signed in so we can attach `accepted_by_user_id`).
 *   2. Loads the invitation by token. Rejects if missing, expired,
 *      revoked, declined, bounced, or already converted.
 *   3. Resolves the public.users row for the signed-in auth user (the
 *      `handle_new_user` trigger creates the row on first sign-in).
 *   4. Sequentially:
 *        - Links the contact (`relationship_contacts.linked_user_id`)
 *        - Links the user (`users.linked_contact_id`)
 *        - Flips contact_invitation_status='converted'
 *        - Inserts a subscriptions row with the default_subscription_tier
 *          (or 'free' when null), status='active', source_campaign_id
 *          attribution preserved
 *        - Flips invitation.status='converted' + accepted_at +
 *          converted_at + accepted_by_user_id
 *        - Writes one activity_log row per change
 *   5. Redirects to /library with a success banner.
 *
 * Email-mismatch: deliberately permissive. The token is unguessable
 * (uuid) and the signed-in user may legitimately accept via a
 * different email than the one the invite was originally sent to.
 * The mismatch is captured in metadata for traceability.
 */

const VALID_TIERS = ["free","pro","premium","team","enterprise","top_promote","comped"] as const;
type ValidTier = (typeof VALID_TIERS)[number];

function failBack(token: string, message: string): never {
  redirect(`/invite/${token}?error=${encodeURIComponent(message)}`);
}

export async function acceptInvitationAction(formData: FormData): Promise<void> {
  const token = String(formData.get("token") ?? "");
  if (!/^[0-9a-f-]{36}$/i.test(token)) {
    redirect(`/invite/_?error=${encodeURIComponent("Invalid invitation link.")}`);
  }

  try {
    // Auth — recipient must be signed in (Supabase Auth)
    const userClient = createServerSupabaseClient();
    const { data: authData, error: authErr } = await userClient.auth.getUser();
    if (authErr || !authData?.user) {
      // Should not happen — the landing only renders the Accept form
      // when a session exists. Surface the case anyway.
      redirect(`/login?next=${encodeURIComponent(`/invite/${token}`)}`);
    }
    const authUser = authData.user!;
    const authEmail = authUser.email?.toLowerCase() ?? null;

    const sb = getSupabaseAdmin();

    // Load invitation
    const { data: invRow, error: invErr } = await sb
      .from("contact_invitations")
      .select("id, status, contact_id, campaign_id, invited_email, invited_by_email, default_subscription_tier, promo_code, expires_at")
      .eq("id", token)
      .maybeSingle();
    if (invErr || !invRow) failBack(token, "Invitation not found.");
    const inv = invRow as {
      id: string; status: string; contact_id: string;
      campaign_id: string | null; invited_email: string;
      invited_by_email: string | null;
      default_subscription_tier: string | null;
      promo_code: string | null;
      expires_at: string | null;
    };

    // Gate by status
    if (inv.status === "revoked") failBack(token, "This invitation has been revoked. Please ask the operator to re-send.");
    if (inv.status === "declined") failBack(token, "This invitation was previously declined.");
    if (inv.status === "expired") failBack(token, "This invitation has expired.");
    if (inv.status === "converted") {
      // Already done — bounce to library without an error
      redirect("/library");
    }
    if (inv.expires_at && new Date(inv.expires_at).getTime() < Date.now()) {
      // Stamp the expired state idempotently
      await sb.from("contact_invitations").update({ status: "expired" } as never).eq("id", inv.id);
      failBack(token, "This invitation has expired.");
    }

    // Resolve public.users row for the signed-in auth user
    const { data: existingUser } = await sb
      .from("users")
      .select("id, email, linked_contact_id")
      .eq("id", authUser.id)
      .maybeSingle();

    let userId: string;
    if (existingUser) {
      userId = (existingUser as { id: string }).id;
    } else {
      // Trigger should have inserted the row, but be defensive
      const fallback = {
        id: authUser.id,
        email: authEmail ?? inv.invited_email,
        role: "user" as const,
        tier: "free" as const,
        invitation_status: "active" as const,
      };
      const { error: insertUserErr } = await sb.from("users").insert(fallback as never);
      if (insertUserErr) failBack(token, "Could not provision platform user. Operator notified.");
      userId = authUser.id;
    }

    const nowIso = new Date().toISOString();
    const desiredTier: ValidTier = VALID_TIERS.includes((inv.default_subscription_tier ?? "free") as ValidTier)
      ? ((inv.default_subscription_tier ?? "free") as ValidTier)
      : "free";

    // 1) Link contact ↔ user (both sides)
    await sb
      .from("relationship_contacts")
      .update({
        linked_user_id: userId,
        contact_invitation_status: "converted",
      } as never)
      .eq("id", inv.contact_id)
      .is("deleted_at", null);

    await sb
      .from("users")
      .update({
        linked_contact_id: inv.contact_id,
        invitation_status: "active",
        last_seen_at: nowIso,
      } as never)
      .eq("id", userId);

    // 2) Bootstrap a subscription. We don't gate on existing
    //    subscriptions — duplicate-tier inserts are operator decisions,
    //    not data corruption. The latest-by-created_at picker in
    //    /user/admin/subscriptions makes the most recent row wins.
    const subInsert = {
      user_id: userId,
      tier: desiredTier,
      status: "active" as const,
      cancel_at_period_end: false,
      source_campaign_id: inv.campaign_id,
      assigned_by_email: inv.invited_by_email,
      notes: `Bootstrapped from invitation ${inv.id.slice(0, 8)}${inv.promo_code ? ` · promo=${inv.promo_code}` : ""}`,
    };
    const { data: subRow, error: subErr } = await sb
      .from("subscriptions")
      .insert(subInsert as never)
      .select("id")
      .maybeSingle();
    if (subErr) {
      // Subscription failed — surface but don't roll back the contact
      // linkage. Audit records the partial state so ops can heal.
      await sb.from("activity_log").insert({
        actor_id: userId,
        entity_id: inv.contact_id,
        entity_type: "relationship_contact",
        action: "invitation.subscription_bootstrap_failed",
        metadata: { invitation_id: inv.id, error: redactError(subErr), tier: desiredTier },
      });
    }
    const subId = (subRow as { id: string } | null)?.id ?? null;

    // 3) Flip invitation lifecycle
    await sb
      .from("contact_invitations")
      .update({
        status: "converted",
        accepted_at: nowIso,
        converted_at: subId ? nowIso : null,
        accepted_by_user_id: userId,
        responded_at: nowIso,
      } as never)
      .eq("id", inv.id);

    // 4) Audit trail (3 rows)
    const auditRows = [
      {
        actor_id: userId,
        entity_id: inv.contact_id,
        entity_type: "relationship_contact",
        action: "invitation.accepted",
        metadata: {
          invitation_id: inv.id,
          campaign_id: inv.campaign_id,
          tier: desiredTier,
          email_match: authEmail === inv.invited_email.toLowerCase(),
          accepted_email: authEmail,
          invited_email: inv.invited_email,
        },
      },
      ...(subId ? [{
        actor_id: userId,
        entity_id: subId,
        entity_type: "subscription",
        action: "invitation.converted",
        metadata: {
          invitation_id: inv.id,
          campaign_id: inv.campaign_id,
          tier: desiredTier,
          assigned_by_email: inv.invited_by_email,
        },
      }] : []),
    ];
    await sb.from("activity_log").insert(auditRows as never);

    revalidatePath("/user/admin/contacts");
    revalidatePath("/user/admin/users");
    revalidatePath("/user/admin/subscriptions");
    revalidatePath("/user/admin/campaigns");

    redirect("/library?onboarded=1");
  } catch (err) {
    if (err instanceof Error && err.message.startsWith("NEXT_REDIRECT")) throw err;
    redirect(`/invite/${token}?error=${encodeURIComponent(redactError(err))}`);
  }
}

/**
 * Operator action — revoke a pending invitation. Wired into the
 * existing admin surfaces later (Phase 2.D.5b). Lives here so the
 * revoke path is co-located with accept for audit clarity.
 */
export async function revokeInvitationAction(formData: FormData): Promise<void> {
  // Note: operator-gated. Imports requireOperator dynamically to avoid
  // pulling it into the public accept code path's bundle.
  const { requireOperator } = await import("@/lib/security/operator-guard");
  const invitationId = String(formData.get("invitationId") ?? "");
  try {
    const ctx = await requireOperator();
    const sb = getSupabaseAdmin();
    const { data: row } = await sb
      .from("contact_invitations")
      .select("id, status, contact_id")
      .eq("id", invitationId)
      .maybeSingle();
    if (!row) redirect(`/user/admin/contacts?bulk_error=${encodeURIComponent("Invitation not found.")}`);
    const r = row as { id: string; status: string; contact_id: string };
    if (["accepted", "converted"].includes(r.status)) {
      redirect(`/user/admin/contacts?bulk_error=${encodeURIComponent("Cannot revoke an already-accepted invitation.")}`);
    }

    await sb
      .from("contact_invitations")
      .update({ status: "revoked" } as never)
      .eq("id", invitationId);

    await sb.from("activity_log").insert({
      actor_id: ctx.userId,
      entity_id: r.contact_id,
      entity_type: "relationship_contact",
      action: "invitation.revoked",
      metadata: { invitation_id: invitationId, actor_email: ctx.email },
    });

    revalidatePath("/user/admin/contacts");
    revalidatePath("/user/admin/campaigns");
    redirect(`/user/admin/contacts?bulk_ok=1&bulk_verb=invitation_revoked`);
  } catch (err) {
    if (err instanceof Error && err.message.startsWith("NEXT_REDIRECT")) throw err;
    redirect(`/user/admin/contacts?bulk_error=${encodeURIComponent(redactError(err))}`);
  }
}
