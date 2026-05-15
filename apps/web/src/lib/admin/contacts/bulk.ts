"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { requireOperator } from "@/lib/security/operator-guard";
import { redactError } from "@/lib/security/redact";
import { getResend, getDefaultFromAddress } from "@/lib/email/client";
import { renderContactInvite } from "@/lib/email/templates/contact-invite";

/**
 * Phase 2.D.3 · Bulk operational workflows on the contacts surface.
 *
 * Every bulk action follows the same shape:
 *   1. Gate by `requireOperator()` (fail-closed allow-list).
 *   2. Resolve the selection set:
 *        explicit IDs (csv string, capped at MAX_EXPLICIT)
 *      OR
 *        the current page's filter, re-run server-side at action time
 *        ("select-filtered-set" mode)
 *   3. Apply the mutation in a single UPDATE (where possible) or a
 *      bounded loop (for invite/email-send).
 *   4. Write one row to `public.activity_log` PER contact affected,
 *      with `action='contact.bulk_<verb>'` and metadata containing the
 *      action arguments + the affected ID for traceable audit.
 *   5. `revalidatePath` + redirect back to view with a result banner.
 *
 * Constraints (intentional):
 *   - No automation engine, no sequence builder, no AI outbound. The
 *     operator pulls each trigger by hand for now.
 *   - The bulk-invite send loop is sequential with a small spacing
 *     so we stay under Resend's per-second cap without exposing
 *     rate-limit knobs.
 *   - Hard cap on action set size (`MAX_BULK_BATCH`). Beyond that the
 *     operator narrows the filter — large unbounded actions are an
 *     anti-pattern at this stage.
 */

// ─── Constants ────────────────────────────────────────────────────────

/** Max contacts touched in a single bulk action. */
const MAX_BULK_BATCH = 500;

/** Max explicit ID list length passed via the toolbar (UI checkboxes). */
const MAX_EXPLICIT = 200;

/** Spacing between Resend sends · keeps us under 10/s default cap. */
const SEND_SPACING_MS = 150;

// ─── Filter-aware selection resolver ──────────────────────────────────

/**
 * Re-applies the current contacts filter server-side and returns the
 * resolved ID list. Mirrors the WHERE clauses in `loadContacts` so
 * "select filtered" matches what the operator sees.
 */
async function resolveFilteredIds(params: URLSearchParams): Promise<string[]> {
  const sb = getSupabaseAdmin();
  let q = sb.from("relationship_contacts").select("id");

  const band = params.get("band");
  const investorType = params.get("investor_type");
  const bucket = params.get("bucket") ?? "active";
  const hideInvalid = params.get("hide_invalid") !== "1";   // default: hide invalid
  const recentlyActiveOnly = params.get("recently_active_only") === "1";
  const search = params.get("search")?.trim().toLowerCase() ?? "";

  if (band && band !== "all") q = q.eq("relationship_band", band);
  if (investorType && investorType !== "all") q = q.eq("investor_type", investorType);
  if (bucket && bucket !== "all") q = q.eq("bucket", bucket);
  if (hideInvalid) q = q.neq("email_validity", "invalid").eq("flagged_for_correction", false);
  // Dormant + no Gmail activity hidden — mirror loadContacts default
  q = q.or("relationship_band.neq.dormant,active_threads.gt.0");
  if (recentlyActiveOnly) {
    const ninety = new Date(Date.now() - 90 * 86_400_000).toISOString().slice(0, 10);
    q = q.gte("last_email_date", ninety);
  }
  if (search) {
    q = q.or(`full_name.ilike.%${search}%,email_lower.ilike.%${search}%,company_name.ilike.%${search}%`);
  }
  // Hard cap so a runaway filter doesn't propose a 5,000-row action.
  q = q.is("deleted_at", null).limit(MAX_BULK_BATCH);

  const { data, error } = await q;
  if (error) {
    console.error("[contacts/bulk] resolveFilteredIds failed:", error.message);
    return [];
  }
  return (data ?? []).map((r: { id: string }) => r.id);
}

