import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, CheckCircle2 } from "lucide-react";
import {
  loadSubscriptions,
  loadSubscriptionKpis,
  loadAssignableUsers,
  loadActiveCampaigns,
  type SubscriptionsFilter,
  type SubscriptionRow,
} from "@/lib/admin/subscriptions/live";
import { SubscriptionsKpis } from "@/components/admin/subscriptions/subscriptions-kpis";
import { SubscriptionsFilters } from "@/components/admin/subscriptions/subscriptions-filters";
import { SubscriptionsTable } from "@/components/admin/subscriptions/subscriptions-table";
import { SubscriptionFormDrawer } from "@/components/admin/subscriptions/subscription-form-drawer";
import { loadProductsWithMetrics, loadProductById, type SubscriptionProduct } from "@/lib/admin/subscriptions/products/live";
import { ProductGrid } from "@/components/admin/subscriptions/products/product-grid";
import { ProductFormDrawer } from "@/components/admin/subscriptions/products/product-form-drawer";

export const metadata: Metadata = {
  title: "Subscriptions · Admin · HotelVALORA",
  description: "Monetization layer · Free · Pro · Premium · Top Promote · Comped · Expired",
};

export const dynamic = "force-dynamic";

interface PageProps {
  searchParams: {
    status?: string;
    tier?: string;
    campaign_only?: string;
    search?: string;
    page?: string;
    sort?: string;
    selected?: string;
    saved?: string;
    form_error?: string;
    /** Phase 2.D.7 · product surface */
    view?: string;
    product?: string;
  };
}

/** Treat the param as a uuid or 'new' · empty/garbage → null. */
function parseSelectedId(raw: string | undefined): string | null {
  if (!raw) return null;
  if (raw === "new") return "new";
  if (/^[0-9a-f-]{36}$/i.test(raw)) return raw;
  return null;
}

