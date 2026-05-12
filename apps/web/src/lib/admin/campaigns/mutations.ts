"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { requireOperator } from "@/lib/security/operator-guard";
import { redactError } from "@/lib/security/redact";

/**
 * Phase 2.D.4 · Campaigns CRUD via server actions. Same shape as the
 * contacts mutation layer: gated, audited, redirects on completion.
 */

export type ActionResult = { ok: true; id?: string } | { ok: false; error: string };

const VALID_STATUSES = ["draft", "running", "paused", "completed", "archived"] as const;
const VALID_KINDS = [
  "investor_outreach", "operator_onboarding", "beta_invite",
  "top_promote_rollout", "lender_campaign", "newsletter",
  "partnership", "custom",
] as const;

const createSchema = z.object({
  slug: z.string().trim().min(2).max(80).regex(/^[a-z0-9][a-z0-9\-_]*$/, "lowercase, numbers, dash, underscore"),
  name: z.string().trim().min(2).max(200),
  kind: z.enum(VALID_KINDS),
  status: z.enum(VALID_STATUSES).default("draft"),
  owner_email: z.string().trim().email().max(320).or(z.literal("")).optional(),
  description: z.string().trim().max(2000).or(z.literal("")).optional(),
  target_audience: z.string().trim().max(2000).or(z.literal("")).optional(),
  notes: z.string().trim().max(2000).or(z.literal("")).optional(),
  conversion_target: z.coerce.number().int().min(0).max(1_000_000).optional(),
  channel: z.string().trim().max(80).default("email"),
});

const updateSchema = createSchema.partial();

async function writeAudit(params: {
  campaignId: string;
  action: string;
  actorId: string | null;
  actorEmail: string | null;
  metadata: Record<string, unknown>;
}): Promise<void> {
  const sb = getSupabaseAdmin();
  const { error } = await sb.from("activity_log").insert({
    actor_id: params.actorId,
    entity_id: params.campaignId,
    entity_type: "campaign",
    action: params.action,
    metadata: { ...params.metadata, actor_email: params.actorEmail },
  });
  if (error) console.error("[campaigns/mutations] audit write failed:", error.message);
}

export async function createCampaignAction(formData: FormData): Promise<void> {
  try {
    const ctx = await requireOperator();
    const parsed = createSchema.safeParse({
      slug: formData.get("slug") ?? "",
      name: formData.get("name") ?? "",
      kind: formData.get("kind") ?? "custom",
      status: formData.get("status") ?? "draft",
      owner_email: formData.get("owner_email") ?? "",
      description: formData.get("description") ?? "",
      target_audience: formData.get("target_audience") ?? "",
      notes: formData.get("notes") ?? "",
      conversion_target: formData.get("conversion_target") || undefined,
      channel: formData.get("channel") ?? "email",
    });
    if (!parsed.success) {
      const msg = parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join(" · ");
      redirect(`/user/admin/campaigns?form_error=${encodeURIComponent(msg)}`);
    }
    const row = parsed.data;
    const sb = getSupabaseAdmin();
    const insert = {
      slug: row.slug,
      name: row.name,
      kind: row.kind,
      status: row.status,
      owner_email: row.owner_email || null,
      description: row.description || null,
      target_audience: row.target_audience || null,
      notes: row.notes || null,
      conversion_target: row.conversion_target ?? null,
      channel: row.channel,
      created_by_email: ctx.email,
    };
    const { data, error } = await sb
      .from("campaigns")
      .insert(insert as never)
      .select("id")
      .maybeSingle();
    if (error || !data) {
      redirect(`/user/admin/campaigns?form_error=${encodeURIComponent(redactError(error ?? "insert failed"))}`);
    }
    const created = (data as { id: string }).id;
    await writeAudit({
      campaignId: created,
      action: "campaign.created",
      actorId: ctx.userId,
      actorEmail: ctx.email,
      metadata: { ...insert },
    });
    revalidatePath("/user/admin/campaigns");
    redirect(`/user/admin/campaigns?selected=${created}&saved=1`);
  } catch (err) {
    // redirect() throws control-flow signals — only fail-redirect on real errors
    if (err instanceof Error && err.message.startsWith("NEXT_REDIRECT")) throw err;
    redirect(`/user/admin/campaigns?form_error=${encodeURIComponent(redactError(err))}`);
  }
}

