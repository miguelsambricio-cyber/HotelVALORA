import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import {
  loadUsers,
  loadUserKpis,
  type UsersFilter,
} from "@/lib/admin/users/live";
import { loadActiveCampaigns } from "@/lib/admin/subscriptions/live";
import { loadProductsForPicker } from "@/lib/admin/subscriptions/products/live";
import { UsersKpis } from "@/components/admin/users/users-kpis";
import { UsersFilters } from "@/components/admin/users/users-filters";
import { UsersTable } from "@/components/admin/users/users-table";
import { UsersBulkSelectionProvider } from "@/components/admin/users/bulk/bulk-selection-context";
import { UsersSelectAllControls } from "@/components/admin/users/bulk/select-all-controls";
import { UsersBulkActionToolbar } from "@/components/admin/users/bulk/bulk-action-toolbar";

export const metadata: Metadata = {
  title: "Users · Admin · HotelVALORA",
  description:
    "Real users on the HOTELVALORA platform — invitations, tiers, subscriptions, conversion provenance.",
};

export const dynamic = "force-dynamic";

interface PageProps {
  searchParams: {
    invitation_status?: string;
    tier?: string;
    linked_only?: string;
    search?: string;
    page?: string;
    sort?: string;
    bulk_ok?: string;
    bulk_failed?: string;
    bulk_verb?: string;
    bulk_error?: string;
  };
}

export default async function UsersAdminPage({ searchParams }: PageProps) {
  const filter: UsersFilter = {
    invitation_status: (searchParams.invitation_status as UsersFilter["invitation_status"]) || "all",
    tier: (searchParams.tier as UsersFilter["tier"]) || "all",
    linked_only: searchParams.linked_only === "1",
    search: searchParams.search || "",
    page: Number.parseInt(searchParams.page ?? "0", 10) || 0,
    page_size: 50,
    sort: (searchParams.sort as UsersFilter["sort"]) || "recent",
  };

  const [kpis, { rows, total }, campaigns, products] = await Promise.all([
    loadUserKpis(),
    loadUsers(filter),
    loadActiveCampaigns(),
    loadProductsForPicker(),
  ]);

  // Build filter_qs for "Select all filtered" — drops page so the
  // server action re-resolves the entire filter set, not just one page.
  const filterParams = new URLSearchParams();
  for (const [k, v] of Object.entries(searchParams)) {
    if (!v) continue;
    if (["page", "bulk_ok", "bulk_failed", "bulk_verb", "bulk_error"].includes(k)) continue;
    filterParams.set(k, v);
  }
  const filterQs = filterParams.toString();

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
            Operational Growth Funnel
          </span>
        </div>
        <h1 className="font-headline text-3xl font-extrabold tracking-tighter text-forest-900 sm:text-[34px]">
          Users
        </h1>
        <p className="max-w-3xl text-[13.5px] leading-relaxed text-slate-600">
          Real users active on HOTELVALORA. The contacts base
          (<code className="rounded bg-slate-100 px-1 font-mono text-[12px]">4,547</code>) feeds the funnel —
          this is who actually onboarded. Conversion arc:
          {" "}
          <span className="font-mono text-[12px]">contact → invited → onboarded → active → premium</span>.
          {" "}<code className="rounded bg-slate-100 px-1 font-mono text-[12px]">{kpis.total}</code>
          {" "}users so far ·{" "}
          <code className="rounded bg-slate-100 px-1 font-mono text-[12px]">{kpis.active_subscriptions}</code>
          {" "}active subscription{kpis.active_subscriptions === 1 ? "" : "s"} ·{" "}
          <code className="rounded bg-slate-100 px-1 font-mono text-[12px]">{kpis.linked_from_contacts}</code>
          {" "}linked back to a contact (provenance).
        </p>
      </header>

      <UsersKpis kpis={kpis} />

      <UsersFilters
        current={{
          invitation_status: filter.invitation_status ?? "all",
          tier: filter.tier ?? "all",
          linked_only: filter.linked_only ?? false,
          search: filter.search ?? "",
          sort: filter.sort ?? "recent",
        }}
      />

      {searchParams.bulk_ok && (
        <div className="rounded-md border border-emerald-500/40 bg-emerald-500/10 p-2.5 font-mono text-[11px] text-emerald-200">
          Bulk {searchParams.bulk_verb ?? "action"} · {searchParams.bulk_ok} user{searchParams.bulk_ok === "1" ? "" : "s"} affected
          {searchParams.bulk_failed && Number(searchParams.bulk_failed) > 0 ? (
            <span className="text-amber-200"> · {searchParams.bulk_failed} skipped (Stripe-backed)</span>
          ) : null}
        </div>
      )}
      {searchParams.bulk_error && (
        <div className="rounded-md border border-rose-500/40 bg-rose-500/10 p-2.5 font-mono text-[11px] text-rose-200">
          Bulk action failed · {searchParams.bulk_error}
        </div>
      )}

      <UsersBulkSelectionProvider filteredCount={total} totalOnPage={rows.length}>
        <UsersSelectAllControls pageIds={rows.map((r) => r.id)} filteredTotal={total} />
        <UsersTable
          rows={rows}
          total={total}
          page={filter.page ?? 0}
          pageSize={filter.page_size ?? 50}
        />
        <UsersBulkActionToolbar filterQs={filterQs} campaigns={campaigns} products={products} />
      </UsersBulkSelectionProvider>
    </div>
  );
}
