import Link from "next/link";
import { ArrowUpRight, Database, Globe, KeyRound, Rss } from "lucide-react";
import { cn } from "@/lib/utils";
import { SIGNAL_VISUAL } from "@/components/admin/dashboard/signal-tints";
import type { IntegrationDescriptor } from "@/lib/admin/integrations";
import {
  AuthStatusBadge,
  ConnectionStatusBadge,
} from "./integration-status-badge";

/**
 * Card surface for one integration on /user/admin/integrations.
 *
 * Visual contract: dark forest-900 / slate-950 canvas, lime-300 numerals,
 * tracked-out uppercase micro-labels — the same institutional terminal
 * aesthetic as the Executive Control Room.
 *
 * Clicking anywhere on the card navigates to the detail page; secondary
 * controls (external links, refresh CTA) live inside the detail surface.
 */
export function IntegrationCard({
  integration,
}: {
  integration: IntegrationDescriptor;
}) {
  const signal = SIGNAL_VISUAL[integration.signal];
  return (
    <Link
      href={`/user/admin/integrations/${integration.id}`}
      className="group relative block overflow-hidden rounded-2xl border border-slate-800/60 bg-gradient-to-b from-forest-900 to-slate-950 p-5 shadow-sm transition-all hover:border-lime-300/40 hover:shadow-lime-300/5"
    >
      {/* Side rail */}
      <span aria-hidden className={cn("absolute left-0 top-0 h-full w-1", signal.rail)} />

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <KindGlyph kind={integration.ingestionKind} />
            <p className="font-headline text-[9px] font-bold uppercase tracking-[0.24em] text-slate-400">
              {tierLabel(integration.tier)}
            </p>
          </div>
          <h3 className="mt-2 font-headline text-xl font-extrabold tracking-tighter text-white">
            {integration.name}
          </h3>
          <p className="mt-0.5 font-headline text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">
            {integration.region} · {integration.language.toUpperCase()} ·{" "}
            {kindLabel(integration.ingestionKind)}
          </p>
        </div>
        <ArrowUpRight
          size={18}
          className="text-slate-500 transition-colors group-hover:text-lime-300"
          aria-hidden
        />
      </div>

      {/* Tagline */}
      <p className="mt-4 text-[12.5px] leading-relaxed text-slate-300/90">
        {integration.tagline}
      </p>

      {/* Status row */}
      <div className="mt-5 flex flex-wrap gap-2">
        <ConnectionStatusBadge status={integration.connection} />
        {integration.requiresAuth && integration.session && (
          <AuthStatusBadge status={integration.session.status} />
        )}
        {!integration.requiresAuth && (
          <AuthStatusBadge status="no_auth_required" />
        )}
      </div>

      {/* Metrics dl */}
      <dl className="mt-5 grid grid-cols-3 divide-x divide-slate-800/60 border-t border-slate-800/60 pt-4">
        <Metric label="Articles · Today" value={String(integration.health.articlesToday)} />
        <Metric label="Articles · 7d" value={String(integration.health.articles7d)} />
        <Metric label="Articles · 30d" value={String(integration.health.articles30d)} />
      </dl>

      {/* Footer */}
      <div className="mt-4 flex items-center justify-between font-headline text-[9px] font-bold uppercase tracking-[0.22em] text-slate-500">
        <span>Last Sync · {formatRelativeUtc(integration.health.lastRunAt)}</span>
        <span className="text-slate-400">Reliability {(integration.reliabilityScore * 100).toFixed(0)}%</span>
      </div>
    </Link>
  );
}

// ── helpers ─────────────────────────────────────────────────────────────────

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
