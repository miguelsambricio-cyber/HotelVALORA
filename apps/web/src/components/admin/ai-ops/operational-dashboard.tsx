import { AlertTriangle, Activity, CheckCircle2, XCircle, Clock, Zap } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import type { AiOpsLive, RecentRunRow, ThroughputBucket, DegradedSource, AlertEntry } from "@/lib/admin/ai-ops/live";
import { PriorityIntelligenceFeed, TopSignalsSummary } from "./priority-intelligence-feed";

/**
 * AI Operations Center · live operational dashboard. Sits at the top of
 * /user/admin/agents above the orbital diagram. Every panel reads from
 * the `loadAiOpsLive` aggregator · zero mock data.
 *
 * Panels
 *   1. Totals strip · 7d aggregates (runs / successes / failures /
 *      articles / sources active / sources degraded)
 *   2. Throughput sparkline · 7d articles-per-day bars
 *   3. Degraded sources panel · what needs attention right now
 *   4. Recent runs table · last 20 ingestion runs with status pill
 *   5. Alerts feed · audit-driven failure entries
 */
export function OperationalDashboard({ data }: { data: AiOpsLive }) {
  return (
    <section className="space-y-5">
      <TotalsStrip data={data} />
      {/* Institutional command-center band · top signals strip + cross-source
       *  priority feed. Sits ABOVE the runtime telemetry so the operator's
       *  first read is the deal-flow, not the cron health. */}
      <TopSignalsSummary signals={data.topSignals} />
      <PriorityIntelligenceFeed items={data.priorityFeed} totalPriority7d={data.totals.priorityArticles7d} />
      <div className="grid gap-5 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <ThroughputCard buckets={data.throughput} articlesTotal={data.totals.articlesInserted7d} />
        </div>
        <DegradedPanel sources={data.degradedSources} />
      </div>
      <div className="grid gap-5 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <RecentRunsTable runs={data.recentRuns} />
        </div>
        <AlertsFeed alerts={data.alerts} />
      </div>
    </section>
  );
}

// ── totals strip ────────────────────────────────────────────────────────────

function TotalsStrip({ data }: { data: AiOpsLive }) {
  const successRate =
    data.totals.runs7d > 0
      ? Math.round((data.totals.successes7d / data.totals.runs7d) * 100)
      : 0;
  return (
    <section className="overflow-hidden rounded-2xl border border-slate-800/60 bg-gradient-to-b from-forest-900 to-slate-950 p-5 shadow-sm">
      <header className="mb-4 flex items-baseline justify-between">
        <p className="font-headline text-[10px] font-extrabold uppercase tracking-[0.25em] text-lime-300/80">
          Operational Totals · 7d
        </p>
        <p className="font-mono text-[10.5px] text-slate-400">
          Updated {formatRel(data.fetchedAt)}
        </p>
      </header>
      <dl className="grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-3 lg:grid-cols-7">
        <Totem label="Runs · 7d" value={String(data.totals.runs7d)} />
        <Totem
          label="Success Rate"
          value={`${successRate}%`}
          severity={successRate >= 80 ? "ok" : successRate >= 60 ? "warn" : "error"}
        />
        <Totem label="Successful" value={String(data.totals.successes7d)} severity="ok" />
        <Totem
          label="Partial"
          value={String(data.totals.partials7d)}
          severity={data.totals.partials7d > 0 ? "warn" : "neutral"}
        />
        <Totem
          label="Failed"
          value={String(data.totals.failures7d)}
          severity={data.totals.failures7d > 0 ? "error" : "neutral"}
        />
        <Totem label="Articles · 7d" value={String(data.totals.articlesInserted7d)} />
        <Totem label="Priority · 7d" value={String(data.totals.priorityArticles7d)} severity="ok" />
      </dl>
    </section>
  );
}

