import { CheckCircle2, AlertTriangle, AlertCircle, CircleDot } from "lucide-react";
import { cn } from "@/lib/utils";
import type { IntegrationDescriptor } from "@/lib/admin/integrations";
import type { CredentialsStatusView } from "@/lib/intelligence/credentials-store";

/**
 * Operational Health Hero — the single-glance coherent state for an
 * integration. Synthesizes T1 (credentials) · T2 (session) · T3
 * (ingestion) into three explicit lanes plus a merged verdict.
 *
 * The verdict line answers the operator's first question — "is this
 * source healthy, and if not, what do I do?" — without making them
 * cross-reference three separate panels.
 *
 * Sits at the top of the integration detail page. Replaces what used
 * to be just two pill badges in the page hero.
 */

type Tier = "T1" | "T2" | "T3";
type Severity = "ok" | "warn" | "error" | "neutral";

interface TierState {
  tier: Tier;
  label: string;
  severity: Severity;
  headline: string;
  detail: string;
}

export function OperationalHealthHero({
  integration,
  credentialsStatus,
}: {
  integration: IntegrationDescriptor;
  credentialsStatus?: CredentialsStatusView;
}) {
  const t1 = describeT1(integration, credentialsStatus);
  const t2 = describeT2(integration);
  const t3 = describeT3(integration);
  const lanes = integration.requiresAuth ? [t1, t2, t3] : [t1, t3];
  const verdict = describeVerdict(integration, t1, t2, t3);
  const cliCommand = `node apps/web/scripts/playwright-refresh.mjs --slug=${integration.id}`;

  return (
    <section className="overflow-hidden rounded-2xl border border-slate-800/60 bg-gradient-to-b from-forest-900 to-slate-950 p-6 shadow-sm">
      <header className="mb-5 flex items-baseline justify-between">
        <div>
          <p className="font-headline text-[9px] font-bold uppercase tracking-[0.24em] text-lime-300/80">
            Operational Health
          </p>
          <h2 className="mt-1 font-headline text-xl font-extrabold tracking-tight text-white">
            {integration.name}
          </h2>
        </div>
        <SeverityPill severity={verdict.severity} label={verdict.label} />
      </header>

      {/* Three lanes (or two for public sources) */}
      <ul className="space-y-3">
        {lanes.map((lane) => (
          <li key={lane.tier} className="flex items-start gap-3">
            <SeverityIcon severity={lane.severity} />
            <div className="min-w-0 flex-1">
              <div className="flex items-baseline gap-2">
                <span className="font-headline text-[10px] font-extrabold uppercase tracking-[0.22em] text-slate-400">
                  {lane.tier}
                </span>
                <span className="font-headline text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">
                  · {lane.label}
                </span>
              </div>
              <p className="mt-0.5 font-headline text-[13.5px] font-extrabold tracking-tight text-white">
                {lane.headline}
              </p>
              <p className="mt-0.5 text-[12px] leading-relaxed text-slate-400">
                {lane.detail}
              </p>
            </div>
          </li>
        ))}
      </ul>

      {/* Merged verdict block */}
      <div
        className={cn(
          "mt-5 rounded-lg border p-4",
          verdict.severity === "ok" && "border-emerald-500/30 bg-emerald-500/5",
          verdict.severity === "warn" && "border-amber-500/40 bg-amber-500/10",
          verdict.severity === "error" && "border-rose-500/40 bg-rose-500/10",
          verdict.severity === "neutral" && "border-slate-700/40 bg-slate-900/40",
        )}
      >
        <p
          className={cn(
            "font-headline text-[10px] font-bold uppercase tracking-[0.22em]",
            verdict.severity === "ok" && "text-emerald-200",
            verdict.severity === "warn" && "text-amber-200",
            verdict.severity === "error" && "text-rose-200",
            verdict.severity === "neutral" && "text-slate-400",
          )}
        >
          Verdict · {verdict.label}
        </p>
        <p className="mt-1.5 text-[13px] leading-relaxed text-slate-200">{verdict.message}</p>
        {integration.requiresAuth && verdict.severity !== "ok" && (
          <p className="mt-2 text-[11.5px] leading-relaxed text-slate-300">
            <span className="font-headline font-extrabold uppercase tracking-[0.18em] text-slate-400">Run</span>{" "}
            <code className="rounded bg-slate-800/80 px-1.5 py-0.5 font-mono text-[11px] text-lime-300">
              {cliCommand}
            </code>
          </p>
        )}
      </div>
    </section>
  );
}