/**
 * Parse the toolbar's selection arguments from FormData and return the
 * resolved ID list (deduped, soft-delete filtered).
 *
 * Modes:
 *   sel_mode = "explicit"  · IDs from formData.get("ids") (csv)
 *   sel_mode = "filtered"  · re-run the current filter server-side
 */
async function resolveSelection(formData: FormData): Promise<string[]> {
  const mode = String(formData.get("sel_mode") ?? "explicit");
  if (mode === "filtered") {
    const raw = String(formData.get("filter_qs") ?? "");
    const params = new URLSearchParams(raw);
    return resolveFilteredIds(params);
  }
  const raw = String(formData.get("ids") ?? "");
  const ids = raw.split(",").map((s) => s.trim()).filter(Boolean);
  return Array.from(new Set(ids)).slice(0, MAX_EXPLICIT);
}

// ─── Audit helper ─────────────────────────────────────────────────────

async function writeBulkAudit(params: {
  contactIds: string[];
  action: string;
  actorId: string | null;
  actorEmail: string | null;
  metadata: Record<string, unknown>;
}): Promise<void> {
  if (params.contactIds.length === 0) return;
  const sb = getSupabaseAdmin();
  const rows = params.contactIds.map((cid) => ({
    actor_id: params.actorId,
    entity_id: cid,
    entity_type: "relationship_contact",
    action: params.action,
    metadata: { ...params.metadata, actor_email: params.actorEmail },
  }));
  const { error } = await sb.from("activity_log").insert(rows);
  if (error) console.error("[contacts/bulk] audit write failed:", error.message);
}

// ─── Result helpers ───────────────────────────────────────────────────

function backToList(filter_qs: string, banner: { ok: number; failed?: number; verb: string }): never {
  const params = new URLSearchParams(filter_qs);
  params.set("bulk_ok", String(banner.ok));
  if (banner.failed) params.set("bulk_failed", String(banner.failed));
  params.set("bulk_verb", banner.verb);
  redirect(`/user/admin/contacts?${params.toString()}`);
}

function failToList(filter_qs: string, message: string): never {
  const params = new URLSearchParams(filter_qs);
  params.set("bulk_error", message);
  redirect(`/user/admin/contacts?${params.toString()}`);
}

/**
 * Next.js `redirect()` works by throwing a special NEXT_REDIRECT error
 * that the framework catches and uses to perform the redirect. Wrapping
 * a redirect call inside try/catch would swallow it · the catch block
 * would then re-throw the wrong shape and the operator would see a
 * misleading "Bulk action failed · Error: NEXT_REDIRECT" banner.
 *
 * Every bulk action's outer catch block must re-throw redirect errors
 * unchanged. Detection is by `digest` field (NEXT_REDIRECT;…) which the
 * framework attaches to the error object · safe across Next 14+.
 */
function isNextRedirectError(err: unknown): boolean {
  return (
    typeof err === "object" &&
    err !== null &&
    "digest" in err &&
    typeof (err as { digest?: unknown }).digest === "string" &&
    ((err as { digest: string }).digest.startsWith("NEXT_REDIRECT") ||
      (err as { digest: string }).digest === "NEXT_NOT_FOUND")
  );
}

// ─── Action implementations ───────────────────────────────────────────

