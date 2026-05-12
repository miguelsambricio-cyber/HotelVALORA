"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { requireOperator } from "@/lib/security/operator-guard";
import { redactError } from "@/lib/security/redact";

/**
 * Phase 2.D.2 · Contact mutation workflows (PRIMERA OLA).
 *
 * The contacts surface stops being read-only. The five actions here
 * cover the operational growth basics — edit, mark invalid, manage
 * operator tags, assign relationship owner, update relationship band.
 *
 * Discipline:
 *   - Every action gated by `requireOperator()` (fail-closed allow-list).
 *   - Every write writes one row to `public.activity_log` so the audit
 *     trail is always preserved (entity_type='relationship_contact',
 *     action='contact.<kind>', metadata = { before, after, diff }).
 *   - Soft-delete invariant: every UPDATE filters by `deleted_at IS NULL`.
 *   - Errors returned to the client go through `redactError()` so we
 *     never leak operator email / contact PII in production toasts.
 *
 * SEGUNDA OLA (next push) adds merge-duplicates, hard-edit of email,
 * delete (soft), and add-manually flows. Bulk actions land in 2.D.3.
 */

export type ActionResult = { ok: true } | { ok: false; error: string };

// ─── Schemas ──────────────────────────────────────────────────────────

const VALID_BANDS = ["active", "warm", "strategic", "cold", "dormant", "invalid"] as const;

const updateSchema = z.object({
  full_name: z.string().trim().max(200).nullish(),
  email: z.string().trim().email().max(320).nullish().or(z.literal("")),
  phone: z.string().trim().max(80).nullish().or(z.literal("")),
  linkedin: z.string().trim().max(500).nullish().or(z.literal("")),
  title: z.string().trim().max(200).nullish().or(z.literal("")),
  role: z.string().trim().max(200).nullish().or(z.literal("")),
  company_name: z.string().trim().max(300).nullish().or(z.literal("")),
  investor_type: z.string().trim().max(120).nullish().or(z.literal("")),
  collaboration_potential_score: z.coerce.number().int().min(0).max(100).optional(),
  notes_consolidated: z.string().trim().max(10000).nullish().or(z.literal("")),
});

const tagSchema = z.string().trim().min(1).max(80).regex(
  /^[A-Za-z0-9][A-Za-z0-9\-_\s]*$/,
  "tags can only contain letters, numbers, dash, underscore, space",
);

const bandSchema = z.enum(VALID_BANDS);

const ownerSchema = z.string().trim().email().max(320).or(z.literal("")).nullable();

// ─── Helpers ──────────────────────────────────────────────────────────

const EDITABLE_FIELDS = [
  "full_name", "email", "phone", "linkedin", "title", "role",
  "company_name", "investor_type", "collaboration_potential_score",
  "notes_consolidated",
] as const;
type EditableField = (typeof EDITABLE_FIELDS)[number];

function diffPatches(
  before: Record<string, unknown>,
  patch: Record<string, unknown>,
): { changed: Record<string, { from: unknown; to: unknown }>; nextRow: Record<string, unknown> } {
  const changed: Record<string, { from: unknown; to: unknown }> = {};
  const nextRow: Record<string, unknown> = {};
  for (const k of Object.keys(patch)) {
    const from = before[k] ?? null;
    let to = patch[k];
    if (to === "") to = null; // normalise empty strings to NULL
    if (to === undefined) continue;
    if (from !== to) {
      changed[k] = { from, to };
      nextRow[k] = to;
    }
  }
  return { changed, nextRow };
}

async function writeAudit(params: {
  contactId: string;
  action: string;
  actorId: string | null;
  actorEmail: string | null;
  metadata: Record<string, unknown>;
}): Promise<void> {
  const sb = getSupabaseAdmin();
  const { error } = await sb.from("activity_log").insert({
    actor_id: params.actorId,
    entity_id: params.contactId,
    entity_type: "relationship_contact",
    action: params.action,
    metadata: {
      ...params.metadata,
      actor_email: params.actorEmail,
    },
  });
  if (error) {
    // Audit write failure is logged but does not roll back the mutation
    // (the row already changed). Operator surface stays consistent;
    // ops can reconcile via the row-level updated_at if needed.
    console.error("[contacts/mutations] audit write failed:", error.message);
  }
}

