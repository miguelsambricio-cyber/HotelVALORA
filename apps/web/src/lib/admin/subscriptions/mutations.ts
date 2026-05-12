"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { requireOperator } from "@/lib/security/operator-guard";
import { redactError } from "@/lib/security/redact";

/**
 * Phase 2.D.4 · Subscriptions admin mutations.
 *
 * Operators can assign tiers manually (Comped + manual workflows), set
 * expirations, expire/cancel/restore subs, and attribute to campaigns.
 * Stripe-managed subs are not modified by these actions — operators
 * should use Stripe Dashboard for any stripe_subscription_id-backed
 * row. Manual rows have NULL stripe_subscription_id.
 */

export type ActionResult = { ok: true; id?: string } | { ok: false; error: string };

const VALID_TIERS = ["free","pro","premium","team","enterprise","top_promote","comped"] as const;
const VALID_STATUSES = ["active","trialing","past_due","canceled","expired","incomplete"] as const;

const assignSchema = z.object({
  user_id: z.string().uuid(),
  tier: z.enum(VALID_TIERS),
  status: z.enum(VALID_STATUSES).default("active"),
  expires_at: z.string().nullable().optional(),
  notes: z.string().trim().max(2000).optional().or(z.literal("")),
  source_campaign_id: z.string().uuid().nullable().optional(),
});

const updateSchema = z.object({
  tier: z.enum(VALID_TIERS).optional(),
  status: z.enum(VALID_STATUSES).optional(),
  expires_at: z.string().nullable().optional(),
  notes: z.string().trim().max(2000).optional().or(z.literal("")),
  cancel_at_period_end: z.coerce.boolean().optional(),
  source_campaign_id: z.string().uuid().nullable().optional(),
});

async function writeAudit(params: {
  subscriptionId: string;
  action: string;
  actorId: string | null;
  actorEmail: string | null;
  metadata: Record<string, unknown>;
}): Promise<void> {
  const sb = getSupabaseAdmin();
  const { error } = await sb.from("activity_log").insert({
    actor_id: params.actorId,
    entity_id: params.subscriptionId,
    entity_type: "subscription",
    action: params.action,
    metadata: { ...params.metadata, actor_email: params.actorEmail },
  });
  if (error) console.error("[subscriptions/mutations] audit write failed:", error.message);
}

function parseDate(raw: FormDataEntryValue | null): string | null {
  if (!raw) return null;
  const s = String(raw).trim();
  if (!s) return null;
  // Accept YYYY-MM-DD from <input type=date> · expand to UTC midnight ISO
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return `${s}T00:00:00.000Z`;
  // Fallback — assume already ISO
  return s;
}

/** Assign a new subscription to a user (manual / Comped workflow). */
export async function assignSubscriptionAction(formData: FormData): Promise<void> {
  try {
    const ctx = await requireOperator();
    const parsed = assignSchema.safeParse({
      user_id: String(formData.get("user_id") ?? ""),
      tier: String(formData.get("tier") ?? "free"),
      status: String(formData.get("status") ?? "active"),
      expires_at: parseDate(formData.get("expires_at")),
      notes: String(formData.get("notes") ?? ""),
      source_campaign_id: (formData.get("source_campaign_id") && String(formData.get("source_campaign_id")) !== "") ? String(formData.get("source_campaign_id")) : null,
    });
    if (!parsed.success) {
      const msg = parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join(" · ");
      redirect(`/user/admin/subscriptions?form_error=${encodeURIComponent(msg)}`);
    }

    const sb = getSupabaseAdmin();
    const insert = {
      user_id: parsed.data.user_id,
      tier: parsed.data.tier,
      status: parsed.data.status,
      expires_at: parsed.data.expires_at ?? null,
      notes: parsed.data.notes || null,
      source_campaign_id: parsed.data.source_campaign_id ?? null,
      assigned_by_email: ctx.email,
      cancel_at_period_end: false,
    };
    const { data, error } = await sb
      .from("subscriptions")
      .insert(insert as never)
      .select("id")
      .maybeSingle();
    if (error || !data) {
      redirect(`/user/admin/subscriptions?form_error=${encodeURIComponent(redactError(error ?? "insert failed"))}`);
    }
    const id = (data as { id: string }).id;
    await writeAudit({
      subscriptionId: id,
      action: "subscription.assigned",
      actorId: ctx.userId,
      actorEmail: ctx.email,
      metadata: { ...insert },
    });
    revalidatePath("/user/admin/subscriptions");
    revalidatePath("/user/admin/users");
    redirect(`/user/admin/subscriptions?selected=${id}&saved=1`);
  } catch (err) {
    if (err instanceof Error && err.message.startsWith("NEXT_REDIRECT")) throw err;
    redirect(`/user/admin/subscriptions?form_error=${encodeURIComponent(redactError(err))}`);
  }
}

