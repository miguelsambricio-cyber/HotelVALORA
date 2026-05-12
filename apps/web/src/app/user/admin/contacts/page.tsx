import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import {
  loadContacts,
  loadContactKpis,
  loadContactDetail,
  loadInvestorTypes,
  type ContactsFilter,
} from "@/lib/admin/contacts/live";
import { ContactsKpis } from "@/components/admin/contacts/contacts-kpis";
import { ContactsFilters } from "@/components/admin/contacts/contacts-filters";
import { ContactsTable } from "@/components/admin/contacts/contacts-table";
import { ContactDetailDrawer } from "@/components/admin/contacts/contact-detail-drawer";

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
    sort?: string;
    selected?: string;
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
    page_size: 50,
    sort: (searchParams.sort as ContactsFilter["sort"]) || "collab",
  };

  const selectedId = searchParams.selected || null;

  // Rebuild the "current filters" search string (without the `selected`
  // param) so row links navigate to the same filter state with the
  // drawer attached. Drives the close-button href too.
  const baseParams = new URLSearchParams();
  for (const [k, v] of Object.entries(searchParams)) {
    if (!v || k === "selected") continue;
    baseParams.set(k, v);
  }
  const baseSearchString = baseParams.toString();
  const closeHref = baseSearchString
    ? `/user/admin/contacts?${baseSearchString}`
    : "/user/admin/contacts";

  const [kpis, { rows, total }, investorTypes, detail] = await Promise.all([
    loadContactKpis(),
    loadContacts(filter),
    loadInvestorTypes(),
    selectedId ? loadContactDetail(selectedId) : Promise.resolve(null),
  ]);

  const hasDrawer = detail !== null;

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
        <h1 className="font-headline text-3xl font-extrabold tracking-tighter text-forest-900 sm:text-[34px]">
          Contacts
        </h1>
        <p className="max-w-3xl text-[13.5px] leading-relaxed text-slate-600">
          Canonical hospitality relationship graph · {kpis.total.toLocaleString()} contacts
          across {kpis.investors.toLocaleString()} investors · {kpis.operators.toLocaleString()} operators ·
          {' '}{kpis.lenders.toLocaleString()} lenders · {kpis.brokers.toLocaleString()} brokers.
          Quality-first filter active by default — invalid emails, bounced contacts, and
          dormant-without-signal rows are excluded from this view.
        </p>
      </header>

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
        investorTypes={investorTypes}
      />

      <div
        className={
          hasDrawer
            ? "grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(360px,420px)]"
            : "block"
        }
      >
        <div className="min-w-0">
          <ContactsTable
            rows={rows}
            total={total}
            page={filter.page ?? 0}
            pageSize={filter.page_size ?? 50}
            selectedId={selectedId}
            baseSearchParams={baseSearchString}
          />
        </div>
        {hasDrawer && detail && (
          <ContactDetailDrawer detail={detail} closeHref={closeHref} />
        )}
      </div>
    </div>
  );
}