async function loadContactSnapshot(contactId: string): Promise<Record<string, unknown> | null> {
  const sb = getSupabaseAdmin();
  const { data, error } = await sb
    .from("relationship_contacts")
    .select(
      "id, full_name, email, phone, linkedin, title, role, company_name, " +
      "investor_type, collaboration_potential_score, notes_consolidated, " +
      "relationship_band, email_validity, flagged_for_correction, bucket, " +
      "contact_invitation_status, relationship_owner_email, tags, deleted_at",
    )
    .eq("id", contactId)
    .is("deleted_at", null)
    .maybeSingle();
  if (error || !data) {
    if (error) console.error("[contacts/mutations] snapshot fetch failed:", error.message);
    return null;
  }
  return data as unknown as Record<string, unknown>;
}

function bumpCachePaths(contactId: string): void {
  revalidatePath("/user/admin/contacts");
  revalidatePath(`/user/admin/contacts?selected=${contactId}`);
}

// ─── Actions ──────────────────────────────────────────────────────────

/**
 * Update editable contact fields. Empty-string patch values are
 * normalised to NULL. Only fields in `EDITABLE_FIELDS` are accepted.
 */
export async function updateContactAction(
  contactId: string,
  patch: Partial<Record<EditableField, string | number | null>>,
): Promise<ActionResult> {
  try {
    const ctx = await requireOperator();
    const parsed = updateSchema.safeParse(patch);
    if (!parsed.success) {
      return { ok: false, error: parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join(" · ") };
    }
    const before = await loadContactSnapshot(contactId);
    if (!before) return { ok: false, error: "Contact not found." };

    const { changed, nextRow } = diffPatches(before, parsed.data);
    if (Object.keys(changed).length === 0) return { ok: true };

    const sb = getSupabaseAdmin();
    // `nextRow` is a generic Record built from the diff helper. zod
    // already validated each value against the column constraint, so
    // the cast through `never` is safe — the type narrowing supabase-js
    // wants is structural and the runtime check is upstream.
    const { error } = await sb
      .from("relationship_contacts")
      .update(nextRow as never)
      .eq("id", contactId)
      .is("deleted_at", null);
    if (error) return { ok: false, error: redactError(error) };

    await writeAudit({
      contactId,
      action: "contact.updated",
      actorId: ctx.userId,
      actorEmail: ctx.email,
      metadata: { diff: changed },
    });

    bumpCachePaths(contactId);
    return { ok: true };
  } catch (err) {
    return { ok: false, error: redactError(err) };
  }
}

/**
 * Mark a contact's email as invalid. Sets `email_validity='invalid'`,
 * `flagged_for_correction=true`, `bucket='DATASITE-CORREGIR'`, and
 * forces the relationship band to `'invalid'`. Captures an optional
 * reason in the audit metadata.
 */
export async function markContactInvalidAction(
  contactId: string,
  reason?: string,
): Promise<ActionResult> {
  try {
    const ctx = await requireOperator();
    const before = await loadContactSnapshot(contactId);
    if (!before) return { ok: false, error: "Contact not found." };

    const sb = getSupabaseAdmin();
    const { error } = await sb
      .from("relationship_contacts")
      .update({
        email_validity: "invalid",
        flagged_for_correction: true,
        bucket: "DATASITE-CORREGIR",
        relationship_band: "invalid",
      })
      .eq("id", contactId)
      .is("deleted_at", null);
    if (error) return { ok: false, error: redactError(error) };

    await writeAudit({
      contactId,
      action: "contact.invalid_marked",
      actorId: ctx.userId,
      actorEmail: ctx.email,
      metadata: {
        reason: reason?.trim().slice(0, 500) ?? null,
        before: {
          email_validity: before.email_validity,
          flagged_for_correction: before.flagged_for_correction,
          bucket: before.bucket,
          relationship_band: before.relationship_band,
        },
      },
    });

    bumpCachePaths(contactId);
    return { ok: true };
  } catch (err) {
    return { ok: false, error: redactError(err) };
  }
}