/** Patch fields on an existing subscription (tier change, status flip, etc). */
export async function updateSubscriptionAction(formData: FormData): Promise<void> {
  const subscriptionId = String(formData.get("subscriptionId") ?? "");
  try {
    const ctx = await requireOperator();
    const raw = {
      tier: formData.get("tier") || undefined,
      status: formData.get("status") || undefined,
      expires_at: parseDate(formData.get("expires_at")),
      notes: formData.get("notes") === null ? undefined : String(formData.get("notes")),
      cancel_at_period_end: formData.get("cancel_at_period_end") === "1" ? true : undefined,
      source_campaign_id: (formData.get("source_campaign_id") && String(formData.get("source_campaign_id")) !== "") ? String(formData.get("source_campaign_id")) : null,
    };
    const parsed = updateSchema.safeParse({
      ...(raw.tier ? { tier: String(raw.tier) } : {}),
      ...(raw.status ? { status: String(raw.status) } : {}),
      expires_at: raw.expires_at,
      ...(raw.notes !== undefined ? { notes: raw.notes } : {}),
      ...(raw.cancel_at_period_end !== undefined ? { cancel_at_period_end: raw.cancel_at_period_end } : {}),
      source_campaign_id: raw.source_campaign_id,
    });
    if (!parsed.success) {
      redirect(`/user/admin/subscriptions?selected=${subscriptionId}&form_error=${encodeURIComponent(parsed.error.issues.map((i) => i.message).join(" · "))}`);
    }

    const sb = getSupabaseAdmin();
    const patch: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(parsed.data)) {
      if (v === undefined) continue;
      if (typeof v === "string" && v === "") {
        patch[k] = null;
      } else {
        patch[k] = v;
      }
    }

    const { error } = await sb
      .from("subscriptions")
      .update(patch as never)
      .eq("id", subscriptionId);
    if (error) {
      redirect(`/user/admin/subscriptions?selected=${subscriptionId}&form_error=${encodeURIComponent(redactError(error))}`);
    }
    await writeAudit({
      subscriptionId,
      action: "subscription.updated",
      actorId: ctx.userId,
      actorEmail: ctx.email,
      metadata: { patch },
    });
    revalidatePath("/user/admin/subscriptions");
    revalidatePath("/user/admin/users");
    redirect(`/user/admin/subscriptions?selected=${subscriptionId}&saved=1`);
  } catch (err) {
    if (err instanceof Error && err.message.startsWith("NEXT_REDIRECT")) throw err;
    redirect(`/user/admin/subscriptions?selected=${subscriptionId}&form_error=${encodeURIComponent(redactError(err))}`);
  }
}

/** Quick "Expire now" action — sets status='expired' + expires_at=now(). */
export async function expireSubscriptionAction(formData: FormData): Promise<void> {
  const subscriptionId = String(formData.get("subscriptionId") ?? "");
  try {
    const ctx = await requireOperator();
    const sb = getSupabaseAdmin();
    const now = new Date().toISOString();
    const { error } = await sb
      .from("subscriptions")
      .update({ status: "expired", expires_at: now } as never)
      .eq("id", subscriptionId);
    if (error) {
      redirect(`/user/admin/subscriptions?selected=${subscriptionId}&form_error=${encodeURIComponent(redactError(error))}`);
    }
    await writeAudit({
      subscriptionId,
      action: "subscription.expired",
      actorId: ctx.userId,
      actorEmail: ctx.email,
      metadata: { expired_at: now },
    });
    revalidatePath("/user/admin/subscriptions");
    revalidatePath("/user/admin/users");
    redirect(`/user/admin/subscriptions?selected=${subscriptionId}&saved=1`);
  } catch (err) {
    if (err instanceof Error && err.message.startsWith("NEXT_REDIRECT")) throw err;
    redirect(`/user/admin/subscriptions?selected=${subscriptionId}&form_error=${encodeURIComponent(redactError(err))}`);
  }
}
