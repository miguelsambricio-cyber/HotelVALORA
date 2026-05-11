import type { Metadata } from "next";
import { CircuitBoard, Plug } from "lucide-react";
import { INTEGRATIONS_REGISTRY } from "@/lib/admin/integrations";
import { IntegrationCard } from "@/components/admin/integrations/integration-card";

export const metadata: Metadata = {
  title: "Administrator · Integrations · HotelVALORA",
  description: "Institutional hospitality intelligence sources — connection status, session validity, ingestion health.",
};

/**
 * /user/admin/integrations — the directory of every hospitality intelligence
 * source wired into the platform. Grouped by category, ranked by signal so
 * the operator sees what needs attention first.
 *
 * Bloomberg-terminal aesthetic: dark forest-900 / slate-950 cards on the
 * lighter page canvas, lime-300 numerals, tracked-out micro-labels.
 */
export default function IntegrationsPage() {
  const groups: Array<{ label: string; rows: typeof INTEGRATIONS_REGISTRY }> = [
    {
      label: "Authenticated · Spain Market Intelligence",
      rows: INTEGRATIONS_REGISTRY.filter(
        (i) => i.requiresAuth && i.category === "spain_market",
      ),
    },
    {
      label: "Public · European + Spain Market",
      rows: INTEGRATIONS_REGISTRY.filter(
        (i) =>
          !i.requiresAuth &&
          (i.category === "european_market" || i.category === "spain_market"),
      ),
    },
    {
      label: "Public · Global Market + Research Houses",
      rows: INTEGRATIONS_REGISTRY.filter(
        (i) =>
          !i.requiresAuth &&
          (i.category === "global_market" ||
            i.category === "research_house" ||
            i.category === "wire_service"),
      ),
    },
    {
      label: "Deferred · API / Vendor Pending",
      rows: INTEGRATIONS_REGISTRY.filter((i) => !i.enabled),
    },
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <section className="overflow-hidden rounded-2xl border border-slate-800/60 bg-gradient-to-b from-forest-900 to-slate-950 p-7 shadow-sm">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="font-headline text-[9px] font-bold uppercase tracking-[0.24em] text-lime-300/80">
              Administrator · Integrations
            </p>
            <h1 className="mt-2 font-headline text-3xl font-extrabold tracking-tighter text-white sm:text-4xl">
              Hospitality Intelligence Sources
            </h1>
            <p className="mt-2 max-w-3xl text-[13.5px] leading-relaxed text-slate-300/90">
              The institutional source roster powering the Market Intelligence Agent. Each integration
              surfaces its connection state, authentication posture, ingestion health, and article volume.
              Authenticated sources (Hosteltur · Alimarket) implement the three-tier credential model —
              raw secrets never reach the database.
            </p>
          </div>
          <SummaryStrip />
        </div>
      </section>

      {/* Groups */}
      {groups.map((g) =>
        g.rows.length === 0 ? null : (
          <section key={g.label}>
            <header className="mb-3 flex items-center gap-3 px-1">
              <Plug size={14} className="text-slate-400" aria-hidden />
              <h2 className="font-headline text-[10px] font-extrabold uppercase tracking-[0.25em] text-slate-500">
                {g.label}
              </h2>
              <span className="font-mono text-[11px] text-slate-400">
                {String(g.rows.length).padStart(2, "0")}
              </span>
            </header>
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {g.rows.map((i) => (
                <IntegrationCard key={i.id} integration={i} />
              ))}
            </div>
          </section>
        ),
      )}

      {/* Footer affordance */}
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-start gap-3">
          <CircuitBoard size={18} className="mt-0.5 text-forest-900" aria-hidden />
          <div className="space-y-1.5">
            <p className="font-headline text-[10px] font-extrabold uppercase tracking-[0.25em] text-slate-500">
              Phase 3 swap-target
            </p>
            <p className="text-[13px] leading-relaxed text-slate-700">
              Every card on this page reads from a single mock module at{" "}
              <code className="rounded bg-slate-100 px-1 py-0.5 font-mono text-[11.5px] text-slate-700">
                lib/admin/integrations/registry.ts
              </code>
              . Phase 3 replaces it with a Supabase read across{" "}
              <code className="rounded bg-slate-100 px-1 py-0.5 font-mono text-[11.5px] text-slate-700">
                public.sources × intelligence_source_sessions × news_ingestion_runs
              </code>
              . Component code is unchanged; the swap is mechanical.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}

function SummaryStrip() {
  const ok = INTEGRATIONS_REGISTRY.filter((i) => i.signal === "ok").length;
  const warn = INTEGRATIONS_REGISTRY.filter((i) => i.signal === "warn").length;
  const error = INTEGRATIONS_REGISTRY.filter((i) => i.signal === "error").length;
  const neutral = INTEGRATIONS_REGISTRY.filter((i) => i.signal === "neutral").length;
  return (
    <dl className="grid grid-cols-2 gap-3 text-right md:grid-cols-4">
      <Cell label="Operational" value={ok} dot="emerald" />
      <Cell label="Attention" value={warn} dot="amber" />
      <Cell label="Failing" value={error} dot="rose" />
      <Cell label="Not Configured" value={neutral} dot="slate" />
    </dl>
  );
}

function Cell({ label, value, dot }: { label: string; value: number; dot: "emerald" | "amber" | "rose" | "slate" }) {
  const dotClass = {
    emerald: "bg-emerald-400",
    amber: "bg-amber-400",
    rose: "bg-rose-500",
    slate: "bg-slate-500",
  }[dot];
  return (
    <div className="rounded-lg border border-slate-800/60 bg-slate-900/40 px-3 py-2">
      <dt className="flex items-center justify-end gap-1.5 font-headline text-[9px] font-bold uppercase tracking-[0.22em] text-slate-400">
        <span aria-hidden className={`inline-block h-1.5 w-1.5 rounded-full ${dotClass}`} />
        {label}
      </dt>
      <dd className="mt-1 font-headline text-2xl font-extrabold text-lime-300">{value}</dd>
    </div>
  );
}
