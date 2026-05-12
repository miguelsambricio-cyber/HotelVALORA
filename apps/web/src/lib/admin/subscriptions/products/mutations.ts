"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { requireOperator } from "@/lib/security/operator-guard";
import { redactError } from "@/lib/security/redact";

/**
 * Phase 2.D.7 · Subscription product mutations.
 *
 * Operators create / edit / archive products from the visual surface.
 * Schema mirrors the read layer (subscription_products columns).
 * Features arrive as a single textarea — one "title|included" per line —
 * so the form stays mobile-keyboard-friendly. Server-side we parse to
 * jsonb.
 */

const VALID_VISIBILITY = ["visible", "hidden", "archived"] as const;
const VALID_THEMES = ["lime", "emerald", "amber", "rose", "slate", "forest"] as const;
const VALID_VAT = ["inclusive", "exclusive", "none"] as const;

const slugSchema = z.string().trim().min(2).max(80).regex(/^[a-z0-9][a-z0-9\-_]*$/, "lowercase, numbers, dash, underscore only");

const createSchema = z.object({
  slug: slugSchema,
  name: z.string().trim().min(2).max(120),
  subtitle: z.string().trim().max(200).or(z.literal("")).optional(),
  description: z.string().trim().max(2000).or(z.literal("")).optional(),
  currency: z.enum(["EUR", "USD", "GBP"]).default("EUR"),
  monthly_price: z.coerce.number().min(0).max(1_000_000).nullable().optional(),
  yearly_price: z.coerce.number().min(0).max(10_000_000).nullable().optional(),
  vat_display: z.enum(VALID_VAT).default("inclusive"),
  badge: z.string().trim().max(80).or(z.literal("")).optional(),
  cta_label: z.string().trim().min(2).max(80).default("Get started"),
  color_theme: z.enum(VALID_THEMES).default("lime"),
  display_order: z.coerce.number().int().min(0).max(10_000).default(100),
  visibility: z.enum(VALID_VISIBILITY).default("visible"),
  tier_enum: z.string().trim().max(40).or(z.literal("")).optional(),
});

const updateSchema = createSchema.partial();

/** Parse the textarea where each line is "title|included" or just "title". */
function parseFeatures(raw: string): Array<{ title: string; included: boolean }> {
  if (!raw) return [];
  const lines = raw.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  return lines.map((line) => {
    const parts = line.split("|");
    const title = parts[0].trim();
    const includedRaw = (parts[1] ?? "true").trim().toLowerCase();
    const included = !["false", "0", "no", "off"].includes(includedRaw);
    return { title, included };
  });
}

async function writeAudit(params: {
  productId: string;
  action: string;
  actorId: string | null;
  actorEmail: string | null;
  metadata: Record<string, unknown>;
}): Promise<void> {
  const sb = getSupabaseAdmin();
  const { error } = await sb.from("activity_log").insert({
    actor_id: params.actorId,
    entity_id: params.productId,
    entity_type: "subscription_product",
    action: params.action,
    metadata: { ...params.metadata, actor_email: params.actorEmail },
  });
  if (error) console.error("[products/mutations] audit write failed:", error.message);
}

function backToProducts(productId: string | null, params: Record<string, string>): never {
  const qs = new URLSearchParams(params);
  if (productId) qs.set("selected", productId);
  redirect(`/user/admin/subscriptions?${qs.toString()}`);
}

