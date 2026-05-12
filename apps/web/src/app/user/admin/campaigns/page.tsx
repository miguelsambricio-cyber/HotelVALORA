import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, CheckCircle2 } from "lucide-react";
import {
  loadCampaigns,
  loadCampaignKpis,
  loadCampaignDetail,
  type CampaignsFilter,
  type CampaignDetail,
} from "@/lib/admin/campaigns/live";
import { CampaignsKpis } from "@/components/admin/campaigns/campaigns-kpis";
import { CampaignsFilters } from "@/components/admin/campaigns/campaigns-filters";
import { CampaignsTable } from "@/components/admin/campaigns/campaigns-table";
import { CampaignFormDrawer } from "@/components/admin/campaigns/campaign-form-drawer";

export const metadata: Metadata = {
  title: "Campaigns · Admin · HotelVALORA",
  description:
    "Activation layer · investor outreach · operator onboarding · beta invites · top promote rollouts.",
};

export const dynamic = "force-dynamic";

interface PageProps {
  searchParams: {
    status?: string;
    kind?: string;
    archived?: string;
    search?: string;
    page?: string;
    sort?: string;
    selected?: string;
    saved?: string;
    form_error?: string;
  };
}

export default async function CampaignsAdminPage({ searchParams }: PageProps) {
  const filter: CampaignsFilter = {
    status: (searchParams.status as CampaignsFilter["status"]) || "all",
    kind: (searchParams.kind as CampaignsFilter["kind"]) || "all",
    archived: (searchParams.archived as CampaignsFilter["archived"]) || "exclude",
    search: searchParams.search || "",
    page: Number.parseInt(searchParams.page ?? "0", 10) || 0,
    page_size: 50,
    sort: (searchParams.sort as CampaignsFilter["sort"]) || "recent",
  };

  const selected = searchParams.selected || null;
  const savedFlag = searchParams.saved === "1";
  const formError = searchParams.form_error || null;
  const isCreate = selected === "new";

  const baseParams = new URLSearchParams();
  for (const [k, v] of Object.entries(searchParams)) {
    if (!v) continue;
    if (["selected", "saved", "form_error"].includes(k)) continue;
    baseParams.set(k, v);
  }
  const baseSearchString = baseParams.toString();
  const closeHref = baseSearchString ? `/user/admin/campaigns?${baseSearchString}` : "/user/admin/campaigns";

  let detail: CampaignDetail | null = null;
  const tasks: Array<Promise<unknown>> = [];
  if (selected && !isCreate) {
    tasks.push((async () => { detail = await loadCampaignDetail(selected); })());
  }
  const [kpis, { rows, total }] = await Promise.all([
    loadCampaignKpis(),
    loadCampaigns(filter),
    ...tasks,
  ]);

  const hasDrawer = isCreate || (selected !== null && detail !== null);

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
            Activation Layer
          </span>
        </div>
        <h1 className="font-headline text-3xl font-extrabold tracking-tighter text-forest-900 sm:text-[34px]">
          Campaigns
        </h1>
        <p className="max-w-3xl text-[13.5px] leading-relaxed text-slate-600">
          Lightweight activation campaigns convert contacts into users. Each invitation is attributed to a campaign·
          each subscription remembers its origin. This is institutional growth ops, not Salesforce — outbound is
          plain Resend + audit, the operator pulls each trigger by hand.
        </p>
      </header>

      {savedFlag && (
        <div className="flex items-center gap-2 rounded-md border border-emerald-500/40 bg-emerald-500/10 p-2.5">
          <CheckCircle2 size={14} className="text-emerald-300" />
          <p className="font-mono text-[11px] text-emerald-200">Saved · audit row written.</p>
        </div>
      )}

      <CampaignsKpis kpis={kpis} />
      <CampaignsFilters current={{
        status: filter.status ?? "all",
        kind: filter.kind ?? "all",
        archived: filter.archived ?? "exclude",
        search: filter.search ?? "",
        sort: filter.sort ?? "recent",
      }} />

      <div className={hasDrawer ? "grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(360px,460px)]" : "block"}>
        <div className="min-w-0">
          <CampaignsTable
            rows={rows}
            total={total}
            page={filter.page ?? 0}
            pageSize={filter.page_size ?? 50}
            selectedId={isCreate ? null : selected}
            baseSearchParams={baseSearchString}
          />
        </div>
        {hasDrawer && (
          <CampaignFormDrawer
            detail={isCreate ? null : detail}
            closeHref={closeHref}
            errorMessage={formError}
          />
        )}
      </div>
    </div>
  );
}
