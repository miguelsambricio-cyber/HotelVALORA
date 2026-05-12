import "server-only";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

/**
 * Phase 2.D.7 · Subscription products read layer.
 *
 * Operator-facing visual catalogue. Loads every product + a computed
 * metrics rollup (active users, MRR estimate, total subscriptions)
 * derived from `public.subscriptions` in a single fan-out.
 */

export type ProductVisibility = "visible" | "hidden" | "archived";
export type ProductColorTheme = "lime" | "emerald" | "amber" | "rose" | "slate" | "forest";
export type ProductVatDisplay = "inclusive" | "exclusive" | "none";

export interface ProductFeature {
  title: string;
  included: boolean;
}

export interface SubscriptionProduct {
  id: string;
  slug: string;
  name: string;
  subtitle: string | null;
  description: string | null;
  currency: string;
  monthly_price: number | null;
  yearly_price: number | null;
  vat_display: ProductVatDisplay;
  badge: string | null;
  cta_label: string;
  color_theme: ProductColorTheme;
  features: ProductFeature[];
  display_order: number;
  visibility: ProductVisibility;
  tier_enum: string | null;
  created_by_email: string | null;
  created_at: string;
  updated_at: string;
}

export interface ProductMetrics {
  active_users: number;
  trialing_users: number;
  expired_users: number;
  /** Sum of monthly_price across active subs · simple MRR estimate */
  mrr: number;
  /** Number of distinct subscriptions for this product (any status) */
  total_subscriptions: number;
}

export interface ProductWithMetrics extends SubscriptionProduct {
  metrics: ProductMetrics;
}

export async function loadProductsWithMetrics(opts: { includeArchived?: boolean } = {}): Promise<ProductWithMetrics[]> {
  const sb = getSupabaseAdmin();

  let q = sb
    .from("subscription_products")
    .select(
      `id, slug, name, subtitle, description, currency, monthly_price, yearly_price,
       vat_display, badge, cta_label, color_theme, features, display_order, visibility,
       tier_enum, created_by_email, created_at, updated_at`,
    )
    .order("display_order", { ascending: true });
  if (!opts.includeArchived) q = q.neq("visibility", "archived");

  const { data, error } = await q;
  if (error) {
    console.error("[products/live] query failed:", error.message);
    return [];
  }

  const products = ((data ?? []) as unknown as Array<{
    id: string;
    slug: string;
    name: string;
    subtitle: string | null;
    description: string | null;
    currency: string;
    monthly_price: string | number | null;
    yearly_price: string | number | null;
    vat_display: string;
    badge: string | null;
    cta_label: string;
    color_theme: string;
    features: unknown;
    display_order: number;
    visibility: string;
    tier_enum: string | null;
    created_by_email: string | null;
    created_at: string;
    updated_at: string;
  }>).map((row) => ({
    id: row.id,
    slug: row.slug,
    name: row.name,
    subtitle: row.subtitle,
    description: row.description,
    currency: row.currency,
    monthly_price: row.monthly_price === null ? null : Number(row.monthly_price),
    yearly_price: row.yearly_price === null ? null : Number(row.yearly_price),
    vat_display: row.vat_display as ProductVatDisplay,
    badge: row.badge,
    cta_label: row.cta_label,
    color_theme: row.color_theme as ProductColorTheme,
    features: Array.isArray(row.features)
      ? (row.features as ProductFeature[])
      : [],
    display_order: row.display_order,
    visibility: row.visibility as ProductVisibility,
    tier_enum: row.tier_enum,
    created_by_email: row.created_by_email,
    created_at: row.created_at,
    updated_at: row.updated_at,
  }));

  if (products.length === 0) return [];

  // Compute metrics from a single subscriptions read · group client-side
  const productIds = products.map((p) => p.id);
  const { data: subs } = await sb
    .from("subscriptions")
    .select("product_id, status")
    .in("product_id", productIds);

  const subRows = (subs ?? []) as Array<{ product_id: string | null; status: string }>;
  return products.map((p) => {
    const mine = subRows.filter((s) => s.product_id === p.id);
    const active_users = mine.filter((s) => s.status === "active").length;
    const trialing_users = mine.filter((s) => s.status === "trialing").length;
    const expired_users = mine.filter((s) => s.status === "expired" || s.status === "canceled").length;
    const mrr = (p.monthly_price ?? 0) * active_users;
    return {
      ...p,
      metrics: {
        active_users,
        trialing_users,
        expired_users,
        mrr,
        total_subscriptions: mine.length,
      },
    };
  });
}

export async function loadProductById(productId: string): Promise<SubscriptionProduct | null> {
  const sb = getSupabaseAdmin();
  const { data, error } = await sb
    .from("subscription_products")
    .select(
      `id, slug, name, subtitle, description, currency, monthly_price, yearly_price,
       vat_display, badge, cta_label, color_theme, features, display_order, visibility,
       tier_enum, created_by_email, created_at, updated_at`,
    )
    .eq("id", productId)
    .maybeSingle();
  if (error || !data) return null;
  const r = data as unknown as {
    id: string; slug: string; name: string; subtitle: string | null; description: string | null;
    currency: string; monthly_price: string | number | null; yearly_price: string | number | null;
    vat_display: string; badge: string | null; cta_label: string; color_theme: string;
    features: unknown; display_order: number; visibility: string; tier_enum: string | null;
    created_by_email: string | null; created_at: string; updated_at: string;
  };
  return {
    id: r.id, slug: r.slug, name: r.name, subtitle: r.subtitle, description: r.description,
    currency: r.currency,
    monthly_price: r.monthly_price === null ? null : Number(r.monthly_price),
    yearly_price: r.yearly_price === null ? null : Number(r.yearly_price),
    vat_display: r.vat_display as ProductVatDisplay,
    badge: r.badge, cta_label: r.cta_label, color_theme: r.color_theme as ProductColorTheme,
    features: Array.isArray(r.features) ? (r.features as ProductFeature[]) : [],
    display_order: r.display_order, visibility: r.visibility as ProductVisibility,
    tier_enum: r.tier_enum, created_by_email: r.created_by_email,
    created_at: r.created_at, updated_at: r.updated_at,
  };
}
