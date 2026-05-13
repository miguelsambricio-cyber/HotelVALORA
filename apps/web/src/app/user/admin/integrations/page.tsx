import type { Metadata } from "next";
import { Radio, Server, Send, UsersRound, BadgeDollarSign, Lock, BrainCircuit, LineChart, GitBranch } from "lucide-react";
import { getIntegrationsLive } from "@/lib/admin/integrations/live";
import { IntelligenceSourceTile } from "@/components/admin/integrations/intelligence-source-tile";
import {
  platformIntegrationsByLayer,
  PLATFORM_LAYER_META,
  PLATFORM_INTEGRATIONS,
} from "@/lib/admin/integrations/platform-registry";
import { PlatformIntegrationTile } from "@/components/admin/integrations/platform-integration-tile";
import { LayerSection } from "@/components/admin/integrations/layer-section";
import { computeUnifiedCounts } from "@/lib/admin/integrations/unified-status";
import { HeroKPIs } from "@/components/admin/integrations/hero-kpis";
import { OperationalStrip } from "@/components/admin/integrations/operational-strip";

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
 * Nine operational layers rendered in operational order. Every
 * integration is now a compact tile (`IntegrationTile`) matching the
 * canonical infra-indicator visual contract from /user/admin Section 05
 * (Infrastructure Monitoring). Clicking a tile opens the full technical
 * dossier in a responsive sheet — bottom sheet on mobile, right-side
 * drawer on desktop.
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
  const counts = computeUnifiedCounts(live, PLATFORM_INTEGRATIONS);

  return (
    <div className="space-y-8">
      {/* Hero — institutional infrastructure observability dashboard
            (compact density · ~25% tighter than the original showcase pass) */}
      <section className="overflow-hidden rounded-2xl border border-slate-800/60 bg-gradient-to-b from-forest-900 to-slate-950 p-3 shadow-sm sm:p-4">
        <div className="mb-3 flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <p className="font-headline text-[9px] font-bold uppercase tracking-[0.24em] text-lime-300/80">
                Administrator · Integrations
              </p>
              <span
                title="Operator-only · internal infrastructure with no customer-facing counterpart by design"
                className="inline-flex items-center rounded-md bg-slate-900/60 px-1.5 py-0.5 font-headline text-[8.5px] font-extrabold uppercase tracking-[0.22em] text-slate-300 ring-1 ring-inset ring-slate-700/60"
              >
                Operator only · internal
              </span>
            </div>
            <h1 className="mt-1.5 font-headline text-2xl font-extrabold tracking-tighter text-white sm:text-3xl">
              Connected Platform Ecosystem
            </h1>
            <p className="mt-1 max-w-3xl text-[12px] leading-snug text-slate-400">
              Institutional infrastructure observability — every vendor, every layer, real-time
              health across the nine operational tiers of HotelVALORA.
            </p>
          </div>
        </div>

        <HeroKPIs counts={counts} />

        <div className="mt-2.5">
          <OperationalStrip totalIntegrations={counts.total} totalLayers={9} />
        </div>
      </section>

      {/* Render layers in operational order:
            1 Infrastructure · 2 Auth · 3 AI · 4 Analytics · 5 Communications
            6 Intelligence Sources (rich card · separate registry · slotted after Communications)
            7 Relationship Intelligence · 8 Commercial · 9 Developer Infrastructure */}
      {platformLayers
        .filter((l) => PLATFORM_LAYER_META[l.layer].order <= 5)
        .map((layer) => (
          <PlatformLayer key={layer.layer} layer={layer} />
        ))}

      <LayerSection
        number={6}
        label="Intelligence Sources"
        subtitle="The institutional source roster powering the Market Intelligence Agent — RSS, paywalled scrape, public preview. Rich session + credentials telemetry preserved."
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
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
                  {g.rows.map((i) => (
                    <IntelligenceSourceTile key={i.id} integration={i} />
                  ))}
                </div>
              </div>
            ),
          )}
        </div>
      </LayerSection>

      {platformLayers
        .filter((l) => PLATFORM_LAYER_META[l.layer].order > 5)
        .map((layer) => (
          <PlatformLayer key={layer.layer} layer={layer} />
        ))}
    </div>
  );
}

function PlatformLayer({
  layer,
}: {
  layer: ReturnType<typeof platformIntegrationsByLayer>[number];
}) {
  return (
    <LayerSection
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
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
          {layer.rows.map((i) => (
            <PlatformIntegrationTile key={i.id} integration={i} />
          ))}
        </div>
      )}
    </LayerSection>
  );
}

function layerNumber(layer: string): number {
  switch (layer) {
    case "infrastructure": return 1;
    case "auth": return 2;
    case "ai": return 3;
    case "analytics": return 4;
    case "communications": return 5;
    // 6 reserved for Intelligence Sources (rendered separately after Communications)
    case "relationship_intelligence": return 7;
    case "commercial": return 8;
    case "developer_infrastructure": return 9;
    default: return 99;
  }
}

function layerIcon(layer: string): React.ReactNode {
  switch (layer) {
    case "infrastructure": return <Server size={14} className="text-slate-400" aria-hidden />;
    case "auth": return <Lock size={14} className="text-slate-400" aria-hidden />;
    case "ai": return <BrainCircuit size={14} className="text-slate-400" aria-hidden />;
    case "analytics": return <LineChart size={14} className="text-slate-400" aria-hidden />;
    case "communications": return <Send size={14} className="text-slate-400" aria-hidden />;
    case "relationship_intelligence": return <UsersRound size={14} className="text-slate-400" aria-hidden />;
    case "commercial": return <BadgeDollarSign size={14} className="text-slate-400" aria-hidden />;
    case "developer_infrastructure": return <GitBranch size={14} className="text-slate-400" aria-hidden />;
    default: return null;
  }
}

