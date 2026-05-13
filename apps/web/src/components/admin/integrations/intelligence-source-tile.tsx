import Link from "next/link";
import { ExternalLink, ArrowUpRight, Database, Globe, KeyRound, Rss } from "lucide-react";
import type { IntegrationDescriptor } from "@/lib/admin/integrations";
import { classifyIntelligenceSource, type UnifiedStatus } from "@/lib/admin/integrations/unified-status";
import {
  AuthStatusBadge,
  ConnectionStatusBadge,
} from "./integration-status-badge";
import { IntegrationTile } from "./integration-tile";
import { IntegrationDetailSheet } from "./integration-detail-sheet";

/**
 * Intelligence source · compact tile + click-to-expand detail sheet.
 *
 * Same canonical infra-indicator visual as `<PlatformIntegrationTile>`.
 * The dossier in the sheet preserves the full session + credentials +
 * ingestion-health telemetry that the previous large `IntegrationCard`
 * surfaced, plus an "Open full dossier" link to the dedicated
 * `/user/admin/integrations/[id]` page when deeper drill-down is needed.
 */
export function IntelligenceSourceTile({
  integration,
}: {
  integration: IntegrationDescriptor;
}) {
  const status = classifyIntelligenceSource(integration);
  return (
    <IntegrationDetailSheet
      title={integration.name}
      summary={
        <IntegrationTile
          signal={integration.signal}
          name={integration.name}
          statusLabel={STATUS_LABEL[status]}
          status={status}
          regionLabel={`${integration.region} · ${integration.language.toUpperCase()}`}
          description={integration.tagline}
          metadata={compactMetadata(integration)}
        />
      }
    >
      <IntelligenceSourceDetail integration={integration} status={status} />
    </IntegrationDetailSheet>
  );
}

function compactMetadata(i: IntegrationDescriptor): string {
  const parts: string[] = [];
  parts.push(kindLabel(i.ingestionKind));
  parts.push(`${i.health.articles7d} · 7d`);
  parts.push(`reliability ${Math.round(i.reliabilityScore * 100)}%`);
  return parts.join(" · ");
}

const STATUS_LABEL: Record<UnifiedStatus, string> = {
  live: "Live",
  partial: "Partial",
  not_wired: "Not wired",
  fail: "Fail",
  planned: "Planned",
};

// ── detail panel ────────────────────────────────────────────────────────────

function IntelligenceSourceDetail({
  integration,
  status,
}: {
  integration: IntegrationDescriptor;
  status: UnifiedStatus;
}) {
  return (
    <div className="space-y-5">
      <div>
        <div className="flex items-center gap-2">
          <KindGlyph kind={integration.ingestionKind} />
          <p className="font-headline text-[9px] font-bold uppercase tracking-[0.22em] text-slate-500">
            {tierLabel(integration.tier)} · {STATUS_LABEL[status]}
          </p>
        </div>
        <p className="mt-2 text-[12.5px] leading-relaxed text-slate-300/90">
          {integration.tagline}
        </p>
        <p className="mt-1 font-headline text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">
          {integration.region} · {integration.language.toUpperCase()} ·{" "}
          {kindLabel(integration.ingestionKind)}
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        <ConnectionStatusBadge status={integration.connection} />
        {integration.requiresAuth && integration.session && (
          <AuthStatusBadge status={integration.session.status} />
        )}
        {!integration.requiresAuth && <AuthStatusBadge status="no_auth_required" />}
      </div>

      <dl className="grid grid-cols-3 divide-x divide-slate-800/60 border-y border-slate-800/60 py-3">
        <Metric label="Articles · Today" value={String(integration.health.articlesToday)} />
        <Metric label="Articles · 7d" value={String(integration.health.articles7d)} />
        <Metric label="Articles · 30d" value={String(integration.health.articles30d)} />
      </dl>

      <div className="grid grid-cols-2 gap-3 text-[11px]">
        <Field label="Last sync" value={formatRelativeUtc(integration.health.lastRunAt)} />
        <Field label="Reliability" value={`${(integration.reliabilityScore * 100).toFixed(0)}%`} />
      </div>

      {integration.notes.length > 0 && (
        <ul className="space-y-1.5 border-t border-slate-800/60 pt-3">
          <p className="mb-1 font-headline text-[9px] font-bold uppercase tracking-[0.22em] text-slate-500">
            Operational notes
          </p>
          {integration.notes.map((note, idx) => (
            <li
              key={idx}
              className="flex items-start gap-1.5 text-[11.5px] leading-snug text-slate-400"
            >
              <span aria-hidden className="mt-1.5 inline-block h-1 w-1 shrink-0 rounded-full bg-slate-500" />
              <span>{note}</span>
            </li>
          ))}
        </ul>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-800/60 pt-3">
        <div className="flex flex-wrap items-center gap-3 text-[10.5px]">
          {integration.externalLinks.map((link) => (
            <a
              key={link.href}
              href={link.href}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 font-mono text-slate-400 hover:text-lime-300"
            >
              <ExternalLink size={10} />
              {link.label}
            </a>
          ))}
        </div>
        <Link
          href={`/user/admin/integrations/${integration.id}`}
          className="inline-flex items-center gap-1 rounded-md bg-slate-900/60 px-2 py-1 font-headline text-[9.5px] font-bold uppercase tracking-[0.22em] text-lime-300 ring-1 ring-inset ring-slate-700/60 hover:bg-slate-900 hover:text-lime-200"
        >
          Open full dossier
          <ArrowUpRight size={11} />
        </Link>
      </div>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="px-3 first:pl-0 last:pr-0">
      <dt className="font-headline text-[9px] font-bold uppercase tracking-[0.22em] text-slate-500">
        {label}
      </dt>
      <dd className="mt-1 font-headline text-lg font-extrabold text-lime-300">{value}</dd>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="font-headline text-[9px] font-bold uppercase tracking-[0.22em] text-slate-500">
        {label}
      </p>
      <p className="mt-0.5 font-mono text-[11px] text-slate-300">{value}</p>
    </div>
  );
}

function KindGlyph({ kind }: { kind: IntegrationDescriptor["ingestionKind"] }) {
  const cls = "text-slate-500";
  if (kind === "rss") return <Rss size={12} className={cls} aria-hidden />;
  if (kind === "api") return <KeyRound size={12} className={cls} aria-hidden />;
  if (kind === "scrape") return <Globe size={12} className={cls} aria-hidden />;
  return <Database size={12} className={cls} aria-hidden />;
}

function kindLabel(kind: IntegrationDescriptor["ingestionKind"]): string {
  if (kind === "rss") return "RSS";
  if (kind === "api") return "API";
  if (kind === "scrape") return "Scrape";
  return "Manual";
}

function tierLabel(tier: IntegrationDescriptor["tier"]): string {
  if (tier === "free_public") return "Public";
  if (tier === "freemium_premium") return "Freemium · Premium";
  if (tier === "paid_subscription") return "Paid Subscription";
  return "Paid API";
}

function formatRelativeUtc(iso: string | null): string {
  if (!iso) return "Never";
  const ts = new Date(iso).getTime();
  if (!Number.isFinite(ts)) return "Never";
  const diffMs = Date.now() - ts;
  const mins = Math.round(diffMs / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.round(mins / 60);
  if (hours < 36) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  return `${days}d ago`;
}
