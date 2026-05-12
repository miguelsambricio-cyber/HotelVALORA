import { ShieldCheck, ShieldAlert, KeyRound, AlertTriangle, CheckCircle2, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { SIGNAL_VISUAL } from "@/components/admin/dashboard/signal-tints";
import type { IntegrationDescriptor, SessionValidationTarget } from "@/lib/admin/integrations";
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
  const isReauthRequired =
    session.hoursToExpiry !== null && session.hoursToExpiry <= 24;
  const isPlaceholder = session.placeholder === true;
  const validationPassed = session.validationReport.filter((r) => r.verdict).length;
  const validationTotal = session.validationReport.length;
  const fetchOk = session.lastAuthedFetchStatus === "ok";

  return (
    <section className="overflow-hidden rounded-2xl border border-slate-800/60 bg-gradient-to-b from-forest-900 to-slate-950 p-5 shadow-sm">
      <header className="mb-4 flex flex-wrap items-center gap-2">
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
        {session.placeholder !== null && (
          <span
            className={cn(
              "inline-flex items-center rounded px-2 py-0.5 font-headline text-[10px] font-bold uppercase tracking-[0.18em] ring-1",
              isPlaceholder
                ? "bg-amber-500/15 text-amber-200 ring-amber-500/40"
                : "bg-emerald-500/15 text-emerald-200 ring-emerald-500/40",
            )}
          >
            {isPlaceholder ? "Placeholder T2" : "Real T2 · Playwright"}
          </span>
        )}
        <span className="ml-auto" />
      </header>

      {/* Prominent re-auth banner · only when session has ≤24h left. */}
      {isReauthRequired && session.status !== "session_expired" && (
        <div className="mb-4 flex items-start gap-2 rounded-lg border border-amber-500/40 bg-amber-500/10 p-3">
          <AlertTriangle size={16} className="mt-0.5 shrink-0 text-amber-300" aria-hidden />
          <div className="flex-1">
            <p className="font-headline text-[12px] font-extrabold uppercase tracking-[0.18em] text-amber-200">
              Re-auth required — session expires in {session.hoursToExpiry}h
            </p>
            <p className="mt-1 text-[11.5px] leading-relaxed text-amber-100/80">
              Run{" "}
              <code className="rounded bg-amber-950/40 px-1.5 py-0.5 font-mono text-[10.5px] text-amber-200">
                node apps/web/scripts/playwright-refresh.mjs --slug={integration.id}
              </code>{" "}
              before expiry to avoid placeholder fallback in the next cron run.
            </p>
          </div>
        </div>
      )}

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

      {/* Telemetry grid — six core fields plus optional row for cookies/origins */}
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
        <Field
          label="Cookies"
          value={session.cookiesCount !== null ? String(session.cookiesCount) : "—"}
          mono
        />
        <Field
          label="Origins"
          value={session.originsCount !== null ? String(session.originsCount) : "—"}
          mono
        />
        {session.postLoginUrl && (
          <Field
            label="Post-login URL"
            value={session.postLoginUrl}
            mono
            className="col-span-full"
          />
        )}
        {session.lastRefreshError && (
          <Field
            label="Last Error"
            value={session.lastRefreshError}
            mono
            className="col-span-full text-rose-400"
          />
        )}
      </dl>

      {/* Premium-access verification — last authed fetch + validation table */}
      <div className="mt-5 border-t border-slate-800/60 pt-4">
        <div className="mb-3 flex items-center gap-2">
          <h4 className="font-headline text-[10px] font-extrabold uppercase tracking-[0.22em] text-slate-400">
            Premium-access verification
          </h4>
          {session.lastAuthedFetchStatus !== null && (
            <span
              className={cn(
                "inline-flex items-center gap-1 rounded px-1.5 py-0.5 font-headline text-[9.5px] font-bold uppercase tracking-[0.18em] ring-1",
                fetchOk
                  ? "bg-emerald-500/15 text-emerald-200 ring-emerald-500/40"
                  : "bg-rose-500/15 text-rose-200 ring-rose-500/40",
              )}
            >
              {fetchOk ? <CheckCircle2 size={11} aria-hidden /> : <XCircle size={11} aria-hidden />}
              {fetchOk ? "OK" : "Fail"}
            </span>
          )}
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <Field
            label="Last Authed Fetch"
            value={formatTs(session.lastAuthedFetchAt)}
            mono
          />
          <Field
            label="Validation"
            value={
              validationTotal > 0
                ? `${validationPassed}/${validationTotal} targets passed`
                : "—"
            }
            mono
          />
          <Field
            label="Refresh Source"
            value={isPlaceholder ? "Placeholder" : "Playwright"}
            mono
          />
        </div>

        {validationTotal > 0 && (
          <div className="mt-3 overflow-hidden rounded-lg border border-slate-800/60">
            <table className="w-full border-collapse text-[11.5px]">
              <thead>
                <tr className="bg-slate-900/60">
                  <th className="px-3 py-2 text-left font-headline text-[9.5px] font-bold uppercase tracking-[0.18em] text-slate-400">
                    Target
                  </th>
                  <th className="px-3 py-2 text-right font-headline text-[9.5px] font-bold uppercase tracking-[0.18em] text-slate-400">
                    Anon
                  </th>
                  <th className="px-3 py-2 text-right font-headline text-[9.5px] font-bold uppercase tracking-[0.18em] text-slate-400">
                    Authed
                  </th>
                  <th className="px-3 py-2 text-right font-headline text-[9.5px] font-bold uppercase tracking-[0.18em] text-slate-400">
                    Δ Bytes
                  </th>
                  <th className="px-3 py-2 text-right font-headline text-[9.5px] font-bold uppercase tracking-[0.18em] text-slate-400">
                    Verdict
                  </th>
                </tr>
              </thead>
              <tbody>
                {session.validationReport.map((row) => (
                  <ValidationRow key={row.target} row={row} />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Action affordances — runbook hints only, not wired yet */}
      <div className="mt-5 flex items-center gap-2 border-t border-slate-800/60 pt-4">
        <KeyRound size={14} className="text-slate-500" aria-hidden />
        <p className="text-[11.5px] leading-relaxed text-slate-400">
          Refresh runbook:{" "}
          <code className="rounded bg-slate-800/60 px-1.5 py-0.5 font-mono text-[11px] text-lime-300">
            node apps/web/scripts/playwright-refresh.mjs --slug={integration.id}
          </code>{" "}
          (operator CLI · Phase 2.5b). Browser-driven refresh deferred until runtime decision.
        </p>
      </div>
    </section>
  );
}

function ValidationRow({ row }: { row: SessionValidationTarget }) {
  const deltaClass =
    row.sizeDelta > 0 ? "text-emerald-300" : row.sizeDelta < 0 ? "text-amber-300" : "text-slate-400";
  return (
    <tr className="border-t border-slate-800/60">
      <td className="px-3 py-2 font-headline font-bold text-white">{row.target}</td>
      <td className="px-3 py-2 text-right font-mono text-slate-300">{formatBytes(row.anonLength)}</td>
      <td className="px-3 py-2 text-right font-mono text-slate-300">{formatBytes(row.authedLength)}</td>
      <td className={cn("px-3 py-2 text-right font-mono", deltaClass)}>
        {row.sizeDelta > 0 ? "+" : ""}
        {row.sizeDelta}B
      </td>
      <td className="px-3 py-2 text-right">
        <span
          className={cn(
            "inline-flex items-center gap-1 rounded px-1.5 py-0.5 font-headline text-[9.5px] font-bold uppercase tracking-[0.16em] ring-1",
            row.verdict
              ? "bg-emerald-500/15 text-emerald-200 ring-emerald-500/40"
              : "bg-slate-600/30 text-slate-300 ring-slate-500/40",
          )}
        >
          {row.verdict ? <CheckCircle2 size={10} aria-hidden /> : <XCircle size={10} aria-hidden />}
          {row.verdict ? "Pass" : "No diff"}
        </span>
      </td>
    </tr>
  );
}

function formatBytes(n: number): string {
  if (n >= 1024) return `${(n / 1024).toFixed(1)}kB`;
  return `${n}B`;
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
