import Link from "next/link";
import { KeyRound, Lock, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import { SIGNAL_VISUAL } from "@/components/admin/dashboard/signal-tints";
import {
  AUTH_STATUS_VISUAL,
  CONNECTION_VISUAL,
  INTEGRATIONS_REGISTRY,
} from "@/lib/admin/integrations";

/**
 * Authenticated-sources panel for the Intelligence Terminal.
 *
 * Surfaces the T1 / T2 status pair for every authenticated source in
 * the registry — credential provisioning + session validity at a glance.
 * Different from the source-coverage matrix (which is article-volume
 * focused); this one is auth-state focused.
 *
 * Currently mock-data-fed via the registry. Phase 3 reads from
 * intelligence_source_credentials + intelligence_source_sessions joins.
 */
export function AuthenticatedSourcesPanel() {
  const authSources = INTEGRATIONS_REGISTRY.filter((i) => i.requiresAuth);
  if (authSources.length === 0) return null;
  return (
    <section className="overflow-hidden rounded-2xl border border-slate-800/60 bg-gradient-to-b from-forest-900 to-slate-950 shadow-sm">
      <header className="flex items-center justify-between border-b border-slate-800/60 px-5 py-3.5">
        <div className="flex items-center gap-2">
          <Lock size={14} className="text-slate-400" aria-hidden />
          <h3 className="font-headline text-[10px] font-extrabold uppercase tracking-[0.25em] text-slate-400">
            Authenticated Sources
          </h3>
        </div>
        <span className="font-mono text-[10.5px] text-slate-500">
          T1.5 credentials · T2 sessions
        </span>
      </header>
      <ul className="divide-y divide-slate-800/60">
        {authSources.map((s) => {
          const conn = CONNECTION_VISUAL[s.connection];
          const connSig = SIGNAL_VISUAL[conn.signal];
          const auth = s.session
            ? AUTH_STATUS_VISUAL[s.session.status]
            : AUTH_STATUS_VISUAL.no_auth_required;
          const authSig = SIGNAL_VISUAL[auth.signal];
          return (
            <li key={s.id} className="grid grid-cols-12 items-center gap-3 px-5 py-4">
              {/* Name + tagline */}
              <div className="col-span-12 lg:col-span-4">
                <Link
                  href={`/user/admin/integrations/${s.id}`}
                  className="font-headline text-[14px] font-extrabold tracking-tight text-white hover:text-lime-300"
                >
                  {s.name}
                </Link>
                <p className="font-headline text-[9px] font-bold uppercase tracking-[0.22em] text-slate-500">
                  {s.region} · {s.tier.replace("_", " ")} · {s.authStrategy.replace("_", " ")}
                </p>
              </div>

              {/* T1.5 — credentials */}
              <div className="col-span-6 lg:col-span-3">
                <p className="font-headline text-[9px] font-bold uppercase tracking-[0.22em] text-slate-500">
                  T1.5 · Credentials
                </p>
                <p className="mt-1 inline-flex items-center gap-1.5">
                  <span aria-hidden className={cn(connSig.text)}>{connSig.dot}</span>
                  <KeyRound size={11} className="text-slate-500" aria-hidden />
                  <span className="font-headline text-[12px] font-extrabold text-white">
                    {credentialLabel(s.connection)}
                  </span>
                </p>
              </div>

              {/* T2 — session */}
              <div className="col-span-6 lg:col-span-3">
                <p className="font-headline text-[9px] font-bold uppercase tracking-[0.22em] text-slate-500">
                  T2 · Session
                </p>
                <p className="mt-1 inline-flex items-center gap-1.5">
                  <span aria-hidden className={cn(authSig.text)}>{authSig.dot}</span>
                  <ShieldCheck size={11} className="text-slate-500" aria-hidden />
                  <span className="font-headline text-[12px] font-extrabold text-white">
                    {auth.label}
                  </span>
                </p>
                <p className="mt-0.5 font-mono text-[10px] text-slate-500">
                  {s.session?.expiresAt
                    ? `expires ${formatRelativeFuture(s.session.expiresAt)}`
                    : "—"}
                </p>
              </div>

              {/* Ingestion */}
              <div className="col-span-12 lg:col-span-2 lg:text-right">
                <p className="font-headline text-[9px] font-bold uppercase tracking-[0.22em] text-slate-500">
                  Articles · 7d
                </p>
                <p className="mt-1 font-headline text-lg font-extrabold text-lime-300">
                  {s.health.articles7d}
                </p>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function credentialLabel(connection: string): string {
  if (connection === "awaiting_credentials") return "Not Provisioned";
  if (connection === "session_expired") return "Active · Session Expired";
  if (connection === "failing") return "Active · Auth Failure";
  if (connection === "not_configured") return "Not Configured";
  if (connection === "operational") return "Active";
  if (connection === "degraded") return "Active · Degraded";
  return "Unknown";
}

function formatRelativeFuture(iso: string): string {
  const ts = new Date(iso).getTime();
  if (!Number.isFinite(ts)) return "—";
  const diffMs = ts - Date.now();
  if (diffMs < 0) return "expired";
  const hours = Math.round(diffMs / 3600000);
  if (hours < 36) return `in ${hours}h`;
  const days = Math.round(hours / 24);
  return `in ${days}d`;
}