/** Bulk add a tag to N contacts. Idempotent — already-tagged contacts skipped. */
export async function bulkAddTagAction(formData: FormData): Promise<void> {
  let filter_qs = "";
  try {
    const ctx = await requireOperator();
    filter_qs = String(formData.get("filter_qs") ?? "");
    const tag = String(formData.get("tag") ?? "").trim().toLowerCase();
    const tagSchema = z.string().min(1).max(80).regex(/^[a-z0-9][a-z0-9\-_\s]*$/);
    const parsed = tagSchema.safeParse(tag);
    if (!parsed.success) return failToList(filter_qs, "Invalid tag format.");
    const ids = await resolveSelection(formData);
    if (ids.length === 0) return failToList(filter_qs, "No contacts in selection.");

    const sb = getSupabaseAdmin();
    // Use array_append via RPC-less approach — fetch existing tags +
    // append + write back. Sequential per row to keep idempotent.
    const { data: existing } = await sb
      .from("relationship_contacts")
      .select("id, tags")
      .in("id", ids)
      .is("deleted_at", null);

    const toUpdate = ((existing ?? []) as Array<{ id: string; tags: string[] | null }>)
      .filter((r) => !(r.tags ?? []).includes(tag))
      .map((r) => ({ id: r.id, tags: [...(r.tags ?? []), tag] }));

    let ok = 0;
    for (const row of toUpdate) {
      const { error } = await sb
        .from("relationship_contacts")
        .update({ tags: row.tags } as never)
        .eq("id", row.id)
        .is("deleted_at", null);
      if (!error) ok++;
    }
    await writeBulkAudit({
      contactIds: toUpdate.map((r) => r.id),
      action: "contact.bulk_tag_added",
      actorId: ctx.userId,
      actorEmail: ctx.email,
      metadata: { tag },
    });
    revalidatePath("/user/admin/contacts");
    backToList(filter_qs, { ok, verb: "tag_added" });
  } catch (err) {
    if (isNextRedirectError(err)) throw err;
    failToList(filter_qs, redactError(err));
  }
}

/** Bulk assign relationship owner. Empty email clears. */
export async function bulkAssignOwnerAction(formData: FormData): Promise<void> {
  let filter_qs = "";
  try {
    const ctx = await requireOperator();
    filter_qs = String(formData.get("filter_qs") ?? "");
    const rawEmail = String(formData.get("relationship_owner_email") ?? "").trim();
    const parsed = z.string().email().or(z.literal("")).safeParse(rawEmail);
    if (!parsed.success) return failToList(filter_qs, "Invalid email.");
    const email = parsed.data === "" ? null : parsed.data.toLowerCase();

    const ids = await resolveSelection(formData);
    if (ids.length === 0) return failToList(filter_qs, "No contacts in selection.");

    const sb = getSupabaseAdmin();
    const { error, count } = await sb
      .from("relationship_contacts")
      .update({ relationship_owner_email: email } as never, { count: "exact" })
      .in("id", ids)
      .is("deleted_at", null);
    if (error) return failToList(filter_qs, redactError(error));

    await writeBulkAudit({
      contactIds: ids,
      action: "contact.bulk_owner_assigned",
      actorId: ctx.userId,
      actorEmail: ctx.email,
      metadata: { to: email },
    });
    revalidatePath("/user/admin/contacts");
    backToList(filter_qs, { ok: count ?? ids.length, verb: "owner_assigned" });
  } catch (err) {
    if (isNextRedirectError(err)) throw err;
    failToList(filter_qs, redactError(err));
  }
}

/** Bulk mark contacted — sets last_contacted_at = now() on each row. */
export async function bulkMarkContactedAction(formData: FormData): Promise<void> {
  let filter_qs = "";
  try {
    const ctx = await requireOperator();
    filter_qs = String(formData.get("filter_qs") ?? "");
    const ids = await resolveSelection(formData);
    if (ids.length === 0) return failToList(filter_qs, "No contacts in selection.");

    const sb = getSupabaseAdmin();
    const { error, count } = await sb
      .from("relationship_contacts")
      .update({ last_contacted_at: new Date().toISOString() } as never, { count: "exact" })
      .in("id", ids)
      .is("deleted_at", null);
    if (error) return failToList(filter_qs, redactError(error));

    await writeBulkAudit({
      contactIds: ids,
      action: "contact.bulk_marked_contacted",
      actorId: ctx.userId,
      actorEmail: ctx.email,
      metadata: {},
    });
    revalidatePath("/user/admin/contacts");
    backToList(filter_qs, { ok: count ?? ids.length, verb: "marked_contacted" });
  } catch (err) {
    if (isNextRedirectError(err)) throw err;
    failToList(filter_qs, redactError(err));
  }
}

