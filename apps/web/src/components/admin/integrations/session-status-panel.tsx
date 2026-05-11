import { ShieldCheck, ShieldAlert, KeyRound } from "lucide-react";
import { cn } from "@/lib/utils";
import { SIGNAL_VISUAL } from "@/components/admin/dashboard/signal-tints";
import type { IntegrationDescriptor } from "@/lib/admin/integrations";
import { AUTH_STATUS_VISUAL } from "@/lib/admin/integrations";

/**
 * Session-status panel for the integration detail page.
 *
 * Mirrors the schema of `public.intelligence_source_sessions`. When the
 * integration is public (requires_auth=false), renders a minimal panel
 * stating that no T2 row is needed.
 */
export function SessionStatusPanel({ integration }: { integration: IntegrationDescriptor }) {
  if (!integration.requiresAuth || !integration.session) {
    return (
      <section className="overflow-hidden rounded-2xl border border-slate-800/60 bg-gradient-to-b from-forest-900 to-slate-950 p-5 shadow-sm">
        <header className="mb-4 flex items-center justify-between">
          <h3 className="font-headline text-[10px] font-extrabold uppercase tracking-[0.25em] text-slate-400">
            Authentication
          </h3>
          <span className="rounded bg-slate-700/40 px-2 py-0.5 font-headline text-[9px] font-bold uppercase tracking-[0.18em] text-slate-300 ring-1 ring-slate-600/40">
            Public Source
          </span>
        </header>
        <div className="flex items-start gap-3">
          <ShieldCheck size={20} className="text-emerald-400" aria-hidden />
          <div>
            <p className="font-headline text-sm font-extrabold text-white">No credentials required</p>
            <p className="mt-1 text-[12px] leading-relaxed text-slate-400">
              This integration consumes publicly accessible {integration.ingestionKind.toUpperCase()} data.
              No session storage, no refresh cycle. Operates entirely within the public-fetch envelope.
            </p>
          </div>
        </div>
      </section>
    );
  }

  const session = integration.session;
  const visual = AUTH_STATUS_VISUAL[session.status];
  const signal = SIGNAL_VISUAL[visual.signal];

  return (
    <section className="overflow-hidden rounded-2xl border border-slate-800/60 bg-gradient-to-b from-forest-900 to-slate-950 p-5 shadow-sm">
      <header className="mb-4 flex items-center justify-between">
        <h3 className="font-headline text-[10px] font-extrabold uppercase tracking-[0.25em] text-slate-400">
          Authentication · Session
        </h3>
        <span
          className={cn(
            "inline-flex items-center gap-1.5 rounded px-2 py-0.5 font-headline text-[10px] font-bold uppercase tracking-[0.18em] ring-1",
            signal.bg,
            signal.ring,
            signal.text,
          )}
        >
          <span aria-hidden className={cn(signal.text, signal.pulse && "animate-pulse")}>{signal.dot}</span>
          {visual.label}
        </span>
      </header>

      <div className="flex items-start gap-3">
        {session.status === "active_session" || session.status === "session_expiring" ? (
          <ShieldCheck size={20} className="text-emerald-400" aria-hidden />
        ) : (
          <ShieldAlert size={20} className="text-amber-400" aria-hidden />
        )}
        <div className="flex-1">
          <p className="font-headline text-sm font-extrabold text-white">
            {sessionHeadline(session.status)}
          </p>
          <p className="mt-1 text-[12px] leading-relaxed text-slate-400">{visual.hint}</p>
        </div>
      </div>

      {/* Telemetry grid */}
      <dl className="mt-5 grid grid-cols-2 gap-x-4 gap-y-3 border-t border-slate-800/60 pt-4 sm:grid-cols-4">
        <Field label="Auth Strategy" value={authStrategyLabel(integration.authStrategy)} />
        <Field label="KEK" value={session.encKeyId ?? "—"} mono />
        <Field label="Refresh Count" value={String(session.refreshCount)} mono />
        <Field
          label="Hours to Expiry"
          value={session.hoursToExpiry !== null ? `${session.hoursToExpiry}h` : "—"}
          mono
        />
        <Field label="Last Refresh" value={formatTs(session.refreshedAt)} mono />
        <Field label="Expires" value={formatTs(session.expiresAt)} mono />
        {session.lastRefreshError && (
          <Field
            label="Last Error"
            value={session.lastRefreshError}
            mono
            className="col-span-full text-rose-400"
          />
        )}
      </dl>

      {/* Action affordances — runbook hints only, not wired yet */}
      <div className="mt-5 flex items-center gap-2 border-t border-slate-800/60 pt-4">
        <KeyRound size={14} className="text-slate-500" aria-hidden />
        <p className="text-[11.5px] leading-relaxed text-slate-400">
          Refresh runbook:{" "}
          <code className="rounded bg-slate-800/60 px-1.5 py-0.5 font-mono text-[11px] text-lime-300">
            pnpm intel:refresh {integration.id}
          </code>{" "}
          (operator CLI · Phase 2.5). Autonomous refresh API arrives in Phase 4.
        </p>
      </div>
    </section>
  );
}

function Field({
  label,
  value,
  mono,
  className,
}: {
  label: string;
  value: string;
  mono?: boolean;
  className?: string;
}) {
  return (
    <div className={className}>
      <dt className="font-headline text-[9px] font-bold uppercase tracking-[0.22em] text-slate-500">
        {label}
      </dt>
      <dd className={cn("mt-1 text-[12.5px] text-white", mono ? "font-mono text-[12px] text-lime-300" : "font-headline font-extrabold")}>
        {value || "—"}
      </dd>
    </div>
  );
}

function sessionHeadline(status: NonNullable<IntegrationDescriptor["session"]>["status"]): string {
  switch (status) {
    case "active_session": return "Encrypted session valid · ingestion authorized";
    case "session_expiring": return "Session expiring soon · refresh within 24h";
    case "session_expired": return "Session expired · operator refresh required";
    case "refresh_failed": return "Last refresh attempt failed · operator action needed";
    case "not_provisioned": return "Credentials not yet provisioned in environment";
    case "no_auth_required": return "No credentials required";
  }
}

function authStrategyLabel(strategy: IntegrationDescriptor["authStrategy"]): string {
  if (strategy === "none") return "None";
  if (strategy === "cookie_session") return "Cookie Session";
  if (strategy === "bearer_token") return "Bearer Token";
  return "OAuth 2.0";
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
