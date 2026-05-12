"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { requireOperator } from "@/lib/security/operator-guard";
import { redactError } from "@/lib/security/redact";

/**
 * Phase 2.D.6 · Campaign-aware bulk subscription operations.
 *
 * Targets the institutional growth-ops loop: assign / comp / expire
 * tiers across N users at once, optionally attributing every action to
 * a campaign. Mirrors the contacts bulk pattern from Phase 2.D.3 —
 * same resolveSelection shape, same audit discipline, same hard cap.
 *
 * Selection contract (FormData fields):
 *   sel_mode = "explicit"  + user_ids = <csv of user uuids>
 *           OR  sel_mode = "filtered"  + filter_qs = <users page filter qs>
 *           OR  sel_mode = "contacts"  + contact_ids = <csv> · resolves
 *               to the `linked_user_id` of each (drops contacts that
 *               haven't onboarded)
 *
 * Common shared inputs (where relevant):
 *   tier               | one of VALID_TIERS
 *   status             | defaults to 'active' on bulk-assign
 *   expires_at         | YYYY-MM-DD optional · expanded to UTC midnight
 *   source_campaign_id | optional uuid
 *   notes              | optional · operator-private
 *
 * Audit: one `activity_log` row PER subscription created OR mutated,
 * with `entity_type='subscription'` and `action='subscription.bulk_<verb>'`.
 * The actor_email is captured in metadata; the actor_id is the
 * operator's auth user id when available.
 */

const MAX_BULK_BATCH = 500;
const MAX_EXPLICIT = 200;

const VALID_TIERS = ["free","pro","premium","team","enterprise","top_promote","comped"] as const;
type ValidTier = (typeof VALID_TIERS)[number];

const VALID_STATUSES = ["active","trialing","past_due","canceled","expired","incomplete"] as const;
type ValidStatus = (typeof VALID_STATUSES)[number];

const tierSchema = z.enum(VALID_TIERS);
const statusSchema = z.enum(VALID_STATUSES);
const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).or(z.literal("")).optional();
const notesSchema = z.string().trim().max(2000).or(z.literal("")).optional();
const uuidSchema = z.string().uuid();

function parseDate(raw: FormDataEntryValue | null): string | null {
  if (!raw) return null;
  const s = String(raw).trim();
  if (!s) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return `${s}T00:00:00.000Z`;
  return s;
}

// ─── Selection resolver ──────────────────────────────────────────────

/**
 * Re-applies the users-page filter server-side and returns up to
 * MAX_BULK_BATCH user ids. Mirrors the WHERE clauses in
 * `lib/admin/users/live.ts::loadUsers`.
 */
async function resolveFilteredUserIds(params: URLSearchParams): Promise<string[]> {
  const sb = getSupabaseAdmin();
  let q = sb.from("users").select("id");

  const status = params.get("invitation_status");
  const tier = params.get("tier");
  const linkedOnly = params.get("linked_only") === "1";
  const search = params.get("search")?.trim().toLowerCase();

  if (status && status !== "all") q = q.eq("invitation_status", status);
  if (tier && tier !== "all") q = q.eq("tier", tier as ValidTier);
  if (linkedOnly) q = q.not("linked_contact_id", "is", null);
  if (search) {
    q = q.or(`email.ilike.%${search}%,full_name.ilike.%${search}%`);
  }
  q = q.limit(MAX_BULK_BATCH);
  const { data, error } = await q;
  if (error) {
    console.error("[subs/bulk] resolveFilteredUserIds failed:", error.message);
    return [];
  }
  return (data ?? []).map((r: { id: string }) => r.id);
}

/**
 * Resolve "linked contacts" → user_ids. Drops contacts that haven't
 * onboarded (linked_user_id IS NULL).
 */
async function resolveUserIdsFromContacts(contactIds: string[]): Promise<string[]> {
  if (contactIds.length === 0) return [];
  const sb = getSupabaseAdmin();
  const { data } = await sb
    .from("relationship_contacts")
    .select("linked_user_id")
    .in("id", contactIds.slice(0, MAX_BULK_BATCH))
    .is("deleted_at", null)
    .not("linked_user_id", "is", null);
  return ((data ?? []) as Array<{ linked_user_id: string | null }>)
    .map((r) => r.linked_user_id!)
    .filter((v): v is string => !!v);
}