export default async function SubscriptionsAdminPage({ searchParams }: PageProps) {
  const filter: SubscriptionsFilter = {
    status: (searchParams.status as SubscriptionsFilter["status"]) || "all",
    tier: (searchParams.tier as SubscriptionsFilter["tier"]) || "all",
    campaign_only: searchParams.campaign_only === "1",
    search: searchParams.search || "",
    page: Number.parseInt(searchParams.page ?? "0", 10) || 0,
    page_size: 50,
    sort: (searchParams.sort as SubscriptionsFilter["sort"]) || "recent",
  };

  const selected = searchParams.selected || null;
  const isCreate = selected === "new";
  const savedFlag = searchParams.saved === "1";
  const formError = searchParams.form_error || null;

  // Product-side drawer state (`?product=<id|new>`)
  const productParam = parseSelectedId(searchParams.product ?? undefined);
  const isProductCreate = productParam === "new";
  const productId = productParam && productParam !== "new" ? productParam : null;

  const baseParams = new URLSearchParams();
  for (const [k, v] of Object.entries(searchParams)) {
    if (!v) continue;
    if (["selected", "saved", "form_error", "product"].includes(k)) continue;
    baseParams.set(k, v);
  }
  const baseSearchString = baseParams.toString();
  const closeHref = baseSearchString
    ? `/user/admin/subscriptions?${baseSearchString}`
    : "/user/admin/subscriptions";

  // Product-drawer hrefs share the same base
  const newProductHref = baseSearchString
    ? `/user/admin/subscriptions?${baseSearchString}&product=new`
    : "/user/admin/subscriptions?product=new";
  const hrefForProduct = (id: string) =>
    baseSearchString
      ? `/user/admin/subscriptions?${baseSearchString}&product=${id}`
      : `/user/admin/subscriptions?product=${id}`;
  const productCloseHref = closeHref;

  const [kpis, { rows, total }, users, campaigns, products, selectedProduct] = await Promise.all([
    loadSubscriptionKpis(),
    loadSubscriptions(filter),
    isCreate ? loadAssignableUsers() : Promise.resolve([]),
    loadActiveCampaigns(),
    loadProductsWithMetrics({ includeArchived: true }),
    productId ? loadProductById(productId) : Promise.resolve(null),
  ]);
  let productForDrawer: SubscriptionProduct | null = null;
  if (isProductCreate) productForDrawer = null;
  else if (selectedProduct) productForDrawer = selectedProduct;

  let currentRow: SubscriptionRow | null = null;
  if (selected && !isCreate) {
    currentRow = rows.find((r) => r.id === selected) ?? null;
    if (!currentRow) {
      const { rows: page1 } = await loadSubscriptions({ ...filter, page: 0, page_size: 1, search: "" });
      currentRow = page1.find((r) => r.id === selected) ?? null;
    }
  }

  const hasDrawer = isCreate || currentRow !== null;

  return (
    <div className="space-y-6">
      <Link
        href="/user/admin"
        className="inline-flex items-center gap-1.5 font-headline text-[11px] font-bold uppercase tracking-[0.22em] text-slate-500 hover:text-forest-900"
      >
        <ArrowLeft size={12} /> Executive Control Room
      </Link>

      <header className="space-y-2">
        <div className="flex items-center gap-3">
          <span className="rounded-md bg-forest-900 px-2 py-0.5 font-headline text-[9px] font-extrabold uppercase tracking-[0.25em] text-lime-300">
            Live
          </span>
          <span className="font-headline text-[10px] font-extrabold uppercase tracking-[0.32em] text-slate-500">
            Monetization Layer
          </span>
        </div>
        <h1 className="font-headline text-3xl font-extrabold tracking-tighter text-forest-900 sm:text-[34px]">
          Subscriptions
        </h1>
        <p className="max-w-3xl text-[13.5px] leading-relaxed text-slate-600">
          The final node of the conversion arc. Operator can assign tiers manually (Free / Pro / Premium / Top
          Promote / Comped), set expirations, and attribute the subscription to its source campaign. Stripe-backed
          subscriptions appear here too · operator edits flow through the Stripe dashboard so the webhook stays
          authoritative.
        </p>
      </header>

      {savedFlag && (
        <div className="flex items-center gap-2 rounded-md border border-emerald-500/40 bg-emerald-500/10 p-2.5">
          <CheckCircle2 size={14} className="text-emerald-300" />
          <p className="font-mono text-[11px] text-emerald-200">Saved · audit row written.</p>
        </div>
      )}

      <SubscriptionsKpis kpis={kpis} />

      <ProductGrid
        products={products}
        newHref={newProductHref}
        hrefForProduct={hrefForProduct}
      />

      <div className="border-t border-slate-200 pt-6">
        <header className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
          <div>
            <p className="font-headline text-[10px] font-extrabold uppercase tracking-[0.25em] text-slate-500">
              Subscribers
            </p>
            <h2 className="font-headline text-xl font-extrabold tracking-tight text-forest-900">
              Active subscription rows
            </h2>
          </div>
          <p className="font-mono text-[10.5px] text-slate-500">
            Filter / inspect individual subscriptions · operator-driven assignments + Stripe-backed rows live here.
          </p>
        </header>
      </div>

      <SubscriptionsFilters current={{
        status: filter.status ?? "all",
        tier: filter.tier ?? "all",
        campaign_only: filter.campaign_only ?? false,
        search: filter.search ?? "",
        sort: filter.sort ?? "recent",
      }} />

      <div className={
        hasDrawer || isProductCreate || productForDrawer
          ? "grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(360px,460px)]"
          : "block"
      }>
        <div className="min-w-0">
          <SubscriptionsTable
            rows={rows}
            total={total}
            page={filter.page ?? 0}
            pageSize={filter.page_size ?? 50}
            selectedId={isCreate ? null : selected}
            baseSearchParams={baseSearchString}
          />
        </div>
        {(isProductCreate || productForDrawer) ? (
          <ProductFormDrawer
            product={productForDrawer}
            closeHref={productCloseHref}
            errorMessage={formError}
          />
        ) : hasDrawer ? (
          <SubscriptionFormDrawer
            row={isCreate ? null : currentRow}
            closeHref={closeHref}
            errorMessage={formError}
            users={users}
            campaigns={campaigns}
          />
        ) : null}
      </div>
    </div>
  );
}