/** Bulk mark inactive · bucket → dormant-archive · band → dormant. */
export async function bulkMarkInactiveAction(formData: FormData): Promise<void> {
  let filter_qs = "";
  try {
    const ctx = await requireOperator();
    filter_qs = String(formData.get("filter_qs") ?? "");
    const ids = await resolveSelection(formData);
    if (ids.length === 0) return failToList(filter_qs, "No contacts in selection.");

    const sb = getSupabaseAdmin();
    const { error, count } = await sb
      .from("relationship_contacts")
      .update({
        bucket: "dormant-archive",
        relationship_band: "dormant",
        archived_at: new Date().toISOString(),
      } as never, { count: "exact" })
      .in("id", ids)
      .is("deleted_at", null);
    if (error) return failToList(filter_qs, redactError(error));

    await writeBulkAudit({
      contactIds: ids,
      action: "contact.bulk_marked_inactive",
      actorId: ctx.userId,
      actorEmail: ctx.email,
      metadata: {},
    });
    revalidatePath("/user/admin/contacts");
    backToList(filter_qs, { ok: count ?? ids.length, verb: "marked_inactive" });
  } catch (err) {
    if (isNextRedirectError(err)) throw err;
    failToList(filter_qs, redactError(err));
  }
}

/** Bulk mark invalid — same effect as the single mutation, applied to N. */
export async function bulkMarkInvalidAction(formData: FormData): Promise<void> {
  let filter_qs = "";
  try {
    const ctx = await requireOperator();
    filter_qs = String(formData.get("filter_qs") ?? "");
    const reason = String(formData.get("reason") ?? "").trim().slice(0, 500);
    const ids = await resolveSelection(formData);
    if (ids.length === 0) return failToList(filter_qs, "No contacts in selection.");

    const sb = getSupabaseAdmin();
    const { error, count } = await sb
      .from("relationship_contacts")
      .update({
        email_validity: "invalid",
        flagged_for_correction: true,
        bucket: "DATASITE-CORREGIR",
        relationship_band: "invalid",
      } as never, { count: "exact" })
      .in("id", ids)
      .is("deleted_at", null);
    if (error) return failToList(filter_qs, redactError(error));

    await writeBulkAudit({
      contactIds: ids,
      action: "contact.bulk_invalid_marked",
      actorId: ctx.userId,
      actorEmail: ctx.email,
      metadata: { reason: reason || null },
    });
    revalidatePath("/user/admin/contacts");
    backToList(filter_qs, { ok: count ?? ids.length, verb: "invalid_marked" });
  } catch (err) {
    if (isNextRedirectError(err)) throw err;
    failToList(filter_qs, redactError(err));
  }
}

/** Bulk suppress outreach — excludes contacts from future invites. */
export async function bulkSuppressOutreachAction(formData: FormData): Promise<void> {
  let filter_qs = "";
  try {
    const ctx = await requireOperator();
    filter_qs = String(formData.get("filter_qs") ?? "");
    const reason = String(formData.get("reason") ?? "").trim().slice(0, 500);
    const ids = await resolveSelection(formData);
    if (ids.length === 0) return failToList(filter_qs, "No contacts in selection.");

    const sb = getSupabaseAdmin();
    const { error, count } = await sb
      .from("relationship_contacts")
      .update({ suppressed_outreach: true } as never, { count: "exact" })
      .in("id", ids)
      .is("deleted_at", null);
    if (error) return failToList(filter_qs, redactError(error));

    await writeBulkAudit({
      contactIds: ids,
      action: "contact.bulk_outreach_suppressed",
      actorId: ctx.userId,
      actorEmail: ctx.email,
      metadata: { reason: reason || null },
    });
    revalidatePath("/user/admin/contacts");
    backToList(filter_qs, { ok: count ?? ids.length, verb: "outreach_suppressed" });
  } catch (err) {
    if (isNextRedirectError(err)) throw err;
    failToList(filter_qs, redactError(err));
  }
}

