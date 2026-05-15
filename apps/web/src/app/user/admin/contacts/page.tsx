import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, Plus } from "lucide-react";
import {
  loadContacts,
  loadContactKpis,
  loadContactDetail,
  type ContactsFilter,
} from "@/lib/admin/contacts/live";
import { ContactsKpis } from "@/components/admin/contacts/contacts-kpis";
import { ContactsFilters } from "@/components/admin/contacts/contacts-filters";
import { ContactsTable } from "@/components/admin/contacts/contacts-table";
import { ContactDetailDrawer } from "@/components/admin/contacts/contact-detail-drawer";
import { ContactDetailDrawerEdit } from "@/components/admin/contacts/contact-detail-drawer-edit";
import { ContactCreateDrawer } from "@/components/admin/contacts/contact-create-drawer";
import { BulkSelectionProvider } from "@/components/admin/contacts/bulk/bulk-selection-context";
import { SelectAllControls } from "@/components/admin/contacts/bulk/select-all-controls";
import { BulkActionToolbar } from "@/components/admin/contacts/bulk/bulk-action-toolbar";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { loadProductsForPicker } from "@/lib/admin/subscriptions/products/live";

export const metadata: Metadata = {
  title: "Institutional Relationship Console · Admin · HotelVALORA",
  description:
    "Canonical hospitality relationship graph · investors · operators · lenders · brokers · strategic counterparties.",
};

export const dynamic = "force-dynamic";

interface PageProps {
  searchParams: {
    band?: string;
    investor_type?: string;
    bucket?: string;
    search?: string;
    hide_invalid?: string;
    recently_active_only?: string;
    page?: string;
    page_size?: string;
    sort?: string;
    selected?: string;
    mode?: string;
    saved?: string;
    created?: string;
    error?: string;
    bulk_ok?: string;
    bulk_failed?: string;
    bulk_verb?: string;
    bulk_error?: string;
  };
}

