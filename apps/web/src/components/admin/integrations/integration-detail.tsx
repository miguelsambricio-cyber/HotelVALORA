import Link from "next/link";
import { ArrowLeft, ExternalLink } from "lucide-react";
import type { IntegrationDescriptor } from "@/lib/admin/integrations";
import type { CredentialStatusDescriptor } from "@/lib/intelligence/credentials";
import { SessionStatusPanel } from "./session-status-panel";
import { CredentialsPanel } from "./credentials-panel";
import {
  AuthStatusBadge,
  ConnectionStatusBadge,
} from "./integration-status-badge";

/**
 * Per-integration detail page. Composes:
 *   - Header (name · region · tagline · connection + auth badges)
 *   - Telemetry strip (ingestion health · reliability · auth)
 *   - CredentialsPanel (T1.5 — only when requiresAuth and a descriptor is provided)
 *   - SessionStatusPanel (T2)
 *   - Ingestion health card (7d run rollup)
 *   - Notes + external links
 */
export function IntegrationDetail({
  integration,
  credentialDescriptor,
}: {
  integration: IntegrationDescriptor;
  credentialDescriptor?: CredentialStatusDescriptor;
}) {
  return (
    <div className="space-y-6">
      <Link
        href="/user/admin/integrations"
        className="inline-flex items-center gap-1.5 font-headline text-[11px] font-bold uppercase tracking-[0.22em] text-slate-500 hover:text-forest-900"
      >
        <ArrowLeft size={12} /> Integrations Directory
      </Link>

      {/* Header card · dark canvas (Bloomberg-terminal) */}
      <section className="overflow-hidden rounded-2xl border border-slate-800/60 bg-gradient-to-b from-forest-900 to-slate-950 p-6 shadow-sm sm:p-8">
        <div className="flex flex-col items-start gap-6 md:flex-row md:items-center md:justify-between">
          <div className="space-y-3">
            <p className="font-headline text-[9px] font-bold uppercase tracking-[0.24em] text-slate-500">
              {integration.region} · {integration.language.toUpperCase()} · {integration.ingestionKind.toUpperCase()}
            </p>
            <h1 className="font-headline text-3xl font-extrabold tracking-tighter text-white sm:text-4xl">
              {integration.name}
            </h1>
            <p className="max-w-2xl text-[13.5px] leading-relaxed text-slate-300/90">
              {integration.tagline}
            </p>
            <div className="flex flex-wrap gap-2">
              <ConnectionStatusBadge status={integration.connection} />
              {integration.requiresAuth && integration.session ? (
                <AuthStatusBadge status={integration.session.status} />
              ) : (
                <AuthStatusBadge status="no_auth_required" />
              )}
              <span className="inline-flex items-center rounded bg-slate-800/60 px-2 py-0.5 font-headline text-[10px] font-bold uppercase tracking-[0.18em] text-slate-300 ring-1 ring-slate-700/60">
                Reliability {(integration.reliabilityScore * 100).toFixed(0)}%
              </span>
            </div>
          </div>
        </div>

        {/* Telemetry strip */}
        <dl className="mt-7 grid grid-cols-2 gap-y-4 border-t border-slate-800/60 pt-5 sm:grid-cols-4">
          <Strip label="Articles · Today" value={String(integration.health.articlesToday)} />
          <Strip label="Articles · 7 Days" value={String(integration.health.articles7d)} />
          <Strip label="Articles · 30 Days" value={String(integration.health.articles30d)} />
          <Strip
            label="Runs OK / Failed · 7d"
            value={`${integration.health.runsSuccess7d} / ${integration.health.runsFailed7d}`}
          />
        </dl>
      </section>

      {/* T1.5 credentials panel — surfaces above the session panel because
          credentials are the prerequisite for sessions. Only rendered for
          authenticated sources (public RSS sources skip this entirely). */}
      {integration.requiresAuth && credentialDescriptor && (
        <CredentialsPanel
          sourceSlug={integration.id}
          sourceName={integration.name}
          descriptor={credentialDescriptor}
        />
      )}

      {/* Two-column body */}
      <div className="grid gap-5 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <SessionStatusPanel integration={integration} />
        </div>
        <IngestionHealthPanel integration={integration} />
      </div>

      {/* Notes + links · light cards on the page canvas */}
      <div className="grid gap-5 lg:grid-cols-2">
        <SectionCard title="Operator Notes">
          {integration.notes.length === 0 ? (
            <p className="text-[13px] text-slate-500">No notes recorded.</p>
          ) : (
            <ul className="space-y-2 text-[13px] leading-relaxed text-slate-700">
              {integration.notes.map((note, i) => (
                <li key={i} className="flex gap-2">
                  <span className="mt-1 inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-forest-900" />
                  <span>{note}</span>
                </li>
              ))}
            </ul>
          )}
        </SectionCard>

        <SectionCard title="External Links">
          <ul className="space-y-2">
            {integration.externalLinks.map((link, i) => (
              <li key={i}>
                <a
                  href={link.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-[13px] text-forest-700 underline-offset-2 hover:underline"
                >
                  {link.label}
                  <ExternalLink size={12} aria-hidden />
                </a>
              </li>
            ))}
          </ul>
        </SectionCard>
      </div>
    </div>
  );
}

function IngestionHealthPanel({ integration }: { integration: IntegrationDescriptor }) {
  return (
    <section className="overflow-hidden rounded-2xl border border-slate-800/60 bg-gradient-to-b from-forest-900 to-slate-950 p-5 shadow-sm">
      <header className="mb-4 flex items-center justify-between">
        <h3 className="font-headline text-[10px] font-extrabold uppercase tracking-[0.25em] text-slate-400">
          Ingestion Health · 7d
        </h3>
        <span className="inline-flex items-center rounded bg-slate-800/60 px-2 py-0.5 font-headline text-[10px] font-bold uppercase tracking-[0.18em] text-slate-300 ring-1 ring-slate-700/60">
          {integration.health.lastRunStatus.toUpperCase()}
        </span>
      </header>
      <dl className="space-y-3">
        <Strip label="Last Run At" value={formatTs(integration.health.lastRunAt)} mono />
        <Strip label="Successful Runs · 7d" value={String(integration.health.runsSuccess7d)} />
        <Strip label="Failed Runs · 7d" value={String(integration.health.runsFailed7d)} />
        <Strip
          label="Mean Items / Run · 7d"
          value={integration.health.meanItemsPerRun7d.toFixed(1)}
        />
      </dl>
    </section>
  );
}

function Strip({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-center justify-between border-b border-slate-800/40 pb-2 last:border-b-0 last:pb-0">
      <span className="font-headline text-[9px] font-bold uppercase tracking-[0.22em] text-slate-500">
        {label}
      </span>
      <span
        className={
          mono
            ? "font-mono text-[12px] text-lime-300"
            : "font-headline text-sm font-extrabold text-lime-300"
        }
      >
        {value}
      </span>
    </div>
  );
}

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <h3 className="mb-3 font-headline text-[10px] font-extrabold uppercase tracking-[0.25em] text-slate-500">
        {title}
      </h3>
      {children}
    </section>
  );
}

function formatTs(iso: string | null): string {
  if (!iso) return "—";
  try {
    const d = new Date(iso);
    const pad = (n: number) => n.toString().padStart(2, "0");
    return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())} ${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())} UTC`;
  } catch {
    return iso;
  }
}