/**
 * Append a tag to the operator-controlled `tags` array. Idempotent —
 * no-op if the tag is already present. Tags are normalised to
 * lowercase to avoid duplicate-with-case fragmentation.
 */
export async function addContactTagAction(
  contactId: string,
  rawTag: string,
): Promise<ActionResult> {
  try {
    const ctx = await requireOperator();
    const parsed = tagSchema.safeParse(rawTag);
    if (!parsed.success) {
      return { ok: false, error: parsed.error.issues.map((i) => i.message).join(" · ") };
    }
    const tag = parsed.data.toLowerCase();

    const before = await loadContactSnapshot(contactId);
    if (!before) return { ok: false, error: "Contact not found." };
    const existing = (before.tags as string[] | null) ?? [];
    if (existing.includes(tag)) return { ok: true };

    const next = [...existing, tag];
    const sb = getSupabaseAdmin();
    const { error } = await sb
      .from("relationship_contacts")
      .update({ tags: next })
      .eq("id", contactId)
      .is("deleted_at", null);
    if (error) return { ok: false, error: redactError(error) };

    await writeAudit({
      contactId,
      action: "contact.tag_added",
      actorId: ctx.userId,
      actorEmail: ctx.email,
      metadata: { tag, tags_after: next },
    });

    bumpCachePaths(contactId);
    return { ok: true };
  } catch (err) {
    return { ok: false, error: redactError(err) };
  }
}

export async function removeContactTagAction(
  contactId: string,
  rawTag: string,
): Promise<ActionResult> {
  try {
    const ctx = await requireOperator();
    const tag = rawTag.trim().toLowerCase();
    if (!tag) return { ok: false, error: "Empty tag." };

    const before = await loadContactSnapshot(contactId);
    if (!before) return { ok: false, error: "Contact not found." };
    const existing = (before.tags as string[] | null) ?? [];
    if (!existing.includes(tag)) return { ok: true };

    const next = existing.filter((t) => t !== tag);
    const sb = getSupabaseAdmin();
    const { error } = await sb
      .from("relationship_contacts")
      .update({ tags: next })
      .eq("id", contactId)
      .is("deleted_at", null);
    if (error) return { ok: false, error: redactError(error) };

    await writeAudit({
      contactId,
      action: "contact.tag_removed",
      actorId: ctx.userId,
      actorEmail: ctx.email,
      metadata: { tag, tags_after: next },
    });

    bumpCachePaths(contactId);
    return { ok: true };
  } catch (err) {
    return { ok: false, error: redactError(err) };
  }
}

/**
 * Assign (or clear) the relationship owner email. Pass `null` or empty
 * string to clear. Stored in `relationship_owner_email`.
 */
export async function assignRelationshipOwnerAction(
  contactId: string,
  rawEmail: string | null,
): Promise<ActionResult> {
  try {
    const ctx = await requireOperator();
    const parsed = ownerSchema.safeParse(rawEmail ?? "");
    if (!parsed.success) {
      return { ok: false, error: "Invalid email." };
    }
    const email = parsed.data && parsed.data !== "" ? parsed.data.toLowerCase() : null;

    const before = await loadContactSnapshot(contactId);
    if (!before) return { ok: false, error: "Contact not found." };
    if (before.relationship_owner_email === email) return { ok: true };

    const sb = getSupabaseAdmin();
    const { error } = await sb
      .from("relationship_contacts")
      .update({ relationship_owner_email: email })
      .eq("id", contactId)
      .is("deleted_at", null);
    if (error) return { ok: false, error: redactError(error) };

    await writeAudit({
      contactId,
      action: "contact.owner_assigned",
      actorId: ctx.userId,
      actorEmail: ctx.email,
      metadata: { from: before.relationship_owner_email, to: email },
    });

    bumpCachePaths(contactId);
    return { ok: true };
  } catch (err) {
    return { ok: false, error: redactError(err) };
  }
}

/**
 * Update the relationship band (active · warm · strategic · cold ·
 * dormant · invalid). Note: the band is also derived from Gmail + Datasite
 * signals by the Python ingester. Operator overrides here win until the
 * next ingest cycle.
 */