async function resolveUserSelection(formData: FormData): Promise<string[]> {
  const mode = String(formData.get("sel_mode") ?? "explicit");
  if (mode === "filtered") {
    const raw = String(formData.get("filter_qs") ?? "");
    return resolveFilteredUserIds(new URLSearchParams(raw));
  }
  if (mode === "contacts") {
    const raw = String(formData.get("contact_ids") ?? "");
    const ids = raw.split(",").map((s) => s.trim()).filter(Boolean).slice(0, MAX_EXPLICIT);
    return resolveUserIdsFromContacts(ids);
  }
  const raw = String(formData.get("user_ids") ?? "");
  const ids = raw.split(",").map((s) => s.trim()).filter(Boolean);
  return Array.from(new Set(ids)).slice(0, MAX_EXPLICIT);
}

// ─── Audit ───────────────────────────────────────────────────────────

async function writeBulkSubAudit(params: {
  rows: Array<{ subscription_id: string; user_id: string; tier: string; status: string }>;
  action: string;
  actorId: string | null;
  actorEmail: string | null;
  metadata: Record<string, unknown>;
}): Promise<void> {
  if (params.rows.length === 0) return;
  const sb = getSupabaseAdmin();
  const auditRows = params.rows.map((r) => ({
    actor_id: params.actorId,
    entity_id: r.subscription_id,
    entity_type: "subscription",
    action: params.action,
    metadata: {
      ...params.metadata,
      actor_email: params.actorEmail,
      user_id: r.user_id,
      tier: r.tier,
      status: r.status,
    },
  }));
  const { error } = await sb.from("activity_log").insert(auditRows);
  if (error) console.error("[subs/bulk] audit write failed:", error.message);
}

// ─── Return helpers (mirror contacts/bulk) ───────────────────────────

function returnToUsers(filter_qs: string, banner: { ok: number; failed?: number; verb: string }): never {
  const params = new URLSearchParams(filter_qs);
  params.set("bulk_ok", String(banner.ok));
  if (banner.failed) params.set("bulk_failed", String(banner.failed));
  params.set("bulk_verb", banner.verb);
  redirect(`/user/admin/users?${params.toString()}`);
}

function failToUsers(filter_qs: string, message: string): never {
  const params = new URLSearchParams(filter_qs);
  params.set("bulk_error", message);
  redirect(`/user/admin/users?${params.toString()}`);
}

function returnToContacts(filter_qs: string, banner: { ok: number; failed?: number; verb: string }): never {
  const params = new URLSearchParams(filter_qs);
  params.set("bulk_ok", String(banner.ok));
  if (banner.failed) params.set("bulk_failed", String(banner.failed));
  params.set("bulk_verb", banner.verb);
  redirect(`/user/admin/contacts?${params.toString()}`);
}

function failToContacts(filter_qs: string, message: string): never {
  const params = new URLSearchParams(filter_qs);
  params.set("bulk_error", message);
  redirect(`/user/admin/contacts?${params.toString()}`);
}

// Pick the right return surface based on where the form was posted from
function pickReturnSurface(formData: FormData): {
  ok: (b: { ok: number; failed?: number; verb: string }) => never;
  fail: (msg: string) => never;
  filter_qs: string;
} {
  const origin = String(formData.get("origin") ?? "users");
  const filter_qs = String(formData.get("filter_qs") ?? "");
  if (origin === "contacts") {
    return {
      ok: (b) => returnToContacts(filter_qs, b),
      fail: (m) => failToContacts(filter_qs, m),
      filter_qs,
    };
  }
  return {
    ok: (b) => returnToUsers(filter_qs, b),
    fail: (m) => failToUsers(filter_qs, m),
    filter_qs,
  };
}

// ─── Actions ─────────────────────────────────────────────────────────

/**
 * Assign a subscription tier to N users at once. Creates one
 * `subscriptions` row per user; existing subs are not modified
 * (latest-by-created_at picks up the new row on the next page render).
 *
 * Use for: activate · upgrade · downgrade · renew (passing a new expires_at).
 */