export default async function ContactsPage({ searchParams }: PageProps) {
  const filter: ContactsFilter = {
    band: (searchParams.band as ContactsFilter["band"]) || "all",
    investor_type: searchParams.investor_type || "all",
    bucket: searchParams.bucket || "active",
    search: searchParams.search || "",
    hide_invalid: searchParams.hide_invalid !== "1",
    recently_active_only: searchParams.recently_active_only === "1",
    page: Number.parseInt(searchParams.page ?? "0", 10) || 0,
    // Smaller default · drawer holds the full detail per row.
    // Operators can override via `?page_size=50` if they need a wider view.
    page_size: Number.parseInt(searchParams.page_size ?? "10", 10) || 10,
    sort: (searchParams.sort as ContactsFilter["sort"]) || "collab",
  };

  const selectedId = searchParams.selected || null;
  const editMode = searchParams.mode === "edit";
  const createMode = searchParams.mode === "create";
  const savedFlag = searchParams.saved === "1";
  const createdFlag = searchParams.created === "1";
  const drawerError = searchParams.error || null;

  // Rebuild the "current filters" search string (without the `selected`
  // param) so row links navigate to the same filter state with the
  // drawer attached. Drives the close-button href too.
  const baseParams = new URLSearchParams();
  for (const [k, v] of Object.entries(searchParams)) {
    if (!v) continue;
    if (["selected", "mode", "saved", "created", "error", "bulk_ok", "bulk_failed", "bulk_verb", "bulk_error"].includes(k)) continue;
    baseParams.set(k, v);
  }
  const baseSearchString = baseParams.toString();
  // For the bulk toolbar — only the filter-shaping params (drops page so
  // the action re-resolves the entire filter set, not just one page).
  const filterParams = new URLSearchParams(baseParams);
  filterParams.delete("page");
  const filterQs = filterParams.toString();
  const closeHref = baseSearchString
    ? `/user/admin/contacts?${baseSearchString}`
    : "/user/admin/contacts";
  const editHref = selectedId
    ? (baseSearchString
        ? `/user/admin/contacts?${baseSearchString}&selected=${selectedId}&mode=edit`
        : `/user/admin/contacts?selected=${selectedId}&mode=edit`)
    : "/user/admin/contacts";
  const viewHref = selectedId
    ? (baseSearchString
        ? `/user/admin/contacts?${baseSearchString}&selected=${selectedId}`
        : `/user/admin/contacts?selected=${selectedId}`)
    : "/user/admin/contacts";

  const sb = getSupabaseAdmin();
  const [kpis, { rows, total }, detail, campaignsResult, products] = await Promise.all([
    loadContactKpis(),
    loadContacts(filter),
    selectedId ? loadContactDetail(selectedId) : Promise.resolve(null),
    sb.from("campaigns")
      .select("id, name")
      .in("status", ["draft", "running"])
      .order("name", { ascending: true })
      .limit(100),
    loadProductsForPicker(),
  ]);
  const campaigns = ((campaignsResult.data ?? []) as Array<{ id: string; name: string }>);

  const hasDrawer = detail !== null || createMode;

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
            Institutional Relationship Console
          </span>
        </div>
        <div className="flex items-start justify-between gap-3">
          <h1 className="font-headline text-3xl font-extrabold tracking-tighter text-forest-900 sm:text-[34px]">
            Contacts
          </h1>
          <Link
            href={baseSearchString
              ? `/user/admin/contacts?${baseSearchString}&mode=create`
              : "/user/admin/contacts?mode=create"}
            className="inline-flex items-center gap-1.5 rounded-md bg-forest-900 px-3 py-2 font-headline text-[10.5px] font-extrabold uppercase tracking-[0.2em] text-lime-300 ring-1 ring-lime-300/40 hover:bg-forest-800 hover:text-lime-200"
            aria-label="Add new contact manually"
          >
            <Plus size={13} />
            New contact
          </Link>
        </div>
        <p className="max-w-3xl text-[13.5px] leading-relaxed text-slate-600">
          Canonical hospitality relationship graph · {kpis.total.toLocaleString()} contacts
          across {kpis.principals.toLocaleString()} principals · {kpis.brokers.toLocaleString()} brokers ·
          {' '}{kpis.lenders.toLocaleString()} lenders · {kpis.operators.toLocaleString()} operators ·
          {' '}{kpis.developers.toLocaleString()} developers.
          Quality-first filter active by default — invalid emails, bounced contacts, and
          dormant-without-signal rows are excluded from this view.
        </p>
      </header>

      {createdFlag && (
        <div className="rounded-md border border-emerald-500/40 bg-emerald-500/10 p-2.5 font-mono text-[11px] text-emerald-200">
          Contact created · view drawer opened on the right.
        </div>
      )}

      <ContactsKpis kpis={kpis} />

      <ContactsFilters
        current={{
          band: filter.band ?? "all",
          investor_type: filter.investor_type ?? "all",
          hide_invalid: filter.hide_invalid ?? true,
          recently_active_only: filter.recently_active_only ?? false,
          search: filter.search ?? "",
          sort: filter.sort ?? "collab",
        }}
      />

      {searchParams.bulk_ok && (
        <div className="rounded-md border border-emerald-500/40 bg-emerald-500/10 p-2.5 font-mono text-[11px] text-emerald-200">
          Bulk {searchParams.bulk_verb ?? "action"} · {searchParams.bulk_ok} contact{searchParams.bulk_ok === "1" ? "" : "s"} affected
          {searchParams.bulk_failed && Number(searchParams.bulk_failed) > 0 ? (
            <span className="text-amber-200"> · {searchParams.bulk_failed} failed</span>
          ) : null}
        </div>
      )}
      {searchParams.bulk_error && !/NEXT_REDIRECT/i.test(searchParams.bulk_error) && (
        <div className="rounded-md border border-rose-500/40 bg-rose-500/10 p-2.5 font-mono text-[11px] text-rose-200">
          Bulk action failed · {searchParams.bulk_error}
        </div>
      )}

      <BulkSelectionProvider filteredCount={total} totalOnPage={rows.length}>
        <div
          className={
            hasDrawer
              ? "grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(360px,420px)]"
              : "block"
          }
        >
          <div className="min-w-0">
            <SelectAllControls pageIds={rows.map((r) => r.id)} filteredTotal={total} />
            <ContactsTable
              rows={rows}
              total={total}
              page={filter.page ?? 0}
              pageSize={filter.page_size ?? 10}
              selectedId={selectedId}
              baseSearchParams={baseSearchString}
            />
            <BulkActionToolbar filterQs={filterQs} campaigns={campaigns} products={products} />
          </div>
          {createMode && (
            <ContactCreateDrawer
              closeHref={closeHref}
              filterQs={filterQs}
              errorMessage={drawerError}
            />
          )}
          {!createMode && hasDrawer && detail && (
            editMode
              ? <ContactDetailDrawerEdit detail={detail} closeHref={viewHref} errorMessage={drawerError} />
              : <ContactDetailDrawer
                  detail={detail}
                  closeHref={closeHref}
                  editHref={editHref}
                  savedFlag={savedFlag}
                />
          )}
        </div>
      </BulkSelectionProvider>
    </div>
  );
}