// ── lane describers ────────────────────────────────────────────────────────

function describeT1(
  integration: IntegrationDescriptor,
  status?: CredentialsStatusView,
): TierState {
  if (!integration.requiresAuth) {
    return {
      tier: "T1",
      label: "Credentials",
      severity: "neutral",
      headline: "Not required",
      detail: "Public source · no credentials provisioned",
    };
  }
  if (!status?.configured) {
    return {
      tier: "T1",
      label: "Credentials",
      severity: "warn",
      headline: "Awaiting provisioning",
      detail: "Operator needs to provision credentials via the Credentials panel below.",
    };
  }
  if (status.status === "invalidated") {
    return {
      tier: "T1",
      label: "Credentials",
      severity: "error",
      headline: "Invalidated",
      detail: "Credentials were marked invalid · re-provision before next cron run.",
    };
  }
  if (status.lastLoginStatus === "failure") {
    return {
      tier: "T1",
      label: "Credentials",
      severity: "warn",
      headline: "Last login failed",
      detail: status.lastLoginError ?? "See audit log for details.",
    };
  }
  return {
    tier: "T1",
    label: "Credentials",
    severity: "ok",
    headline: "Active",
    detail: status.lastRotatedAt
      ? `Last rotated ${formatRel(status.lastRotatedAt)}.`
      : "Provisioned · no rotations yet.",
  };
}

function describeT2(integration: IntegrationDescriptor): TierState {
  if (!integration.requiresAuth) {
    return {
      tier: "T2",
      label: "Session",
      severity: "neutral",
      headline: "Not required",
      detail: "No encrypted session needed for public sources.",
    };
  }
  const session = integration.session;
  if (!session) {
    return {
      tier: "T2",
      label: "Session",
      severity: "warn",
      headline: "No session row",
      detail: "Run the refresh CLI to capture a real T2 session.",
    };
  }
  if (session.status === "refresh_failed") {
    return {
      tier: "T2",
      label: "Session",
      severity: "error",
      headline: "Refresh failed",
      detail: session.lastRefreshError ?? "Last refresh attempt failed · operator action required.",
    };
  }
  if (session.status === "session_expired" || session.status === "not_provisioned") {
    return {
      tier: "T2",
      label: "Session",
      severity: "warn",
      headline: session.status === "session_expired" ? "Expired" : "Not provisioned",
      detail: session.expiresAt
        ? `Expired ${formatRel(session.expiresAt)} · refresh required to resume premium ingestion.`
        : "No active session captured · refresh required.",
    };
  }
  if (session.placeholder === true) {
    return {
      tier: "T2",
      label: "Session",
      severity: "warn",
      headline: "Placeholder · not validated",
      detail: "Synthetic T2 row · run the refresh CLI to capture a real Playwright session.",
    };
  }
  if (session.status === "session_expiring") {
    return {
      tier: "T2",
      label: "Session",
      severity: "warn",
      headline: `Expires in ${session.hoursToExpiry}h`,
      detail: `${session.cookiesCount ?? "—"} cookies captured · refresh within 24h to avoid degradation.`,
    };
  }
  return {
    tier: "T2",
    label: "Session",
    severity: "ok",
    headline: `Real Playwright · ${session.cookiesCount ?? "?"} cookies`,
    detail: `${session.hoursToExpiry}h to expiry · last cron health check ${formatRel(session.lastAuthedFetchAt)}.`,
  };
}

function describeT3(integration: IntegrationDescriptor): TierState {
  const h = integration.health;
  if (h.runsSuccess7d === 0 && h.runsFailed7d === 0 && !h.lastRunAt) {
    return {
      tier: "T3",
      label: "Ingestion",
      severity: "neutral",
      headline: "No runs yet",
      detail: "Ingestion has not executed for this source in the last 7 days.",
    };
  }
  if (h.runsFailed7d > 0 && h.runsSuccess7d === 0) {
    return {
      tier: "T3",
      label: "Ingestion",
      severity: "error",
      headline: `${h.runsFailed7d} consecutive failures`,
      detail: "No successful runs in 7d · investigate before next cron firing.",
    };
  }
  if (h.runsFailed7d > 0) {
    return {
      tier: "T3",
      label: "Ingestion",
      severity: "warn",
      headline: `${h.runsSuccess7d} ok · ${h.runsFailed7d} failed (7d)`,
      detail: `${h.articlesToday} articles last 24h · last run ${h.lastRunStatus} ${formatRel(h.lastRunAt)}.`,
    };
  }
  if (h.lastRunStatus === "partial") {
    return {
      tier: "T3",
      label: "Ingestion",
      severity: "warn",
      headline: "Last run partial",
      detail: `${h.articlesToday} articles last 24h · session auto-degraded or RSS empty.`,
    };
  }
  return {
    tier: "T3",
    label: "Ingestion",
    severity: "ok",
    headline: `${h.articlesToday} articles last 24h`,
    detail: `${h.runsSuccess7d} successful runs in 7d · last run ${formatRel(h.lastRunAt)}.`,
  };
}