function Totem({
  label,
  value,
  severity,
}: {
  label: string;
  value: string;
  severity?: "ok" | "warn" | "error" | "neutral";
}) {
  const tone =
    severity === "ok"
      ? "text-emerald-300"
      : severity === "warn"
        ? "text-amber-300"
        : severity === "error"
          ? "text-rose-300"
          : "text-lime-300";
  return (
    <div>
      <dt className="font-headline text-[9px] font-bold uppercase tracking-[0.22em] text-slate-500">
        {label}
      </dt>
      <dd className={cn("mt-1 font-headline text-2xl font-extrabold", tone)}>{value}</dd>
    </div>
  );
}

// ── throughput sparkline ────────────────────────────────────────────────────

function ThroughputCard({ buckets, articlesTotal }: { buckets: ThroughputBucket[]; articlesTotal: number }) {
  const peak = buckets.reduce((max, b) => Math.max(max, b.articles), 1);
  return (
    <section className="overflow-hidden rounded-2xl border border-slate-800/60 bg-gradient-to-b from-forest-900 to-slate-950 p-5 shadow-sm">
      <header className="mb-4 flex items-center justify-between">
        <div>
          <p className="font-headline text-[10px] font-extrabold uppercase tracking-[0.25em] text-lime-300/80">
            Ingestion Throughput · 7d
          </p>
          <p className="mt-0.5 font-headline text-2xl font-extrabold text-lime-300">
            {articlesTotal} articles
          </p>
        </div>
        <Zap size={16} className="text-slate-600" aria-hidden />
      </header>
      <div className="flex items-end gap-2">
        {buckets.map((b) => {
          const heightPct = peak > 0 ? Math.max(8, (b.articles / peak) * 100) : 8;
          return (
            <div key={b.date} className="flex flex-1 flex-col items-center gap-2">
              <span className="font-mono text-[10px] text-slate-400">{b.articles}</span>
              <div className="relative flex h-24 w-full items-end rounded bg-slate-900/40">
                <div
                  className={cn(
                    "w-full rounded transition-colors",
                    b.articles > 0 ? "bg-lime-300/80" : "bg-slate-700/50",
                  )}
                  style={{ height: `${heightPct}%` }}
                />
              </div>
              <span className="font-mono text-[10px] text-slate-500">{formatDateShort(b.date)}</span>
            </div>
          );
        })}
      </div>
      <p className="mt-3 text-[11px] leading-relaxed text-slate-500">
        Per-day article inserts from `market_news`. Bars track the nightly cron — taller bars = more new news ingested.
      </p>
    </section>
  );
}

// ── degraded sources ────────────────────────────────────────────────────────