export async function bulkAssignSubscriptionAction(formData: FormData): Promise<void> {
  const surface = pickReturnSurface(formData);
  try {
    const ctx = await requireOperator();
    const tier = tierSchema.parse(String(formData.get("tier") ?? "free")) as ValidTier;
    const status = statusSchema.parse(String(formData.get("status") ?? "active")) as ValidStatus;
    const expires_at = parseDate(formData.get("expires_at"));
    const notesRaw = formData.get("notes") === null ? "" : String(formData.get("notes") ?? "");
    notesSchema.parse(notesRaw);
    const notes = notesRaw.trim() || null;
    const rawCampaign = String(formData.get("source_campaign_id") ?? "");
    const source_campaign_id = rawCampaign && rawCampaign !== "none" ? uuidSchema.parse(rawCampaign) : null;

    const userIds = await resolveUserSelection(formData);
    if (userIds.length === 0) surface.fail("No users in selection (linked contacts must have onboarded).");

    const sb = getSupabaseAdmin();
    const inserts = userIds.map((uid) => ({
      user_id: uid,
      tier,
      status,
      cancel_at_period_end: false,
      expires_at: expires_at ?? null,
      notes,
      assigned_by_email: ctx.email,
      source_campaign_id,
    }));

    const { data: insertedRows, error } = await sb
      .from("subscriptions")
      .insert(inserts as never)
      .select("id, user_id, tier, status");
    if (error) surface.fail(redactError(error));

    const rows = (insertedRows ?? []) as Array<{ id: string; user_id: string; tier: string; status: string }>;
    await writeBulkSubAudit({
      rows: rows.map((r) => ({
        subscription_id: r.id,
        user_id: r.user_id,
        tier: r.tier,
        status: r.status,
      })),
      action: "subscription.bulk_assigned",
      actorId: ctx.userId,
      actorEmail: ctx.email,
      metadata: { tier, status, expires_at, source_campaign_id, has_notes: !!notes },
    });
    revalidatePath("/user/admin/users");
    revalidatePath("/user/admin/subscriptions");
    revalidatePath("/user/admin/contacts");
    surface.ok({ ok: rows.length, verb: "subscription_assigned" });
  } catch (err) {
    if (err instanceof Error && err.message.startsWith("NEXT_REDIRECT")) throw err;
    surface.fail(redactError(err));
  }
}

/**
 * Shortcut for the most common operator flow — grant Comped access at
 * `tier='comped'`, `status='active'`, optionally with an `expires_at`.
 * Wraps bulkAssignSubscriptionAction with a fixed tier.
 */
export async function bulkCompSubscriptionAction(formData: FormData): Promise<void> {
  // Force tier=comped on the FormData before delegating.
  formData.set("tier", "comped");
  formData.set("status", "active");
  return bulkAssignSubscriptionAction(formData);
}

/**
 * Bulk expire: flip status='expired' + expires_at=now() on the LATEST
 * subscription of each selected user. Stripe-backed subs are skipped
 * (operator should cancel via Stripe Dashboard so the webhook stays
 * authoritative — we surface the count in the result banner).
 */
