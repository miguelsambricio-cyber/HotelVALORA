import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowLeft,
  Building2,
  Search,
  Database,
  AlertTriangle,
  ExternalLink,
  ArrowUpRight,
  ChevronDown,
} from "lucide-react";
import {
  loadHotelsSnapshot,
  getSnapshotDiagnostics,
  type HotelRecord,
  type ReconciliationEntry,
  type ProjectEntry,
} from "@/lib/admin/hotels/snapshot-reader";
import { AddHotelModal } from "@/components/admin/hotels/add-hotel-modal";
import { AddDealModal } from "@/components/admin/hotels/add-deal-modal";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Hotel Registry · Admin",
  description:
    "Institutional hotel reference registry — search, inspect, reconcile reference hotels backing compsets, valuations, and market reports.",
};

// Phase 3.d · Tab IA — institutional operations terminal architecture.
// Each tab is its own URL-state slice. Renders only its own content so
// the DOM stays bounded as the inventory scales beyond Madrid.
type TabId = "hotels" | "transactions" | "projects" | "reconciliation" | "corrections" | "analytics";
const DEFAULT_TAB: TabId = "hotels";
const TAB_IDS: TabId[] = [
  "hotels",
  "transactions",
  "projects",
  "reconciliation",
  "corrections",
  "analytics",
];

interface PageProps {
  searchParams?: {
    tab?: string;
    q?: string;
    market?: string;
    country?: string;
    chain?: string;
    affiliation?: string;
    needs_review?: string;
    sort?: string;
    page?: string;
    // Per-tab filters for the transactions/projects sections
    dq?: string;
    dkind?: string;        // "transaction" | "project" | "" (any) · obsolete now (tab decides kind)
    dsource?: string;      // "costar" | "private" | "manual_entry" | "" (any)
    dmarket?: string;
    dcountry?: string;
    dsort?: string;        // "date_desc" | "date_asc" | "price_desc" | "price_asc" | "name_asc"
  };
}

// "Visible at a glance" count — operator sees 6 in the scrollable
// container, the rest is one finger-scroll away (no pagination
// boundary cut). The number doubles as the value shown in
// "showing 6 of N".
const VISIBLE_HOTELS = 6;
const VISIBLE_RECON = 3;

type SortKey =
  | "name_asc"
  | "name_desc"
  | "rooms_desc"
  | "rooms_asc"
  | "year_desc"
  | "year_asc"
  | "chain_scale"
  | "brand";

const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: "name_asc", label: "Name · A → Z" },
  { value: "name_desc", label: "Name · Z → A" },
  { value: "rooms_desc", label: "Rooms · largest first" },
  { value: "rooms_asc", label: "Rooms · smallest first" },
  { value: "year_desc", label: "Year opened · newest" },
  { value: "year_asc", label: "Year opened · oldest" },
  { value: "chain_scale", label: "Class · luxury → economy" },
  { value: "brand", label: "Brand · A → Z" },
];

const CHAIN_SCALE_ORDER: Record<string, number> = {
  luxury: 0,
  upper_upscale: 1,
  upscale: 2,
  upper_midscale: 3,
  midscale: 4,
  economy: 5,
};

function sortHotels(rows: HotelRecord[], key: SortKey): HotelRecord[] {
  const cmpStr = (a: string | null | undefined, b: string | null | undefined, dir = 1) => {
    const aa = (a ?? "").toLocaleLowerCase();
    const bb = (b ?? "").toLocaleLowerCase();
    if (aa === bb) return 0;
    return aa < bb ? -dir : dir;
  };
  const cmpNum = (a: number | null | undefined, b: number | null | undefined, dir = 1) => {
    const aa = a ?? Number.NEGATIVE_INFINITY;
    const bb = b ?? Number.NEGATIVE_INFINITY;
    return (aa - bb) * dir;
  };
  const arr = [...rows];
  switch (key) {
    case "name_asc": return arr.sort((a, b) => cmpStr(a.name, b.name, 1));
    case "name_desc": return arr.sort((a, b) => cmpStr(a.name, b.name, -1));
    case "rooms_desc": return arr.sort((a, b) => cmpNum(a.rooms_count, b.rooms_count, -1));
    case "rooms_asc": return arr.sort((a, b) => cmpNum(a.rooms_count, b.rooms_count, 1));
    case "year_desc": return arr.sort((a, b) => cmpNum(a.year_opened, b.year_opened, -1));
    case "year_asc": return arr.sort((a, b) => cmpNum(a.year_opened, b.year_opened, 1));
    case "chain_scale":
      return arr.sort((a, b) => {
        const ra = CHAIN_SCALE_ORDER[a.chain_scale ?? ""] ?? 99;
        const rb = CHAIN_SCALE_ORDER[b.chain_scale ?? ""] ?? 99;
        if (ra !== rb) return ra - rb;
        return cmpStr(a.name, b.name, 1);
      });
    case "brand": return arr.sort((a, b) => cmpStr(a.brand, b.brand, 1));
    default: return arr;
  }
}