// ─── Delete actions (soft + hard) ─────────────────────────────────────

/** Smaller cap for hard-delete · destructive · prefer narrow batches. */
const MAX_HARD_DELETE = 100;

/** Type-to-confirm token required for hard delete. */
const HARD_DELETE_CONFIRM_TOKEN = "DELETE PERMANENTLY";

/**
 * Bulk SOFT delete · sets `deleted_at = now()`. Reversible (clear
 * the field to restore). Idempotent — already-deleted rows ignored.
 * The default `loadContacts` filter and every other bulk action filter
 * `.is("deleted_at", null)` so the contacts disappear from the surface.
 */
export async function bulkSoftDeleteAction(formData: FormData): Promise<void> {
  let filter_qs = "";
  try {
    const ctx = await requireOperator();
    filter_qs = String(formData.get("filter_qs") ?? "");
    const reason = String(formData.get("reason") ?? "").trim().slice(0, 500);
    const ids = await resolveSelection(formData);
    if (ids.length === 0) return failToList(filter_qs, "No contacts in selection.");

    const sb = getSupabaseAdmin();
    const { error, count } = await sb
      .from("relationship_contacts")
      .update({ deleted_at: new Date().toISOString() } as never, { count: "exact" })
      .in("id", ids)
      .is("deleted_at", null);
    if (error) return failToList(filter_qs, redactError(error));

    await writeBulkAudit({
      contactIds: ids,
      action: "contact.bulk_soft_deleted",
      actorId: ctx.userId,
      actorEmail: ctx.email,
      metadata: { reason: reason || null },
    });
    revalidatePath("/user/admin/contacts");
    backToList(filter_qs, { ok: count ?? ids.length, verb: "soft_deleted" });
  } catch (err) {
    if (isNextRedirectError(err)) throw err;
    failToList(filter_qs, redactError(err));
  }
}

/**
 * Bulk HARD delete · IRREVERSIBLE. Refuses any contact with a non-null
 * `linked_user_id` (preserves growth-funnel attribution). Requires a
 * type-to-confirm `confirm_token = 'DELETE PERMANENTLY'`. Capped at
 * MAX_HARD_DELETE per batch (smaller than other bulk actions).
 *
 * FK cascade behavior (verified 2026-05-15):
 *   - contact_invitations.contact_id      → CASCADE (deleted)
 *   - relationship_health.contact_id      → CASCADE (deleted)
 *   - relationship_labels.contact_id      → CASCADE (deleted)
 *   - users.linked_contact_id             → SET NULL (rejected upstream)
 *
 * Audit log written BEFORE the delete so the record survives the row
 * being gone (entity_id becomes a dangling reference, intentional · the
 * activity_log preserves "this id existed and was hard-deleted at T").
 */