export async function updateCampaignAction(formData: FormData): Promise<void> {
  const campaignId = String(formData.get("campaignId") ?? "");
  try {
    const ctx = await requireOperator();
    const patch: Record<string, unknown> = {};
    const raw = {
      slug: formData.get("slug"),
      name: formData.get("name"),
      kind: formData.get("kind"),
      status: formData.get("status"),
      owner_email: formData.get("owner_email"),
      description: formData.get("description"),
      target_audience: formData.get("target_audience"),
      notes: formData.get("notes"),
      conversion_target: formData.get("conversion_target") || undefined,
      channel: formData.get("channel"),
    };
    for (const [k, v] of Object.entries(raw)) {
      if (v === null || v === undefined) continue;
      if (typeof v === "string" && v.length === 0) {
        // Empty strings normalize to NULL for optional text fields
        if (k === "name" || k === "slug" || k === "kind" || k === "status" || k === "channel") continue;
        patch[k] = null;
      } else if (k === "conversion_target") {
        patch[k] = Number(v);
      } else {
        patch[k] = String(v);
      }
    }
    const parsed = updateSchema.safeParse(patch);
    if (!parsed.success) {
      redirect(`/user/admin/campaigns?selected=${campaignId}&form_error=${encodeURIComponent(parsed.error.issues.map((i) => i.message).join(" · "))}`);
    }

    const sb = getSupabaseAdmin();
    const { error } = await sb
      .from("campaigns")
      .update(patch as never)
      .eq("id", campaignId);
    if (error) {
      redirect(`/user/admin/campaigns?selected=${campaignId}&form_error=${encodeURIComponent(redactError(error))}`);
    }
    await writeAudit({
      campaignId,
      action: "campaign.updated",
      actorId: ctx.userId,
      actorEmail: ctx.email,
      metadata: { patch },
    });
    revalidatePath("/user/admin/campaigns");
    redirect(`/user/admin/campaigns?selected=${campaignId}&saved=1`);
  } catch (err) {
    if (err instanceof Error && err.message.startsWith("NEXT_REDIRECT")) throw err;
    redirect(`/user/admin/campaigns?selected=${campaignId}&form_error=${encodeURIComponent(redactError(err))}`);
  }
}

export async function archiveCampaignAction(formData: FormData): Promise<void> {
  const campaignId = String(formData.get("campaignId") ?? "");
  try {
    const ctx = await requireOperator();
    const sb = getSupabaseAdmin();
    const { error } = await sb
      .from("campaigns")
      .update({ status: "archived", archived_at: new Date().toISOString() } as never)
      .eq("id", campaignId);
    if (error) {
      redirect(`/user/admin/campaigns?selected=${campaignId}&form_error=${encodeURIComponent(redactError(error))}`);
    }
    await writeAudit({
      campaignId,
      action: "campaign.archived",
      actorId: ctx.userId,
      actorEmail: ctx.email,
      metadata: {},
    });
    revalidatePath("/user/admin/campaigns");
    redirect(`/user/admin/campaigns?saved=1`);
  } catch (err) {
    if (err instanceof Error && err.message.startsWith("NEXT_REDIRECT")) throw err;
    redirect(`/user/admin/campaigns?selected=${campaignId}&form_error=${encodeURIComponent(redactError(err))}`);
  }
}

export async function restoreCampaignAction(formData: FormData): Promise<void> {
  const campaignId = String(formData.get("campaignId") ?? "");
  try {
    const ctx = await requireOperator();
    const sb = getSupabaseAdmin();
    const { error } = await sb
      .from("campaigns")
      .update({ status: "draft", archived_at: null } as never)
      .eq("id", campaignId);
    if (error) {
      redirect(`/user/admin/campaigns?selected=${campaignId}&form_error=${encodeURIComponent(redactError(error))}`);
    }
    await writeAudit({
      campaignId,
      action: "campaign.restored",
      actorId: ctx.userId,
      actorEmail: ctx.email,
      metadata: {},
    });
    revalidatePath("/user/admin/campaigns");
    redirect(`/user/admin/campaigns?selected=${campaignId}&saved=1`);
  } catch (err) {
    if (err instanceof Error && err.message.startsWith("NEXT_REDIRECT")) throw err;
    redirect(`/user/admin/campaigns?selected=${campaignId}&form_error=${encodeURIComponent(redactError(err))}`);
  }
}