// ─── Form-wrapper actions ─────────────────────────────────────────────
//
// Server-action form handlers for the edit drawer. They unpack FormData
// into the typed action arg shapes, run the typed action, and redirect
// back to the drawer (view mode) with a saved=1 / error=<msg> flag so
// the page can surface the outcome without a client store.

function exitToView(contactId: string, result: ActionResult): never {
  if (result.ok) {
    redirect(`/user/admin/contacts?selected=${contactId}&saved=1`);
  }
  redirect(
    `/user/admin/contacts?selected=${contactId}&mode=edit&error=${encodeURIComponent(result.error)}`,
  );
}

export async function updateContactFromForm(formData: FormData): Promise<void> {
  const contactId = String(formData.get("contactId") ?? "");
  const patch: Record<string, string | number | null> = {};
  for (const field of EDITABLE_FIELDS) {
    const v = formData.get(field);
    if (v === null) continue;
    if (field === "collaboration_potential_score") {
      const n = Number.parseInt(String(v), 10);
      if (!Number.isNaN(n)) patch[field] = n;
    } else {
      patch[field] = String(v);
    }
  }
  const result = await updateContactAction(contactId, patch as never);
  exitToView(contactId, result);
}

export async function markInvalidFromForm(formData: FormData): Promise<void> {
  const contactId = String(formData.get("contactId") ?? "");
  const reason = formData.get("reason") ? String(formData.get("reason")) : undefined;
  const result = await markContactInvalidAction(contactId, reason);
  exitToView(contactId, result);
}

export async function addTagFromForm(formData: FormData): Promise<void> {
  const contactId = String(formData.get("contactId") ?? "");
  const tag = String(formData.get("tag") ?? "");
  const result = await addContactTagAction(contactId, tag);
  // Stay in view mode — tag chips re-render with the new value
  if (result.ok) {
    redirect(`/user/admin/contacts?selected=${contactId}`);
  }
  redirect(
    `/user/admin/contacts?selected=${contactId}&error=${encodeURIComponent(result.error)}`,
  );
}

export async function removeTagFromForm(formData: FormData): Promise<void> {
  const contactId = String(formData.get("contactId") ?? "");
  const tag = String(formData.get("tag") ?? "");
  const result = await removeContactTagAction(contactId, tag);
  if (result.ok) {
    redirect(`/user/admin/contacts?selected=${contactId}`);
  }
  redirect(
    `/user/admin/contacts?selected=${contactId}&error=${encodeURIComponent(result.error)}`,
  );
}

export async function assignOwnerFromForm(formData: FormData): Promise<void> {
  const contactId = String(formData.get("contactId") ?? "");
  const email = String(formData.get("relationship_owner_email") ?? "").trim();
  const result = await assignRelationshipOwnerAction(contactId, email === "" ? null : email);
  exitToView(contactId, result);
}

export async function updateStatusFromForm(formData: FormData): Promise<void> {
  const contactId = String(formData.get("contactId") ?? "");
  const band = String(formData.get("relationship_band") ?? "");
  const result = await updateRelationshipStatusAction(contactId, band);
  exitToView(contactId, result);
}


export async function updateRelationshipStatusAction(
  contactId: string,
  rawBand: string,
): Promise<ActionResult> {
  try {
    const ctx = await requireOperator();
    const parsed = bandSchema.safeParse(rawBand);
    if (!parsed.success) {
      return { ok: false, error: `Band must be one of: ${VALID_BANDS.join(", ")}` };
    }
    const band = parsed.data;

    const before = await loadContactSnapshot(contactId);
    if (!before) return { ok: false, error: "Contact not found." };
    if (before.relationship_band === band) return { ok: true };

    const sb = getSupabaseAdmin();
    const { error } = await sb
      .from("relationship_contacts")
      .update({ relationship_band: band })
      .eq("id", contactId)
      .is("deleted_at", null);
    if (error) return { ok: false, error: redactError(error) };

    await writeAudit({
      contactId,
      action: "contact.status_updated",
      actorId: ctx.userId,
      actorEmail: ctx.email,
      metadata: { from: before.relationship_band, to: band },
    });

    bumpCachePaths(contactId);
    return { ok: true };
  } catch (err) {
    return { ok: false, error: redactError(err) };
  }
}