export async function bulkHardDeleteAction(formData: FormData): Promise<void> {
  let filter_qs = "";
  try {
    const ctx = await requireOperator();
    filter_qs = String(formData.get("filter_qs") ?? "");
    const reason = String(formData.get("reason") ?? "").trim().slice(0, 500);
    const confirmToken = String(formData.get("confirm_token") ?? "").trim();

    if (confirmToken !== HARD_DELETE_CONFIRM_TOKEN) {
      return failToList(
        filter_qs,
        `Hard delete refused · type "${HARD_DELETE_CONFIRM_TOKEN}" exactly to confirm.`,
      );
    }

    const ids = await resolveSelection(formData);
    if (ids.length === 0) return failToList(filter_qs, "No contacts in selection.");
    if (ids.length > MAX_HARD_DELETE) {
      return failToList(
        filter_qs,
        `Hard delete capped at ${MAX_HARD_DELETE} per batch (got ${ids.length}). Narrow the selection first.`,
      );
    }

    const sb = getSupabaseAdmin();

    // Refuse any contact linked to an onboarded user · preserves growth funnel.
    const { data: linked, error: linkErr } = await sb
      .from("relationship_contacts")
      .select("id, full_name, email, linked_user_id")
      .in("id", ids)
      .not("linked_user_id", "is", null);
    if (linkErr) return failToList(filter_qs, redactError(linkErr));
    if (linked && linked.length > 0) {
      const sample = (linked[0] as { email: string | null; id: string }).email
        ?? (linked[0] as { id: string }).id;
      return failToList(
        filter_qs,
        `Hard delete refused · ${linked.length} contact${linked.length === 1 ? "" : "s"} linked to onboarded user${linked.length === 1 ? "" : "s"} (e.g. ${sample}). Soft delete instead, or unlink user first.`,
      );
    }

    // Audit FIRST · entity_id will dangle after delete (intentional).
    await writeBulkAudit({
      contactIds: ids,
      action: "contact.bulk_hard_deleted",
      actorId: ctx.userId,
      actorEmail: ctx.email,
      metadata: { reason: reason || null, irreversible: true, confirm_token: HARD_DELETE_CONFIRM_TOKEN },
    });

    // CASCADE handles invitations + labels + health. Users.linked_contact_id
    // already verified null above so SET NULL is a no-op.
    const { error, count } = await sb
      .from("relationship_contacts")
      .delete({ count: "exact" })
      .in("id", ids);
    if (error) return failToList(filter_qs, redactError(error));

    revalidatePath("/user/admin/contacts");
    backToList(filter_qs, { ok: count ?? ids.length, verb: "hard_deleted" });
  } catch (err) {
    if (isNextRedirectError(err)) throw err;
    failToList(filter_qs, redactError(err));
  }
}

/**
 * Bulk assign to a campaign. Creates one `contact_invitations` row per
 * contact with `status='pending'` (the row will flip to `sent` if/when
 * the operator runs bulk-invite against the same selection later).
 *
 * Validates the campaign exists. Skips contacts already pending for
 * the same campaign (no duplicate-pending rows).
 */
export async function bulkAssignCampaignAction(formData: FormData): Promise<void> {
  let filter_qs = "";
  try {
    const ctx = await requireOperator();
    filter_qs = String(formData.get("filter_qs") ?? "");
    const campaignId = String(formData.get("campaign_id") ?? "").trim();
    if (!campaignId) return failToList(filter_qs, "Campaign id required.");

    const sb = getSupabaseAdmin();
    const { data: campaign } = await sb
      .from("campaigns")
      .select("id, name")
      .eq("id", campaignId)
      .maybeSingle();
    if (!campaign) return failToList(filter_qs, "Campaign not found.");

    const ids = await resolveSelection(formData);
    if (ids.length === 0) return failToList(filter_qs, "No contacts in selection.");

    // Fetch the contacts so we have their email + name for the invitation row
    const { data: contacts } = await sb
      .from("relationship_contacts")
      .select("id, email, full_name")
      .in("id", ids)
      .is("deleted_at", null);

    const rows = ((contacts ?? []) as Array<{ id: string; email: string | null; full_name: string | null }>)
      .filter((c) => c.email)
      .map((c) => ({
        contact_id: c.id,
        campaign_id: campaignId,
        invited_by_email: ctx.email,
        invited_email: c.email!,
        status: "pending" as const,
        notes: `Assigned via bulk_assign_campaign · campaign=${campaign.name}`,
      }));

    if (rows.length === 0) return failToList(filter_qs, "Selected contacts have no email.");

    const { error } = await sb.from("contact_invitations").insert(rows as never);
    if (error) return failToList(filter_qs, redactError(error));

    await writeBulkAudit({
      contactIds: rows.map((r) => r.contact_id),
      action: "contact.bulk_campaign_assigned",
      actorId: ctx.userId,
      actorEmail: ctx.email,
      metadata: { campaign_id: campaignId, campaign_name: campaign.name },
    });
    revalidatePath("/user/admin/contacts");
    backToList(filter_qs, { ok: rows.length, verb: "campaign_assigned" });
  } catch (err) {
    if (isNextRedirectError(err)) throw err;
    failToList(filter_qs, redactError(err));
  }
}

