import type { Metadata } from "next";
import { Radio, Server, Send, UsersRound, BadgeDollarSign } from "lucide-react";
import { getIntegrationsLive } from "@/lib/admin/integrations/live";
import { IntegrationCard } from "@/components/admin/integrations/integration-card";
import { platformIntegrationsByLayer } from "@/lib/admin/integrations/platform-registry";
import { PlatformIntegrationCard } from "@/components/admin/integrations/platform-integration-card";
import { LayerSection } from "@/components/admin/integrations/layer-section";

export const metadata: Metadata = {
  title: "Administrator · Integrations · HotelVALORA",
  description:
    "Connected platform ecosystem — intelligence sources, infrastructure, communications, relationship intelligence, commercial.",
};

export const dynamic = "force-dynamic";

/**
 * /user/admin/integrations — full operational map of HotelVALORA's
 * connected ecosystem (Phase 2.D.8 architecture).
 *
 * Five operational layers rendered in order. Layer 1 (Intelligence
 * Sources) uses the existing rich IntegrationCard with credentials +
 * session telemetry. Layers 2-5 use the simpler PlatformIntegrationCard
 * driven by lib/admin/integrations/platform-registry.ts.
 *
 * Bloomberg-terminal aesthetic: dark forest-900 / slate-950 cards on
 * the lighter page canvas, lime-300 numerals, tracked-out micro-labels.
 */
export default async function IntegrationsPage() {
  const live = await getIntegrationsLive();
  const platformLayers = platformIntegrationsByLayer();

  // Layer 1 sub-groupings preserved within Intelligence Sources — the
  // operator still benefits from the authenticated-vs-public split.
  const intelligenceGroups: Array<{ label: string; rows: typeof live }> = [
    {
      label: "Authenticated · Spain Market Intelligence",
      rows: live.filter((i) => i.requiresAuth && i.category === "spain_market"),
    },
    {
      label: "Public · European + Spain Market",
      rows: live.filter(
        (i) =>
          !i.requiresAuth &&
          (i.category === "european_market" || i.category === "spain_market"),
      ),
    },
    {
      label: "Public · Global Market + Research Houses",
      rows: live.filter(
        (i) =>
          !i.requiresAuth &&
          (i.category === "global_market" ||
            i.category === "research_house" ||
            i.category === "wire_service"),
      ),
    },
    {
      label: "Deferred · API / Vendor Pending",
      rows: live.filter((i) => !i.enabled),
    },
  ];

  const totalPlatformRows = platformLayers.reduce((n, l) => n + l.rows.length, 0);
  const totalRows = live.length + totalPlatformRows;

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
              Connected Platform Ecosystem
            </h1>
            <p className="mt-2 max-w-3xl text-[13.5px] leading-relaxed text-slate-300/90">
              The full operational map — intelligence feeds, infrastructure dependencies,
              communications wiring, relationship-intelligence upstream sources, and the
              commercial / monetization stack.{" "}
              <span className="font-mono text-lime-300/80">{totalRows}</span> integrations across
              five layers.
            </p>
            <span
              title="Operator-only · internal infrastructure with no customer-facing counterpart by design"
              className="mt-3 inline-flex items-center rounded-md bg-slate-900/60 px-2 py-0.5 font-headline text-[9px] font-extrabold uppercase tracking-[0.25em] text-slate-300 ring-1 ring-inset ring-slate-700/60"
            >
              Operator only · internal infrastructure
            </span>
          </div>
          <SummaryStrip live={live} platformCount={totalPlatformRows} />
        </div>
      </section>

      {/* ── Layer 1 · Intelligence Sources ────────────────────────── */}
      <LayerSection
        number={1}
        label="Intelligence Sources"
        subtitle="The institutional source roster powering the Market Intelligence Agent — RSS, paywalled scrape, public preview."
        count={live.length}
        icon={<Radio size={14} className="text-slate-400" aria-hidden />}
      >
        <div className="space-y-5">
          {intelligenceGroups.map((g) =>
            g.rows.length === 0 ? null : (
              <div key={g.label}>
                <p className="mb-2 font-headline text-[9.5px] font-extrabold uppercase tracking-[0.22em] text-slate-500">
                  {g.label} · {String(g.rows.length).padStart(2, "0")}
                </p>
                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                  {g.rows.map((i) => (
                    <IntegrationCard key={i.id} integration={i} />
                  ))}
                </div>
              </div>
            ),
          )}
        </div>
      </LayerSection>

      {/* ── Layers 2-5 · driven by the platform registry ──────────── */}
      {platformLayers.map((layer) => (
        <LayerSection
          key={layer.layer}
          number={layerNumber(layer.layer)}
          label={layer.label}
          subtitle={layer.subtitle}
          count={layer.rows.length}
          icon={layerIcon(layer.layer)}
        >
          {layer.rows.length === 0 ? (
            <p className="rounded-lg border border-slate-700/50 bg-slate-900/40 p-4 text-[12px] leading-relaxed text-slate-400">
              No integrations registered in this layer yet.
            </p>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {layer.rows.map((i) => (
                <PlatformIntegrationCard key={i.id} integration={i} />
              ))}
            </div>
          )}
        </LayerSection>
      ))}
    </div>
  );
}

function layerNumber(layer: string): number {
  switch (layer) {
    case "infrastructure": return 2;
    case "communications": return 3;
    case "relationship_intelligence": return 4;
    case "commercial": return 5;
    default: return 9;
  }
}

function layerIcon(layer: string): React.ReactNode {
  switch (layer) {
    case "infrastructure": return <Server size={14} className="text-slate-400" aria-hidden />;
    case "communications": return <Send size={14} className="text-slate-400" aria-hidden />;
    case "relationship_intelligence": return <UsersRound size={14} className="text-slate-400" aria-hidden />;
    case "commercial": return <BadgeDollarSign size={14} className="text-slate-400" aria-hidden />;
    default: return null;
  }
}

function SummaryStrip({
  live,
  platformCount,
}: {
  live: Awaited<ReturnType<typeof getIntegrationsLive>>;
  platformCount: number;
}) {
  const ok = live.filter((i) => i.signal === "ok").length;
  const warn = live.filter((i) => i.signal === "warn").length;
  const error = live.filter((i) => i.signal === "error").length;
  const totalInt = live.length;
  return (
    <dl className="grid grid-cols-2 gap-3 text-right md:grid-cols-4">
      <Cell label="Intel · OK" value={ok} dot="emerald" />
      <Cell label="Intel · Warn" value={warn} dot="amber" />
      <Cell label="Intel · Fail" value={error} dot="rose" />
      <Cell label="Platform Layers 2-5" value={platformCount} dot="slate" />
      <Cell label="Intelligence sources" value={totalInt} dot="slate" />
    </dl>
  );
}

function Cell({
  label,
  value,
  dot,
}: {
  label: string;
  value: number;
  dot: "emerald" | "amber" | "rose" | "slate";
}) {
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
