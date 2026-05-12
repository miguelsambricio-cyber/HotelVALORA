import { Activity, KeyRound, RefreshCw, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import { SIGNAL_VISUAL } from "@/components/admin/dashboard/signal-tints";
import type { IntegrationDescriptor } from "@/lib/admin/integrations";
import type { CredentialStatusDescriptor } from "@/lib/intelligence/credentials";
import type { SignalLevel } from "@/lib/admin/dashboard";

/**
 * Auth Health Strip — the institutional at-a-glance for the integration
 * detail page. Four KPI cells fed by three independent lifecycle systems:
 *
 *   Last successful auth     ← intelligence_source_sessions.refreshed_at (T2)
 *   Last credential rotation ← intelligence_source_credentials.last_rotated_at (T1.5)
 *   Session expires in       ← intelligence_source_sessions.expires_at  (T2)
 *   Last ingestion run       ← news_ingestion_runs rollup               (T3)
 *
 * Read-only · no mutations · dark Bloomberg-terminal canvas.
 */
export function AuthHealthStrip({
  integration,
  credentialDescriptor,
}: {
  integration: IntegrationDescriptor;
  credentialDescriptor?: CredentialStatusDescriptor;
}) {
  const cells = buildCells(integration, credentialDescriptor);
  return (
    <section className="overflow-hidden rounded-2xl border border-slate-800/60 bg-gradient-to-b from-forest-900 to-slate-950 shadow-sm">
      <header className="flex items-center justify-between border-b border-slate-800/60 px-5 py-3">
        <div className="flex items-center gap-2">
          <ShieldCheck size={13} className="text-slate-400" aria-hidden />
          <h3 className="font-headline text-[10px] font-extrabold uppercase tracking-[0.25em] text-slate-400">
            Auth Health
          </h3>
        </div>
        <span className="font-mono text-[10.5px] text-slate-500">
          T1.5 · T2 · ingestion
        </span>
      </header>
      <dl className="grid grid-cols-2 divide-y divide-slate-800/60 lg:grid-cols-4 lg:divide-x lg:divide-y-0">
        {cells.map((cell, i) => {
          const sig = SIGNAL_VISUAL[cell.signal];
          const Icon = cell.icon;
          return (
            <div key={i} className="relative px-5 py-4">
              <span aria-hidden className={cn("absolute left-0 top-4 bottom-4 w-0.5", sig.rail)} />
              <dt className="flex items-center gap-1.5 pl-2 font-headline text-[9px] font-bold uppercase tracking-[0.22em] text-slate-500">
                <Icon size={11} className={cn("shrink-0", sig.text)} aria-hidden />
                {cell.label}
              </dt>
              <dd className={cn("mt-1.5 pl-2 font-headline text-xl font-extrabold tracking-tighter", cell.signal === "neutral" ? "text-slate-300" : "text-lime-300")}>
                {cell.headline}
              </dd>
              <p className="mt-1 pl-2 font-mono text-[10.5px] text-slate-500">{cell.subline}</p>
            </div>
          );
        })}
      </dl>
    </section>
  );
}

// ── derive ─────────────────────────────────────────────────────────────────

interface Cell {
  label: string;
  headline: string;
  subline: string;
  signal: SignalLevel;
  icon: typeof ShieldCheck;
}

function buildCells(
  integration: IntegrationDescriptor,
  cred?: CredentialStatusDescriptor,
): Cell[] {
  const session = integration.session;
  const lastSuccessfulAuth = session?.refreshedAt ?? null;
  const lastCredentialRotation = cred?.lastRotatedAt ?? null;
  const sessionExpiresAt = session?.expiresAt ?? null;
  const lastIngestionRun = integration.health.lastRunAt ?? null;

  return [
    {
      label: "Last Successful Auth",
      headline: relativeAgo(lastSuccessfulAuth) ?? "Never",
      subline: absoluteUtc(lastSuccessfulAuth) ?? "No T2 session minted yet",
      signal: signalForAgeHours(lastSuccessfulAuth, { okWithin: 48, warnWithin: 168 }),
      icon: ShieldCheck,
    },
    {
      label: "Last Credential Rotation",
      headline: relativeAgo(lastCredentialRotation) ?? "Never",
      subline: cred?.provisioned
        ? `Rotation #${cred.rotationCount} · KEK ${cred.encKeyId ?? "—"}`
        : "Not provisioned",
      signal: cred?.provisioned ? signalForAgeHours(lastCredentialRotation, { okWithin: 2160, warnWithin: 4320 }) : "warn",
      icon: KeyRound,
    },
    {
      label: "Session Expires In",
      headline: relativeFuture(sessionExpiresAt) ?? "—",
      subline: absoluteUtc(sessionExpiresAt) ?? "No active session",
      signal: signalForExpiry(sessionExpiresAt),
      icon: RefreshCw,
    },
    {
      label: "Last Ingestion Run",
      headline: relativeAgo(lastIngestionRun) ?? "Never",
      subline: integration.health.lastRunAt
        ? `${integration.health.runsSuccess7d}/${integration.health.runsSuccess7d + integration.health.runsFailed7d} OK · 7d`
        : "No runs recorded",
      signal: signalForAgeHours(lastIngestionRun, { okWithin: 30, warnWithin: 72 }),
      icon: Activity,
    },
  ];
}

// ── time formatting ────────────────────────────────────────────────────────

function relativeAgo(iso: string | null): string | null {
  if (!iso) return null;
  const ts = new Date(iso).getTime();
  if (!Number.isFinite(ts)) return null;
  const diffMs = Date.now() - ts;
  if (diffMs < 0) return "in the future";
  const mins = Math.round(diffMs / 60_000);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.round(mins / 60);
  if (hours < 36) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  return `${days}d ago`;
}

function relativeFuture(iso: string | null): string | null {
  if (!iso) return null;
  const ts = new Date(iso).getTime();
  if (!Number.isFinite(ts)) return null;
  const diffMs = ts - Date.now();
  if (diffMs < 0) return "Expired";
  const mins = Math.round(diffMs / 60_000);
  if (mins < 60) return `${mins}m`;
  const hours = Math.round(mins / 60);
  if (hours < 36) return `${hours}h`;
  const days = Math.round(hours / 24);
  return `${days}d`;
}

function absoluteUtc(iso: string | null): string | null {
  if (!iso) return null;
  try {
    const d = new Date(iso);
    if (!Number.isFinite(d.getTime())) return null;
    const pad = (n: number) => n.toString().padStart(2, "0");
    return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())} ${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())} UTC`;
  } catch {
    return null;
  }
}

function signalForAgeHours(
  iso: string | null,
  thresholds: { okWithin: number; warnWithin: number },
): SignalLevel {
  if (!iso) return "neutral";
  const ts = new Date(iso).getTime();
  if (!Number.isFinite(ts)) return "neutral";
  const hours = (Date.now() - ts) / 3_600_000;
  if (hours <= thresholds.okWithin) return "ok";
  if (hours <= thresholds.warnWithin) return "warn";
  return "error";
}

function signalForExpiry(iso: string | null): SignalLevel {
  if (!iso) return "neutral";
  const ts = new Date(iso).getTime();
  if (!Number.isFinite(ts)) return "neutral";
  const hoursAhead = (ts - Date.now()) / 3_600_000;
  if (hoursAhead < 0) return "error";
  if (hoursAhead < 24) return "warn";
  return "ok";
}
