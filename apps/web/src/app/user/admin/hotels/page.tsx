import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, Building2, Search, Database, AlertTriangle, ExternalLink } from "lucide-react";
import { loadHotelsRegistryStatus } from "@/lib/admin/hotels/registry";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Hotel Registry · Admin",
  description:
    "Institutional hotel reference registry — search, inspect, edit reference hotels backing compsets, valuations, and market reports.",
};

/**
 * /user/admin/hotels — Hotel Reference Registry.
 *
 * Read-only scaffold today. The canonical inventory lives in
 * `services/costar/HOTELES POR MERCADO/` as XLSX masters; the runtime
 * read path activates once one of:
 *   1. `build_masters.py` v1.2 ships the new master + a JSON snapshot
 *   2. Phase 5 mirrors the master into Supabase
 *
 * Why this page exists already: the COSTAR & Hotel Reference Agent is
 * the owner of this data, and operators need a destination for the
 * reconciliation-queue work (dedup detection · missing fields ·
 * suspicious changes) once the pipeline ships. Standing the route up
 * now means the agent dashboards can link to it without dangling refs.
 */
export default async function HotelsPage() {
  const status = await loadHotelsRegistryStatus();

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <Link
        href="/user/admin"
        className="inline-flex items-center gap-1.5 font-headline text-[11px] font-bold uppercase tracking-[0.22em] text-slate-500 hover:text-forest-900"
      >
        <ArrowLeft size={12} /> Executive Control Room
      </Link>

      {/* Header */}
      <header className="space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-md bg-amber-100 px-2 py-0.5 font-headline text-[9px] font-extrabold uppercase tracking-[0.25em] text-amber-800 ring-1 ring-inset ring-amber-200">
            Scaffold · Read-only
          </span>
          <span
            title="Operator-only · reference data plane owned by the COSTAR & Hotel Reference Agent"
            className="rounded-md bg-slate-100 px-2 py-0.5 font-headline text-[9px] font-extrabold uppercase tracking-[0.25em] text-slate-600 ring-1 ring-inset ring-slate-200"
          >
            Operator only · reference data
          </span>
          <span className="font-headline text-[10px] font-extrabold uppercase tracking-[0.32em] text-slate-500">
            Hotel Reference Registry
          </span>
        </div>
        <h1 className="font-headline text-3xl font-extrabold tracking-tighter text-forest-900 sm:text-[34px]">
          Hotel Registry
        </h1>
        <p className="max-w-3xl text-[13.5px] leading-relaxed text-slate-600">
          Institutional source of truth for reference hotels — the backbone of compsets,
          valuations, benchmarking, and market reports. Search, inspect, and edit hotel
          characteristics when an ingestion error or hallucinated attribute needs correction.
        </p>
      </header>

      {/* Data-plane status card */}
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-3 flex items-center gap-2">
          <Database size={14} className="text-slate-400" aria-hidden />
          <h2 className="font-headline text-[10px] font-extrabold uppercase tracking-[0.28em] text-slate-500">
            Data plane
          </h2>
        </div>
        <dl className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <Stat label="Plane" value={planeLabel(status.dataPlane)} hint={planeHint(status.dataPlane)} />
          <Stat label="Normalization" value={status.normalizationVersion} />
          <Stat
            label="Rows in master"
            value={status.rowsInMaster === null ? "—" : String(status.rowsInMaster)}
            hint={status.rowsInMaster === null ? "Pending build_masters v1.2" : undefined}
          />
          <Stat
            label="Markets"
            value={status.marketsRepresented.length === 0 ? "—" : status.marketsRepresented.join(" · ")}
          />
        </dl>
      </section>

      {/* Search (UI-only stub) */}
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-3 flex items-center gap-2">
          <Search size={14} className="text-slate-400" aria-hidden />
          <h2 className="font-headline text-[10px] font-extrabold uppercase tracking-[0.28em] text-slate-500">
            Search hotels · planned
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
              disabled
              placeholder="Search by name · brand · operator · hotel_id"
              aria-disabled
              className="w-full cursor-not-allowed rounded-lg border border-slate-200 bg-slate-50 py-2.5 pl-9 pr-3 font-mono text-[12px] text-slate-400 placeholder:text-slate-400"
            />
          </div>
          <select
            disabled
            aria-disabled
            className="cursor-not-allowed rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 font-mono text-[11px] text-slate-400"
          >
            <option>Any market</option>
          </select>
          <select
            disabled
            aria-disabled
            className="cursor-not-allowed rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 font-mono text-[11px] text-slate-400"
          >
            <option>Any chain scale</option>
          </select>
        </div>
        <p className="mt-2 text-[11.5px] leading-relaxed text-slate-500">
          Search activates when the Phase-5 Supabase mirror lands. The COSTAR & Hotel
          Reference Agent will populate the index from <code className="rounded bg-slate-100 px-1 font-mono text-[10.5px]">services/costar/HOTELES POR MERCADO/MASTER/</code>.
        </p>
      </section>

      {/* Capabilities · planned */}
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-3 flex items-center gap-2">
          <Building2 size={14} className="text-slate-400" aria-hidden />
          <h2 className="font-headline text-[10px] font-extrabold uppercase tracking-[0.28em] text-slate-500">
            Planned capabilities
          </h2>
        </div>
        <ul className="grid gap-2 sm:grid-cols-2">
          {CAPABILITIES.map((cap) => (
            <li
              key={cap.label}
              className="flex items-start gap-2 rounded-lg border border-slate-200 bg-slate-50/40 p-3"
            >
              <span aria-hidden className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-slate-400" />
              <div className="min-w-0">
                <p className="font-headline text-[12px] font-extrabold tracking-tight text-forest-900">
                  {cap.label}
                </p>
                <p className="mt-0.5 text-[11px] leading-snug text-slate-500">{cap.detail}</p>
              </div>
            </li>
          ))}
        </ul>
      </section>

      {/* Reconciliation queue · empty state */}
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-3 flex items-center gap-2">
          <AlertTriangle size={14} className="text-amber-400" aria-hidden />
          <h2 className="font-headline text-[10px] font-extrabold uppercase tracking-[0.28em] text-slate-500">
            Reconciliation queue · {status.reconciliationQueueSize}
          </h2>
        </div>
        {status.reconciliationQueueSize === 0 ? (
          <p className="rounded-lg border border-emerald-500/30 bg-emerald-50/60 p-3 text-[12px] leading-relaxed text-emerald-900">
            No entries — empty queue. Once the v1.2 ingestion pipeline lands, suspicious
            attribute changes, missing required fields, and orphan compset references will
            surface here for operator review.
          </p>
        ) : (
          <p className="rounded-lg border border-amber-500/30 bg-amber-50/60 p-3 text-[12px] leading-relaxed text-amber-900">
            {status.reconciliationQueueSize} entries pending review.
          </p>
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
              docs/intelligence/costar-hotels-by-market-schema.md — schema
            </a>
          </li>
          <li>
            <a
              href="https://github.com/miguelsambricio-cyber/HotelVALORA/blob/main/services/costar/README.md"
              target="_blank"
              rel="noopener noreferrer"
              className="font-mono text-[11.5px] text-slate-600 hover:text-forest-900 hover:underline"
            >
              services/costar/README.md — workspace
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

function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div>
      <p className="font-headline text-[9px] font-bold uppercase tracking-[0.22em] text-slate-500">
        {label}
      </p>
      <p className="mt-1 font-headline text-base font-extrabold text-forest-900">{value}</p>
      {hint && <p className="mt-0.5 font-mono text-[10.5px] text-slate-500">{hint}</p>}
    </div>
  );
}

function planeLabel(plane: string): string {
  switch (plane) {
    case "xlsx_master": return "XLSX master";
    case "supabase_mirror": return "Supabase (mirror)";
    case "supabase_canonical": return "Supabase (canonical)";
    default: return plane;
  }
}

function planeHint(plane: string): string {
  switch (plane) {
    case "xlsx_master": return "services/costar/HOTELES POR MERCADO/";
    case "supabase_mirror": return "Read-path on Postgres; XLSX still canonical";
    case "supabase_canonical": return "Postgres is source of truth";
    default: return "";
  }
}

const CAPABILITIES = [
  {
    label: "Search hotels",
    detail: "By name · brand · operator · hotel_id · market · chain scale · score.",
  },
  {
    label: "Inspect hotel profile",
    detail: "Full attribute set — facilities · amenities · category · rooms · geo · owner.",
  },
  {
    label: "Edit hotel characteristics",
    detail: "Operator corrects hallucinated or stale fields. Writes a supersede row with audit.",
  },
  {
    label: "Inspect compset membership",
    detail: "Which target hotels include this one in their competitive set.",
  },
  {
    label: "Inspect market assignment",
    detail: "Country · market · submarket — joined to the period KPIs in MERCADO masters.",
  },
  {
    label: "Inspect operator / owner relationships",
    detail: "Cross-reference the relationship graph in /user/admin/contacts.",
  },
  {
    label: "Inspect facilities & scoring",
    detail: "Normalised facility codes + external platform scores (Booking, Tripadvisor).",
  },
  {
    label: "Version history / audit trail",
    detail: "Every supersede produces an INGESTION_LOG row + ai_events entry.",
  },
];