function DegradedPanel({ sources }: { sources: DegradedSource[] }) {
  return (
    <section className="overflow-hidden rounded-2xl border border-slate-800/60 bg-gradient-to-b from-forest-900 to-slate-950 p-5 shadow-sm">
      <header className="mb-3 flex items-center gap-2">
        <AlertTriangle size={14} className="text-amber-400" aria-hidden />
        <p className="font-headline text-[10px] font-extrabold uppercase tracking-[0.25em] text-amber-300/80">
          Degraded Sources
        </p>
        <span className="ml-auto font-mono text-[10.5px] text-slate-400">{sources.length}</span>
      </header>
      {sources.length === 0 ? (
        <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-3">
          <p className="flex items-center gap-2 font-headline text-[12px] font-extrabold text-emerald-200">
            <CheckCircle2 size={14} aria-hidden /> All sources nominal
          </p>
          <p className="mt-1 text-[11px] leading-relaxed text-emerald-100/70">
            Every authenticated source has a healthy T2 session and recent successful runs.
          </p>
        </div>
      ) : (
        <ul className="space-y-2">
          {sources.map((s) => (
            <li
              key={s.slug}
              className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-3"
            >
              <div className="flex items-center justify-between gap-2">
                <Link
                  href={`/user/admin/integrations/${s.slug}`}
                  className="font-headline text-[13px] font-extrabold tracking-tight text-white hover:underline"
                >
                  {s.name}
                </Link>
                <span className="font-headline text-[9.5px] font-bold uppercase tracking-[0.18em] text-amber-200">
                  {reasonLabel(s.reason)}
                </span>
              </div>
              <p className="mt-1 text-[11.5px] leading-relaxed text-amber-100/80">{s.detail}</p>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function reasonLabel(reason: DegradedSource["reason"]): string {
  switch (reason) {
    case "session_refresh_failed": return "T2 Refresh Failed";
    case "consecutive_failures": return "Repeated Failures";
    case "auto_degraded": return "Auto-Degraded";
    case "no_recent_runs": return "No Recent Runs";
  }
}

// ── recent runs table ───────────────────────────────────────────────────────

function RecentRunsTable({ runs }: { runs: RecentRunRow[] }) {
  return (
    <section className="overflow-hidden rounded-2xl border border-slate-800/60 bg-gradient-to-b from-forest-900 to-slate-950 p-5 shadow-sm">
      <header className="mb-3 flex items-center gap-2">
        <Activity size={14} className="text-slate-400" aria-hidden />
        <p className="font-headline text-[10px] font-extrabold uppercase tracking-[0.25em] text-lime-300/80">
          Recent Ingestion Runs
        </p>
        <span className="ml-auto font-mono text-[10.5px] text-slate-400">{runs.length}</span>
      </header>
      {runs.length === 0 ? (
        <p className="text-[12px] text-slate-500">No ingestion runs in the last 14 days.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-[11.5px]">
            <thead>
              <tr className="text-left text-slate-500">
                <th className="px-2 py-2 font-headline text-[9.5px] font-bold uppercase tracking-[0.18em]">Source</th>
                <th className="px-2 py-2 font-headline text-[9.5px] font-bold uppercase tracking-[0.18em]">Status</th>
                <th className="px-2 py-2 text-right font-headline text-[9.5px] font-bold uppercase tracking-[0.18em]">Items</th>
                <th className="px-2 py-2 text-right font-headline text-[9.5px] font-bold uppercase tracking-[0.18em]">Body</th>
                <th className="px-2 py-2 text-right font-headline text-[9.5px] font-bold uppercase tracking-[0.18em]">Auth</th>
                <th className="px-2 py-2 text-right font-headline text-[9.5px] font-bold uppercase tracking-[0.18em]">Duration</th>
                <th className="px-2 py-2 text-right font-headline text-[9.5px] font-bold uppercase tracking-[0.18em]">Started</th>
              </tr>
            </thead>
            <tbody>
              {runs.map((r) => (
                <RunRow key={r.id} run={r} />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

function RunRow({ run }: { run: RecentRunRow }) {
  return (
    <tr className="border-t border-slate-800/60">
      <td className="px-2 py-2">
        <Link
          href={`/user/admin/integrations/${run.source_slug}`}
          className="font-headline font-bold text-white hover:underline"
        >
          {run.source_name}
        </Link>
      </td>
      <td className="px-2 py-2">
        <StatusPill status={run.status} />
      </td>
      <td className="px-2 py-2 text-right font-mono text-slate-300">
        {run.items_inserted}
        {run.items_updated > 0 && <span className="text-slate-500">·{run.items_updated}</span>}
      </td>
      <td className="px-2 py-2 text-right font-mono text-slate-300">
        {run.body_fetch_successes !== null
          ? `${run.body_fetch_successes}/${(run.body_fetch_successes ?? 0) + (run.body_fetch_failures ?? 0)}`
          : "—"}
      </td>
      <td className="px-2 py-2 text-right">
        <AuthPill health={run.session_health} />
      </td>
      <td className="px-2 py-2 text-right font-mono text-slate-400">
        {run.duration_ms !== null ? `${(run.duration_ms / 1000).toFixed(1)}s` : "—"}
      </td>
      <td className="px-2 py-2 text-right font-mono text-slate-400">
        {formatRel(run.run_started_at)}
      </td>
    </tr>
  );
}

function StatusPill({ status }: { status: RecentRunRow["status"] }) {
  const map = {
    success: { tone: "bg-emerald-500/15 text-emerald-200 ring-emerald-500/40", label: "Success" },
    partial: { tone: "bg-amber-500/15 text-amber-200 ring-amber-500/40", label: "Partial" },
    failed: { tone: "bg-rose-500/15 text-rose-200 ring-rose-500/40", label: "Failed" },
    queued: { tone: "bg-slate-700/40 text-slate-300 ring-slate-600/40", label: "Queued" },
    running: { tone: "bg-sky-500/15 text-sky-200 ring-sky-500/40", label: "Running" },
  } as const;
  const v = map[status];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded px-1.5 py-0.5 font-headline text-[9.5px] font-bold uppercase tracking-[0.18em] ring-1",
        v.tone,
      )}
    >
      <span aria-hidden>●</span>
      {v.label}
    </span>
  );
}

function AuthPill({ health }: { health: RecentRunRow["session_health"] }) {
  if (!health || health === "no_auth_required") {
    return <span className="font-mono text-[10px] text-slate-500">public</span>;
  }
  const map = {
    ok: { tone: "text-emerald-300", label: "authed" },
    failed_auto_degraded: { tone: "text-rose-300", label: "degraded" },
    no_session: { tone: "text-amber-300", label: "no-session" },
  } as const;
  const v = map[health as keyof typeof map] ?? { tone: "text-slate-400", label: health };
  return <span className={cn("font-mono text-[10px]", v.tone)}>{v.label}</span>;
}

// ── alerts feed ─────────────────────────────────────────────────────────────

function AlertsFeed({ alerts }: { alerts: AlertEntry[] }) {
  return (
    <section className="overflow-hidden rounded-2xl border border-slate-800/60 bg-gradient-to-b from-forest-900 to-slate-950 p-5 shadow-sm">
      <header className="mb-3 flex items-center gap-2">
        <XCircle size={14} className="text-rose-400" aria-hidden />
        <p className="font-headline text-[10px] font-extrabold uppercase tracking-[0.25em] text-rose-300/80">
          Alerts · 7d
        </p>
        <span className="ml-auto font-mono text-[10.5px] text-slate-400">{alerts.length}</span>
      </header>
      {alerts.length === 0 ? (
        <p className="text-[12px] text-slate-500">No alerts in the last 7 days.</p>
      ) : (
        <ul className="space-y-2.5">
          {alerts.slice(0, 8).map((a) => (
            <li key={a.id} className="border-l-2 border-rose-500/50 pl-3">
              <p className="flex items-center gap-2 font-headline text-[11.5px] font-extrabold tracking-tight text-white">
                <Clock size={10} className="text-slate-500" aria-hidden />
                {a.headline}
              </p>
              {a.detail && (
                <p className="mt-0.5 text-[10.5px] leading-relaxed text-slate-400">{a.detail}</p>
              )}
              <p className="mt-0.5 font-mono text-[10px] text-slate-500">{formatRel(a.occurred_at)}</p>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

// ── helpers ─────────────────────────────────────────────────────────────────

function formatRel(iso: string | null): string {
  if (!iso) return "—";
  const ms = new Date(iso).getTime();
  if (!Number.isFinite(ms)) return "—";
  const diff = Date.now() - ms;
  if (diff < 60_000) return "just now";
  if (diff < 3600_000) return `${Math.round(diff / 60_000)}m ago`;
  if (diff < 86400_000) return `${Math.round(diff / 3600_000)}h ago`;
  return `${Math.round(diff / 86400_000)}d ago`;
}

function formatDateShort(iso: string): string {
  const d = new Date(`${iso}T00:00:00Z`);
  if (!Number.isFinite(d.getTime())) return iso;
  return d.toLocaleDateString("en-US", { weekday: "short", timeZone: "UTC" });
}
