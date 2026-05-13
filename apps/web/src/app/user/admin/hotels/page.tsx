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
  type HotelRecord,
  type ReconciliationEntry,
} from "@/lib/admin/hotels/snapshot-reader";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Hotel Registry · Admin",
  description:
    "Institutional hotel reference registry — search, inspect, reconcile reference hotels backing compsets, valuations, and market reports.",
};

interface PageProps {
  searchParams?: { q?: string; market?: string; country?: string; chain?: string; needs_review?: string };
}

export default async function HotelsPage({ searchParams = {} }: PageProps) {
  const snap = await loadHotelsSnapshot();
  const q = (searchParams.q ?? "").trim();
  const marketFilter = (searchParams.market ?? "").trim();
  const countryFilter = (searchParams.country ?? "").trim().toUpperCase();
  const chainFilter = (searchParams.chain ?? "").trim();
  const needsReviewOnly = searchParams.needs_review === "1";

  const filtered = snap
    ? snap.hotels.filter((h) => matchesQuery(h, { q, marketFilter, countryFilter, chainFilter, needsReviewOnly }))
    : [];

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

      {/* KPI strip */}
      <section className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <Kpi label="Hotels" value={snap?.totals.hotels ?? 0} tone="emerald" />
        <Kpi label="Markets" value={snap?.totals.markets ?? 0} />
        <Kpi label="Compsets" value={snap?.totals.compsets ?? 0} />
        <Kpi label="Transactions" value={snap?.totals.transactions ?? 0} />
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
              ? `${snap.corrections.applied} applied · ${snap.corrections.rejected} rejected · ${snap.corrections.pending_before} pending (this run)`
              : undefined
          }
        />
      </section>

      {/* Data-plane status */}
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
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
          <p className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-[12px] leading-relaxed text-amber-900">
            <strong>No snapshot found.</strong> Run{" "}
            <code className="rounded bg-amber-100 px-1 font-mono text-[10.5px]">
              python services/costar/scripts/ingest.py
            </code>{" "}
            to generate{" "}
            <code className="rounded bg-amber-100 px-1 font-mono text-[10.5px]">
              services/costar/MASTER/snapshot.json
            </code>{" "}
            from the files already in the INPUT folders.
          </p>
        )}
      </section>

      {/* Search */}
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <form className="space-y-3" method="get">
          <div className="flex items-center gap-2">
            <Search size={14} className="text-slate-400" aria-hidden />
            <h2 className="font-headline text-[10px] font-extrabold uppercase tracking-[0.28em] text-slate-500">
              Search hotels
            </h2>
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
              label="Any chain scale"
              current={chainFilter}
              options={["luxury", "upper_upscale", "upscale", "upper_midscale", "midscale", "economy", "independent"]}
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
            <button
              type="submit"
              className="ml-auto rounded-md bg-forest-900 px-3 py-1.5 font-headline text-[11px] font-extrabold uppercase tracking-[0.22em] text-lime-300 hover:opacity-90"
            >
              Apply filters
            </button>
          </div>
        </form>

        <div className="mt-4">
          <p className="mb-2 font-headline text-[9.5px] font-extrabold uppercase tracking-[0.22em] text-slate-500">
            {filtered.length} result{filtered.length === 1 ? "" : "s"}
          </p>
          {filtered.length === 0 ? (
            <p className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-[12px] text-slate-500">
              {snap
                ? "No hotels match the current filters."
                : "Snapshot is empty — see the data-plane card above."}
            </p>
          ) : (
            <ul className="grid gap-2 sm:grid-cols-2">
              {filtered.slice(0, 50).map((h) => (
                <li key={h.hotel_id}>
                  <HotelRow hotel={h} />
                </li>
              ))}
            </ul>
          )}
          {filtered.length > 50 && (
            <p className="mt-2 font-mono text-[10.5px] text-slate-500">
              showing 50 of {filtered.length} · narrow filters to see the rest
            </p>
          )}
        </div>
      </section>

      {/* Reconciliation queue */}
      <section id="reconciliation-queue" className="scroll-mt-24 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-3 flex items-center gap-2">
          <AlertTriangle size={14} className="text-amber-400" aria-hidden />
          <h2 className="font-headline text-[10px] font-extrabold uppercase tracking-[0.28em] text-slate-500">
            Reconciliation queue · {snap?.totals.reconciliation_queue ?? 0}
          </h2>
        </div>
        {!snap || snap.reconciliation_queue.length === 0 ? (
          <p className="rounded-lg border border-emerald-500/30 bg-emerald-50/60 p-3 text-[12px] leading-relaxed text-emerald-900">
            No entries — clean queue.
          </p>
        ) : (
          <ul className="space-y-2">
            {snap.reconciliation_queue.slice(0, 20).map((e) => (
              <li key={e.id}>
                <ReconRow entry={e} />
              </li>
            ))}
            {snap.reconciliation_queue.length > 20 && (
              <li className="font-mono text-[10.5px] text-slate-500">
                showing 20 of {snap.reconciliation_queue.length} entries
              </li>
            )}
          </ul>
        )}
      </section>

      {/* Reference */}
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
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
      </section>
    </div>
  );
}

function matchesQuery(
  h: HotelRecord,
  f: { q: string; marketFilter: string; countryFilter: string; chainFilter: string; needsReviewOnly: boolean },
): boolean {
  if (f.q) {
    const hay = `${h.name} ${h.brand ?? ""} ${h.operator ?? ""} ${h.hotel_id}`.toLowerCase();
    if (!hay.includes(f.q.toLowerCase())) return false;
  }
  if (f.marketFilter && h.market_name !== f.marketFilter) return false;
  if (f.countryFilter && h.country !== f.countryFilter) return false;
  if (f.chainFilter && (h.chain_scale ?? "") !== f.chainFilter) return false;
  if (f.needsReviewOnly && (h._meta?.needs_review.length ?? 0) === 0) return false;
  return true;
}

function HotelRow({ hotel }: { hotel: HotelRecord }) {
  const conf = hotel._meta?.confidence ?? 1;
  const needsReview = (hotel._meta?.needs_review.length ?? 0) > 0;
  return (
    <Link
      href={`/user/admin/hotels/${encodeURIComponent(hotel.hotel_id)}`}
      className="group flex items-start gap-3 rounded-xl border border-slate-200 bg-slate-50/40 p-3 transition-colors hover:border-forest-900 hover:bg-white"
    >
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="truncate font-headline text-[13px] font-extrabold tracking-tight text-forest-900">
            {hotel.name}
          </span>
          {hotel.chain_scale && (
            <span className="inline-flex items-center rounded bg-slate-100 px-1.5 py-0.5 font-headline text-[9px] font-bold uppercase tracking-[0.18em] text-slate-700 ring-1 ring-slate-200">
              {hotel.chain_scale.replace(/_/g, " ")}
            </span>
          )}
          {needsReview && (
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
