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


// ─── Manual contact creation ──────────────────────────────────────────

/** 8 canonical buckets · same set the chip filter uses. */
const CONTACT_CATEGORY_V2_VALUES = [
  "Principal",
  "Broker",
  "Lender",
  "Operator",
  "Developer",
  "Hotel Supply",
  "IA Supply",
  "Uncategorized",
] as const;

const createSchema = z.object({
  full_name: z.string().trim().min(1, "Full name required").max(200),
  email: z.string().trim().email("Invalid email").max(320),
  company_name: z.string().trim().max(300).nullish().or(z.literal("")),
  contact_category_v2: z.enum(CONTACT_CATEGORY_V2_VALUES).default("Uncategorized"),
  title: z.string().trim().max(200).nullish().or(z.literal("")),
  phone: z.string().trim().max(80).nullish().or(z.literal("")),
  linkedin: z.string().trim().max(500).nullish().or(z.literal("")),
  notes_consolidated: z.string().trim().max(10_000).nullish().or(z.literal("")),
});

/** Detect Next.js redirect throws so we re-throw past the catch. */
function isNextRedirectError(err: unknown): boolean {
  return (
    typeof err === "object" &&
    err !== null &&
    "digest" in err &&
    typeof (err as { digest?: unknown }).digest === "string" &&
    (err as { digest: string }).digest.startsWith("NEXT_REDIRECT")
  );
}

/** 16-char lowercase hex · matches the historical Master master_id shape. */
function generateMasterId(): string {
  const bytes = new Uint8Array(8);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

/**
 * Create a new contact manually from the admin/contacts surface.
 *
 * Required: full_name + email. Everything else optional. Defaults:
 *   master_id              = random 16-char hex
 *   bucket                 = 'active'
 *   relationship_band      = 'cold'
 *   email_validity         = 'uncertain' (upgrades on first Gmail signal)
 *   contact_invitation_status = 'never_invited'
 *   suppressed_outreach    = false
 *   contact_category_v2    = 'Uncategorized' (operator can edit later)
 *
 * Idempotency: refuses to create if a non-deleted row already has the
 * same email_lower.
 *
 * Company linking is NOT performed here · company_name stored as text.
 * The next promote_to_supabase.py run reconciles against
 * relationship_companies if the operator chooses to push the new row
 * through the canonical pipeline.
 *
 * On success: redirects to ?selected=<new-id>&created=1 so the operator
 * lands on the view drawer of the freshly-created contact.
 */
export async function createContactAction(formData: FormData): Promise<void> {
  let filter_qs = "";
  try {
    const ctx = await requireOperator();
    filter_qs = String(formData.get("filter_qs") ?? "");

    const parsed = createSchema.safeParse({
      full_name: formData.get("full_name"),
      email: formData.get("email"),
      company_name: formData.get("company_name"),
      contact_category_v2: formData.get("contact_category_v2") || "Uncategorized",
      title: formData.get("title"),
      phone: formData.get("phone"),
      linkedin: formData.get("linkedin"),
      notes_consolidated: formData.get("notes_consolidated"),
    });
    if (!parsed.success) {
      const msg = parsed.error.issues.map((i) => i.message).join(" · ");
      const params = new URLSearchParams(filter_qs);
      params.set("mode", "create");
      params.set("error", msg);
      redirect(`/user/admin/contacts?${params.toString()}`);
    }
    const v = parsed.data;
    const emailLower = v.email.toLowerCase();

    const sb = getSupabaseAdmin();

    const { data: existing } = await sb
      .from("relationship_contacts")
      .select("id")
      .eq("email_lower", emailLower)
      .is("deleted_at", null)
      .limit(1)
      .maybeSingle();
    if (existing) {
      const params = new URLSearchParams(filter_qs);
      params.set("mode", "create");
      params.set("error", `A contact with email ${v.email} already exists.`);
      redirect(`/user/admin/contacts?${params.toString()}`);
    }

    const masterId = generateMasterId();
    const insert = {
      master_id: masterId,
      full_name: v.full_name,
      email: v.email,
      company_name: v.company_name || null,
      title: v.title || null,
      phone: v.phone || null,
      linkedin: v.linkedin || null,
      notes_consolidated: v.notes_consolidated || null,
      bucket: "active",
      relationship_band: "cold",
      email_validity: "uncertain",
      contact_invitation_status: "never_invited",
      suppressed_outreach: false,
      // Operator picks the canonical bucket directly · investor_type
      // (legacy raw field) is left null · classifier v2 / promote
      // pipeline can backfill it later if needed.
      contact_category_v2: v.contact_category_v2,
      source_file: "admin_ui_manual_entry",
    };

    const { data: inserted, error } = await sb
      .from("relationship_contacts")
      .insert(insert as never)
      .select("id")
      .single();
    if (error || !inserted) {
      const params = new URLSearchParams(filter_qs);
      params.set("mode", "create");
      params.set("error", redactError(error ?? "Insert failed"));
      redirect(`/user/admin/contacts?${params.toString()}`);
    }

    const contactId = (inserted as { id: string }).id;

    await sb.from("activity_log").insert({
      actor_id: ctx.userId,
      entity_id: contactId,
      entity_type: "relationship_contact",
      action: "contact.created_manually",
      metadata: { actor_email: ctx.email, master_id: masterId, email: emailLower },
    } as never);

    revalidatePath("/user/admin/contacts");
    const params = new URLSearchParams(filter_qs);
    params.set("selected", contactId);
    params.set("created", "1");
    redirect(`/user/admin/contacts?${params.toString()}`);
  } catch (err) {
    if (isNextRedirectError(err)) throw err;
    const params = new URLSearchParams(filter_qs);
    params.set("mode", "create");
    params.set("error", redactError(err));
    redirect(`/user/admin/contacts?${params.toString()}`);
  }
}