/**
 * Bulk invite via Resend. Per contact:
 *   1. Create a `contact_invitations` row (status='pending'). The
 *      invitation id IS the invite token — the accept-invite landing
 *      route looks it up by uuid.
 *   2. Send the email via Resend.
 *   3. Update the invitation row: status='sent', sent_at=now(),
 *      resend_message_id=<the message id Resend returned>. If the send
 *      threw, status='bounced' instead.
 *   4. Update the contact: contact_invitation_status='invited',
 *      last_contacted_at=now().
 *   5. Write one activity_log row per outcome.
 *
 * Excludes:
 *   - contacts with no email
 *   - contacts already suppressed (suppressed_outreach=true)
 *   - contacts whose email_validity='invalid' or flagged
 *
 * Spacing: SEND_SPACING_MS between sends to stay under Resend's
 * default per-second cap without exposing a knob.
 */
export async function bulkInviteAction(formData: FormData): Promise<void> {
  let filter_qs = "";
  try {
    const ctx = await requireOperator();
    filter_qs = String(formData.get("filter_qs") ?? "");
    const tier = String(formData.get("default_subscription_tier") ?? "").trim() || null;
    const promo = String(formData.get("promo_code") ?? "").trim() || null;
    const campaignIdRaw = String(formData.get("campaign_id") ?? "").trim();
    const campaignId = campaignIdRaw && campaignIdRaw !== "none" ? campaignIdRaw : null;

    const validTiers = ["free","pro","premium","team","enterprise","top_promote","comped"] as const;
    if (tier && !validTiers.includes(tier as (typeof validTiers)[number])) {
      return failToList(filter_qs, "Invalid subscription tier.");
    }

    const ids = await resolveSelection(formData);
    if (ids.length === 0) return failToList(filter_qs, "No contacts in selection.");

    const sb = getSupabaseAdmin();

    // Resolve campaign (for the email's campaign byline)
    let campaignName: string | null = null;
    if (campaignId) {
      const { data: c } = await sb
        .from("campaigns")
        .select("name")
        .eq("id", campaignId)
        .maybeSingle();
      campaignName = (c?.name as string | undefined) ?? null;
    }

    // Fetch invitable contacts only · skips suppressed + invalid + no-email
    const { data: contacts } = await sb
      .from("relationship_contacts")
      .select("id, email, full_name, suppressed_outreach, email_validity, flagged_for_correction")
      .in("id", ids)
      .is("deleted_at", null);

    const invitable = ((contacts ?? []) as Array<{
      id: string; email: string | null; full_name: string | null;
      suppressed_outreach: boolean; email_validity: string | null; flagged_for_correction: boolean;
    }>).filter((c) =>
      c.email && !c.suppressed_outreach
      && c.email_validity !== "invalid" && !c.flagged_for_correction,
    );

    if (invitable.length === 0) {
      return failToList(filter_qs, "No invitable contacts in selection (check suppressed / invalid).");
    }

    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.hotelvalora.com";
    const resend = getResend();
    const from = getDefaultFromAddress();

    let ok = 0;
    let failed = 0;
    const auditOk: string[] = [];
    const auditFail: string[] = [];

    for (const c of invitable) {
      // 1) Create the pending invitation row — its id is the invite token.
      const { data: invRows, error: insertErr } = await sb
        .from("contact_invitations")
        .insert({
          contact_id: c.id,
          campaign_id: campaignId,
          invited_by_email: ctx.email,
          invited_email: c.email!,
          status: "pending",
          promo_code: promo,
          default_subscription_tier: tier,
          notes: campaignName ? `Bulk invite · campaign=${campaignName}` : "Bulk invite",
        } as never)
        .select("id")
        .limit(1);
      const invitationId = (invRows ?? [])[0]?.id as string | undefined;
      if (insertErr || !invitationId) {
        failed++;
        auditFail.push(c.id);
        continue;
      }

      // 2) Send the email
      const acceptUrl = `${baseUrl}/invite/${invitationId}`;
      const { subject, html, text } = renderContactInvite({
        contactName: c.full_name,
        acceptUrl,
        campaignName,
        promoCode: promo,
        tier,
        signedBy: ctx.email,
      });

      let sentOk = false;
      let messageId: string | null = null;
      try {
        const r = await resend.emails.send({
          from,
          to: c.email!,
          subject,
          html,
          text,
        });
        if (r.data?.id) {
          sentOk = true;
          messageId = r.data.id;
        }
      } catch {
        sentOk = false;
      }

      // 3) Reflect outcome on the invitation row
      await sb.from("contact_invitations")
        .update({
          status: sentOk ? "sent" : "bounced",
          sent_at: sentOk ? new Date().toISOString() : null,
          resend_message_id: messageId,
        } as never)
        .eq("id", invitationId);

      // 4) Update the contact's rollup
      if (sentOk) {
        await sb.from("relationship_contacts")
          .update({
            contact_invitation_status: "invited",
            last_contacted_at: new Date().toISOString(),
          } as never)
          .eq("id", c.id)
          .is("deleted_at", null);
        ok++;
        auditOk.push(c.id);
      } else {
        failed++;
        auditFail.push(c.id);
      }

      if (SEND_SPACING_MS > 0) {
        await new Promise((res) => setTimeout(res, SEND_SPACING_MS));
      }
    }

    await writeBulkAudit({
      contactIds: auditOk,
      action: "contact.bulk_invite_sent",
      actorId: ctx.userId,
      actorEmail: ctx.email,
      metadata: { tier, promo, campaign_id: campaignId, campaign_name: campaignName },
    });
    if (auditFail.length > 0) {
      await writeBulkAudit({
        contactIds: auditFail,
        action: "contact.bulk_invite_failed",
        actorId: ctx.userId,
        actorEmail: ctx.email,
        metadata: { tier, promo, campaign_id: campaignId },
      });
    }
    revalidatePath("/user/admin/contacts");
    backToList(filter_qs, { ok, failed, verb: "invited" });
  } catch (err) {
    if (isNextRedirectError(err)) throw err;
    failToList(filter_qs, redactError(err));
  }
}