// ── verdict ────────────────────────────────────────────────────────────────

interface Verdict {
  severity: Severity;
  label: string;
  message: string;
}

function describeVerdict(
  integration: IntegrationDescriptor,
  t1: TierState,
  t2: TierState,
  t3: TierState,
): Verdict {
  // Worst lane wins. If any lane is error, the verdict is error.
  // Public sources skip T1/T2 since they're "neutral · not required".
  const lanes = integration.requiresAuth ? [t1, t2, t3] : [t3];
  const hasError = lanes.some((l) => l.severity === "error");
  const hasWarn = lanes.some((l) => l.severity === "warn");

  if (hasError) {
    const culprit = lanes.find((l) => l.severity === "error")!;
    return {
      severity: "error",
      label: "Failing · operator action required",
      message: `${culprit.tier} (${culprit.label}) is in an error state: ${culprit.headline.toLowerCase()}. The cron will continue but premium ingestion may be incomplete until this is resolved.`,
    };
  }
  if (hasWarn) {
    const culprit = lanes.find((l) => l.severity === "warn")!;
    return {
      severity: "warn",
      label: "Degraded · attention recommended",
      message: `${culprit.tier} (${culprit.label}) needs attention: ${culprit.headline.toLowerCase()}. The cron remains functional but the source may auto-degrade if not addressed.`,
    };
  }
  return {
    severity: "ok",
    label: "Operational",
    message: integration.requiresAuth
      ? "All three tiers green · authenticated daily ingestion runs unattended at 08:48 Madrid."
      : "Public source · daily ingestion runs unattended at 08:48 Madrid.",
  };
}

// ── visuals ────────────────────────────────────────────────────────────────

function SeverityIcon({ severity }: { severity: Severity }) {
  const className = "mt-1 shrink-0";
  switch (severity) {
    case "ok":
      return <CheckCircle2 size={18} className={cn(className, "text-emerald-400")} aria-hidden />;
    case "warn":
      return <AlertTriangle size={18} className={cn(className, "text-amber-300")} aria-hidden />;
    case "error":
      return <AlertCircle size={18} className={cn(className, "text-rose-400")} aria-hidden />;
    case "neutral":
      return <CircleDot size={18} className={cn(className, "text-slate-500")} aria-hidden />;
  }
}

function SeverityPill({ severity, label }: { severity: Severity; label: string }) {
  const tone =
    severity === "ok"
      ? "bg-emerald-500/15 text-emerald-200 ring-emerald-500/40"
      : severity === "warn"
        ? "bg-amber-500/15 text-amber-200 ring-amber-500/40"
        : severity === "error"
          ? "bg-rose-500/15 text-rose-200 ring-rose-500/40"
          : "bg-slate-700/40 text-slate-300 ring-slate-600/40";
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded px-2.5 py-1 font-headline text-[10.5px] font-extrabold uppercase tracking-[0.2em] ring-1",
        tone,
      )}
    >
      <span aria-hidden className={severity === "error" ? "animate-pulse" : ""}>
        ●
      </span>
      {label}
    </span>
  );
}

// ── helpers ────────────────────────────────────────────────────────────────

function formatRel(iso: string | null): string {
  if (!iso) return "—";
  const ms = new Date(iso).getTime();
  if (!Number.isFinite(ms)) return "—";
  const diff = ms - Date.now();
  const absH = Math.abs(diff) / 3600_000;
  const absD = absH / 24;
  if (Math.abs(diff) < 60_000) return diff > 0 ? "in a moment" : "just now";
  if (absH < 1) {
    const m = Math.round(Math.abs(diff) / 60_000);
    return diff > 0 ? `in ${m}m` : `${m}m ago`;
  }
  if (absH < 48) {
    const h = Math.round(absH);
    return diff > 0 ? `in ${h}h` : `${h}h ago`;
  }
  const d = Math.round(absD);
  return diff > 0 ? `in ${d}d` : `${d}d ago`;
}