export default async function HotelsPage({ searchParams = {} }: PageProps) {
  const snap = await loadHotelsSnapshot();
  const diag = getSnapshotDiagnostics();
  const activeTab: TabId =
    TAB_IDS.includes((searchParams.tab as TabId) ?? DEFAULT_TAB) ? ((searchParams.tab as TabId) ?? DEFAULT_TAB) : DEFAULT_TAB;
  const q = (searchParams.q ?? "").trim();
  const marketFilter = (searchParams.market ?? "").trim();
  const countryFilter = (searchParams.country ?? "").trim().toUpperCase();
  const chainFilter = (searchParams.chain ?? "").trim();
  const affiliationFilter = (searchParams.affiliation ?? "").trim();
  const needsReviewOnly = searchParams.needs_review === "1";
  const sortKey: SortKey =
    (SORT_OPTIONS.find((o) => o.value === searchParams.sort)?.value as SortKey | undefined) ??
    "name_asc";
  const page = Math.max(1, parseInt(searchParams.page ?? "1", 10) || 1);

  const filteredAll = snap
    ? snap.hotels.filter((h) =>
        matchesQuery(h, { q, marketFilter, countryFilter, chainFilter, affiliationFilter, needsReviewOnly }),
      )
    : [];
  const sorted = sortHotels(filteredAll, sortKey);
  // No pagination — operator scrolls within the fixed-height container
  // to browse all matches. Renders every filtered hotel into the DOM
  // (acceptable up to ~5k rows; revisit with virtual scroll later).
  const filtered = sorted;
  void page; // legacy param preserved for backward compat with shared URLs

  // ── Phase 3.c · "Search transactions & projects" section state ─────────
  type DealKind = "transaction" | "project";
  interface UnifiedDeal {
    kind: DealKind;
    id: string;
    name: string;
    country: string | null;
    market: string | null;
    submarket: string | null;
    source: string; // costar | private | manual_entry
    is_new: boolean;
    // transaction-specific
    closed_at?: string | null;
    price_eur?: number | null;
    buyer?: string | null;
    seller?: string | null;
    rooms_count?: number | null;
    // project-specific
    phase?: string | null;
    status?: string | null;
    opening_date?: string | null;
    stars?: number | null;
    city?: string | null;
  }
  const dq = (searchParams.dq ?? "").trim().toLowerCase();
  const dkind = (searchParams.dkind ?? "").trim();
  const dsource = (searchParams.dsource ?? "").trim();
  const dmarketFilter = (searchParams.dmarket ?? "").trim();
  const dcountryFilter = (searchParams.dcountry ?? "").trim().toUpperCase();
  const dsort = (searchParams.dsort ?? "date_desc").trim();

  const allDeals: UnifiedDeal[] = [];
  for (const t of snap?.transactions ?? []) {
    const isManualNew =
      t._meta?.source === "manual_entry" && t._meta?.review_status === "new";
    allDeals.push({
      kind: "transaction",
      id: t.transaction_id,
      name: t.asset_name,
      country: t.country,
      market: t.market_name,
      submarket: null,
      source: isManualNew ? "manual_entry" : (t.source ?? "unknown"),
      is_new: !!isManualNew,
      closed_at: t.closed_at,
      price_eur: t.price_eur,
      buyer: t.buyer,
      seller: t.seller,
    });
  }
  const projectsRaw = (snap as unknown as { projects?: ProjectEntry[] } | null)?.projects ?? [];
  for (const p of projectsRaw) {
    const isManualNew =
      p._meta?.source === "manual_entry" && p._meta?.review_status === "new";
    allDeals.push({
      kind: "project",
      id: p.project_id,
      name: p.project_name,
      country: p.country,
      market: p.market_name,
      submarket: p.submarket_name ?? null,
      source: isManualNew ? "manual_entry" : "costar",
      is_new: !!isManualNew,
      phase: p.phase,
      status: p.status,
      opening_date: p.opening_date,
      stars: p.stars,
      rooms_count: p.rooms_count,
      city: p.city,
    });
  }
  // Tab dictates the kind constraint when on a deal tab. Outside deal
  // tabs, `dkind` user param still works (e.g. for shared URLs).
  const effectiveKind =
    activeTab === "transactions" ? "transaction" : activeTab === "projects" ? "project" : dkind;
  const filteredDeals = allDeals.filter((d) => {
    if (effectiveKind && d.kind !== effectiveKind) return false;
    if (dsource && d.source !== dsource) return false;
    if (dcountryFilter && d.country !== dcountryFilter) return false;
    if (dmarketFilter && d.market !== dmarketFilter) return false;
    if (dq) {
      const hay = `${d.name} ${d.buyer ?? ""} ${d.seller ?? ""} ${d.id}`.toLowerCase();
      if (!hay.includes(dq)) return false;
    }
    return true;
  });
  filteredDeals.sort((a, b) => {
    // primary sort
    if (dsort === "name_asc") return a.name.localeCompare(b.name);
    if (dsort === "price_desc") return (b.price_eur ?? -1) - (a.price_eur ?? -1);
    if (dsort === "price_asc") return (a.price_eur ?? Number.MAX_SAFE_INTEGER) - (b.price_eur ?? Number.MAX_SAFE_INTEGER);
    // date_asc / date_desc — use closed_at or opening_date as proxy
    const ad = a.closed_at ?? a.opening_date ?? "";
    const bd = b.closed_at ?? b.opening_date ?? "";
    if (dsort === "date_asc") return ad.localeCompare(bd);
    return bd.localeCompare(ad); // date_desc default
  });

  return (
    <div className="space-y-6">
      <Link
        href="/user/admin"
        className="inline-flex items-center gap-1.5 font-headline text-[11px] font-bold uppercase tracking-[0.22em] text-slate-500 hover:text-forest-900"
      >
        <ArrowLeft size={12} /> Executive Control Room
      </Link>

      <header className="space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-md bg-emerald-100 px-2 py-0.5 font-headline text-[9px] font-extrabold uppercase tracking-[0.25em] text-emerald-800 ring-1 ring-inset ring-emerald-200">
            Beta · v1.2 pipeline
          </span>
          <span
            title="Operator-only · reference data plane owned by the COSTAR & Hotel Reference Agent"
            className="rounded-md bg-slate-100 px-2 py-0.5 font-headline text-[9px] font-extrabold uppercase tracking-[0.25em] text-slate-600 ring-1 ring-inset ring-slate-200"
          >
            Operator only · reference data
          </span>
        </div>
        <h1 className="font-headline text-3xl font-extrabold tracking-tighter text-forest-900 sm:text-[34px]">
          Hotel Registry
        </h1>
        <p className="max-w-3xl text-[13.5px] leading-relaxed text-slate-600">
          Institutional source of truth for reference hotels — the backbone of compsets,
          valuations, benchmarking, and market reports. Search, inspect, and reconcile hotel
          characteristics when an ingestion error or hallucinated attribute needs correction.
        </p>
      </header>

      {/* KPI strip · two-row layout designed for institutional scale.
            Row 1 = COVERAGE (geo hierarchy + inventory)
            Row 2 = OPERATIONS (performance KPIs + worklists)
          Scale-aware hints (e.g. "1 / 70 planned via CoStar") surface the
          runway so the operator can see remaining coverage at a glance. */}
      {(() => {
        // Derive coverage from the actual hotels list (not the heterogenous
        // market_snapshots count which mixes country/market/submarket rows).
        const hotels = snap?.hotels ?? [];
        const countries = new Set(hotels.map((h) => h.country).filter(Boolean));
        const markets = new Set(hotels.map((h) => h.market_name).filter(Boolean));
        const submarkets = new Set(hotels.map((h) => h.submarket_name).filter(Boolean));
        // Compset semantics: the snapshot today carries 0 operator-confirmed
        // memberships (3.1 PDF parser not yet shipped) and N synthetic
        // applications. Treat the operator's conceptual compset as "1" when
        // synthetic inference is running, so the KPI matches the operator's
        // mental model. Switch to real count once memberships land.
        const realCompsets = snap?.totals.compset_membership ?? 0;
        const syntheticCount = (snap?.synthetic_compsets ?? []).length;
        const compsetDisplay =
          realCompsets > 0 ? realCompsets : syntheticCount > 0 ? 1 : 0;
        const compsetHint =
          realCompsets > 0
            ? `${realCompsets} operator-confirmed`
            : syntheticCount > 0
              ? `synthetic-applied to ${syntheticCount} hotels · pending CoStar PDF`
              : "no compset data yet";
        return (
          <>
            <section
              aria-label="Coverage"
              className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5"
            >
              <Kpi
                label="Countries"
                value={countries.size}
                tone="emerald"
                hint="70+ planned via CoStar"
              />
              <Kpi
                label="Markets"
                value={markets.size}
                tone="emerald"
                hint="300+ planned"
              />
              <Kpi
                label="Submarkets"
                value={submarkets.size}
                tone="emerald"
                hint={
                  markets.size === 1 && hotels[0]?.market_name
                    ? `within ${hotels[0].market_name}`
                    : undefined
                }
              />
              <Kpi
                label="Hotels"
                value={snap?.totals.hotels ?? 0}
                tone="emerald"
                hint="institutional inventory"
              />
              <Kpi
                label="Projects"
                value={snap?.totals.projects ?? 0}
                hint="pipeline"
              />
            </section>

            <section
              aria-label="Operations"
              className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5"
            >
              <Kpi
                label="Market KPIs"
                value={snap?.totals.market_timeseries ?? 0}
                tone="emerald"
                hint="period-indexed"
              />
              <Kpi
                label="Transactions"
                value={snap?.totals.transactions ?? 0}
                hint={
                  hotels.length > 0
                    ? `${snap?.transactions.filter((t) => t.hotel_id).length ?? 0} hotel-linked`
                    : undefined
                }
              />
              <Kpi
                label="Compsets"
                value={compsetDisplay}
                tone="amber"
                hint={compsetHint}
              />
              <Kpi
                label="To reconcile"
                value={snap?.totals.reconciliation_queue ?? 0}
                tone={(snap?.totals.reconciliation_queue ?? 0) > 0 ? "amber" : "slate"}
                href="#reconciliation-queue"
              />
              <Kpi
                label="Corrections"
                value={snap?.corrections?.applied_total_in_master ?? 0}
                tone="emerald"
                hint={
                  snap?.corrections
                    ? `${snap.corrections.applied} applied · ${snap.corrections.rejected} rejected · ${snap.corrections.pending_before} pending`
                    : undefined
                }
              />
            </section>
          </>
        );
      })()}

      {/* Phase 3.d · Sticky tab bar — institutional terminal IA.
            Each tab is its own URL slice (?tab=...). Counters reflect the
            full dataset size (not filtered values) so the operator can see
            scale at a glance regardless of active filters. */}
      <nav
        aria-label="Hotel admin tabs"
        className="sticky top-0 z-10 -mx-2 flex items-center gap-1 overflow-x-auto rounded-xl border border-slate-200 bg-white/95 px-2 py-1.5 shadow-sm backdrop-blur"
      >
        {(
          [
            { id: "hotels", label: "Hotels", count: snap?.totals.hotels ?? 0 },
            { id: "transactions", label: "Transactions", count: snap?.totals.transactions ?? 0 },
            { id: "projects", label: "Projects", count: snap?.totals.projects ?? 0 },
            { id: "reconciliation", label: "Reconciliation", count: snap?.totals.reconciliation_queue ?? 0 },
            { id: "corrections", label: "Corrections", count: snap?.corrections?.applied_total_in_master ?? 0 },
            { id: "analytics", label: "Analytics", count: null as number | null },
          ] satisfies Array<{ id: TabId; label: string; count: number | null }>
        ).map((t) => {
          const isActive = activeTab === t.id;
          return (
            <Link
              key={t.id}
              href={`/user/admin/hotels?tab=${t.id}`}
              aria-current={isActive ? "page" : undefined}
              className={`flex items-center gap-1.5 whitespace-nowrap rounded-md px-3 py-1.5 font-headline text-[11px] font-bold uppercase tracking-[0.22em] transition-colors ${
                isActive
                  ? "bg-forest-900 text-lime-300"
                  : "text-slate-600 hover:bg-slate-100 hover:text-forest-900"
              }`}
            >
              {t.label}
              {t.count !== null && (
                <span
                  className={`rounded px-1.5 py-0.5 font-mono text-[9px] font-bold tabular-nums ${
                    isActive
                      ? "bg-lime-300/20 text-lime-300"
                      : "bg-slate-100 text-slate-500"
                  }`}
                >
                  {t.count}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Last ingestion batch · governance summary · ANALYTICS TAB */}
      {activeTab === "analytics" && snap?.batch && (
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-3 flex items-center gap-2">
            <Database size={14} className="text-slate-400" aria-hidden />
            <h2 className="font-headline text-[10px] font-extrabold uppercase tracking-[0.28em] text-slate-500">
              Last ingestion batch
            </h2>
            <span className="ml-auto font-mono text-[10.5px] text-slate-500">
              {snap.batch.normalization_version} · {snap.batch.batch_id}
            </span>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            <BatchStat
              label="Files processed"
              value={snap.batch.files.processed}
            />
            <BatchStat
              label="Files archived"
              value={snap.batch.files.archived}
              tone={snap.batch.files.archived === snap.batch.files.processed ? "emerald" : "amber"}
              hint={`INPUT → OLD`}
            />
            <BatchStat
              label="Archive failed"
              value={snap.batch.files.archive_failed}
              tone={snap.batch.files.archive_failed > 0 ? "rose" : "slate"}
              hint={snap.batch.files.archive_failed > 0 ? "stayed in INPUT" : undefined}
            />
            <BatchStat
              label="Files failed"
              value={snap.batch.files.failed}
              tone={snap.batch.files.failed > 0 ? "rose" : "slate"}
              hint={snap.batch.files.failed > 0 ? "unparseable" : undefined}
            />
            <BatchStat
              label="Duplicate suspect"
              value={snap.batch.rows.duplicate_suspected}
              tone={snap.batch.rows.duplicate_suspected > 0 ? "amber" : "slate"}
            />
            <BatchStat
              label="To reconcile"
              value={snap.batch.rows.reconciliation_required}
              tone={snap.batch.rows.reconciliation_required > 0 ? "amber" : "slate"}
            />
          </div>
          {snap.batch.files.archive_failed > 0 && (
            <p className="mt-3 rounded-md border border-rose-200 bg-rose-50 p-2.5 text-[11.5px] leading-relaxed text-rose-900">
              <strong>{snap.batch.files.archive_failed}</strong> file{snap.batch.files.archive_failed === 1 ? "" : "s"} could not be moved from INPUT → OLD.
              The most common cause on Windows is the file being open in Excel. Close it and re-run{" "}
              <code className="rounded bg-rose-100 px-1 font-mono text-[10.5px]">python services/costar/scripts/ingest.py</code> — the pipeline is idempotent.
            </p>
          )}
        </section>
      )}

      {/* Data-plane status · ANALYTICS TAB */}
      {activeTab === "analytics" && (
      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="mb-3 flex items-center gap-2">
          <Database size={14} className="text-slate-400" aria-hidden />
          <h2 className="font-headline text-[10px] font-extrabold uppercase tracking-[0.28em] text-slate-500">
            Data plane
          </h2>
          {snap && (
            <span className="ml-auto font-mono text-[10.5px] text-slate-500">
              snapshot · {formatRel(snap.generated_at)} · batch {snap.ingestion_batch_id}
            </span>
          )}
        </div>
        {snap ? (
          <p className="text-[12px] leading-relaxed text-slate-600">
            Reading from{" "}
            <code className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[10.5px]">
              services/costar/MASTER/snapshot.json
            </code>
            . Re-run{" "}
            <code className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[10.5px]">
              python services/costar/scripts/ingest.py
            </code>{" "}
            after dropping new files into the INPUT folders to refresh this view.
          </p>
        ) : (
          <div className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-[12px] leading-relaxed text-amber-900">
            <p>
              <strong>No snapshot found.</strong> Tried filesystem first, then Supabase Storage.
            </p>
            <div className="mt-2 space-y-0.5 font-mono text-[10.5px] text-amber-800">
              <p>
                <strong>fs</strong> · {diag.fs.path}
              </p>
              <p className="pl-3">
                resolved via · {diag.fs.resolvedFrom} · exists · {String(diag.fs.exists)} · size ·{" "}
                {diag.fs.sizeBytes !== null ? `${diag.fs.sizeBytes} bytes` : "n/a"}
              </p>
              <p>
                <strong>storage</strong> · {diag.storage.bucket}/{diag.storage.key}
              </p>
              <p className="pl-3">
                last fetch ·{" "}
                {diag.storage.lastFetchedAtMs
                  ? new Date(diag.storage.lastFetchedAtMs).toISOString()
                  : "never"}{" "}
                · cached · {String(diag.storage.cached)}
              </p>
            </div>
            <p className="mt-2">
              Operator workflow:{" "}
              <code className="rounded bg-amber-100 px-1 font-mono text-[10.5px]">
                python services/costar/scripts/ingest.py
              </code>{" "}
              then{" "}
              <code className="rounded bg-amber-100 px-1 font-mono text-[10.5px]">
                cd apps/web && node --env-file=.env.local scripts/upload-snapshot.mjs
              </code>
            </p>
          </div>
        )}
      </section>
      )}

      {/* Search hotels · HOTELS TAB */}
      {activeTab === "hotels" && (
      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <form className="space-y-3" method="get">
          <div className="flex items-center gap-2">
            <Search size={14} className="text-slate-400" aria-hidden />
            <h2 className="font-headline text-[10px] font-extrabold uppercase tracking-[0.28em] text-slate-500">
              Search hotels
            </h2>
            <div className="ml-auto">
              <AddHotelModal />
            </div>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <div className="relative flex-1">
              <Search
                size={14}
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                aria-hidden
              />
              <input
                type="text"
                name="q"
                defaultValue={q}
                placeholder="Search by name · brand · operator · hotel_id"
                className="w-full rounded-lg border border-slate-200 bg-white py-2.5 pl-9 pr-3 font-mono text-[12px] text-slate-900 placeholder:text-slate-400 focus:border-forest-900 focus:outline-none"
              />
            </div>
            <SelectControl name="market" label="Any market" current={marketFilter} options={(snap?.markets ?? []).map((m) => m.market_name)} />
            <SelectControl name="country" label="Any country" current={countryFilter} options={Array.from(new Set((snap?.hotels ?? []).map((h) => h.country)))} />
            <SelectControl
              name="chain"
              label="Class"
              current={chainFilter}
              options={["luxury", "upper_upscale", "upscale", "upper_midscale", "midscale", "economy"]}
            />
            <SelectControl
              name="affiliation"
              label="Affiliation"
              current={affiliationFilter}
              options={["chain", "independent"]}
            />
          </div>
          <div className="flex flex-wrap items-center gap-3 text-[12px] text-slate-600">
            <label className="inline-flex items-center gap-1.5">
              <input
                type="checkbox"
                name="needs_review"
                value="1"
                defaultChecked={needsReviewOnly}
                className="rounded border-slate-300 text-forest-900 focus:ring-forest-900"
              />
              Needs review only
            </label>
            <div className="flex items-center gap-1.5">
              <span className="font-headline text-[9px] font-bold uppercase tracking-[0.22em] text-slate-500">
                Sort by
              </span>
              <select
                name="sort"
                defaultValue={sortKey}
                className="appearance-none rounded-md border border-slate-200 bg-white py-1 pl-2 pr-7 font-mono text-[11px] text-slate-900 focus:border-forest-900 focus:outline-none"
              >
                {SORT_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
            <button
              type="submit"
              className="ml-auto rounded-md bg-forest-900 px-3 py-1.5 font-headline text-[11px] font-extrabold uppercase tracking-[0.22em] text-lime-300 hover:opacity-90"
            >
              Apply filters
            </button>
          </div>
        </form>

        <div className="mt-4">
          <div className="mb-2 flex items-baseline justify-between gap-3">
            <p className="font-headline text-[9.5px] font-extrabold uppercase tracking-[0.22em] text-slate-500">
              {sorted.length} result{sorted.length === 1 ? "" : "s"}
              {sorted.length > VISIBLE_HOTELS && (
                <span className="ml-1 text-slate-400">
                  · showing {VISIBLE_HOTELS} of {sorted.length}
                </span>
              )}
            </p>
            {sorted.length > VISIBLE_HOTELS && (
              <p className="font-mono text-[10px] text-slate-400">
                scroll for the rest ↓
              </p>
            )}
          </div>
          {sorted.length === 0 ? (
            <p className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-[12px] text-slate-500">
              {snap
                ? "No hotels match the current filters."
                : "Snapshot is empty — see the data-plane card above."}
            </p>
          ) : (
            <div
              className="max-h-[360px] overflow-y-auto rounded-lg border border-slate-200 bg-white p-2 ring-1 ring-inset ring-slate-100"
              tabIndex={0}
              aria-label={`Hotel results · ${sorted.length} matches · scroll within this list`}
            >
              {/* 2-cols on sm+ inside the scroll · 3 rows × 2 = 6
                  visible at a glance; single column on mobile. */}
              <ul className="grid gap-2 sm:grid-cols-2">
                {filtered.map((h) => (
                  <li key={h.hotel_id}>
                    <HotelRow hotel={h} />
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </section>
      )}

      {/* Phase 3.c · Search transactions / projects · scoped by active tab */}
      {(activeTab === "transactions" || activeTab === "projects") && (
      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <form className="space-y-3" method="get">
          <input type="hidden" name="tab" value={activeTab} />
          <div className="flex items-center gap-2">
            <Search size={14} className="text-slate-400" aria-hidden />
            <h2 className="font-headline text-[10px] font-extrabold uppercase tracking-[0.28em] text-slate-500">
              {activeTab === "transactions" ? "Search transactions" : "Search projects"}
            </h2>
            <div className="ml-auto">
              <AddDealModal />
            </div>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <div className="relative flex-1">
              <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" aria-hidden />
              <input
                type="text"
                name="dq"
                defaultValue={dq}
                placeholder="Search by asset / project name · buyer · seller · id"
                className="w-full rounded-lg border border-slate-200 bg-white py-2.5 pl-9 pr-3 font-mono text-[12px] text-slate-900 placeholder:text-slate-400 focus:border-forest-900 focus:outline-none"
              />
            </div>
            {/* Kind dropdown removed · the active tab IS the kind */}
            <SelectControl name="dsource" label="Source" current={dsource} options={["costar", "private", "manual_entry"]} />
            <SelectControl name="dmarket" label="Market" current={dmarketFilter} options={Array.from(new Set(allDeals.flatMap((d) => (d.market ? [d.market] : []))))} />
            <SelectControl name="dcountry" label="Country" current={dcountryFilter} options={Array.from(new Set(allDeals.flatMap((d) => (d.country ? [d.country] : []))))} />
          </div>
          <div className="flex flex-wrap items-center gap-3 text-[12px] text-slate-600">
            <div className="flex items-center gap-1.5">
              <span className="font-headline text-[9px] font-bold uppercase tracking-[0.22em] text-slate-500">Sort by</span>
              <select
                name="dsort"
                defaultValue={dsort}
                className="appearance-none rounded-md border border-slate-200 bg-white py-1 pl-2 pr-7 font-mono text-[11px] text-slate-900 focus:border-forest-900 focus:outline-none"
              >
                <option value="date_desc">Date · newest first</option>
                <option value="date_asc">Date · oldest first</option>
                <option value="price_desc">Price · highest first</option>
                <option value="price_asc">Price · lowest first</option>
                <option value="name_asc">Name · A → Z</option>
              </select>
            </div>
            <button
              type="submit"
              className="ml-auto rounded-md bg-forest-900 px-3 py-1.5 font-headline text-[11px] font-extrabold uppercase tracking-[0.22em] text-lime-300 hover:opacity-90"
            >
              Apply filters
            </button>
          </div>
        </form>

        <div className="mt-4">
          <div className="mb-2 flex items-baseline justify-between gap-3">
            <p className="font-headline text-[9.5px] font-extrabold uppercase tracking-[0.22em] text-slate-500">
              {filteredDeals.length} result{filteredDeals.length === 1 ? "" : "s"}
              {filteredDeals.length > 6 && (
                <span className="ml-1 text-slate-400">· showing 6 of {filteredDeals.length}</span>
              )}
            </p>
            {filteredDeals.length > 6 && (
              <p className="font-mono text-[10px] text-slate-400">scroll for the rest ↓</p>
            )}
          </div>
          {filteredDeals.length === 0 ? (
            <p className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-[12px] text-slate-500">
              No transactions or projects match the current filters.
            </p>
          ) : (
            <div
              className="max-h-[360px] overflow-y-auto rounded-lg border border-slate-200 bg-white p-2 ring-1 ring-inset ring-slate-100"
              tabIndex={0}
              aria-label={`Deal results · ${filteredDeals.length} matches · scroll within this list`}
            >
              <ul className="grid gap-2 sm:grid-cols-2">
                {filteredDeals.map((d) => (
                  <li key={`${d.kind}-${d.id}`}>
                    <DealRow deal={d} />
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </section>
      )}

      {/* Reconciliation queue · RECONCILIATION TAB */}
      {activeTab === "reconciliation" && (
      <section id="reconciliation-queue" className="scroll-mt-24 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="mb-3 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <AlertTriangle size={14} className="text-amber-400" aria-hidden />
            <h2 className="font-headline text-[10px] font-extrabold uppercase tracking-[0.28em] text-slate-500">
              Reconciliation queue · {snap?.totals.reconciliation_queue ?? 0}
            </h2>
          </div>
          {snap && snap.reconciliation_queue.length > VISIBLE_RECON && (
            <p className="font-headline text-[9.5px] font-extrabold uppercase tracking-[0.22em] text-slate-500">
              showing {VISIBLE_RECON} of {snap.reconciliation_queue.length} entries
              <span className="ml-1 font-mono text-[10px] font-normal text-slate-400">
                scroll ↓
              </span>
            </p>
          )}
        </div>
        {!snap || snap.reconciliation_queue.length === 0 ? (
          <p className="rounded-lg border border-emerald-500/30 bg-emerald-50/60 p-3 text-[12px] leading-relaxed text-emerald-900">
            No entries — clean queue.
          </p>
        ) : (
          <div
            className="max-h-[280px] overflow-y-auto rounded-lg border border-slate-200 bg-white p-2 ring-1 ring-inset ring-slate-100"
            tabIndex={0}
            aria-label={`Reconciliation queue · ${snap.reconciliation_queue.length} entries · scroll within this list`}
          >
            <ul className="space-y-2">
              {snap.reconciliation_queue.map((e) => (
                <li key={e.id}>
                  <ReconRow entry={e} />
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>
      )}

      {/* Corrections · CORRECTIONS TAB · placeholder until corrections accumulate */}
      {activeTab === "corrections" && (
        <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="mb-3 flex items-center gap-2">
            <AlertTriangle size={14} className="text-emerald-500" aria-hidden />
            <h2 className="font-headline text-[10px] font-extrabold uppercase tracking-[0.28em] text-slate-500">
              Corrections audit
            </h2>
            {snap?.corrections && (
              <span className="ml-auto font-mono text-[10.5px] text-slate-500">
                {snap.corrections.applied_total_in_master} applied · {snap.corrections.pending_before} pending · {snap.corrections.rejected} rejected
              </span>
            )}
          </div>
          <p className="text-[12px] leading-relaxed text-slate-600">
            Operator-submitted corrections to canonical hotel records. Each correction is
            consumed on the next <code className="rounded bg-slate-100 px-1 font-mono text-[10.5px]">ingest.py</code> run · creates
            a supersede entry in the master with full provenance (submitted_by · reason ·
            confidence_before).
          </p>
          {(snap?.corrections?.applied_total_in_master ?? 0) === 0 && (
            <p className="mt-3 rounded-md border border-slate-200 bg-slate-50 p-3 text-[12px] text-slate-500">
              No corrections applied yet. Open any hotel detail and use the
              &ldquo;Submit correction&rdquo; form to queue one. The next
              ingest run will absorb it into the canonical master.
            </p>
          )}
        </section>
      )}

      {/* Analytics tab · placeholder for the deeper analytics views */}
      {activeTab === "analytics" && (
        <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="mb-3 flex items-center gap-2">
            <ExternalLink size={14} className="text-slate-400" aria-hidden />
            <h2 className="font-headline text-[10px] font-extrabold uppercase tracking-[0.28em] text-slate-500">
              Reference
            </h2>
          </div>
          <ul className="space-y-1.5 text-[12px] text-slate-600">
            <li>
              <a
                href="https://github.com/miguelsambricio-cyber/HotelVALORA/blob/main/docs/intelligence/costar-hotels-by-market-schema.md"
                target="_blank"
                rel="noopener noreferrer"
                className="font-mono text-[11.5px] text-slate-600 hover:text-forest-900 hover:underline"
              >
                docs/intelligence/costar-hotels-by-market-schema.md — canonical schema
              </a>
            </li>
            <li>
              <a
                href="https://github.com/miguelsambricio-cyber/HotelVALORA/blob/main/services/costar/scripts/README.md"
                target="_blank"
                rel="noopener noreferrer"
                className="font-mono text-[11.5px] text-slate-600 hover:text-forest-900 hover:underline"
              >
                services/costar/scripts/README.md — pipeline reference
              </a>
            </li>
            <li>
              <Link
                href="/user/admin/agents/costar_market_data"
                className="font-mono text-[11.5px] text-slate-600 hover:text-forest-900 hover:underline"
              >
                /user/admin/agents/costar_market_data — owning agent
              </Link>
            </li>
          </ul>
          <p className="mt-3 rounded-md border border-amber-200 bg-amber-50 p-2.5 text-[11.5px] text-amber-900">
            Analytics tab will host brand coverage · submarket distribution · YoY market
            performance charts · cap-rate distribution. Next iteration.
          </p>
        </section>
      )}
    </div>
  );
}

function matchesQuery(
  h: HotelRecord,
  f: {
    q: string;
    marketFilter: string;
    countryFilter: string;
    chainFilter: string;
    affiliationFilter: string;
    needsReviewOnly: boolean;
  },
): boolean {
  if (f.q) {
    const hay = `${h.name} ${h.brand ?? ""} ${h.operator ?? ""} ${h.hotel_id}`.toLowerCase();
    if (!hay.includes(f.q.toLowerCase())) return false;
  }
  if (f.marketFilter && h.market_name !== f.marketFilter) return false;
  if (f.countryFilter && h.country !== f.countryFilter) return false;
  if (f.chainFilter && (h.chain_scale ?? "") !== f.chainFilter) return false;
  if (f.affiliationFilter && (h.affiliation_type ?? "") !== f.affiliationFilter) return false;
  if (f.needsReviewOnly && (h._meta?.needs_review.length ?? 0) === 0) return false;
  return true;
}

function HotelRow({ hotel }: { hotel: HotelRecord }) {
  const conf = hotel._meta?.confidence ?? 1;
  const needsReview = (hotel._meta?.needs_review.length ?? 0) > 0;
  const isManualNew =
    hotel._meta?.source === "manual_entry" && hotel._meta?.review_status === "new";
  return (
    <Link
      href={`/user/admin/hotels/${encodeURIComponent(hotel.hotel_id)}`}
      className={`group flex items-start gap-3 rounded-xl border p-3 transition-colors hover:bg-white ${
        isManualNew
          ? "border-emerald-300 bg-emerald-50/40 hover:border-emerald-600"
          : "border-slate-200 bg-slate-50/40 hover:border-forest-900"
      }`}
    >
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="truncate font-headline text-[13px] font-extrabold tracking-tight text-forest-900">
            {hotel.name}
          </span>
          {isManualNew && (
            <span
              title={`Manually added · ${hotel._meta?.submitted_by ?? "operator"} · ${hotel._meta?.submitted_at ?? ""}`}
              className="inline-flex items-center rounded bg-emerald-600 px-1.5 py-0.5 font-headline text-[9px] font-extrabold uppercase tracking-[0.22em] text-white"
            >
              NEW
            </span>
          )}
          {hotel.chain_scale && (
            <span className="inline-flex items-center rounded bg-slate-100 px-1.5 py-0.5 font-headline text-[9px] font-bold uppercase tracking-[0.18em] text-slate-700 ring-1 ring-slate-200">
              {hotel.chain_scale.replace(/_/g, " ")}
            </span>
          )}
          {needsReview && !isManualNew && (
            <span className="inline-flex items-center rounded bg-amber-100 px-1.5 py-0.5 font-headline text-[9px] font-bold uppercase tracking-[0.18em] text-amber-800 ring-1 ring-amber-200">
              Review
            </span>
          )}
        </div>
        <p className="mt-0.5 truncate text-[11.5px] text-slate-500">
          {hotel.brand ? `${hotel.brand} · ` : ""}
          {hotel.operator ? `op. ${hotel.operator} · ` : ""}
          {hotel.country} · {hotel.market_name}
          {hotel.submarket_name ? ` · ${hotel.submarket_name}` : ""}
        </p>
        <p className="mt-1 font-mono text-[10.5px] text-slate-500">
          {hotel.rooms_count ? `${hotel.rooms_count} rooms · ` : ""}
          {hotel.year_opened ? `opened ${hotel.year_opened} · ` : ""}
          confidence {(conf * 100).toFixed(0)}%
        </p>
      </div>
      <ArrowUpRight size={14} className="shrink-0 text-slate-300 group-hover:text-forest-900" />
    </Link>
  );
}

interface DealRowItem {
  kind: "transaction" | "project";
  id: string;
  name: string;
  country: string | null;
  market: string | null;
  submarket: string | null;
  source: string;
  is_new: boolean;
  closed_at?: string | null;
  price_eur?: number | null;
  buyer?: string | null;
  seller?: string | null;
  rooms_count?: number | null;
  phase?: string | null;
  status?: string | null;
  opening_date?: string | null;
  stars?: number | null;
  city?: string | null;
}

function DealRow({ deal }: { deal: DealRowItem }) {
  const isTx = deal.kind === "transaction";
  const kindCls = isTx
    ? "bg-violet-100 text-violet-800 ring-violet-200"
    : "bg-cyan-100 text-cyan-800 ring-cyan-200";
  const sourceCls =
    deal.source === "costar"
      ? "bg-slate-100 text-slate-700 ring-slate-200"
      : deal.source === "manual_entry"
        ? "bg-emerald-100 text-emerald-800 ring-emerald-200"
        : "bg-amber-100 text-amber-800 ring-amber-200"; // private

  return (
    <div
      className={`flex h-full flex-col gap-1.5 rounded-xl border p-3 transition-colors ${
        deal.is_new ? "border-emerald-300 bg-emerald-50/40" : "border-slate-200 bg-slate-50/40"
      }`}
    >
      <div className="flex flex-wrap items-center gap-1.5">
        <span className={`rounded px-1.5 py-0.5 font-headline text-[9px] font-extrabold uppercase tracking-[0.18em] ring-1 ${kindCls}`}>
          {isTx ? "TX" : "PROJ"}
        </span>
        <span className={`rounded px-1.5 py-0.5 font-headline text-[9px] font-bold uppercase tracking-[0.18em] ring-1 ${sourceCls}`}>
          {deal.source.replace(/_/g, " ")}
        </span>
        {deal.is_new && (
          <span
            title="Manually added · pending CoStar reconciliation"
            className="rounded bg-emerald-600 px-1.5 py-0.5 font-headline text-[9px] font-extrabold uppercase tracking-[0.22em] text-white"
          >
            NEW
          </span>
        )}
      </div>
      <p className="truncate font-headline text-[13px] font-extrabold tracking-tight text-forest-900">
        {deal.name}
      </p>
      <p className="truncate text-[11.5px] text-slate-500">
        {deal.country ?? "—"}
        {deal.market ? ` · ${deal.market}` : ""}
        {deal.submarket ? ` · ${deal.submarket}` : ""}
        {!isTx && deal.city && !deal.market ? ` · ${deal.city}` : ""}
      </p>
      {isTx ? (
        <div className="flex flex-wrap items-baseline justify-between gap-2 font-mono text-[10.5px] text-slate-600">
          <span>
            {deal.closed_at ? `closed ${deal.closed_at}` : "closed —"}
            {deal.buyer || deal.seller
              ? ` · ${deal.buyer ?? "—"} ← ${deal.seller ?? "—"}`
              : ""}
          </span>
          {deal.price_eur !== null && deal.price_eur !== undefined && (
            <span className="font-headline text-[13px] font-extrabold text-forest-900">
              €{(deal.price_eur / 1_000_000).toFixed(1)}M
            </span>
          )}
        </div>
      ) : (
        <div className="flex flex-wrap items-baseline justify-between gap-2 font-mono text-[10.5px] text-slate-600">
          <span>
            {deal.phase ?? "—"}
            {deal.opening_date ? ` · opens ${deal.opening_date}` : ""}
            {deal.rooms_count ? ` · ${deal.rooms_count}r` : ""}
            {deal.stars ? ` · ${deal.stars}★` : ""}
          </span>
          {deal.status && (
            <span className="font-headline text-[10px] font-bold uppercase tracking-[0.18em] text-slate-700">
              {deal.status}
            </span>
          )}
        </div>
      )}
    </div>
  );
}

function ReconRow({ entry }: { entry: ReconciliationEntry }) {
  const tone = TONE_BY_KIND[entry.kind] ?? "slate";
  const cls =
    tone === "amber"
      ? "border-amber-200 bg-amber-50"
      : tone === "rose"
        ? "border-rose-200 bg-rose-50"
        : "border-slate-200 bg-slate-50";
  return (
    <div className={`rounded-lg border p-3 ${cls}`}>
      <div className="flex flex-wrap items-center gap-2">
        <span className="rounded bg-white px-1.5 py-0.5 font-headline text-[9px] font-extrabold uppercase tracking-[0.18em] text-slate-700 ring-1 ring-slate-200">
          {entry.kind.replace(/_/g, " ")}
        </span>
        {entry.hotel_id && (
          <Link
            href={`/user/admin/hotels/${encodeURIComponent(entry.hotel_id)}`}
            className="font-mono text-[10.5px] text-forest-900 hover:underline"
          >
            {entry.hotel_id}
          </Link>
        )}
        {entry.confidence !== undefined && (
          <span className="font-mono text-[10.5px] text-slate-500">
            conf {(entry.confidence * 100).toFixed(0)}%
          </span>
        )}
        {entry.fuzzy_score !== undefined && (
          <span className="font-mono text-[10.5px] text-slate-500">
            fuzzy {entry.fuzzy_score}
          </span>
        )}
      </div>
      <p className="mt-1 text-[12px] leading-snug text-slate-700">{entry.detail}</p>
      {entry.source_file && (
        <p className="mt-0.5 font-mono text-[10.5px] text-slate-500">{entry.source_file}</p>
      )}
    </div>
  );
}

const TONE_BY_KIND: Record<string, "amber" | "rose" | "slate"> = {
  unrecoverable_row: "rose",
  suspected_duplicate: "amber",
  low_confidence: "amber",
  compset_orphan_target: "rose",
  compset_orphan_member: "amber",
  transaction_orphan: "amber",
};

function Kpi({
  label,
  value,
  tone = "slate",
  href,
  hint,
}: {
  label: string;
  value: number;
  tone?: "slate" | "emerald" | "amber";
  href?: string;
  hint?: string;
}) {
  const toneClass =
    tone === "emerald" ? "text-emerald-700" : tone === "amber" ? "text-amber-700" : "text-forest-900";
  const inner = (
    <div className="rounded-xl border border-slate-200 bg-white p-4 transition-colors hover:border-slate-300">
      <p className="font-headline text-[9px] font-bold uppercase tracking-[0.22em] text-slate-500">
        {label}
      </p>
      <p className={`mt-1 font-headline text-2xl font-extrabold ${toneClass}`}>{value}</p>
      {hint && (
        <p className="mt-1 font-mono text-[10px] leading-snug text-slate-500">{hint}</p>
      )}
    </div>
  );
  if (!href) return inner;
  return (
    <Link href={href} className="block">
      {inner}
    </Link>
  );
}

function BatchStat({
  label,
  value,
  tone = "slate",
  hint,
}: {
  label: string;
  value: number;
  tone?: "slate" | "emerald" | "amber" | "rose";
  hint?: string;
}) {
  const toneClass =
    tone === "emerald"
      ? "text-emerald-700"
      : tone === "amber"
        ? "text-amber-700"
        : tone === "rose"
          ? "text-rose-700"
          : "text-forest-900";
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50/40 p-2.5">
      <p className="font-headline text-[8.5px] font-bold uppercase tracking-[0.22em] text-slate-500">
        {label}
      </p>
      <p className={`mt-0.5 font-headline text-xl font-extrabold tabular-nums ${toneClass}`}>
        {value}
      </p>
      {hint && (
        <p className="mt-0.5 font-mono text-[10px] leading-snug text-slate-500">{hint}</p>
      )}
    </div>
  );
}

function SelectControl({
  name,
  label,
  current,
  options,
}: {
  name: string;
  label: string;
  current: string;
  options: string[];
}) {
  return (
    <div className="relative">
      <select
        name={name}
        defaultValue={current}
        className="appearance-none rounded-lg border border-slate-200 bg-white py-2.5 pl-3 pr-8 font-mono text-[11px] text-slate-900 focus:border-forest-900 focus:outline-none"
      >
        <option value="">{label}</option>
        {Array.from(new Set(options))
          .filter(Boolean)
          .map((o) => (
            <option key={o} value={o}>
              {o}
            </option>
          ))}
      </select>
      <ChevronDown
        size={12}
        className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-slate-400"
        aria-hidden
      />
    </div>
  );
}

function formatRel(iso: string): string {
  const ms = new Date(iso).getTime();
  if (!Number.isFinite(ms)) return "—";
  const diff = Date.now() - ms;
  if (diff < 60_000) return "just now";
  if (diff < 3600_000) return `${Math.round(diff / 60_000)}m ago`;
  if (diff < 86400_000) return `${Math.round(diff / 3600_000)}h ago`;
  return `${Math.round(diff / 86400_000)}d ago`;
}