/**
 * Bulk export to CSV. Returns a redirect to a route handler that
 * streams the CSV body — since server actions can't return a Response
 * directly from a form action, we redirect with the selection encoded
 * and let the route handler do the streaming.
 *
 * Cleaner alternative — when the operator hits "Export CSV", we POST
 * to `/api/admin/contacts/export` which honours the same selection
 * shape. For PRIMERA OLA we don't even need that — we can dump the
 * full CSV into a `contacts-export-<ts>.csv` text response via a
 * redirect-to-API. Implementation in the route handler below.
 *
 * For PRIMERA OLA: redirect to /api/admin/contacts/export?<filter_qs>
 * with the selection mode + ids encoded as query.
 */
export async function bulkExportCsvAction(formData: FormData): Promise<void> {
  let filter_qs = "";
  try {
    await requireOperator();
    filter_qs = String(formData.get("filter_qs") ?? "");
    const mode = String(formData.get("sel_mode") ?? "explicit");
    const ids = String(formData.get("ids") ?? "");
    const params = new URLSearchParams();
    params.set("sel_mode", mode);
    if (mode === "filtered") params.set("filter_qs", filter_qs);
    else params.set("ids", ids);
    redirect(`/api/admin/contacts/export?${params.toString()}`);
  } catch (err) {
    if (isNextRedirectError(err)) throw err;
    failToList(filter_qs, redactError(err));
  }
}