export async function bulkExpireSubscriptionAction(formData: FormData): Promise<void> {
  const surface = pickReturnSurface(formData);
  try {
    const ctx = await requireOperator();
    const userIds = await resolveUserSelection(formData);
    if (userIds.length === 0) surface.fail("No users in selection.");

    const sb = getSupabaseAdmin();
    // Pull the latest subscription per user. Service-role · we sort
    // client-side because PostgREST doesn't expose DISTINCT ON cleanly.
    const { data: subs } = await sb
      .from("subscriptions")
      .select("id, user_id, tier, status, stripe_subscription_id, created_at")
      .in("user_id", userIds)
      .order("created_at", { ascending: false });

    const seen = new Set<string>();
    const targets: Array<{ id: string; user_id: string; tier: string; stripe_subscription_id: string | null }> = [];
    for (const r of ((subs ?? []) as Array<{ id: string; user_id: string; tier: string; stripe_subscription_id: string | null; status: string; created_at: string }>)) {
      if (seen.has(r.user_id)) continue;
      seen.add(r.user_id);
      // Only act on non-Stripe rows and non-already-expired
      if (r.status === "expired" || r.status === "canceled") continue;
      if (r.stripe_subscription_id) continue;
      targets.push({ id: r.id, user_id: r.user_id, tier: r.tier, stripe_subscription_id: r.stripe_subscription_id });
    }
    if (targets.length === 0) surface.ok({ ok: 0, verb: "subscription_expired" });

    const ids = targets.map((t) => t.id);
    const nowIso = new Date().toISOString();
    const { error } = await sb
      .from("subscriptions")
      .update({ status: "expired", expires_at: nowIso } as never)
      .in("id", ids);
    if (error) surface.fail(redactError(error));

    await writeBulkSubAudit({
      rows: targets.map((t) => ({
        subscription_id: t.id,
        user_id: t.user_id,
        tier: t.tier,
        status: "expired",
      })),
      action: "subscription.bulk_expired",
      actorId: ctx.userId,
      actorEmail: ctx.email,
      metadata: { expired_at: nowIso },
    });
    revalidatePath("/user/admin/users");
    revalidatePath("/user/admin/subscriptions");
    revalidatePath("/user/admin/contacts");
    const stripeBacked = userIds.length - targets.length;
    surface.ok({
      ok: targets.length,
      failed: stripeBacked,
      verb: "subscription_expired",
    });
  } catch (err) {
    if (err instanceof Error && err.message.startsWith("NEXT_REDIRECT")) throw err;
    surface.fail(redactError(err));
  }
}

/**
 * Revoke all currently-pending invitations for the selected contacts.
 * Idempotent — already-accepted / converted / declined / revoked rows
 * are skipped. Writes one `invitation.bulk_revoked` audit row per
 * actually-flipped invitation.
 */
export async function bulkRevokeInvitationsAction(formData: FormData): Promise<void> {
  const filter_qs = String(formData.get("filter_qs") ?? "");
  function fail(msg: string): never {
    const p = new URLSearchParams(filter_qs);
    p.set("bulk_error", msg);
    redirect(`/user/admin/contacts?${p.toString()}`);
  }
  function done(ok: number): never {
    const p = new URLSearchParams(filter_qs);
    p.set("bulk_ok", String(ok));
    p.set("bulk_verb", "invites_revoked");
    redirect(`/user/admin/contacts?${p.toString()}`);
  }

  try {
    const ctx = await requireOperator();
    const mode = String(formData.get("sel_mode") ?? "explicit");
    let contactIds: string[] = [];
    if (mode === "filtered") {
      // Re-use the contacts-filter resolver — but we don't have it
      // here. Cheapest path: read raw ids from the form. The contacts
      // toolbar passes explicit ids when this action fires.
      contactIds = String(formData.get("contact_ids") ?? "").split(",").map((s) => s.trim()).filter(Boolean);
    } else {
      contactIds = String(formData.get("contact_ids") ?? "").split(",").map((s) => s.trim()).filter(Boolean);
    }
    contactIds = Array.from(new Set(contactIds)).slice(0, MAX_EXPLICIT);
    if (contactIds.length === 0) fail("No contacts in selection.");

    const sb = getSupabaseAdmin();
    const REVOKE_ELIGIBLE = ["pending", "sent", "delivered", "opened", "clicked", "bounced"];
    const { data: invs } = await sb
      .from("contact_invitations")
      .select("id, contact_id, status")
      .in("contact_id", contactIds)
      .in("status", REVOKE_ELIGIBLE);

    const rows = (invs ?? []) as Array<{ id: string; contact_id: string; status: string }>;
    if (rows.length === 0) done(0);

    const ids = rows.map((r) => r.id);
    const { error } = await sb
      .from("contact_invitations")
      .update({ status: "revoked" } as never)
      .in("id", ids);
    if (error) fail(redactError(error));

    const auditRows = rows.map((r) => ({
      actor_id: ctx.userId,
      entity_id: r.contact_id,
      entity_type: "relationship_contact",
      action: "invitation.bulk_revoked",
      metadata: { invitation_id: r.id, actor_email: ctx.email },
    }));
    await sb.from("activity_log").insert(auditRows);

    revalidatePath("/user/admin/contacts");
    revalidatePath("/user/admin/campaigns");
    done(rows.length);
  } catch (err) {
    if (err instanceof Error && err.message.startsWith("NEXT_REDIRECT")) throw err;
    fail(redactError(err));
  }
}
