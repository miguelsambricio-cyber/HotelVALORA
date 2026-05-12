import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import {
  loadUsers,
  loadUserKpis,
  type UsersFilter,
} from "@/lib/admin/users/live";
import { UsersKpis } from "@/components/admin/users/users-kpis";
import { UsersFilters } from "@/components/admin/users/users-filters";
import { UsersTable } from "@/components/admin/users/users-table";

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

  const [kpis, { rows, total }] = await Promise.all([
    loadUserKpis(),
    loadUsers(filter),
  ]);

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

      <UsersTable
        rows={rows}
        total={total}
        page={filter.page ?? 0}
        pageSize={filter.page_size ?? 50}
      />
    </div>
  );
}