export async function createProductAction(formData: FormData): Promise<void> {
  try {
    const ctx = await requireOperator();
    const parsed = createSchema.safeParse({
      slug: formData.get("slug") ?? "",
      name: formData.get("name") ?? "",
      subtitle: formData.get("subtitle") ?? "",
      description: formData.get("description") ?? "",
      currency: formData.get("currency") ?? "EUR",
      monthly_price: formData.get("monthly_price") === null || formData.get("monthly_price") === ""
        ? null : formData.get("monthly_price"),
      yearly_price: formData.get("yearly_price") === null || formData.get("yearly_price") === ""
        ? null : formData.get("yearly_price"),
      vat_display: formData.get("vat_display") ?? "inclusive",
      badge: formData.get("badge") ?? "",
      cta_label: formData.get("cta_label") || "Get started",
      color_theme: formData.get("color_theme") ?? "lime",
      display_order: formData.get("display_order") || 100,
      visibility: formData.get("visibility") ?? "visible",
      tier_enum: formData.get("tier_enum") ?? "",
    });
    if (!parsed.success) {
      const msg = parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join(" · ");
      backToProducts(null, { form_error: msg });
    }
    const data = parsed.data;
    const features = parseFeatures(String(formData.get("features") ?? ""));

    const insert = {
      slug: data.slug,
      name: data.name,
      subtitle: data.subtitle || null,
      description: data.description || null,
      currency: data.currency,
      monthly_price: data.monthly_price ?? null,
      yearly_price: data.yearly_price ?? null,
      vat_display: data.vat_display,
      badge: data.badge || null,
      cta_label: data.cta_label,
      color_theme: data.color_theme,
      features,
      display_order: data.display_order,
      visibility: data.visibility,
      tier_enum: data.tier_enum || null,
      created_by_email: ctx.email,
    };

    const sb = getSupabaseAdmin();
    const { data: row, error } = await sb
      .from("subscription_products")
      .insert(insert as never)
      .select("id")
      .maybeSingle();
    if (error || !row) backToProducts(null, { form_error: redactError(error ?? "insert failed") });
    const productId = (row as { id: string }).id;

    await writeAudit({
      productId,
      action: "product.created",
      actorId: ctx.userId,
      actorEmail: ctx.email,
      metadata: { ...insert, features_count: features.length },
    });
    revalidatePath("/user/admin/subscriptions");
    backToProducts(productId, { saved: "1" });
  } catch (err) {
    if (err instanceof Error && err.message.startsWith("NEXT_REDIRECT")) throw err;
    backToProducts(null, { form_error: redactError(err) });
  }
}

export async function updateProductAction(formData: FormData): Promise<void> {
  const productId = String(formData.get("productId") ?? "");
  try {
    const ctx = await requireOperator();
    const patch: Record<string, unknown> = {};

    const fields = ["slug", "name", "subtitle", "description", "currency",
      "monthly_price", "yearly_price", "vat_display", "badge", "cta_label",
      "color_theme", "display_order", "visibility", "tier_enum"] as const;
    for (const f of fields) {
      const v = formData.get(f);
      if (v === null) continue;
      if (typeof v === "string" && v === "") {
        if (["name", "slug", "currency", "vat_display", "color_theme", "visibility", "cta_label"].includes(f)) continue;
        patch[f] = null;
      } else if (f === "monthly_price" || f === "yearly_price" || f === "display_order") {
        const n = Number(v);
        patch[f] = Number.isFinite(n) ? n : null;
      } else {
        patch[f] = String(v);
      }
    }
    const parsed = updateSchema.safeParse(patch);
    if (!parsed.success) {
      const msg = parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join(" · ");
      backToProducts(productId, { form_error: msg });
    }
    // Features (always replace from form payload — operator may have removed entries)
    const featuresRaw = formData.get("features");
    if (featuresRaw !== null) {
      patch.features = parseFeatures(String(featuresRaw));
    }

    const sb = getSupabaseAdmin();
    const { error } = await sb
      .from("subscription_products")
      .update(patch as never)
      .eq("id", productId);
    if (error) backToProducts(productId, { form_error: redactError(error) });

    await writeAudit({
      productId,
      action: "product.updated",
      actorId: ctx.userId,
      actorEmail: ctx.email,
      metadata: { patch },
    });
    revalidatePath("/user/admin/subscriptions");
    backToProducts(productId, { saved: "1" });
  } catch (err) {
    if (err instanceof Error && err.message.startsWith("NEXT_REDIRECT")) throw err;
    backToProducts(productId, { form_error: redactError(err) });
  }
}

export async function setProductVisibilityAction(formData: FormData): Promise<void> {
  const productId = String(formData.get("productId") ?? "");
  const next = String(formData.get("visibility") ?? "");
  try {
    const ctx = await requireOperator();
    if (!VALID_VISIBILITY.includes(next as (typeof VALID_VISIBILITY)[number])) {
      backToProducts(productId, { form_error: "Invalid visibility value." });
    }
    const sb = getSupabaseAdmin();
    const { error } = await sb
      .from("subscription_products")
      .update({ visibility: next } as never)
      .eq("id", productId);
    if (error) backToProducts(productId, { form_error: redactError(error) });
    await writeAudit({
      productId,
      action: `product.visibility_${next}`,
      actorId: ctx.userId,
      actorEmail: ctx.email,
      metadata: { visibility: next },
    });
    revalidatePath("/user/admin/subscriptions");
    backToProducts(null, { saved: "1" });
  } catch (err) {
    if (err instanceof Error && err.message.startsWith("NEXT_REDIRECT")) throw err;
    backToProducts(productId, { form_error: redactError(err) });
  }
}
